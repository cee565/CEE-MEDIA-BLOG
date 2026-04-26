import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { Token, Submission, Question } from '../types';
import { toast } from 'sonner';
import { 
  Plus, Ticket, Users, BarChart3, Trash2, 
  Download, RefreshCw, Search, Filter, 
  ShieldCheck, ShieldAlert, PlusCircle,
  FileText, CheckCircle2, Eye, EyeOff,
  Settings, Clock, Save, Timer
} from 'lucide-react';
import Logo from '../components/Logo';

const QuizAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tokens' | 'submissions' | 'questions' | 'settings'>('tokens');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tokenCount, setTokenCount] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [importing, setImporting] = useState(false);
  
  // Question Form State
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A' as 'A' | 'B' | 'C' | 'D',
    category: 'Science Courses'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, submissionsRes, questionsRes, configRes] = await Promise.all([
        supabase.from('mock_exam_users').select('*').order('created_at', { ascending: false }),
        supabase.from('submissions').select('*, mock_exam_users(token, full_name)').order('submitted_at', { ascending: false }),
        supabase.from('questions').select('*').order('created_at', { ascending: false }),
        supabase.from('quiz_config').select('*').eq('id', 'global_config').maybeSingle()
      ]);

      if (usersRes.data) setTokens(usersRes.data as any);
      if (submissionsRes.data) setSubmissions(submissionsRes.data as Submission[]);
      if (questionsRes.data) setQuestions(questionsRes.data);
      
      if (configRes.data) {
        setDeadline(configRes.data.deadline);
        setExamDuration(configRes.data.duration);
      } else {
        // Fallback to local storage if no DB entry
        const localDeadline = localStorage.getItem('quiz_deadline');
        const localDuration = localStorage.getItem('quiz_duration');
        if (localDeadline) setDeadline(localDeadline);
        if (localDuration) setExamDuration(parseInt(localDuration));
      }
    } catch (err) {
      console.error('Failed to fetch admin data', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Real-time updates for mock_exam_users table
    const channel = supabase
      .channel('admin_live_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mock_exam_users' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const generateTokens = async () => {
    setGenerating(true);
    try {
      const newTokens = Array.from({ length: tokenCount }).map(() => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return {
          token: `CEEMEDIA-${result}`,
          category: 'Science Courses',
          full_name: 'Manual Generation',
          email_phone: 'N/A',
          department: 'Admin',
          has_started_exam: false,
          has_submitted: false,
          score: 0
        };
      });

      const { error } = await supabase.from('mock_exam_users').insert(newTokens);
      if (error) throw error;

      toast.success(`${tokenCount} tokens generated successfully`);
      fetchData();
    } catch (err) {
      console.error('Failed to generate tokens', err);
      toast.error('Failed to generate tokens');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('questions').insert([newQuestion]);
      if (error) throw error;
      
      toast.success('Question added successfully');
      setShowQuestionForm(false);
      setNewQuestion({
        question: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'A',
        category: 'Science Courses'
      });
      fetchData();
    } catch (err) {
      console.error('Failed to add question', err);
      toast.error('Failed to add question');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    setImporting(true);
    try {
      // Simple Parser: Question | Option A | Option B | Option C | Option D | Correct(A/B/C/D) | Category
      const lines = bulkText.split('\n').filter(l => l.trim().includes('|'));
      const newQuestions = lines.map(line => {
        const [q, a, b, c, d, correct, cat] = line.split('|').map(s => s.trim());
        return {
          question: q,
          option_a: a,
          option_b: b,
          option_c: c,
          option_d: d,
          correct_answer: correct.toUpperCase() as 'A' | 'B' | 'C' | 'D',
          category: cat || 'Science Courses'
        };
      });

      if (newQuestions.length === 0) {
        toast.error('No valid lines found. Use format: Question | A | B | C | D | Answer | Category');
        return;
      }

      const { error } = await supabase.from('questions').insert(newQuestions);
      if (error) throw error;

      toast.success(`Successfully imported ${newQuestions.length} questions`);
      setBulkText('');
      fetchData();
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Import failed. Check your format.');
    } finally {
      setImporting(false);
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) throw error;
      setQuestions(prev => prev.filter(q => q.id !== id));
      toast.success('Question deleted');
    } catch (err) {
      toast.error('Failed to delete question');
    }
  };

  const [deadline, setDeadline] = useState('2026-12-31T23:59:59');
  const [examDuration, setExamDuration] = useState(60);

  const saveSettings = async () => {
    setLoading(true);
    try {
      // We'll store settings in local storage for now if we don't have a settings table, 
      // but ideally we should use a database. Let's try to use 'quiz_config'
      const { error } = await supabase.from('quiz_config').upsert({
        id: 'global_config',
        deadline: deadline,
        duration: examDuration
      });
      
      if (error) {
        // Fallback to localStorage if table doesn't exist
        localStorage.setItem('quiz_deadline', deadline);
        localStorage.setItem('quiz_duration', examDuration.toString());
        toast.info('Settings saved locally (check database table quiz_config)');
      } else {
        toast.success('Global settings updated in database');
      }
    } catch (err) {
      console.error('Failed to save settings', err);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const dataToExport = activeTab === 'tokens' ? filteredTokens : leaderboard;
    if (dataToExport.length === 0) return;

    let headers = [];
    let rows = [];

    if (activeTab === 'tokens') {
      headers = ['Token', 'Name', 'Email/Phone', 'Matric No', 'Dept', 'Category', 'Status'];
      rows = filteredTokens.map(t => [
        t.token,
        t.full_name,
        t.email_phone,
        (t as any).matric_number || 'N/A',
        t.department,
        t.category,
        t.has_submitted ? 'Submitted' : (t.has_started_exam ? 'In Progress' : 'Not Used')
      ]);
    } else {
      headers = ['Rank', 'Name', 'Token', 'Score', 'Time Used'];
      rows = leaderboard.map((t, i) => [
        i + 1,
        t.full_name,
        t.token,
        t.score,
        `${Math.floor((t.time_used || 0) / 60)}m ${(t.time_used || 0) % 60}s`
      ]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `cee_media_exam_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Downloaded');
  };

  const deleteToken = async (id: string) => {
    if (!confirm('Are you sure you want to delete this token? This will also remove the student\'s submission and allow them to register again.')) return;
    try {
      // Deleting from mock_exam_users
      const { error } = await supabase.from('mock_exam_users').delete().eq('id', id);
      if (error) throw error;
      
      // Also try to delete from submissions if any
      await supabase.from('submissions').delete().eq('token_id', id);

      setTokens(prev => prev.filter(t => t.id !== id));
      setSubmissions(prev => prev.filter(s => s.token_id !== id));
      toast.success('User and data deleted successfully');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete user record');
    }
  };

  const deleteAllData = async () => {
    if (!confirm('CRITICAL ALERT: This will delete ALL registrations and ALL submissions. This action CANNOT be undone. Proceed?')) return;
    if (!confirm('SECOND CONFIRMATION: Are you absolutely sure? Every student record will be wiped.')) return;

    setLoading(true);
    try {
      // Delete all submissions
      const { error: subErr } = await supabase.from('submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (subErr) console.warn('Submissions deletion error:', subErr);

      // Delete all mock_exam_users
      const { error: userErr } = await supabase.from('mock_exam_users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (userErr) throw userErr;

      setTokens([]);
      setSubmissions([]);
      toast.success('All exam records have been wiped');
    } catch (err) {
      console.error('Wipe error:', err);
      toast.error('Failed to clear records');
    } finally {
      setLoading(false);
    }
  };

  const deleteSubmission = async (id: string) => {
    if (!confirm('Are you sure you want to delete this specific submission record?')) return;
    try {
      const { error } = await supabase.from('submissions').delete().eq('id', id);
      if (error) throw error;
      setSubmissions(prev => prev.filter(s => s.id !== id));
      toast.success('Submission record deleted');
    } catch (err) {
      toast.error('Failed to delete submission');
    }
  };

  const filteredTokens = tokens.filter(t => 
    (t.token?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (t.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (t.matric_number?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );
  
  const filteredSubmissions = submissions.filter(s => 
    (s.mock_exam_users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.mock_exam_users?.token.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const leaderboard = [...tokens]
    .filter(t => t.has_submitted)
    .sort((a, b) => {
      if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
      return (a.time_used || 0) - (b.time_used || 0);
    });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Sidebar/Header */}
      <header className="bg-brand-primary p-6 text-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <Logo iconClassName="w-12 h-12" showText={false} dark={true} />
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter">Exam <span className="text-brand-accent">Admin</span></h1>
              <p className="text-indigo-100/70 text-[10px] font-black uppercase tracking-widest">Live Monitoring Dashboard</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-white/10 p-1 rounded-2xl">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-3 hover:bg-white/10 rounded-xl text-white transition-all disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            {[
              { id: 'tokens', icon: Ticket, label: 'Tokens' },
              { id: 'submissions', icon: BarChart3, label: 'Leaderboard' },
              { id: 'questions', icon: FileText, label: 'Questions' },
              { id: 'settings', icon: Settings, label: 'Settings' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id ? 'bg-white text-brand-primary shadow-lg' : 'hover:bg-white/5'
                }`}
              >
                <tab.icon size={14} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Registered Users', value: tokens.length, icon: Users, color: 'text-blue-600' },
            { label: 'Tokens Generated', value: tokens.length, icon: Ticket, color: 'text-orange-600' },
            { label: 'Taking Exam', value: tokens.filter(t => t.has_started_exam && !t.has_submitted).length, icon: RefreshCw, color: 'text-purple-600' },
            { label: 'Submitted', value: tokens.filter(t => t.has_submitted).length, icon: ShieldCheck, color: 'text-green-600' }
          ].map(stat => (
            <div key={stat.label} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl bg-slate-50 ${stat.color}`}>
                  <stat.icon size={18} className={stat.label === 'Taking Exam' ? 'animate-spin' : ''} />
                </div>
                <span className="text-2xl font-black text-slate-900 tracking-tighter">{stat.value}</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="Search by name or token..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-4 pl-12 rounded-2xl bg-white border border-slate-100 outline-none focus:border-brand-secondary transition-all text-xs font-bold uppercase tracking-widest"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100">
            {activeTab === 'tokens' && (
              <>
                <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-slate-400">Qty:</span>
                  <input
                    type="number"
                    value={tokenCount}
                    onChange={(e) => setTokenCount(parseInt(e.target.value))}
                    className="w-12 text-center font-black text-slate-900 bg-transparent outline-none"
                  />
                </div>
                <button
                  onClick={generateTokens}
                  disabled={generating}
                  className="bg-brand-primary text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center space-x-2 hover:bg-brand-secondary transition-all disabled:opacity-50"
                >
                  {generating ? <RefreshCw className="animate-spin" size={14} /> : <Plus size={14} />}
                  <span>Generate Tokens</span>
                </button>
                <div className="w-px h-8 bg-slate-100 hidden md:block" />
              </>
            )}
            
            {(activeTab === 'tokens' || activeTab === 'submissions') && (
              <button
                onClick={downloadCSV}
                className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center space-x-2 hover:bg-slate-200 transition-all"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            )}

            <div className="w-px h-8 bg-slate-100 hidden md:block" />
            
            <button
              onClick={deleteAllData}
              className="bg-red-50 text-red-600 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center space-x-2 hover:bg-red-600 hover:text-white transition-all ml-auto"
            >
              <Trash2 size={14} />
              <span>Wipe Data</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="animate-spin text-brand-primary" size={32} />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing Live Data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {activeTab === 'tokens' && (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Token</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Info</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Matric No.</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dept/Cat</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredTokens.map(token => (
                      <tr key={token.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6 font-mono font-black text-slate-900 tracking-widest uppercase">{token.token}</td>
                        <td className="px-8 py-6">
                           <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900 uppercase">{token.full_name}</span>
                            <span className="text-[9px] font-medium text-slate-400 lowercase">{token.email_phone}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-[10px] font-black text-slate-600 font-mono">{(token as any).matric_number || 'N/A'}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{token.department}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{token.category}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            token.has_submitted ? 'bg-green-50 text-green-600' : 
                            token.has_started_exam ? 'bg-purple-50 text-purple-600' : 
                            'bg-slate-50 text-slate-400'
                          }`}>
                            {token.has_submitted ? <CheckCircle2 size={12} /> : 
                             token.has_started_exam ? <RefreshCw size={12} className="animate-spin" /> : 
                             <Ticket size={12} />}
                            <span>{token.has_submitted ? 'Submitted' : 
                                   token.has_started_exam ? 'In Progress' : 
                                   'Not Used'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button 
                            onClick={() => deleteToken(token.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'submissions' && (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rank</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Participant</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Score</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Time Used</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {leaderboard.map((sub, index) => (
                      <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-slate-200 text-slate-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-50 text-slate-400'
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 uppercase tracking-tight text-sm">{sub.full_name}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Token: {sub.token}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="text-lg font-black text-brand-primary tracking-tighter">{sub.score}</span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="text-xs font-bold text-slate-500">
                            {Math.floor((sub.time_used || 0) / 60)}m {(sub.time_used || 0) % 60}s
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button 
                            onClick={() => deleteToken(sub.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === 'questions' && (
                <div className="p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Question Bank</h3>
                    <button 
                      onClick={() => setShowQuestionForm(!showQuestionForm)}
                      className="bg-brand-primary text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center space-x-2 hover:bg-brand-secondary transition-all"
                    >
                      <PlusCircle size={14} />
                      <span>{showQuestionForm ? 'Cancel' : 'Add Question'}</span>
                    </button>
                  </div>

                  <AnimatePresence>
                    {showQuestionForm && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-slate-50 p-8 rounded-3xl border border-brand-primary/10 overflow-hidden space-y-12"
                      >
                        <div className="space-y-6">
                           <div className="flex items-center space-x-3">
                            <PlusCircle className="text-brand-primary" size={20} />
                            <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Bulk Import (Pro Mode)</h4>
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            Paste questions in format: <span className="text-brand-secondary">Question | Option A | Option B | Option C | Option D | Answer(A/B/C/D) | Category</span>
                            <br/>One question per line.
                          </p>
                          <textarea
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                            className="w-full h-48 p-4 rounded-xl border border-slate-200 outline-none focus:border-brand-primary font-mono text-[10px] bg-white"
                            placeholder="Example: What is 2+2? | 3 | 4 | 5 | 6 | B | General"
                            disabled={importing}
                          />
                          <button
                            onClick={handleBulkImport}
                            disabled={importing || !bulkText.trim()}
                            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-black transition-all flex items-center space-x-2 disabled:opacity-50"
                          >
                            {importing ? <RefreshCw className="animate-spin" size={14} /> : <Zap size={14} />}
                            <span>Process Bulk Import</span>
                          </button>
                        </div>

                        <div className="h-px bg-slate-200 w-full" />

                        <div className="space-y-6 pt-4">
                          <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">Single Question Entry</h4>
                          <form onSubmit={handleAddQuestion} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-400">Question Text</label>
                              <textarea
                                required
                                value={newQuestion.question}
                                onChange={(e) => setNewQuestion({...newQuestion, question: e.target.value})}
                                className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:border-brand-primary h-24"
                                placeholder="Enter question..."
                                disabled={loading}
                              />
                            </div>
                            
                            {['a', 'b', 'c', 'd'].map(opt => (
                              <div key={opt} className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400">Option {opt.toUpperCase()}</label>
                                <input
                                  required
                                  type="text"
                                  value={(newQuestion as any)[`option_${opt}`]}
                                  onChange={(e) => setNewQuestion({...newQuestion, [`option_${opt}`]: e.target.value})}
                                  className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:border-brand-primary"
                                  placeholder={`Option ${opt.toUpperCase()} text`}
                                  disabled={loading}
                                />
                              </div>
                            ))}

                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-400">Correct Answer</label>
                              <select
                                value={newQuestion.correct_answer}
                                onChange={(e) => setNewQuestion({...newQuestion, correct_answer: e.target.value as any})}
                                className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:border-brand-primary bg-white font-bold"
                                disabled={loading}
                              >
                                {['A', 'B', 'C', 'D'].map(val => <option key={val} value={val}>Option {val}</option>)}
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-400">Category</label>
                              <select
                                value={newQuestion.category}
                                onChange={(e) => setNewQuestion({...newQuestion, category: e.target.value})}
                                className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:border-brand-primary bg-white font-bold"
                                disabled={loading}
                              >
                                <option value="Science Courses">Science Courses</option>
                                <option value="Social Science">Social Science</option>
                                <option value="Art Courses">Art Courses</option>
                                <option value="General">General</option>
                              </select>
                            </div>
                          </div>
                          
                          <button
                            type="submit"
                            disabled={loading}
                            className="bg-brand-primary text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center space-x-2 w-full md:w-auto"
                          >
                            {loading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                            <span>Save Question to Bank</span>
                          </button>
                        </form>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                  <div className="grid grid-cols-1 gap-6">
                    {questions.length === 0 ? (
                      <div className="p-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem]">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No questions found</p>
                      </div>
                    ) : (
                      questions.map((q, idx) => (
                        <div key={q.id} className="bg-slate-50 rounded-3xl p-8 border border-slate-100 space-y-4 group relative">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="bg-brand-secondary/10 text-brand-secondary px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                {q.category}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Q{idx + 1}</span>
                            </div>
                            <button 
                              onClick={() => deleteQuestion(q.id)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <p className="text-lg font-black text-slate-900 leading-tight">{q.question}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['A', 'B', 'C', 'D'].map(key => (
                              <div key={key} className={`p-4 rounded-2xl border flex items-center space-x-3 ${q.correct_answer === key ? 'border-green-200 bg-green-50/50' : 'border-white bg-white'}`}>
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${q.correct_answer === key ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                  {key}
                                </span>
                                <span className="text-xs font-bold text-slate-600">{(q as any)[`option_${key.toLowerCase()}`]}</span>
                                {q.correct_answer === key && <CheckCircle2 size={14} className="text-green-500 ml-auto" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="p-8 md:p-12 space-y-12">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Quiz Configuration</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Timer & Lock Settings</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6">
                        <div className="flex items-center space-x-3 text-brand-primary">
                          <Clock size={20} />
                          <span className="text-sm font-black uppercase tracking-widest">Exam Deadline</span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          This sets when the exam globally expires. After this time, 
                          no one can register or start the exam. It will also lock the exam entry page.
                        </p>
                        <div className="space-y-2">
                          <input
                            type="datetime-local"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="w-full p-4 rounded-2xl border border-slate-200 outline-none focus:border-brand-primary bg-white font-black text-slate-900"
                          />
                          <p className="text-[9px] text-slate-400 text-right">Format: YYYY-MM-DD HH:MM</p>
                        </div>
                      </div>

                      <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6">
                        <div className="flex items-center space-x-3 text-brand-primary">
                          <Timer size={20} />
                          <span className="text-sm font-black uppercase tracking-widest">Exam Duration</span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          Set the maximum time allowed for each student in minutes.
                        </p>
                        <div className="flex items-center space-x-4">
                          <input
                            type="number"
                            value={examDuration}
                            onChange={(e) => setExamDuration(parseInt(e.target.value))}
                            className="w-24 p-4 rounded-2xl border border-slate-200 outline-none focus:border-brand-primary bg-white font-black text-slate-900 text-center text-xl"
                          />
                          <span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Minutes</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                       <div className="p-8 bg-brand-primary rounded-[2.5rem] text-white space-y-4">
                        <ShieldAlert className="text-brand-accent animate-pulse" size={32} />
                        <h4 className="text-lg font-black uppercase tracking-tight">Master Exam Control</h4>
                        <p className="text-xs text-indigo-100/70 font-medium leading-relaxed">
                          Updating these settings will affect all current and future participants. 
                          The exam will be locked automatically when the deadline is reached.
                        </p>
                      </div>

                      <button
                        onClick={saveSettings}
                        disabled={loading}
                        className="w-full bg-brand-primary text-white p-6 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center space-x-3 hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/20 active:scale-95 disabled:opacity-50"
                      >
                        {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                        <span>Publish Global Settings</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const QuizAdminGate = () => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const adminPass = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';
    if (password === adminPass || password.trim() === adminPass) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid password. Access denied.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 bg-slate-50/50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-brand-primary w-full max-w-md rounded-[2rem] shadow-2xl p-8 md:p-10 border border-white/5 space-y-8"
        >
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-6">
              <Logo iconClassName="w-20 h-20" dark={true} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Exam Admin Access</h1>
            <p className="text-sm text-indigo-100/70 font-medium">Enter the secret password to continue.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/50 outline-none transition-all text-center text-base tracking-widest font-mono text-white placeholder:text-indigo-300/30"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-100/50 hover:text-brand-accent transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] text-red-400 text-center font-bold"
                >
                  {error}
                </motion.p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-white text-brand-primary p-4 rounded-2xl font-black shadow-xl hover:bg-slate-50 transition-all text-xs uppercase tracking-widest active:scale-[0.98]"
            >
              Unlock Dashboard
            </button>
            <p className="text-[9px] text-indigo-100/40 text-center mt-4 uppercase tracking-widest font-black">
              Authorized Personnel Only
            </p>
          </form>
        </motion.div>
      </div>
    );
  }

  return <QuizAdminDashboard />;
};

export default QuizAdminGate;
