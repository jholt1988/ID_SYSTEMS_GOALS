import { useState } from 'react';
import { Moon, Sparkles, AlertCircle, Heart, CheckCircle2, ArrowRight } from 'lucide-react';

export default function EndOfDaySurvey({ systems }: { systems: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [feelings, setFeelings] = useState('');
  const [triumphs, setTriumphs] = useState('');
  const [struggles, setStruggles] = useState('');
  const [completed, setCompleted] = useState(false);

  const completedCount = systems.filter(s => s.todayCompleted).length;
  const totalCount = systems.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCompleted(true);
    setTimeout(() => {
      setIsOpen(false);
      setCompleted(false);
      setStep(0);
    }, 3000);
  };

  if (!isOpen) {
    return (
      <div className="w-full">
        <button 
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Moon className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-indigo-200">End of Day Review</h3>
              <p className="text-sm text-indigo-300/70">Reflect on your progress, triumphs, and struggles today.</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#131316] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
        {!completed ? (
          <>
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
                <Moon className="w-5 h-5 text-indigo-400" />
                Evening Reflection
              </h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {step === 0 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-semibold text-white mb-2">Today's Summary</h3>
                    <p className="text-slate-400">Here's a look at what you accomplished.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                      <div className="text-3xl font-mono font-semibold text-emerald-400 mb-1">{completedCount}/{totalCount}</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Systems Completed</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                      <div className="text-3xl font-mono font-semibold text-indigo-400 mb-1">{progress}%</div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Daily Progress</div>
                    </div>
                  </div>

                  <div className="space-y-3 mt-6">
                    <h4 className="text-sm font-medium text-slate-300">Status Breakdown</h4>
                    {systems.map((sys, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                        <span className="text-slate-200">{sys.name}</span>
                        {sys.todayCompleted ? (
                          <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Done
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 px-2 py-1">Pending</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => setStep(1)}
                    className="w-full mt-6 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl py-3 transition-colors flex items-center justify-center gap-2"
                  >
                    Start Reflection <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {step === 1 && (
                <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-right-4 duration-300 flex flex-col h-full">
                  <div className="space-y-4 flex-1">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-200 mb-2">
                        <Heart className="w-4 h-4 text-rose-400" />
                        How are you feeling at the end of today?
                      </label>
                      <textarea 
                        value={feelings}
                        onChange={(e) => setFeelings(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                        placeholder="Exhausted but accomplished, a bit stressed about tomorrow..."
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-200 mb-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        What were your triumphs? (Big or small)
                      </label>
                      <textarea 
                        value={triumphs}
                        onChange={(e) => setTriumphs(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors h-24 resize-none"
                        placeholder="Nailed the workout, ate healthy all day..."
                        required
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-200 mb-2">
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        What were your struggles today?
                      </label>
                      <textarea 
                        value={struggles}
                        onChange={(e) => setStruggles(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500/50 transition-colors h-24 resize-none"
                        placeholder="Got distracted by social media during deep work block..."
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setStep(0)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-medium rounded-xl py-3 transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      type="submit"
                      className="flex-[2] bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl py-3 transition-colors flex items-center justify-center gap-2"
                    >
                      Complete Reflection
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="p-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-2">Day Logged!</h3>
            <p className="text-slate-400">Your reflections have been safely stored. Rest up for tomorrow.</p>
          </div>
        )}
      </div>
    </div>
  );
}
