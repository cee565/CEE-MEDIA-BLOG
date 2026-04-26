import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../supabase';
import { toast } from 'sonner';
import { ShieldCheck, ArrowRight, Trophy, Clock } from 'lucide-react';
import Logo from '../components/Logo';

const TokenEntryPage: React.FC = () => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);
  const [isPastDeadline, setIsPastDeadline] = useState(false);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await supabase
          .from('quiz_config')
          .select('deadline')
          .eq('id', 'global_config')
          .maybeSingle();
        
        let targetDeadline = new Date('2026-12-31T23:59:59');
        if (data && data.deadline) {
          targetDeadline = new Date(data.deadline);
        } else {
          const local = localStorage.getItem('quiz_deadline');
          if (local) targetDeadline = new Date(local);
        }
        setDeadline(targetDeadline);
      } catch (err) {
        console.error('Failed to fetch config', err);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!deadline) return;

    const timer = setInterval(() => {
      const now = new Date();
      const difference = deadline.getTime() - now.getTime();

      if (difference <= 0) {
        setIsPastDeadline(true);
        setTimeLeft(null);
        clearInterval(timer);
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isPastDeadline) {
      toast.error('The exam portal is now closed (Deadline: April 29th, 9:00 AM)');
      return;
    }

    if (!token.trim()) {
      toast.error('Please enter your access token');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mock_exam_users')
        .select('*')
        .eq('token', token.trim().toUpperCase())
        .single();

      if (error || !data) {
        toast.error('Invalid token. Please check and try again.');
        return;
      }

      if (data.has_submitted) {
        toast.error('This token has already been used to submit an exam.');
        return;
      }

      // If they haven't started, mark as started and set start time
      if (!data.has_started_exam) {
        const { error: updateError } = await supabase
          .from('mock_exam_users')
          .update({ 
            has_started_exam: true, 
            start_time: new Date().toISOString() 
          })
          .eq('id', data.id);
        
        if (updateError) throw updateError;
      }

      // Store session info in localStorage for persistence across refreshes and tab closes
      localStorage.setItem('exam_token_id', data.id);
      localStorage.setItem('exam_token', data.token);
      localStorage.setItem('exam_category', data.category);
      localStorage.setItem('full_name', data.full_name);

      // Also set sessionStorage for immediate use in ResultPage
      sessionStorage.setItem('full_name', data.full_name);
      
      // Navigate to exam
      navigate('/mock-exam/start');
    } catch (err) {
      console.error('Token validation failed', err);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden"
      >
        <div className="bg-brand-primary p-8 text-center space-y-4">
          <div className="flex justify-center">
            <Logo iconClassName="w-16 h-16" showText={false} dark={true} />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">
            Mock Exam <span className="text-brand-accent">Portal</span>
          </h1>
          
          {/* Deadline Countdown */}
          {timeLeft ? (
            <div className="flex justify-center space-x-2">
              {Object.entries(timeLeft).map(([unit, value]) => (
                <div key={unit} className="flex flex-col items-center bg-white/10 px-3 py-2 rounded-xl min-w-[50px]">
                  <span className="text-white font-black text-sm">{value}</span>
                  <span className="text-indigo-200/50 text-[7px] font-black uppercase tracking-tighter">{unit}</span>
                </div>
              ))}
            </div>
          ) : isPastDeadline ? (
             <div className="bg-red-500/20 text-red-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/30">
               Registration & Exam Closed
             </div>
          ) : null}

          <p className="text-indigo-100/70 text-xs font-bold uppercase tracking-widest">
            Enter your CEEMEDIA token to begin
          </p>
        </div>

        <form onSubmit={handleStartExam} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">CEEMEDIA Token</label>
              <div className="relative">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.toUpperCase())}
                  placeholder="CEEMEDIA-XXXXXX"
                  className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/5 transition-all font-mono text-sm uppercase tracking-widest"
                  required
                />
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-primary text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-brand-secondary transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Start Exam</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <div className="pt-4 border-t border-slate-50 flex flex-col items-center space-y-4">
            <button
              type="button"
              onClick={() => navigate('/mock-exam/leaderboard')}
              className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-brand-secondary transition-colors"
            >
              <Trophy size={14} />
              <span>View Leaderboard</span>
            </button>
            
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Don't have a token? <button type="button" onClick={() => navigate('/mock-exam/register')} className="text-brand-secondary">Register here</button>
            </p>
          </div>
        </form>
      </motion.div>

      <div className="mt-8 text-center space-y-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Exam Rules</p>
        <ul className="text-[9px] text-slate-400 font-bold uppercase tracking-widest space-y-1">
          <li>• Token usable once only</li>
          <li>• Timer starts instantly</li>
          <li>• Resume allowed on refresh</li>
          <li>• Auto-submit when time runs out</li>
        </ul>
      </div>
    </div>
  );
};

export default TokenEntryPage;
