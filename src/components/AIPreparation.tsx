import React, { useState } from 'react';
import { Sparkles, CheckCircle2, ChevronRight, Brain, Clock, Calendar, AlertCircle, Link as LinkIcon, Wrench } from 'lucide-react';

export default function AIPreparation() {
  const [activeView, setActiveView] = useState<'task' | 'day' | 'week'>('task');
  const [completedItems, setCompletedItems] = useState<number[]>([]);

  const toggleItem = (id: number) => {
    if (completedItems.includes(id)) {
      setCompletedItems(completedItems.filter(i => i !== id));
    } else {
      setCompletedItems([...completedItems, id]);
    }
  };

  const suggestions = {
    task: [
      { id: 1, title: 'Clear your physical workspace', desc: 'A clean desk reduces cognitive load. Take 2 minutes to put away unnecessary items.', type: 'action' },
      { id: 2, title: 'Close unrelated tabs', desc: 'You have 14 tabs open. Consider bookmarking them or using a tab suspender for the next 90 minutes.', type: 'focus' },
      { id: 3, title: 'Hydration check', desc: 'Fill up a water bottle before starting this deep work session.', type: 'health' }
    ],
    day: [
      { id: 4, title: 'Review tomorrow\'s first task', desc: 'Identify your most important task for tomorrow morning so you know exactly where to start.', type: 'planning' },
      { id: 5, title: 'Pack your bag / Lay out clothes', desc: 'Reduce decision fatigue for tomorrow morning by preparing your physical items now.', type: 'action' },
      { id: 6, title: 'Wind down routine', desc: 'Set an alarm for 9:30 PM to turn off screens and begin your wind down routine.', type: 'health' }
    ],
    week: [
      { id: 7, title: 'Meal prep planning', desc: 'Plan 3 core meals for the upcoming week to save time and maintain health goals.', type: 'planning' },
      { id: 8, title: 'Schedule buffer blocks', desc: 'You have a packed Tuesday. Add a 30-minute buffer block to prevent cascading delays.', type: 'focus' },
      { id: 9, title: 'Review weekly goals', desc: 'Are your tasks for this week aligned with your monthly milestone? Consider dropping the "newsletter redesign" task to focus on core features.', type: 'insight' }
    ]
  };

  const resources = {
    task: [
      { id: 1, name: 'Pomodoro Timer', desc: 'Tool to maintain focus blocks', icon: Clock, link: '#' },
      { id: 2, name: 'Focus Music', desc: 'Ambient beats for deep work', icon: LinkIcon, link: '#' },
    ],
    day: [
      { id: 3, name: 'Daily Planner Template', desc: 'Notion template for daily prioritization', icon: LinkIcon, link: '#' },
      { id: 4, name: 'Timeboxing Guide', desc: 'Article on effective calendar management', icon: LinkIcon, link: '#' },
    ],
    week: [
      { id: 5, name: 'Weekly Review Checklist', desc: 'Interactive checklist for weekly resets', icon: CheckCircle2, link: '#' },
      { id: 6, name: 'Meal Prep Ideas', desc: 'Quick healthy recipes for busy weeks', icon: LinkIcon, link: '#' },
    ]
  };

  const currentSuggestions = suggestions[activeView];
  const currentResources = resources[activeView];
  const completedCount = currentSuggestions.filter(s => completedItems.includes(s.id)).length;
  const readinessScore = Math.round((completedCount / currentSuggestions.length) * 100) || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <Brain className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-100 tracking-tight">AI Preparation</h2>
            <p className="text-slate-400 text-sm">Smart suggestions to ensure you are ready for what's next.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
        <button
          onClick={() => setActiveView('task')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'task' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Clock className="w-4 h-4" /> Next Task
        </button>
        <button
          onClick={() => setActiveView('day')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'day' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <AlertCircle className="w-4 h-4" /> Tomorrow
        </button>
        <button
          onClick={() => setActiveView('week')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView === 'week' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Calendar className="w-4 h-4" /> Next Week
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {currentSuggestions.map((suggestion) => {
            const isCompleted = completedItems.includes(suggestion.id);
            return (
              <div key={suggestion.id} className={`bg-[#131316] rounded-2xl p-6 border shadow-xl flex gap-4 group transition-all duration-300 ${isCompleted ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 hover:border-indigo-500/30'}`}>
                <div className="mt-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isCompleted ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' :
                    suggestion.type === 'action' ? 'bg-blue-500/10 text-blue-400' :
                    suggestion.type === 'focus' ? 'bg-amber-500/10 text-amber-400' :
                    suggestion.type === 'health' ? 'bg-emerald-500/10 text-emerald-400' :
                    suggestion.type === 'planning' ? 'bg-purple-500/10 text-purple-400' :
                    'bg-indigo-500/10 text-indigo-400'
                  }`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className={`text-base font-medium mb-1 transition-colors ${isCompleted ? 'text-emerald-300' : 'text-slate-200'}`}>
                    {suggestion.title}
                  </h3>
                  <p className={`text-sm leading-relaxed transition-colors ${isCompleted ? 'text-emerald-500/70' : 'text-slate-400'}`}>
                    {suggestion.desc}
                  </p>
                </div>
                <button 
                  onClick={() => toggleItem(suggestion.id)}
                  className={`self-center w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border ${
                    isCompleted ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border-transparent hover:border-emerald-500/30'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden shadow-xl">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
             <h3 className="text-indigo-300 font-medium mb-2 relative z-10 flex items-center gap-2">
               <Brain className="w-4 h-4" /> AI Insight
             </h3>
             <p className="text-sm text-indigo-200/80 relative z-10 leading-relaxed">
               {activeView === 'task' && "You've been working for 45 minutes straight. Completing these prep steps will reset your context and improve focus for the upcoming task."}
               {activeView === 'day' && "Your energy levels typically dip around 2 PM. By preparing tonight, you preserve your peak morning energy for high-leverage work."}
               {activeView === 'week' && "Looking at your calendar, Thursday is extremely heavy on context-switching. These weekly prep steps will help mitigate cognitive fatigue."}
             </p>
          </div>
          
          <div className="bg-[#131316] border border-white/5 rounded-2xl p-6 shadow-xl">
             <h3 className="text-slate-300 font-medium mb-4 text-sm">Readiness Score</h3>
             <div className="flex items-end gap-2 mb-2">
               <span className="text-3xl font-light text-white">{readinessScore}</span>
               <span className="text-slate-500 text-sm mb-1">/ 100</span>
             </div>
             <div className="w-full bg-white/5 rounded-full h-2 mb-4 overflow-hidden">
               <div 
                 className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-1000 ease-out" 
                 style={{ width: `${readinessScore}%` }}
               />
             </div>
             <p className="text-xs text-slate-500">
               {readinessScore === 100 ? "You're fully prepared!" : `Complete the suggestions to improve your readiness for the ${activeView}.`}
             </p>
          </div>

          <div className="bg-[#131316] border border-white/5 rounded-2xl p-6 shadow-xl">
            <h3 className="text-slate-300 font-medium mb-4 text-sm flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-400" /> Resources & Tools
            </h3>
            <div className="space-y-3">
              {currentResources.map(resource => (
                <a key={resource.id} href={resource.link} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/10 group">
                  <div className="mt-0.5 bg-indigo-500/10 text-indigo-400 p-1.5 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                    <resource.icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-200 group-hover:text-indigo-300 transition-colors">{resource.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{resource.desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
