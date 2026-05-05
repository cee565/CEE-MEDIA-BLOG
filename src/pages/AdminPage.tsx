import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { toast } from 'sonner';
import { Shield, Trash2, Users, RefreshCw, Search, ArrowLeft, Download, FileText, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ totalUsers: 0, submitted: 0, nonSubmitted: 0 });
  const navigate = useNavigate();

  const [view, setView] = useState<'confessions'>('confessions');
  const [confessions, setConfessions] = useState<any[]>([]);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchConfessions();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'ceemedia2026';
    if (password === correctPassword) {
      setIsAuthenticated(true);
      toast.success('Access Granted');
    } else {
      toast.error('Invalid Password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-[2.5rem] p-10 md:p-16 max-w-md w-full space-y-8 shadow-2xl">
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 bg-brand-primary/10 rounded-2xl text-brand-primary">
              <Shield size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Admin <span className="text-brand-secondary">Gate</span></h1>
            <p className="text-slate-500 font-medium text-sm">Enter the super secret password to access the CEE MEDIA dashboard.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password..."
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary transition-all font-mono"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/20"
            >
              Access Portal
            </button>
          </form>
          <button 
            onClick={() => navigate('/')}
            className="w-full text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600 transition-colors"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mock_exam_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setUsers(data || []);
      const submitted = data?.filter(u => u.has_submitted).length || 0;
      setStats({
        totalUsers: data?.length || 0,
        submitted,
        nonSubmitted: (data?.length || 0) - submitted
      });
    } catch (err: any) {
      toast.error('Failed to fetch users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfessions = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setConfessions(data || []);
    } catch (err) {
      console.error('Failed to fetch confessions', err);
    }
  };

  const approveConfession = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ approved: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      toast.success(currentStatus ? 'Confession hidden' : 'Confession approved!');
      fetchConfessions();
    } catch (err: any) {
      toast.error('Operation failed: ' + err.message);
    }
  };

  const deleteConfession = async (id: string) => {
    if (!window.confirm('Delete this confession forever?')) return;
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Confession deleted');
      fetchConfessions();
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  const deleteUser = async (id: string, matric: string) => {
    if (!window.confirm(`Are you sure you want to delete registration for ${matric}?`)) return;

    try {
      const { error } = await supabase
        .from('mock_exam_users')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success(`User ${matric} deleted.`);
      fetchUsers();
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  const wipeAllData = async () => {
    if (!window.confirm("CRITICAL WARNING: This will delete ALL registrations and ALL exam results. This cannot be undone. Type 'DELETE' to confirm.")) {
        return;
    }
    
    setLoading(true);
    try {
      // 1. Wipe Submissions
      await supabase.from('submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      // 2. Wipe Users
      await supabase.from('mock_exam_users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      toast.success('System wiped clean!');
      fetchUsers();
    } catch (err: any) {
      toast.error('Wipe failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (users.length === 0) return;
    
    const headers = ['Name', 'Matric Number', 'Token', 'Department', 'Category', 'Score', 'Submitted', 'Date'];
    const rows = users.map(u => [
      u.full_name,
      u.matric_number,
      u.token,
      u.department,
      u.category,
      u.score || 0,
      u.has_submitted ? 'YES' : 'NO',
      new Date(u.created_at).toLocaleDateString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ceemedia_exam_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.matric_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.token.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-slate-400 hover:text-brand-primary transition-colors mb-2 text-xs font-black uppercase tracking-widest"
            >
              <ArrowLeft size={14} />
              <span>Back to Home</span>
            </button>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-brand-primary rounded-2xl shadow-lg shadow-brand-primary/20">
                <Shield className="text-white" size={24} />
              </div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">CEE MEDIA <span className="text-brand-secondary">DASHBOARD</span></h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={exportToCSV}
              className="flex items-center space-x-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
            <button 
              onClick={fetchUsers}
              className="flex items-center space-x-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button 
              onClick={wipeAllData}
              className="flex items-center space-x-2 bg-red-500 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
            >
              <Trash2 size={14} />
              <span>Wipe System</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-2xl w-fit">
          <button 
            className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-white text-brand-primary shadow-sm"
          >
            Confessions
          </button>
        </div>

        {/* Table/Search Section */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white overflow-hidden">
          <div className="divide-y divide-slate-50">
            <div className="p-6 border-b border-slate-50">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center space-x-3">
                <FileText className="text-brand-primary" />
                <span>Confession Moderation</span>
              </h3>
            </div>
            
            {confessions.map((confession) => (
              <div key={confession.id} className="p-6 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="space-y-2 flex-grow">
                  <p className="text-slate-900 font-medium text-sm leading-relaxed">{confession.content}</p>
                  <div className="flex items-center space-x-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {new Date(confession.created_at).toLocaleString()}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${confession.approved ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                      {confession.approved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => approveConfession(confession.id, confession.approved)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${confession.approved ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}
                  >
                    {confession.approved ? 'Hide' : 'Approve'}
                  </button>
                  <button 
                    onClick={() => deleteConfession(confession.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            
            {confessions.length === 0 && (
              <div className="p-20 text-center space-y-4">
                <FileText size={48} className="mx-auto text-slate-100" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No confessions found in database.</p>
              </div>
            )}
          </div>
          
          <div className="p-6 bg-slate-50/50 border-t border-slate-50">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              CEE MEDIA Confessions Management
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
