import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trophy, Home, BarChart3, CheckCircle2, RefreshCw } from 'lucide-react';
import Logo from '../components/Logo';

const ResultPage: React.FC = () => {
  const navigate = useNavigate();
  const score = sessionStorage.getItem('exam_score');
  const total = sessionStorage.getItem('exam_total_questions');
  const name = sessionStorage.getItem('full_name');

  useEffect(() => {
    if (score === null) {
      navigate('/mock-exam/entry');
    }
  }, [score, navigate]);

  const percentage = total ? (parseInt(score || '0') / parseInt(total)) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden text-center"
      >
        <div className="bg-brand-primary p-12 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          
          <div className="flex justify-center relative z-10">
            <div className="w-24 h-24 bg-brand-accent rounded-full flex items-center justify-center shadow-2xl border-4 border-white/20">
              <Trophy className="text-brand-primary" size={40} />
            </div>
          </div>

          <div className="space-y-2 relative z-10">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
              Mock Exam <span className="text-brand-accent">Completed!</span>
            </h1>
            <p className="text-indigo-100/70 text-[10px] font-black uppercase tracking-[0.3em]">
              Great job, {name}!
            </p>
          </div>
        </div>

        <div className="p-10 space-y-10">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 bg-green-50 text-green-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
              <CheckCircle2 size={14} />
              <span>Submission Successful</span>
            </div>

            <div className="space-y-1">
              <p className="text-6xl font-black text-slate-900 tracking-tighter">
                {score}<span className="text-slate-200">/{total}</span>
              </p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Total Score</p>
            </div>

            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                className="h-full bg-brand-secondary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-brand-secondary hover:shadow-lg transition-all space-y-3 group"
            >
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-brand-secondary transition-colors shadow-sm">
                <Home size={20} />
              </div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Back Home</span>
            </button>

            <button
              onClick={() => navigate('/mock-exam/leaderboard')}
              className="flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-brand-secondary hover:shadow-lg transition-all space-y-3 group"
            >
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-brand-secondary transition-colors shadow-sm">
                <BarChart3 size={20} />
              </div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Leaderboard</span>
            </button>
            <button
              onClick={() => {
                if (window.confirm('This will clear your session and allow for a new registration. Are you sure?')) {
                  localStorage.clear();
                  navigate('/mock-exam/register');
                }
              }}
              className="flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-brand-secondary hover:shadow-lg transition-all space-y-3 group col-span-2"
            >
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-brand-secondary transition-colors shadow-sm">
                <RefreshCw size={20} />
              </div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Start New Registration</span>
            </button>
          </div>
        </div>
      </motion.div>

      <div className="mt-8 text-center">
        <Logo iconClassName="w-8 h-8" showText={false} />
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em] mt-2">CEE MEDIA MOCK EXAM v1.0</p>
      </div>
    </div>
  );
};

export default ResultPage;
