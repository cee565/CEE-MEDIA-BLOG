import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
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
    const fetchConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('quiz_config')
          .select('deadline')
          .eq('id', 'global_config')
          .maybeSingle();
        
        let targetDeadline = new Date('2026-12-31T23:59:59'); // Default
        
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
    // Format: XXX/XXX/25/XXXXX
    const regex = /^[A-Z]{3}\/[A-Z]{3}\/25\/[0-9]{5}$/i;
    return regex.test(matric);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isPastDeadline) {
      toast.error('Registration is closed (Deadline: April 29th, 9:00 AM)');
      return;
    }

    if (!agreedToRules) {
      toast.error('You must agree to the exam rules to register');
      return;
    }
    
    const trimmedMatric = matricNumber.trim().toUpperCase();
    const trimmedEmailPhone = emailPhone.trim();
    const trimmedName = name.trim();
    const trimmedDept = department.trim();

    if (!trimmedName) {
      toast.error('Please enter your full name');
      return;
    }
    if (!trimmedEmailPhone) {
      toast.error('Please enter your email or phone number');
      return;
    }
    if (!validateMatric(trimmedMatric)) {
      toast.error('Invalid Matric Number format. Use XXX/XXX/25/XXXXX');
      return;
    }
    if (!trimmedDept) {
      toast.error('Please enter your department');
      return;
    }

    setLoading(true);
    try {
      // Get device ID for "One registration per phone"
      let deviceId = localStorage.getItem('ceemedia_device_id');
      if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('ceemedia_device_id', deviceId);
      }

      // 1. Check if matric number already registered
      const { data: matricUser, error: matricErr } = await supabase
        .from('mock_exam_users')
        .select('token, full_name')
        .eq('matric_number', trimmedMatric)
        .maybeSingle();

      if (matricUser) {
        setGeneratedToken(matricUser.token);
        localStorage.setItem('ceemedia_exam_token', matricUser.token);
        toast.info(`Welcome back, ${matricUser.full_name}. You are already registered.`);
        setLoading(false);
        return;
      }

      // 2. Check if device is already registered
      const { data: ipUser, error: ipErr } = await supabase
        .from('mock_exam_users')
        .select('token, full_name, matric_number')
        .eq('ip_address', deviceId)
        .maybeSingle();

      if (ipUser) {
        setGeneratedToken(ipUser.token);
        localStorage.setItem('ceemedia_exam_token', ipUser.token);
        toast.info(`Device already has a registered user (${ipUser.full_name}). Multi-account per device is prohibited.`);
        setLoading(false);
        return;
      }

      const tokenStr = generateToken();

      const { error } = await supabase
        .from('mock_exam_users')
        .insert({
          token: tokenStr,
          full_name: trimmedName,
          email_phone: trimmedEmailPhone,
          matric_number: trimmedMatric,
          department: trimmedDept,
          category: category,
          ip_address: deviceId
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('This matric number is already registered.');
        } else {
          throw error;
        }
        return;
      }

      setGeneratedToken(tokenStr);
      localStorage.setItem('ceemedia_exam_token', tokenStr);
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
      toast.success('Token copied successfully');
      setTimeout(() => setCopied(false), 2000);
    }
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
            <button
              onClick={copyToClipboard}
              className="mt-6 bg-white shadow-lg px-6 py-3 rounded-xl text-slate-600 font-black uppercase tracking-widest text-[10px] hover:text-brand-secondary hover:scale-105 transition-all flex items-center space-x-2 mx-auto"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Token'}</span>
            </button>
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
            <span>Go to Exam Page</span>
            <ArrowRight size={16} />
          </button>
          <div className="flex flex-col items-center space-y-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Registered the wrong details?</p>
            <button 
              type="button" 
              onClick={() => {
                if (window.confirm('This will clear your local session. You can now register as a new user.')) {
                  localStorage.clear(); 
                  window.location.reload(); // Force a fresh start
                }
              }} 
              className="px-6 py-2 rounded-full border border-slate-200 text-brand-secondary text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all font-sans"
            >
              Start New Registration
            </button>
          </div>
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
        <div className="bg-brand-primary p-8 text-center space-y-4">
          <div className="flex justify-center">
            <Logo iconClassName="w-16 h-16" showText={false} dark={true} />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">
            Mock Exam <span className="text-brand-accent">Registration</span>
          </h1>
          {isPastDeadline && (
            <div className="bg-red-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse border border-red-400">
               Registration is Closed
            </div>
          )}
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Email or Phone Number</label>
              <div className="relative">
                <input
                  type="text"
                  value={emailPhone}
                  onChange={(e) => setEmailPhone(e.target.value)}
                  placeholder="Enter email or phone"
                  className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/5 transition-all font-medium text-sm"
                  required
                />
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Matric Number (XXX/XXX/25/XXXXX)</label>
              <div className="relative">
                <input
                  type="text"
                  value={matricNumber}
                  onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
                  placeholder="ABC/XYZ/25/12345"
                  className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/5 transition-all font-mono text-sm uppercase tracking-widest"
                  required
                />
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Department</label>
              <div className="relative">
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Enter your department"
                  className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/5 transition-all font-medium text-sm"
                  required
                />
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
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
