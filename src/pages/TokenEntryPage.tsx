import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  const [isExamLive, setIsExamLive] = useState(false);
  const [examStartDate] = useState(new Date('2024-01-01T00:00:00'));
  const navigate = useNavigate();

  useEffect(() => {
    // Hidden Super Reset Feature
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('super_reset') === 'true') {
      const performSuperReset = async () => {
        const confirmReset = window.confirm("WARNING: This will clear ALL exam data, including all tokens and student registrations. Continue?");
        if (!confirmReset) return;
        
        toast.loading('Performing complete system wipe...');
        try {
          // Clear Users (will cascade to submissions if linked)
          const { error: userErr } = await supabase.from('mock_exam_users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (userErr) throw userErr;

          // Clear standalone submissions
          const { error: subErr } = await supabase.from('submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          if (subErr) throw subErr;

          // Clear legacy tokens
          await supabase.from('tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          
          // Clear local storage for the admin too
          localStorage.clear();
          
          toast.success('System cleared! All tokens and registrations have been wiped.');
        } catch (err: any) {
          console.error('Super reset failed:', err);
          toast.error(`System wipe failed: ${err.message}`);
        }
      };
      performSuperReset();
    }

    const fetchConfig = async () => {
      try {
        const { data } = await supabase
          .from('quiz_config')
          .select('deadline')
          .eq('id', 'global_config')
          .maybeSingle();
        
        let targetDeadline = new Date('2028-12-31T23:59:59');
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
    const timer = setInterval(() => {
      const now = new Date();
      
      // Check if exam is live
      if (now >= examStartDate) {
        setIsExamLive(true);
      } else {
        setIsExamLive(false);
      }

      if (!deadline) return;
      const difference = deadline.getTime() - now.getTime();

      if (difference <= 0) {
        setIsPastDeadline(false); // Override deadline to always be open
        setTimeLeft(null);
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline, examStartDate]);

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isExamLive && !token.includes('RESET')) {
      toast.error('The exam has not started yet. Please wait for official announcement.');
      return;
    }

    /* if (isPastDeadline) {
      toast.error('The exam portal is now closed');
      return;
    } */

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
            CEE MEDIA <span className="text-brand-accent italic">BLOG</span>
          </h1>
          
          {isExamLive ? (
             <div className="bg-green-500/20 text-green-200 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-green-500/30 flex flex-col items-center space-y-2">
               <ShieldCheck size={20} className="animate-pulse" />
               <span>Exam Portal is Now Live</span>
             </div>
          ) : (
            <div className="flex justify-center space-x-2">
               <div className="bg-green-500/20 text-green-200 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-green-500/30 flex flex-col items-center space-y-2">
                 <ShieldCheck size={20} />
                 <span>Portal Active</span>
               </div>
            </div>
          )}

          <p className="text-indigo-100/70 text-xs font-bold uppercase tracking-widest">
            {isExamLive ? 'Enter your CEEMEDIA token to begin' : 'Prepare for your mock exam'}
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
                  disabled={!isExamLive}
                  className={`w-full p-4 pl-12 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/5 transition-all font-mono text-sm uppercase tracking-widest ${!isExamLive ? 'opacity-50 cursor-not-allowed' : ''}`}
                  required
                />
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isExamLive}
            className="w-full bg-brand-primary text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-brand-secondary transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isExamLive ? 'Start Exam' : 'Portal Locked'}</span>
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
