import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { supabase } from '../supabase';
import { toast } from 'sonner';
import { User, Book, Copy, Check, ArrowRight, Sparkles } from 'lucide-react';
import Logo from '../components/Logo';

const RegistrationPage: React.FC = () => {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState<'Art' | 'Physical Science' | 'Life Science'>('Art');
  const [loading, setLoading] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    setLoading(true);
    try {
      // Generate a unique token
      const tokenStr = `WA${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const { data, error } = await supabase
        .from('tokens')
        .insert({
          token: tokenStr,
          participant_name: name.trim(),
          department: department.trim() || null,
          category: category
        })
        .select()
        .single();

      if (error) throw error;

      setGeneratedToken(tokenStr);
      toast.success('Registration successful! Please save your token.');
    } catch (err) {
      console.error('Registration failed', err);
      toast.error('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      setCopied(true);
      toast.success('Token copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (generatedToken) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden text-center p-8 space-y-8"
        >
          <div className="space-y-4">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500">
              <Sparkles size={40} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Registration Complete</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Your unique access token is below</p>
          </div>

          <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200 relative group">
            <p className="text-3xl font-black text-brand-primary tracking-[0.2em] font-mono uppercase">
              {generatedToken}
            </p>
            <button
              onClick={copyToClipboard}
              className="absolute -right-2 -top-2 bg-white shadow-lg p-2 rounded-xl text-slate-400 hover:text-brand-secondary transition-all"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>

          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-left">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Important Note:</p>
            <p className="text-[10px] text-amber-600 font-medium leading-relaxed">
              Please copy and save this token. You will need it to start your Mock Exam. This token can only be used ONCE.
            </p>
          </div>

          <button
            onClick={() => navigate('/mock-exam/entry')}
            className="w-full bg-brand-primary text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-brand-secondary transition-all flex items-center justify-center space-x-2"
          >
            <span>Proceed to Login</span>
            <ArrowRight size={16} />
          </button>
        </motion.div>
      </div>
    );
  }

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
            Mock Exam <span className="text-brand-accent">Registration</span>
          </h1>
          <p className="text-indigo-100/70 text-xs font-bold uppercase tracking-widest">
            Sign up to receive your access token
          </p>
        </div>

        <form onSubmit={handleRegister} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/5 transition-all font-medium text-sm"
                  required
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Department (Optional)</label>
              <div className="relative">
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/5 transition-all font-medium text-sm"
                />
                <Book className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Category</label>
              <div className="grid grid-cols-1 gap-2">
                {['Art', 'Physical Science', 'Life Science'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat as any)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                      category === cat 
                        ? 'border-brand-secondary bg-brand-secondary/5' 
                        : 'border-slate-50 bg-slate-50'
                    }`}
                  >
                    <span className={`text-xs font-black uppercase tracking-widest ${category === cat ? 'text-brand-primary' : 'text-slate-400'}`}>
                      {cat}
                    </span>
                    {category === cat && <Check size={16} className="text-brand-secondary" />}
                  </button>
                ))}
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
                <span>Register Now</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Already have a token? <button type="button" onClick={() => navigate('/mock-exam/entry')} className="text-brand-secondary">Login here</button>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default RegistrationPage;
