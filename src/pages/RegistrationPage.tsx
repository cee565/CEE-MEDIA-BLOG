import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabase';
import { toast } from 'sonner';
import { User, Book, Copy, Check, ArrowRight, Sparkles, ShieldCheck, Hash, Phone, Building2 } from 'lucide-react';
import Logo from '../components/Logo';

const RegistrationPage: React.FC = () => {
  const [name, setName] = useState('');
  const [emailPhone, setEmailPhone] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState<'Science Courses' | 'Commercial Courses'>('Science Courses');
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [isPastDeadline, setIsPastDeadline] = useState(false);

  useEffect(() => {
    // Hidden System Wipe Feature for ADMIN
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin_wipe') === 'true') {
      const confirmWipe = window.confirm("URGENT: This will delete ALL student registrations and exam tokens. Are you sure?");
      if (confirmWipe) {
        const wipeDatabase = async () => {
          toast.loading('Wiping database...');
          try {
            await supabase.from('submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            await supabase.from('mock_exam_users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            localStorage.clear();
            toast.success('System has been wiped successfully!');
            setTimeout(() => window.location.href = '/mock-exam/register', 2000);
          } catch (err: any) {
            toast.error('Wipe failed: ' + err.message);
          }
        };
        wipeDatabase();
      }
    }
    
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('quiz_config')
          .select('deadline')
          .eq('id', 'global_config')
          .maybeSingle();
        
        let targetDeadline = new Date('2028-12-31T23:59:59'); // Default far in future
        
        if (data && data.deadline) {
          targetDeadline = new Date(data.deadline);
        } else {
          // Fallback to local storage if DB fetch fails or table missing
          const local = localStorage.getItem('quiz_deadline');
          if (local) targetDeadline = new Date(local);
        }
        
        setDeadline(targetDeadline);
        if (new Date() > targetDeadline) {
          setIsPastDeadline(true);
        }
      } catch (err) {
        console.error('Failed to fetch quiz config', err);
      }
    };

    fetchConfig();
    const interval = setInterval(() => {
      if (deadline && new Date() > deadline) {
        setIsPastDeadline(true);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [deadline]);

  const [generatedToken, setGeneratedToken] = useState<string | null>(() => {
    return localStorage.getItem('ceemedia_exam_token');
  });
  const [practiceToken, setPracticeToken] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  // Check if user is already registered on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('ceemedia_exam_token');
    if (savedToken) {
      // Verify token still exists in database
      const verifyToken = async () => {
        try {
          const { data, error } = await supabase
            .from('mock_exam_users')
            .select('token')
            .eq('token', savedToken)
            .maybeSingle();
            
          if (error || !data) {
            console.warn('Invalid token found in storage, clearing...');
            localStorage.removeItem('ceemedia_exam_token');
            setGeneratedToken(null);
          } else {
            setGeneratedToken(savedToken);
          }
        } catch (err) {
          console.error('Error verifying token:', err);
        }
      };
      verifyToken();
    }
  }, []);

  const generateToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `CEEMEDIA-${result}`;
  };

  const validateMatric = (matric: string) => {
    // Very loose validation: at least 5 characters
    return matric.length >= 5;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    /* if (isPastDeadline) {
      toast.error('Registration is closed');
      return;
    } */

    if (!agreedToRules) {
      toast.error('You must agree to the exam rules to register');
      return;
    }
    
    const trimmedMatric = matricNumber.trim().toUpperCase();
    const trimmedEmailPhone = emailPhone.trim();
    const trimmedName = name.trim();
    const trimmedDept = department.trim();

    if (!trimmedName || trimmedName.length < 2) {
      toast.error('Please enter your full name');
      return;
    }
    if (!trimmedEmailPhone) {
      toast.error('Please enter your email or phone number');
      return;
    }
    if (trimmedMatric.length < 2) {
      toast.error('Please enter a valid Matric Number');
      return;
    }
    if (!trimmedDept) {
      toast.error('Please enter your department');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting registration check for:', trimmedMatric);
      
      // 1. Check if matric number already registered
      const { data: matricUser, error: checkErr } = await supabase
        .from('mock_exam_users')
        .select('id, matric_number, token, full_name')
        .eq('matric_number', trimmedMatric)
        .maybeSingle();

      if (checkErr) {
        console.error('Supabase SELECT error:', checkErr);
        // We continue, as it might just be the record doesn't exist and maybeSingle is being fussy
      }

      if (matricUser) {
        console.log('User found, performing reset/update:', matricUser.id);
        const newToken = generateToken();
        const { error: resetErr } = await supabase
          .from('mock_exam_users')
          .update({
            token: newToken,
            has_started_exam: false,
            has_submitted: false,
            start_time: null,
            time_used: 0,
            score: 0,
            answers: {},
            department: trimmedDept,
            category: category,
            full_name: trimmedName,
            email_phone: trimmedEmailPhone,
            created_at: new Date().toISOString()
          })
          .eq('id', matricUser.id);

        if (!resetErr) {
          setGeneratedToken(newToken);
          localStorage.setItem('ceemedia_exam_token', newToken);
          toast.success(`Welcome back! Registration updated with NEW TOKEN.`);
          setLoading(false);
          return;
        } else {
          console.error('Supabase UPDATE error:', resetErr);
          toast.error(`Update failed: ${resetErr.message}`);
          setLoading(false);
          return;
        }
      }

      console.log('Performing NEW registration for:', trimmedMatric);
      const tokenStr = generateToken();
      const { error: insertErr } = await supabase
        .from('mock_exam_users')
        .insert({
          token: tokenStr,
          full_name: trimmedName,
          email_phone: trimmedEmailPhone,
          matric_number: trimmedMatric,
          department: trimmedDept,
          category: category,
          ip_address: 'reg-new-v2',
          real_ip: 'reg-new-v2',
          has_started_exam: false,
          has_submitted: false,
          score: 0
        });

      if (insertErr) {
        console.error('Supabase INSERT error:', insertErr);
        if (insertErr.code === '23505') {
          toast.error('This matric number is already registered. Please try refreshing.');
        } else {
          toast.error(`Registration error: ${insertErr.message}`);
        }
        setLoading(false);
        return;
      }

      setGeneratedToken(tokenStr);
      localStorage.setItem('ceemedia_exam_token', tokenStr);
      toast.success('Registration completed! Please save your token.');
    } catch (err: any) {
      console.error('Fatal registration error:', err);
      toast.error('System error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      setCopied(true);
      toast.success('Token copied successfully');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegisterAnother = () => {
    localStorage.removeItem('ceemedia_exam_token');
    setGeneratedToken(null);
    setName('');
    setEmailPhone('');
    setMatricNumber('');
    setDepartment('');
  };

  if (generatedToken) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden p-8 md:p-12 space-y-8"
        >
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500">
              <Sparkles size={40} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter text-center">YOUR MOCK EXAM TOKEN</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Registration Complete! Save your token below</p>
          </div>

          <div className="bg-slate-50 p-8 rounded-3xl border-2 border-dashed border-slate-200 relative group text-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">👉 Access Token</p>
            <p className="text-3xl md:text-4xl font-black text-brand-primary tracking-tight font-mono uppercase">
              {generatedToken}
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <button
                onClick={copyToClipboard}
                className="bg-white shadow-md border border-slate-100 px-6 py-3 rounded-xl text-slate-600 font-black uppercase tracking-widest text-[10px] hover:text-brand-secondary hover:scale-105 transition-all flex items-center space-x-2"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Token'}</span>
              </button>
              <button
                onClick={handleRegisterAnother}
                className="bg-white shadow-md border border-slate-100 px-6 py-3 rounded-xl text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-brand-primary hover:scale-105 transition-all flex items-center space-x-2"
              >
                <User size={14} />
                <span>Register Another</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Paste your token here (for practice)</label>
              <input
                type="text"
                value={practiceToken}
                onChange={(e) => setPracticeToken(e.target.value.toUpperCase())}
                placeholder="Paste token here..."
                className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-brand-secondary transition-all font-mono text-sm uppercase tracking-widest"
              />
              {practiceToken === generatedToken && (
                <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest ml-2 flex items-center space-x-1">
                  <Check size={12} />
                  <span>Perfect! You're ready for the exam.</span>
                </p>
              )}
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest flex items-center space-x-2">
              <ShieldCheck size={16} className="text-brand-accent" />
              <span>Exam Instructions</span>
            </h3>
            <ul className="text-[10px] font-bold uppercase tracking-widest space-y-3 text-slate-400">
              <li className="flex items-start space-x-3">
                <span className="text-brand-accent">•</span>
                <span>Save your token (copy or screenshot it)</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-brand-accent">•</span>
                <span>Do NOT share your token with anyone</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-brand-accent">•</span>
                <span>Come back on exam day</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-brand-accent">•</span>
                <span>Click "Go to Exam Page" and paste your token</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-brand-accent">•</span>
                <span>Once you start, timer begins immediately</span>
              </li>
              <li className="flex items-start space-x-3 text-red-400">
                <span className="text-red-400">•</span>
                <span>You cannot restart after starting</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-brand-accent">•</span>
                <span>Ensure stable internet before beginning</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => navigate('/mock-exam/entry')}
            className="w-full bg-brand-primary text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-brand-secondary transition-all flex items-center justify-center space-x-2"
          >
            <span>Go to Exam Portal</span>
            <ArrowRight size={16} />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden"
      >
        <div className="bg-gradient-to-br from-brand-primary to-indigo-900 p-8 text-center space-y-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="flex justify-center relative z-10 transition-transform hover:scale-110 duration-300">
            <Logo iconClassName="w-16 h-16" showText={false} dark={true} />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter relative z-10">
            CEE MEDIA <span className="text-brand-accent italic">BLOG</span>
          </h1>
          {isPastDeadline && (
            <div className="bg-red-500/90 backdrop-blur-md text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse border border-red-400 relative z-10 mx-auto w-fit">
               Registration is Closed
            </div>
          )}
          <p className="text-indigo-100/70 text-[10px] font-bold uppercase tracking-[0.2em] relative z-10">
            Secure your spot for the campus mock exam
          </p>
        </div>

        <form onSubmit={handleRegister} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 group-focus-within:text-brand-secondary transition-colors">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/5 transition-all font-medium text-sm focus:bg-white"
                  required
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-secondary transition-colors" size={20} />
              </div>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 group-focus-within:text-brand-secondary transition-colors">Email or Phone Number</label>
              <div className="relative">
                <input
                  type="text"
                  value={emailPhone}
                  onChange={(e) => setEmailPhone(e.target.value)}
                  placeholder="Enter email or phone"
                  className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/5 transition-all font-medium text-sm focus:bg-white"
                  required
                />
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-secondary transition-colors" size={20} />
              </div>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 group-focus-within:text-brand-secondary transition-colors">Matric Number</label>
              <div className="relative">
                <input
                  type="text"
                  value={matricNumber}
                  onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
                  placeholder="Enter your Matric Number"
                  className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/5 transition-all font-mono text-sm uppercase tracking-widest focus:bg-white"
                  required
                />
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-secondary transition-colors" size={20} />
              </div>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 group-focus-within:text-brand-secondary transition-colors">Department</label>
              <div className="relative">
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Enter your department"
                  className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/5 transition-all font-medium text-sm focus:bg-white"
                  required
                />
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-brand-secondary transition-colors" size={20} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Category</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'Science Courses', label: 'Science courses', desc: 'maths, physic, chemistry and GST 101' },
                  { id: 'Commercial Courses', label: 'Commercial courses', desc: 'ACC, ECO, GST 101 AND GST 102' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as any)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                      category === cat.id 
                        ? 'border-brand-secondary bg-brand-secondary/5' 
                        : 'border-slate-50 bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className={`text-xs font-black uppercase tracking-widest ${category === cat.id ? 'text-brand-primary' : 'text-slate-400'}`}>
                        {cat.label}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">
                        {cat.desc}
                      </span>
                    </div>
                    {category === cat.id && <Check size={16} className="text-brand-secondary" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4 pt-4 border-t border-slate-50">
              <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center space-x-2">
                  <ShieldCheck size={16} className="text-brand-accent" />
                  <span>Exam Mandatory Rules</span>
                </h3>
                <ul className="text-[9px] font-bold uppercase tracking-widest space-y-2 text-slate-400">
                  <li className="flex items-start space-x-2">
                    <span className="text-brand-accent">•</span>
                    <span>One registration per phone/device only</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-brand-accent">•</span>
                    <span>Matric number must be valid format</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-brand-accent">•</span>
                    <span>Exam session cannot be restarted</span>
                  </li>
                </ul>
              </div>

              <label className="flex items-center space-x-3 cursor-pointer group p-2">
                <div 
                  onClick={() => setAgreedToRules(!agreedToRules)}
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    agreedToRules ? 'bg-brand-secondary border-brand-secondary' : 'bg-white border-slate-200'
                  }`}
                >
                  {agreedToRules && <Check size={14} className="text-white" />}
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-brand-primary transition-colors">
                  I agree to the exam rules
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || isPastDeadline}
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
