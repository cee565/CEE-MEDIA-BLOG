import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { Token, Submission, Question } from '../types';
import { toast } from 'sonner';
import { 
  Plus, Ticket, Users, BarChart3, Trash2, 
  Download, RefreshCw, Search, Filter, 
  ShieldCheck, ShieldAlert, PlusCircle,
  FileText, CheckCircle2
} from 'lucide-react';
import Logo from '../components/Logo';

const QuizAdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tokens' | 'submissions' | 'questions'>('tokens');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tokenCount, setTokenCount] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tokensRes, submissionsRes, questionsRes] = await Promise.all([
        supabase.from('tokens').select('*').order('created_at', { ascending: false }),
        supabase.from('submissions').select('*, tokens(token, participant_name)').order('submitted_at', { ascending: false }),
        supabase.from('questions').select('*').order('created_at', { ascending: false })
      ]);

      if (tokensRes.data) setTokens(tokensRes.data);
      if (submissionsRes.data) setSubmissions(submissionsRes.data as Submission[]);
      if (questionsRes.data) setQuestions(questionsRes.data);
    } catch (err) {
      console.error('Failed to fetch admin data', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const generateTokens = async () => {
    setGenerating(true);
    try {
      const newTokens = Array.from({ length: tokenCount }).map(() => ({
        token: `WA${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        category: 'Art', // Default category for manual generation
        participant_name: 'Manual Generation'
      }));

      const { error } = await supabase.from('tokens').insert(newTokens);
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

  const deleteToken = async (id: string) => {
    if (!confirm('Are you sure you want to delete this token?')) return;
    try {
      const { error } = await supabase.from('tokens').delete().eq('id', id);
      if (error) throw error;
      setTokens(prev => prev.filter(t => t.id !== id));
      toast.success('Token deleted');
    } catch (err) {
      toast.error('Failed to delete token');
    }
  };

  const deleteSubmission = async (id: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;
    try {
      const { error } = await supabase.from('submissions').delete().eq('id', id);
      if (error) throw error;
      setSubmissions(prev => prev.filter(s => s.id !== id));
      toast.success('Submission deleted');
    } catch (err) {
      toast.error('Failed to delete submission');
    }
  };

  const filteredTokens = tokens.filter(t => 
    t.token.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.participant_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const filteredSubmissions = submissions.filter(s => 
    (s.tokens?.participant_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.tokens?.token.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Sidebar/Header */}
      <header className="bg-brand-primary p-6 text-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <Logo iconClassName="w-12 h-12" showText={false} dark={true} />
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter">Quiz <span className="text-brand-accent">Admin</span></h1>
              <p className="text-indigo-100/70 text-[10px] font-black uppercase tracking-widest">Competition Management System</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-white/10 p-1 rounded-2xl">
            {[
              { id: 'tokens', icon: Ticket, label: 'Tokens' },
              { id: 'submissions', icon: BarChart3, label: 'Results' },
              { id: 'questions', icon: FileText, label: 'Questions' }
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
            { label: 'Total Tokens', value: tokens.length, icon: Ticket, color: 'text-blue-600' },
            { label: 'Used Tokens', value: tokens.filter(t => t.is_used).length, icon: ShieldCheck, color: 'text-green-600' },
            { label: 'Submissions', value: submissions.length, icon: Users, color: 'text-purple-600' },
            { label: 'Questions', value: questions.length, icon: FileText, color: 'text-orange-600' }
          ].map(stat => (
            <div key={stat.label} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl bg-slate-50 ${stat.color}`}>
                  <stat.icon size={18} />
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
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-4 pl-12 rounded-2xl bg-white border border-slate-100 outline-none focus:border-brand-secondary transition-all text-xs font-bold uppercase tracking-widest"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          </div>

          {activeTab === 'tokens' && (
            <div className="flex items-center space-x-4 bg-white p-2 rounded-2xl border border-slate-100">
              <input
                type="number"
                value={tokenCount}
                onChange={(e) => setTokenCount(parseInt(e.target.value))}
                className="w-20 p-2 text-center font-black text-slate-900 bg-slate-50 rounded-xl outline-none"
              />
              <button
                onClick={generateTokens}
                disabled={generating}
                className="bg-brand-primary text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center space-x-2 hover:bg-brand-secondary transition-all disabled:opacity-50"
              >
                {generating ? <RefreshCw className="animate-spin" size={14} /> : <Plus size={14} />}
                <span>Generate Tokens</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="animate-spin text-brand-primary" size={32} />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing Data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {activeTab === 'tokens' && (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Token</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Created</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredTokens.map(token => (
                      <tr key={token.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6 font-mono font-black text-slate-900 tracking-widest uppercase">{token.token}</td>
                        <td className="px-8 py-6">
                          <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            token.is_used ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                          }`}>
                            {token.is_used ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
                            <span>{token.is_used ? 'Used' : 'Unused'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-xs text-slate-500 font-medium">
                          {new Date(token.created_at).toLocaleDateString()}
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
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Participant</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredSubmissions.map(sub => (
                      <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 uppercase tracking-tight text-sm">{sub.tokens?.participant_name}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Token: {sub.tokens?.token}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-lg font-black text-brand-primary tracking-tighter">{sub.score}</span>
                        </td>
                        <td className="px-8 py-6 text-xs text-slate-500 font-medium">
                          {Math.floor(sub.time_taken / 60)}m {sub.time_taken % 60}s
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button 
                            onClick={() => deleteSubmission(sub.id)}
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
                <div className="p-8 text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300">
                      <FileText size={40} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Question Management</h3>
                    <p className="text-slate-500 text-xs font-medium max-w-sm mx-auto">
                      Use the main Admin Panel to add, edit, or remove quiz questions.
                    </p>
                  </div>
                  <button 
                    onClick={() => window.location.href = '/admin'}
                    className="bg-brand-primary text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-brand-secondary transition-all"
                  >
                    Go to Main Admin
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default QuizAdminPage;
