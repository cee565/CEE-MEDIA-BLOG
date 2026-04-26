import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { Question } from '../types';
import { toast } from 'sonner';
import { Timer, Send, ChevronRight, AlertTriangle, ShieldAlert, Zap } from 'lucide-react';

const MockExamPage: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [examDuration, setExamDuration] = useState<number>(20 * 60);
  const [timeLeft, setTimeLeft] = useState<number>(20 * 60);
  const [loading, setLoading] = useState(true);
  const [staggering, setStaggering] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  
  const tokenId = localStorage.getItem('exam_token_id');
  const token = localStorage.getItem('exam_token');
  const category = localStorage.getItem('exam_category');
  const fullName = localStorage.getItem('full_name');

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

  const submitExam = useCallback(async (finalTimeLeft?: number) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSubmitting(true);

    const currentTimeLeft = finalTimeLeft ?? timeLeft;
    const timeTaken = examDuration - currentTimeLeft;
    
    try {
      // Calculate score client-side if RPC is missing
      let score = 0;
      questions.forEach(q => {
        if (answers[q.id] === q.correct_answer) {
          score++;
        }
      });

      // 1. Update mock_exam_users
      const { error: userError } = await supabase
        .from('mock_exam_users')
        .update({ 
          has_submitted: true, 
          score: score,
          answers: answers
        })
        .eq('id', tokenId);

      if (userError) {
        if (userError.code === 'PGRST116' || userError.message?.includes('not found')) {
          console.warn('Session expired or token deleted');
          localStorage.clear();
          navigate('/mock-exam/register');
          return;
        }
        throw userError;
      }

      // 2. Insert into submissions table
      const { error: subError } = await supabase
        .from('submissions')
        .insert({
          token_id: tokenId,
          score: score,
          answers: answers,
          time_taken: timeTaken,
          submitted_at: new Date().toISOString()
        });

      // Ignore subError if it's just a permission issue on submissions table, 
      // as long as mock_exam_users is updated.
      if (subError) console.warn('Submissions table insert failed', subError);

      // Clear exam session info
      localStorage.removeItem('exam_token_id');
      localStorage.removeItem('exam_token');
      localStorage.removeItem('exam_category');
      localStorage.removeItem('full_name');
      localStorage.removeItem('ceemedia_exam_token'); // Clear registration token too

      sessionStorage.setItem('exam_score', score.toString());
      sessionStorage.setItem('exam_total_questions', questions.length.toString());
      sessionStorage.setItem('full_name', fullName || 'Student');
      
      navigate('/mock-exam/result');
    } catch (err) {
      console.error('Submission failed', err);
      toast.error('Failed to submit exam. Please contact an administrator.');
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  }, [answers, questions, tokenId, timeLeft, navigate, fullName]);

  // Auto-save answers to database
  useEffect(() => {
    if (loading || staggering || Object.keys(answers).length === 0) return;

    const saveAnswers = async () => {
      try {
        await supabase
          .from('mock_exam_users')
          .update({ answers: answers })
          .eq('id', tokenId);
      } catch (err) {
        console.error('Auto-save failed', err);
      }
    };

    const debounce = setTimeout(saveAnswers, 2000);
    return () => clearTimeout(debounce);
  }, [answers, tokenId, loading, staggering]);

  // Timer logic
  useEffect(() => {
    if (loading || staggering) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
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
        // 0. Fetch global config
        const { data: configData } = await supabase
          .from('quiz_config')
          .select('*')
          .eq('id', 'global_config')
          .maybeSingle();
        
        let activeDuration = 20 * 60; // default 20 mins
        if (configData && configData.duration) {
          activeDuration = configData.duration * 60;
        } else {
          const local = localStorage.getItem('quiz_duration');
          if (local) activeDuration = parseInt(local) * 60;
        }
        setExamDuration(activeDuration);

        // 1. Fetch token info to check start_time and previous answers
        const { data: tokenData, error: tokenError } = await supabase
          .from('mock_exam_users')
          .select('*')
          .eq('id', tokenId)
          .single();

        if (tokenError) {
          console.warn('Token invalid or deleted, clearing session');
          localStorage.removeItem('exam_token_id');
          localStorage.removeItem('exam_token');
          localStorage.removeItem('exam_category');
          localStorage.removeItem('full_name');
          navigate('/mock-exam/entry');
          return;
        }

        if (tokenData.has_submitted) {
          navigate('/mock-exam/result');
          return;
        }

        // Calculate remaining time based on start_time
        let remaining = activeDuration;
        
        if (tokenData.start_time) {
          const startTime = new Date(tokenData.start_time).getTime();
          const now = new Date().getTime();
          const elapsedSeconds = Math.floor((now - startTime) / 1000);
          remaining = activeDuration - elapsedSeconds;
        } else {
          // If for some reason start_time is missing, initialize it
          await supabase
            .from('mock_exam_users')
            .update({ start_time: new Date().toISOString() })
            .eq('id', tokenId);
        }

        if (remaining <= 0) {
          console.warn('Exam time expired based on start_time', { remaining, startTime: tokenData.start_time });
          toast.error('Your exam time has expired.');
          submitExam(0);
          return;
        }

        setTimeLeft(remaining);
        if (tokenData.answers) {
          setAnswers(tokenData.answers);
        }

        // 2. Fetch questions
        let activeCategory = category;
        if (!activeCategory || activeCategory === 'undefined') {
          console.warn('No category found in localStorage, recovering from tokenData:', tokenData.category);
          activeCategory = tokenData.category;
          if (activeCategory) localStorage.setItem('exam_category', activeCategory);
        }

        // Force match the database category values
        const dbCategory = activeCategory === 'Science Courses' ? 'Science Courses' : 'Commercial Courses';
        
        console.log('Fetching questions for category:', dbCategory);
        const { data: qData, error: qError } = await supabase
          .from('questions')
          .select('*')
          .eq('category', dbCategory);

        if (qError) {
          console.error('Questions fetch error:', qError);
          throw new Error('FAILED_TO_LOAD_QUESTIONS');
        }

        if (!qData || qData.length === 0) {
          console.warn('No questions found in database for these categories');
          throw new Error('NO_QUESTIONS_FOUND');
        }

        setQuestions(qData as Question[]);
        setLoading(false);
        console.log('Questions loaded successfully:', qData.length);
      } catch (err: any) {
        console.error('Failed to start exam', err);
        setLoading(false);
        
        if (err.message === 'FAILED_TO_LOAD_QUESTIONS') {
          toast.error('Failed to load exam questions. Retrying...');
        } else if (err.message === 'NO_QUESTIONS_FOUND') {
          toast.error('No questions found for your category.');
        } else {
          toast.error('An unexpected error occurred while loading the exam.');
        }
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
