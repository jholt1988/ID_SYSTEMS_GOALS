import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout, getAccessToken } from '../lib/firebase';
import { Calendar as CalendarIcon, CheckSquare, Loader2, LogOut, Clock } from 'lucide-react';

export default function WorkspaceConnect() {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'tasks'>('calendar');

  const [events, setEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [freeBlocks, setFreeBlocks] = useState<{start: Date, end: Date}[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setUser(user);
        setToken(token);
        setNeedsAuth(false);
      },
      () => setNeedsAuth(true)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (token && !needsAuth) {
      if (activeTab === 'calendar') {
        fetchCalendarEvents();
        fetchFreeBusy();
      } else {
        fetchTasks();
      }
    }
  }, [token, needsAuth, activeTab]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
    setEvents([]);
    setTasks([]);
  };

  const fetchCalendarEvents = async () => {
    if (!token) return;
    setIsLoadingData(true);
    try {
      const timeMin = new Date().toISOString();
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=10&singleEvents=true&orderBy=startTime`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.items) {
        setEvents(data.items);
      }
    } catch (e) {
      console.error('Error fetching calendar:', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchFreeBusy = async () => {
    if (!token) return;
    try {
      const timeMin = new Date();
      const timeMax = new Date();
      timeMax.setHours(23, 59, 59, 999);
      
      const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: [{ id: 'primary' }]
        })
      });
      const data = await res.json();
      if (data.calendars?.primary?.busy) {
        const busy = data.calendars.primary.busy;
        let currentFreeStart = timeMin;
        const blocks: {start: Date, end: Date}[] = [];
        
        for (const busyBlock of busy) {
          const busyStart = new Date(busyBlock.start);
          const busyEnd = new Date(busyBlock.end);
          
          if (busyStart > currentFreeStart) {
            blocks.push({ start: currentFreeStart, end: busyStart });
          }
          if (busyEnd > currentFreeStart) {
             currentFreeStart = busyEnd;
          }
        }
        if (currentFreeStart < timeMax) {
          blocks.push({ start: currentFreeStart, end: timeMax });
        }
        
        setFreeBlocks(blocks.filter(b => (b.end.getTime() - b.start.getTime()) >= 30 * 60000));
      }
    } catch (e) {
      console.error('Error fetching free/busy:', e);
    }
  };

  const fetchTasks = async () => {
    if (!token) return;
    setIsLoadingData(true);
    try {
      // First get task lists
      const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const listsData = await listsRes.json();
      
      if (listsData.items && listsData.items.length > 0) {
        const firstListId = listsData.items[0].id;
        const tasksRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${firstListId}/tasks?showCompleted=false`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const tasksData = await tasksRes.json();
        if (tasksData.items) {
          setTasks(tasksData.items);
        } else {
          setTasks([]);
        }
      }
    } catch (e) {
      console.error('Error fetching tasks:', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  if (needsAuth) {
    return (
      <div className="p-8 rounded-2xl bg-[#0A0A0B] border border-white/10 shadow-xl flex flex-col items-center justify-center gap-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-slate-100 tracking-tight mb-2">Connect Google Workspace</h3>
          <p className="text-sm text-slate-400">Sign in to sync your Calendar events and Tasks with your system.</p>
        </div>
        
        <button 
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="flex items-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-medium rounded-xl px-6 py-3 transition-colors shadow-sm disabled:opacity-50"
        >
          {isLoggingIn ? (
             <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
          )}
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#0A0A0B] border border-white/10 shadow-xl overflow-hidden flex flex-col">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-white/10" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 text-indigo-400 font-medium">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-sm">
            <p className="text-slate-200 font-medium">{user?.displayName || 'Connected Account'}</p>
            <p className="text-slate-500 text-xs">{user?.email}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'calendar' ? 'bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'}`}
        >
          <CalendarIcon className="w-4 h-4" /> Upcoming Events
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'tasks' ? 'bg-indigo-500/10 text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'}`}
        >
          <CheckSquare className="w-4 h-4" /> Open Tasks
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto min-h-[300px] max-h-[400px]">
        {isLoadingData ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            <p className="text-sm text-slate-500">Syncing workspace...</p>
          </div>
        ) : activeTab === 'calendar' ? (
          events.length > 0 ? (
            <div className="space-y-3 animate-in fade-in duration-300">
              {events.map((event) => {
                const startTime = new Date(event.start.dateTime || event.start.date);
                const isAllDay = !event.start.dateTime;
                
                return (
                  <div key={event.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex gap-4 hover:bg-white/10 transition-colors">
                    <div className="flex flex-col items-center justify-center min-w-[50px] shrink-0 text-center border-r border-white/10 pr-4">
                      <span className="text-xs text-slate-400 font-medium uppercase">{startTime.toLocaleString('default', { month: 'short' })}</span>
                      <span className="text-lg text-slate-200 font-semibold">{startTime.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="text-sm font-medium text-slate-200 truncate">{event.summary || 'Busy'}</h4>
                      {!isAllDay && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {freeBlocks.length > 0 && (
                <div className="mt-6 pt-4 border-t border-white/10">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Optimal Habit Blocks (Today)</h4>
                  <div className="space-y-2">
                    {freeBlocks.map((block, idx) => {
                      const duration = Math.round((block.end.getTime() - block.start.getTime()) / 60000);
                      return (
                        <div key={idx} className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex gap-3 items-center">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-4 h-4 text-indigo-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-indigo-100">
                              {block.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {block.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-xs text-indigo-300/80 mt-0.5">
                              {duration >= 60 ? `${Math.floor(duration/60)}h ${duration%60}m` : `${duration}m`} available
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
              <CalendarIcon className="w-8 h-8 opacity-50 mb-1" />
              <p className="text-sm">No upcoming events found.</p>
              
              {freeBlocks.length > 0 && (
                <div className="mt-6 w-full text-left">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Optimal Habit Blocks (Today)</h4>
                  <div className="space-y-2">
                    {freeBlocks.map((block, idx) => {
                      const duration = Math.round((block.end.getTime() - block.start.getTime()) / 60000);
                      return (
                        <div key={idx} className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex gap-3 items-center">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-4 h-4 text-indigo-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-indigo-100">
                              {block.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {block.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-xs text-indigo-300/80 mt-0.5">
                              {duration >= 60 ? `${Math.floor(duration/60)}h ${duration%60}m` : `${duration}m`} available
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          tasks.length > 0 ? (
            <div className="space-y-2 animate-in fade-in duration-300">
              {tasks.map((task) => (
                <div key={task.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex gap-3 items-start hover:bg-white/10 transition-colors">
                  <div className="mt-0.5 w-4 h-4 rounded border border-slate-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-slate-200">{task.title}</h4>
                    {task.notes && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{task.notes}</p>
                    )}
                    {task.due && (
                      <p className="text-xs text-indigo-400/80 mt-1.5 flex items-center gap-1 font-medium">
                        <CalendarIcon className="w-3 h-3" /> Due {new Date(task.due).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
              <CheckSquare className="w-8 h-8 opacity-50 mb-1" />
              <p className="text-sm">No open tasks found.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
