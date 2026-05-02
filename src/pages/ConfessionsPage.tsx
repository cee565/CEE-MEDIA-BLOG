import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { Message } from '../types';
import { Send, ShieldAlert, CheckCircle2, History, Clock, RefreshCw, ShieldCheck, Heart, MessageSquare, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import Logo from '../components/Logo';

const ConfessionsPage = () => {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myMessages, setMyMessages] = useState<Message[]>([]);

  useEffect(() => {
    fetchMyMessages();

    // Subscribe to changes to update status in real-time
    const channel = supabase
      .channel('my_messages_channel')
      .on('postgres_changes' as any, { event: '*', table: 'messages' }, () => {
        fetchMyMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMyMessages = async () => {
    const storedIds = JSON.parse(localStorage.getItem('my_confession_ids') || '[]');
    if (storedIds.length === 0) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('id, content, approved, likes, created_at')
        .in('id', storedIds)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMyMessages(data as Message[]);
    } catch (err) {
      console.error("Failed to fetch my messages", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || sending) return;

    setSending(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('messages')
        .insert({
          content: content.trim(),
          approved: false // Needs admin approval
        })
        .select();
      
      if (insertError) {
        console.error("Supabase Insert Error:", insertError);
        throw insertError;
      }

      if (data && (data as any).length > 0) {
        const storedIds = JSON.parse(localStorage.getItem('my_confession_ids') || '[]');
        const newIds = [(data as any)[0].id, ...storedIds].slice(0, 50); // Keep last 50
        localStorage.setItem('my_confession_ids', JSON.stringify(newIds));
        fetchMyMessages();
      }

      setContent('');
      setSuccess(true);
      toast.success('Message sent! It will appear on the board once approved.');
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      console.error("Message send failed", err);
      let errorMessage = "Failed to send message. Please try again.";
      if (err.message?.includes("row-level security")) {
        errorMessage = "Permission denied. Please ensure Supabase RLS policies allow anonymous submissions.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Logo iconClassName="w-8 h-8" showText={false} />
            <span className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">DROP <span className="text-brand-secondary">GIST</span></span>
          </Link>
          <div className="flex items-center space-x-6">
             <Link to="/confessions" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-secondary transition-colors">
              The Board
            </Link>
            {!isSupabaseConfigured && <ShieldAlert className="text-red-500" size={16} />}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto pt-32 pb-20 px-6 w-full relative">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl h-80 bg-brand-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Submission Form */}
          <div className="lg:col-span-7 space-y-8">
            <header className="space-y-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center space-x-2 bg-brand-secondary/10 text-brand-secondary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest"
              >
                <ShieldCheck size={12} />
                <span>100% Secure & Anonymous</span>
              </motion.div>
              <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-none uppercase tracking-tighter">
                Drop your <span className="text-brand-gradient">Gist</span>
              </h1>
              <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed max-w-xl">
                Got a secret, a crushed heart, or just campus news? 
                Tell us everything. It's anonymous, forever.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="group relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="The floor is yours. Type away..."
                  className="w-full h-80 p-8 rounded-[2.5rem] bg-white border border-slate-200 outline-none focus:border-brand-secondary focus:ring-8 focus:ring-brand-secondary/5 transition-all text-slate-800 font-medium leading-relaxed resize-none shadow-2xl shadow-slate-200/20 placeholder:text-slate-300"
                  required
                  maxLength={500}
                />
                <div className="absolute bottom-8 right-10 flex items-center space-x-2">
                  <div className="h-1 w-20 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-brand-secondary"
                      initial={{ width: 0 }}
                      animate={{ width: `${(content.length / 500) * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {content.length}/500
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3 text-slate-400 order-2 sm:order-1">
                  <ShieldAlert size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest tracking-[0.2em]">Verified Private Tunnel</span>
                </div>
                
                <button
                  type="submit"
                  disabled={sending || !content.trim()}
                  className="w-full sm:w-auto bg-brand-primary text-white pl-8 pr-10 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl hover:bg-brand-secondary transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center space-x-3 group order-1 sm:order-2"
                >
                  {sending ? (
                    <RefreshCw className="animate-spin" size={16} />
                  ) : (
                    <>
                      <span>Transmit Gist</span>
                      <Send size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-5 space-y-8">
            {/* Guidelines Card */}
            <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-brand-accent/20 blur-[80px] rounded-full group-hover:bg-brand-accent/30 transition-all pointer-events-none" />
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight relative z-10 leading-none">Whisper <span className="text-brand-accent">Code</span></h3>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Guardian Protocol Engaged</p>
              </div>
              
              <ul className="space-y-6 relative z-10">
                {[
                  { icon: Heart, text: 'Keep it respectfull & Fun', sub: 'No toxicity or harassment allowed' },
                  { icon: ShieldCheck, text: 'Identity Protection', sub: 'Never mention full names of others' },
                  { icon: Zap, text: 'Moderation System', sub: 'Posts are reviewed before going live' }
                ].map((item, i) => (
                  <motion.li 
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="flex items-start space-x-4"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-brand-accent shrink-0">
                      <item.icon size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-white leading-none">{item.text}</p>
                      <p className="text-[9px] font-medium text-white/50 mt-1">{item.sub}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
              <div className="pt-6 border-t border-white/5">
                 <Link to="/confessions" className="text-[10px] font-black text-brand-accent hover:text-brand-focus transition-all uppercase tracking-[0.2em] flex items-center space-x-2">
                   <span>Browse Public Board</span>
                   <Zap size={10} />
                 </Link>
              </div>
            </div>

            {/* My Submissions Card */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                 <div className="flex items-center space-x-3">
                   <History size={18} className="text-brand-secondary" />
                   <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Your Transmission Log</h4>
                 </div>
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Secure Connection" />
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {myMessages.length === 0 ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                      <MessageSquare size={24} className="text-slate-200" />
                    </div>
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">
                      No transmissions recorded on this device yet.
                    </p>
                  </div>
                ) : (
                  myMessages.map(msg => (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-3 group hover:border-brand-secondary/20 transition-all"
                    >
                      <p className="text-xs font-medium text-slate-600 line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                        "{msg.content}"
                      </p>
                      <div className="flex items-center justify-between pt-2">
                         <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{formatDistanceToNow(new Date(msg.created_at))} ago</span>
                         <span className={`text-[8px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${
                          msg.approved ? 'bg-green-100 text-green-700' : 'bg-brand-accent/20 text-brand-accent'
                        }`}>
                          {msg.approved ? 'Live' : 'Screening'}
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ConfessionsPage;
