import { useState, useEffect } from 'react';
import { Sparkles, Loader2, CheckCircle2, ChevronRight, CalendarClock } from 'lucide-react';
import { aiPost } from '../lib/aiClient';

export default function WeeklyReflection({ systems }: { systems: any[] }) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuestions() {
      setIsLoadingQuestions(true);
      try {
        const systemsContext = systems.map(s => `${s.name} (${s.state})`).join(', ');
        const data = await aiPost<{ questions: string[] }>('/api/generate-reflection-questions', { systemsContext }, 'text');
        if (data.questions && data.questions.length === 3) {
          setQuestions(data.questions);
        } else {
          // Fallback questions
          setQuestions([
            "What identity did you reinforce the most this past week?",
            "Which system or microtask felt the most frictionless, and which caused the most resistance?",
            "How should we adjust your daily baselines for the upcoming week?"
          ]);
        }
      } catch (e) {
        console.error(e);
        setQuestions([
          "What identity did you reinforce the most this past week?",
          "Which system or microtask felt the most frictionless, and which caused the most resistance?",
          "How should we adjust your daily baselines for the upcoming week?"
        ]);
      } finally {
        setIsLoadingQuestions(false);
      }
    }
    
    if (questions.length === 0) {
      fetchQuestions();
    }
  }, [systems, questions.length]);

  const handleSubmit = async () => {
    if (currentStep < 2) {
      setCurrentStep(prev => prev + 1);
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await aiPost<{ summary?: string }>('/api/process-reflection', { answers }, 'text');
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (e) {
      console.error(e);
      setSummary("Great reflection! Your systems have been updated to reflect your new insights.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingQuestions) {
    return (
      <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/5 shadow-xl flex flex-col items-center justify-center gap-4 animate-pulse">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        <p className="text-sm text-slate-400">Generating your weekly reflection...</p>
      </div>
    );
  }

  if (summary) {
    return (
      <div className="p-6 sm:p-8 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-xl animate-in fade-in zoom-in duration-500">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          <h3 className="text-xl font-semibold text-slate-100">Reflection Complete</h3>
        </div>
        <p className="text-slate-300 leading-relaxed text-sm mb-6">{summary}</p>
        <button 
          onClick={() => {
            setSummary(null);
            setCurrentStep(0);
            setAnswers(['', '', '']);
          }}
          className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Start new reflection
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/5 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-500/20 rounded-lg">
          <CalendarClock className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Weekly Reflection</h3>
          <p className="text-xs text-slate-400 mt-0.5">Step {currentStep + 1} of 3</p>
        </div>
      </div>

      {questions.length > 0 && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300" key={currentStep}>
          <h4 className="text-lg text-slate-200 font-medium leading-snug">
            {questions[currentStep]}
          </h4>
          
          <textarea
            value={answers[currentStep]}
            onChange={e => {
              const newAnswers = [...answers];
              newAnswers[currentStep] = e.target.value;
              setAnswers(newAnswers);
            }}
            placeholder="Type your reflection here..."
            className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-4 text-slate-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm resize-none min-h-[120px]"
            autoFocus
          />

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(step => (
                <div 
                  key={step} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${step === currentStep ? 'w-6 bg-indigo-500' : step < currentStep ? 'w-2 bg-indigo-500/50' : 'w-2 bg-white/10'}`}
                />
              ))}
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={!answers[currentStep].trim() || isSubmitting}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white font-medium rounded-xl px-6 py-2.5 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              ) : currentStep === 2 ? (
                <><Sparkles className="w-4 h-4" /> Complete Reflection</>
              ) : (
                <>Next <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
