import React, { useState, useEffect } from 'react';
import { Bell, Clock, Activity, Zap, Play, RotateCcw } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip, ReferenceLine, YAxis } from 'recharts';

// Mock data representing a user's historical activity probability throughout the day (0-23 hours)
const MOCK_ACTIVITY_DATA = Array.from({ length: 24 }, (_, i) => {
  let probability = 0.1; // base baseline
  if (i >= 7 && i <= 9) probability = 0.6 + Math.random() * 0.3; // Morning spike
  if (i >= 12 && i <= 13) probability = 0.4 + Math.random() * 0.2; // Lunch spike
  if (i >= 18 && i <= 21) probability = 0.7 + Math.random() * 0.2; // Evening spike
  if (i >= 0 && i <= 5) probability = 0.05; // Sleep
  return {
    hour: i,
    label: `${i}:00`,
    probability: Math.round(probability * 100)
  };
});

export default function AdaptiveTimingSimulation() {
  const [currentHour, setCurrentHour] = useState(8);
  const [scheduledHour, setScheduledHour] = useState<number | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const calculateOptimalTime = (startHour: number) => {
    // Find the highest probability time slot in the upcoming 12 hours
    let maxProb = -1;
    let bestHour = startHour;
    
    for (let i = 1; i <= 12; i++) {
      const checkHour = (startHour + i) % 24;
      if (MOCK_ACTIVITY_DATA[checkHour].probability > maxProb) {
        maxProb = MOCK_ACTIVITY_DATA[checkHour].probability;
        bestHour = checkHour;
      }
    }
    return bestHour;
  };

  const handleSimulate = () => {
    setIsSimulating(true);
    setLogs(["Trigger event received. Determining optimal notification window..."]);
    setScheduledHour(null);
    
    setTimeout(() => {
      const optimal = calculateOptimalTime(currentHour);
      setLogs(prev => [...prev, `Analyzing historical activity patterns...`]);
      
      setTimeout(() => {
        setLogs(prev => [...prev, `Found peak activity probability (${MOCK_ACTIVITY_DATA[optimal].probability}%) at ${optimal}:00.`]);
        
        setTimeout(() => {
          setScheduledHour(optimal);
          setLogs(prev => [...prev, `Notification scheduled for ${optimal}:00.`]);
          setIsSimulating(false);
        }, 800);
      }, 800);
    }, 800);
  };

  const handleReset = () => {
    setScheduledHour(null);
    setLogs([]);
    setIsSimulating(false);
  };

  return (
    <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-6">
      <div className="flex items-center gap-2 text-indigo-400 mb-2">
        <Zap className="w-5 h-5" />
        <h3 className="font-medium text-lg text-indigo-200">Adaptive Timing Logic Simulation</h3>
      </div>
      <p className="text-slate-400 text-sm leading-relaxed">
        <strong className="text-slate-300">Scenario:</strong> We need to send a streak reminder or cascade notification. Instead of sending it immediately or at a generic time, we calculate the user's historical active hours and delay the notification to their highest-probability engagement window to prevent fatigue.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 bg-[#131316] rounded-xl border border-white/5 p-5">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> 
              Historical Engagement Probability
            </h4>
            <div className="text-xs text-slate-500 flex items-center gap-4">
               <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-500"></div> Current Time</span>
               <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Scheduled Notification</span>
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_ACTIVITY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="#334155" fontSize={10} tickMargin={10} minTickGap={15} />
                <YAxis stroke="#334155" fontSize={10} tickFormatter={(val) => `${val}%`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }}
                  itemStyle={{ color: '#34d399' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="probability" stroke="#10b981" fillOpacity={1} fill="url(#colorProb)" />
                <ReferenceLine x={`${currentHour}:00`} stroke="#64748b" strokeDasharray="3 3" />
                {scheduledHour !== null && (
                  <ReferenceLine x={`${scheduledHour}:00`} stroke="#6366f1" strokeWidth={2} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-6 flex flex-col gap-2">
            <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Simulate Current Time</label>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="0" 
                max="23" 
                value={currentHour} 
                onChange={(e) => { setCurrentHour(parseInt(e.target.value)); handleReset(); }}
                className="flex-1 accent-indigo-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <span className="font-mono text-slate-300 min-w-[50px]">{currentHour}:00</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-[#131316] rounded-xl border border-white/5 p-5 flex-1 flex flex-col">
            <h4 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              Event Scheduler
            </h4>
            
            <div className="flex gap-2 mb-6">
              <button 
                onClick={handleSimulate}
                disabled={isSimulating}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg py-2 transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" /> Simulate
              </button>
              <button 
                onClick={handleReset}
                disabled={isSimulating}
                className="px-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-slate-300 rounded-lg transition-colors flex items-center justify-center"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 bg-black/40 rounded-lg border border-white/5 p-4 font-mono text-xs text-slate-400 overflow-y-auto space-y-2">
              {logs.length === 0 && (
                <div className="text-slate-600 italic">Awaiting trigger event...</div>
              )}
              {logs.map((log, i) => (
                <div key={i} className="animate-in fade-in slide-in-from-left-2 flex gap-2">
                  <span className="text-indigo-400/50">&gt;</span>
                  <span className={i === logs.length - 1 && scheduledHour !== null ? 'text-emerald-400' : ''}>{log}</span>
                </div>
              ))}
              {isSimulating && (
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400/50">&gt;</span>
                  <span className="animate-pulse">_</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
