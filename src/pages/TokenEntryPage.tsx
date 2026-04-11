import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../supabase';
import { toast } from 'sonner';
import { ShieldCheck, ArrowRight, Trophy } from 'lucide-react';
import Logo from '../components/Logo';

const TokenEntryPage: React.FC = () => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error('Please enter your access token');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('token', token.trim())
        .single();

      if (error || !data) {
        toast.error('Invalid token. Please check and try again.');
        return;
      }

      if (data.is_used) {
        toast.error('This token has already been used.');
        return;
      }

      // Store session info
      sessionStorage.setItem('exam_token_id', data.id);
      sessionStorage.setItem('exam_token', data.token);
      sessionStorage.setItem('exam_category', data.category);
      sessionStorage.setItem('participant_name', data.participant_name);
      
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
          <p className="text-indigo-100/70 text-xs font-bold uppercase tracking-widest">
            Enter your token to begin
          </p>
        </div>

        <form onSubmit={handleStartExam} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Access Token</label>
              <div className="relative">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter your unique token"
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
                <span>Start Mock Exam</span>
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
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Rules & Regulations</p>
        <ul className="text-[9px] text-slate-400 font-bold uppercase tracking-widest space-y-1">
          <li>• One attempt per token</li>
          <li>• 20 minutes time limit</li>
          <li>• Refreshing will auto-submit</li>
          <li>• No back navigation allowed</li>
        </ul>
      </div>
    </div>
  );
};

export default TokenEntryPage;
