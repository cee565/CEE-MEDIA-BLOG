import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { Question, Submission, Token } from '../types';
import { Trophy, Medal, Timer, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

const LeaderboardPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchLeaderboard = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          tokens (
            token,
            participant_name
          )
        `)
        .order('score', { ascending: false })
        .order('time_taken', { ascending: true })
        .limit(50);

      if (error) throw error;
      setSubmissions(data as Submission[]);
    } catch (err) {
      console.error('Failed to fetch leaderboard', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(() => fetchLeaderboard(true), 20000); // Auto-refresh every 20s
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-brand-primary p-8 md:p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/mock-exam/entry')}
              className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <Logo iconClassName="w-10 h-10" showText={false} dark={true} />
            <div className={`p-3 bg-white/10 rounded-2xl ${isRefreshing ? 'animate-spin' : ''}`}>
              <RefreshCw size={20} />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">
              MOCK EXAM <span className="text-brand-accent">RANKINGS</span>
            </h1>
            <p className="text-indigo-100/70 text-[10px] font-black uppercase tracking-[0.4em]">
              Performance Leaderboard
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-4xl w-full mx-auto p-4 md:p-8 -mt-10">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Standings...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-20 text-center space-y-4">
              <Trophy size={48} className="mx-auto text-slate-100" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No submissions yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rank</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Participant</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <AnimatePresence mode="popLayout">
                    {submissions.map((sub, index) => {
                      const isTop3 = index < 3;
                      const rankColors = [
                        'bg-brand-accent text-brand-primary',
                        'bg-slate-200 text-slate-600',
                        'bg-orange-100 text-orange-700'
                      ];

                      return (
                        <motion.tr
                          key={sub.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="px-8 py-6">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${isTop3 ? rankColors[index] : 'bg-slate-50 text-slate-400'}`}>
                              {index + 1}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 uppercase tracking-tight text-sm">
                                {sub.tokens?.participant_name || 'Anonymous'}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                                Token: {sub.tokens?.token}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg font-black text-brand-primary tracking-tighter">{sub.score}</span>
                              <Medal size={16} className={isTop3 ? (index === 0 ? 'text-brand-accent' : 'text-slate-300') : 'text-slate-100'} />
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center space-x-2 text-slate-500">
                              <Timer size={14} />
                              <span className="text-xs font-bold font-mono">{formatTime(sub.time_taken)}</span>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <footer className="p-8 text-center">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em]">Auto-refreshing every 20 seconds</p>
      </footer>
    </div>
  );
};

export default LeaderboardPage;
