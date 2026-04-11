import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { Question } from '../types';
import { toast } from 'sonner';
import { Timer, Send, ChevronRight, AlertTriangle, ShieldAlert, Zap } from 'lucide-react';

const EXAM_DURATION = 20 * 60; // 20 minutes in seconds

const MockExamPage: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const saved = localStorage.getItem('exam_time_left');
    return saved ? parseInt(saved) : EXAM_DURATION;
  });
  const [loading, setLoading] = useState(true);
  const [staggering, setStaggering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  
  const tokenId = sessionStorage.getItem('exam_token_id');
  const token = sessionStorage.getItem('exam_token');
  const category = sessionStorage.getItem('exam_category');
  const participantName = sessionStorage.getItem('participant_name');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);

  // Anti-cheat: Prevent back navigation
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      toast.error('Navigation is disabled during the exam');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Anti-cheat: Detect refresh/close -> Auto-submit
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmittingRef.current) {
        // Auto-submit on refresh is requested
        submitExam(timeLeft);
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [timeLeft]);

  const submitExam = useCallback(async (finalTimeLeft?: number) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSubmitting(true);

    const timeTaken = EXAM_DURATION - (finalTimeLeft ?? timeLeft);
    
    try {
      const { data: score, error } = await supabase.rpc('submit_mock_exam_securely', {
        p_token_id: tokenId,
        p_answers: answers,
        p_time_taken: timeTaken
      });

      if (error) throw error;

      // Clear session and local storage
      localStorage.removeItem('exam_time_left');
      sessionStorage.setItem('exam_score', score.toString());
      sessionStorage.setItem('exam_total_questions', questions.length.toString());
      
      navigate('/mock-exam/result');
    } catch (err) {
      console.error('Submission failed', err);
      toast.error('Failed to submit exam. Please contact an administrator.');
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  }, [answers, questions.length, tokenId, timeLeft, navigate]);

  // Timer logic
  useEffect(() => {
    if (loading || staggering) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        localStorage.setItem('exam_time_left', next.toString());
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          submitExam(0);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, staggering, submitExam]);

  useEffect(() => {
    if (!tokenId || !token) {
      navigate('/mock-exam/entry');
      return;
    }

    const startExamSequence = async () => {
      setLoading(true);
      try {
        // 1. Fetch all questions once
        const { data, error } = await supabase
          .from('questions')
          .select('id, question, option_a, option_b, option_c, option_d, category')
          .eq('category', category)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setQuestions(data as Question[]);
        setLoading(false);

        // 2. Traffic Control: Random stagger delay (1-5 seconds)
        setStaggering(true);
        const delay = Math.floor(Math.random() * 4000) + 1000;
        setTimeout(() => {
          setStaggering(false);
        }, delay);

      } catch (err) {
        console.error('Failed to start exam', err);
        toast.error('Failed to load exam content');
        setLoading(false);
      }
    };

    startExamSequence();
  }, [tokenId, token, category, navigate]);

  const handleOptionSelect = (option: string) => {
    const questionId = questions[currentIndex].id;
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || staggering) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 space-y-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-brand-primary/10 rounded-full" />
          <div className="absolute top-0 left-0 w-20 h-20 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
            {loading ? 'Preparing Exam...' : 'Staggering Start...'}
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
            Optimizing for high traffic performance
          </p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <ShieldAlert size={48} className="text-slate-300" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No questions available for your category.</p>
        <button onClick={() => navigate('/mock-exam/entry')} className="text-brand-secondary font-black text-[10px] uppercase tracking-[0.2em]">Go Back</button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 p-4 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-brand-primary p-2 rounded-xl">
              <Timer className="text-white" size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time Remaining</p>
              <p className={`text-lg font-black tracking-tighter leading-none ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-slate-900'}`}>
                {formatTime(timeLeft)}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question</p>
            <p className="text-lg font-black text-slate-900 tracking-tighter leading-none">
              {currentIndex + 1} <span className="text-slate-300">/ {questions.length}</span>
            </p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 h-1 bg-slate-100 w-full">
          <motion.div 
            className="h-full bg-brand-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-8 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 md:p-12 space-y-8"
          >
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Zap size={14} className="text-brand-secondary" />
                <span className="bg-brand-secondary/10 text-brand-secondary px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                  {currentQuestion.category}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                {currentQuestion.question}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {['A', 'B', 'C', 'D'].map((key) => {
                const optionText = (currentQuestion as any)[`option_${key.toLowerCase()}`];
                const isSelected = answers[currentQuestion.id] === key;
                
                return (
                  <button
                    key={key}
                    onClick={() => handleOptionSelect(key)}
                    className={`group w-full p-5 rounded-2xl border-2 text-left transition-all flex items-center space-x-4 ${
                      isSelected 
                        ? 'border-brand-secondary bg-brand-secondary/5 shadow-md' 
                        : 'border-slate-50 bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs transition-colors ${
                      isSelected ? 'bg-brand-secondary text-white' : 'bg-white text-slate-400'
                    }`}>
                      {key}
                    </div>
                    <span className={`font-bold text-sm ${isSelected ? 'text-brand-primary' : 'text-slate-600'}`}>
                      {optionText}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer Controls */}
      <footer className="bg-white border-t border-slate-100 p-6 sticky bottom-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 text-orange-500">
            <AlertTriangle size={16} />
            <span className="text-[9px] font-black uppercase tracking-widest">Auto-submit on refresh</span>
          </div>

          <div className="flex space-x-4">
            {currentIndex < questions.length - 1 ? (
              <button
                onClick={nextQuestion}
                disabled={!answers[currentQuestion.id]}
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-slate-800 transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                <span>Next Question</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => submitExam()}
                disabled={submitting || !answers[currentQuestion.id]}
                className="bg-brand-accent text-brand-primary px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-brand-focus transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Submit Exam</span>
                    <Send size={16} />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MockExamPage;
