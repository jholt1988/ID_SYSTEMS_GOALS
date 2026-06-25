import React, { useState } from 'react';
import { User, Target, Brain, Activity, Clock, ChevronRight, CheckCircle2, ArrowRight } from 'lucide-react';

type ShiftStatus = 'not_started' | 'active' | 'completed';

export default function IdentityShiftTracker() {
  const [status, setStatus] = useState<ShiftStatus>('not_started');
  const [step, setStep] = useState(0);

  // Questionnaire State
  const [identityName, setIdentityName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [currentFeeling, setCurrentFeeling] = useState('');
  const [currentStress, setCurrentStress] = useState('');
  const [currentJoy, setCurrentJoy] = useState('');
  const [personaStress, setPersonaStress] = useState('');
  const [personaJoy, setPersonaJoy] = useState('');

  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  type CheckIn = {
    date: string;
    stress: string;
    joy: string;
    feeling: string;
    isFinal?: boolean;
  };

  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isFinalCheckIn, setIsFinalCheckIn] = useState(false);

  const [checkInFeeling, setCheckInFeeling] = useState('');
  const [checkInStress, setCheckInStress] = useState('');
  const [checkInJoy, setCheckInJoy] = useState('');

  const startShift = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('active');
    setStep(0);
  };

  const submitCheckIn = () => {
    const newCheckIn: CheckIn = {
      date: new Date().toLocaleDateString(),
      feeling: checkInFeeling,
      stress: checkInStress,
      joy: checkInJoy,
      isFinal: isFinalCheckIn
    };
    setCheckIns([...checkIns, newCheckIn]);
    
    if (isFinalCheckIn) {
      setStatus('completed');
      setActiveTab('history');
    }
    
    setIsCheckingIn(false);
    setIsFinalCheckIn(false);
    setCheckInFeeling('');
    setCheckInStress('');
    setCheckInJoy('');
  };

  if (status === 'not_started') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <User className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-100 tracking-tight">Identity Shift</h2>
            <p className="text-slate-400 text-sm">Bridge the gap between who you are and who you want to be.</p>
          </div>
        </div>

        <div className="bg-[#131316] border border-white/5 rounded-2xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          
          {step === 0 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-medium text-slate-200 mb-2">Define Your Target Identity</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Who are you striving to become?</label>
                <input 
                  type="text" 
                  value={identityName}
                  onChange={(e) => setIdentityName(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="e.g., A disciplined athlete, A focused writer..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Target Deadline for this Shift</label>
                <input 
                  type="date" 
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <button 
                onClick={() => setStep(1)}
                disabled={!identityName || !deadline}
                className="w-full mt-4 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl py-3 transition-colors flex items-center justify-center gap-2"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-medium text-slate-200 mb-2">Current State Baseline</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">How are you currently thinking and feeling overall?</label>
                <textarea 
                  value={currentFeeling}
                  onChange={(e) => setCurrentFeeling(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                  placeholder="Honestly..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">How do you currently handle highly stressful situations?</label>
                <textarea 
                  value={currentStress}
                  onChange={(e) => setCurrentStress(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                  placeholder="I usually get overwhelmed and..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">How do you handle enjoyment and success?</label>
                <textarea 
                  value={currentJoy}
                  onChange={(e) => setCurrentJoy(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                  placeholder="I celebrate briefly but then..."
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setStep(0)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-medium rounded-xl py-3 transition-colors"
                >
                  Back
                </button>
                <button 
                  onClick={() => setStep(2)}
                  disabled={!currentFeeling || !currentStress || !currentJoy}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-medium rounded-xl py-3 transition-colors flex items-center justify-center gap-2"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-medium text-indigo-300 mb-2">The Persona Perspective</h3>
              <p className="text-sm text-slate-400 mb-6">How would "{identityName}" handle those exact same situations?</p>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">How would they handle highly stressful situations?</label>
                <textarea 
                  value={personaStress}
                  onChange={(e) => setPersonaStress(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                  placeholder="They would probably step back and..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">How would they handle enjoyment and success?</label>
                <textarea 
                  value={personaJoy}
                  onChange={(e) => setPersonaJoy(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                  placeholder="They would channel the momentum into..."
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-medium rounded-xl py-3 transition-colors"
                >
                  Back
                </button>
                <button 
                  onClick={startShift}
                  disabled={!personaStress || !personaJoy}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium rounded-xl py-3 transition-colors flex items-center justify-center gap-2"
                >
                  Commit to Shift <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <User className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-100 tracking-tight">Active Shift: {identityName}</h2>
            <p className="text-slate-400 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" /> Deadline: {deadline}
            </p>
          </div>
        </div>
        
        <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
          <button 
            onClick={() => setActiveTab('current')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'current' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Journey & Comparison
          </button>
        </div>
      </div>

      {activeTab === 'current' && !isCheckingIn && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-[#131316] rounded-2xl p-6 border border-white/5 shadow-xl relative overflow-hidden">
             <div className="flex items-center gap-2 mb-6">
                <Brain className="w-5 h-5 text-slate-400" />
                <h3 className="text-lg font-medium text-slate-200">Current Self (Baseline)</h3>
             </div>
             
             <div className="space-y-4 relative z-10">
                <div>
                   <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">State of Mind</h4>
                   <p className="text-sm text-slate-300 bg-white/5 rounded-lg p-3 border border-white/5">{currentFeeling}</p>
                </div>
                <div>
                   <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Under Stress</h4>
                   <p className="text-sm text-slate-300 bg-white/5 rounded-lg p-3 border border-white/5">{currentStress}</p>
                </div>
                <div>
                   <h4 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Handling Success</h4>
                   <p className="text-sm text-slate-300 bg-white/5 rounded-lg p-3 border border-white/5">{currentJoy}</p>
                </div>
             </div>
          </div>

          <div className="bg-indigo-500/5 rounded-2xl p-6 border border-indigo-500/20 shadow-xl relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
             <div className="flex items-center gap-2 mb-6 relative z-10">
                <Target className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-medium text-indigo-200">Target Persona: {identityName}</h3>
             </div>
             
             <div className="space-y-4 relative z-10">
                <div>
                   <h4 className="text-xs uppercase tracking-wider text-indigo-400/50 font-semibold mb-1">Under Stress</h4>
                   <p className="text-sm text-indigo-100 bg-indigo-500/10 rounded-lg p-3 border border-indigo-500/20">{personaStress}</p>
                </div>
                <div>
                   <h4 className="text-xs uppercase tracking-wider text-indigo-400/50 font-semibold mb-1">Handling Success</h4>
                   <p className="text-sm text-indigo-100 bg-indigo-500/10 rounded-lg p-3 border border-indigo-500/20">{personaJoy}</p>
                </div>
             </div>
          </div>

          {status !== 'completed' && (
            <div className="md:col-span-2 bg-[#131316] rounded-2xl p-6 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
               <div>
                  <h4 className="font-medium text-slate-200">Periodic Check-In</h4>
                  <p className="text-sm text-slate-400">Time to evaluate your progress. How close are your actions aligning with the persona?</p>
               </div>
               <div className="flex items-center gap-3">
                 <button 
                   onClick={() => { setIsFinalCheckIn(false); setIsCheckingIn(true); }}
                   className="whitespace-nowrap bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl px-6 py-2.5 transition-colors"
                 >
                    Log Check-In
                 </button>
                 <button 
                   onClick={() => { setIsFinalCheckIn(true); setIsCheckingIn(true); }}
                   className="whitespace-nowrap bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl px-6 py-2.5 transition-colors"
                 >
                    Complete Shift
                 </button>
               </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'current' && isCheckingIn && (
        <div className="bg-[#131316] rounded-2xl p-8 border border-white/5 shadow-xl animate-in slide-in-from-right-4 duration-300">
           <div className="mb-6">
             <h3 className="text-xl font-medium text-slate-200">{isFinalCheckIn ? 'Final Integration Review' : 'Periodic Check-In'}</h3>
             <p className="text-sm text-slate-400">Reflect on your current state compared to your target persona.</p>
           </div>
           
           <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">How are you currently thinking and feeling overall?</label>
                <textarea 
                  value={checkInFeeling}
                  onChange={(e) => setCheckInFeeling(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                  placeholder="Honestly..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">How are you currently handling highly stressful situations?</label>
                <textarea 
                  value={checkInStress}
                  onChange={(e) => setCheckInStress(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                  placeholder="Lately I've been..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">How are you handling enjoyment and success?</label>
                <textarea 
                  value={checkInJoy}
                  onChange={(e) => setCheckInJoy(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors h-24 resize-none"
                  placeholder="When things go well, I..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsCheckingIn(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-medium rounded-xl py-3 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitCheckIn}
                  disabled={!checkInFeeling || !checkInStress || !checkInJoy}
                  className={`flex-1 disabled:opacity-50 text-white font-medium rounded-xl py-3 transition-colors flex items-center justify-center gap-2 ${isFinalCheckIn ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}
                >
                  {isFinalCheckIn ? 'Finalize & Compare' : 'Save Check-In'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-[#131316] rounded-2xl p-8 border border-white/5 animate-in slide-in-from-bottom-4 duration-300">
           <div className="flex items-center gap-3 mb-8">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h3 className="text-xl font-medium text-slate-200">Shift Progression Timeline</h3>
           </div>

           <div className="relative pl-6 space-y-8 border-l border-white/10 ml-3">
              <div className="relative">
                 <div className="absolute w-3 h-3 bg-slate-400 rounded-full -left-[30px] top-1.5 ring-4 ring-[#131316]" />
                 <div className="text-xs font-mono text-slate-500 mb-1">Initial Baseline</div>
                 <h4 className="text-base font-medium text-slate-200 mb-2">Shift Initiated</h4>
                 <p className="text-sm text-slate-400">Committed to bridging the gap to "{identityName}".</p>
                 <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                    <div><span className="text-slate-500 text-xs uppercase font-semibold">Feeling:</span> <span className="text-sm text-slate-300 ml-2">{currentFeeling}</span></div>
                    <div><span className="text-slate-500 text-xs uppercase font-semibold">Stress:</span> <span className="text-sm text-slate-300 ml-2">{currentStress}</span></div>
                 </div>
              </div>

              {checkIns.length === 0 && (
                <div className="relative opacity-50">
                   <div className="absolute w-3 h-3 bg-white/10 rounded-full -left-[30px] top-1.5 ring-4 ring-[#131316]" />
                   <div className="text-xs font-mono text-slate-500 mb-1">Periodic Check-Ins</div>
                   <h4 className="text-base font-medium text-slate-400 mb-2">Awaiting Data</h4>
                   <p className="text-sm text-slate-500">Your periodic questionnaire responses will appear here to map the trajectory of your identity shift.</p>
                </div>
              )}

              {checkIns.map((ci, idx) => (
                <div key={idx} className="relative">
                   <div className={`absolute w-3 h-3 rounded-full -left-[30px] top-1.5 ring-4 ring-[#131316] ${ci.isFinal ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
                   <div className={`text-xs font-mono mb-1 ${ci.isFinal ? 'text-emerald-400' : 'text-indigo-400'}`}>{ci.date}</div>
                   <h4 className={`text-base font-medium mb-2 ${ci.isFinal ? 'text-emerald-300' : 'text-slate-200'}`}>{ci.isFinal ? 'Final Comparison' : `Check-In #${idx + 1}`}</h4>
                   <div className={`mt-3 p-4 rounded-xl border space-y-3 ${ci.isFinal ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/5 border-white/5'}`}>
                      <div><span className="text-slate-500 text-xs uppercase font-semibold">Feeling:</span> <span className="text-sm text-slate-300 ml-2">{ci.feeling}</span></div>
                      <div><span className="text-slate-500 text-xs uppercase font-semibold">Stress:</span> <span className="text-sm text-slate-300 ml-2">{ci.stress}</span></div>
                      <div><span className="text-slate-500 text-xs uppercase font-semibold">Joy:</span> <span className="text-sm text-slate-300 ml-2">{ci.joy}</span></div>
                   </div>
                </div>
              ))}

              {status !== 'completed' && (
                <div className="relative opacity-50">
                   <div className="absolute w-3 h-3 bg-emerald-500/20 rounded-full -left-[30px] top-1.5 ring-4 ring-[#131316]" />
                   <div className="text-xs font-mono text-emerald-500/50 mb-1">Deadline: {deadline}</div>
                   <h4 className="text-base font-medium text-emerald-500/50 mb-2">Final Comparison</h4>
                   <p className="text-sm text-slate-500">The final questionnaire will compare your ending state directly against your initial baseline and target persona expectations.</p>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
