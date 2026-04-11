import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { Message } from '../types';
import { Send, MessageCircle, ShieldAlert, CheckCircle2, History, Clock } from 'lucide-react';
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
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-12">
      {!isSupabaseConfigured && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-red-700 text-xs font-medium flex items-center space-x-3">
          <ShieldAlert size={18} />
          <span>Supabase is not configured. Please check your environment variables.</span>
        </div>
      )}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center space-x-2 bg-brand-primary text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase"
        >
          <Logo iconClassName="w-4 h-4" showText={false} />
          <span>Anonymous Portal</span>
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">
          WRITE YOUR <span className="text-brand-accent">MESSAGE</span>
        </h1>
        <p className="text-slate-500 text-sm md:text-base max-w-xl mx-auto font-medium">
          Share your thoughts, secrets, or gist anonymously. Your identity is completely safe.
        </p>
      </div>

      {/* Message Form */}
      <section className="bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center space-x-2 text-brand-accent">
          <ShieldAlert size={20} />
          <span className="font-black text-xs uppercase tracking-widest">Completely Anonymous</span>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Your Message</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?..."
              className="w-full h-32 p-5 rounded-2xl bg-slate-50 border border-slate-100 focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/5 outline-none transition-all resize-none text-slate-700 text-sm font-medium"
              maxLength={500}
            />
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{content.length}/500 characters</span>
            <button
              type="submit"
              disabled={!content.trim() || sending}
              className="bg-brand-primary text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-brand-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send size={16} />
                  <span>Send Anonymously</span>
                </>
              )}
            </button>
          </div>
        </form>

        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center space-y-2 text-green-600 font-black text-xs bg-green-50 p-6 rounded-2xl border border-green-100"
            >
              <div className="flex items-center space-x-2">
                <CheckCircle2 size={20} />
                <span className="uppercase tracking-widest">Sent Successfully!</span>
              </div>
              <p className="text-[10px] text-green-500 font-medium opacity-80 uppercase tracking-widest">Will appear on the board once approved.</p>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center space-x-2 text-red-600 font-black text-xs bg-red-50 p-4 rounded-xl border border-red-100"
            >
              <ShieldAlert size={18} />
              <span className="uppercase tracking-widest">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* History Section */}
      {myMessages.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-1 h-6 bg-brand-accent rounded-full" />
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
              Your Recent Submissions
            </h2>
          </div>
          <div className="space-y-4">
            {myMessages.map((msg) => (
              <div key={msg.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <p className="text-slate-600 italic text-sm font-medium leading-relaxed">"{msg.content}"</p>
                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                  <div className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Clock size={12} />
                    <span>{formatDistanceToNow(new Date(msg.created_at))} ago</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    msg.approved ? 'bg-green-50 text-green-600' : 'bg-brand-accent/10 text-brand-accent'
                  }`}>
                    {msg.approved ? 'Approved' : 'Pending Approval'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Info Section */}
      <section className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 space-y-6">
        <div className="flex items-center space-x-3">
          <MessageCircle size={24} className="text-brand-secondary" />
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">How it works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: 1, text: "Write your message anonymously." },
            { step: 2, text: "Our admin team reviews it for safety." },
            { step: 3, text: "Approved messages appear on the board." }
          ].map((item) => (
            <div key={item.step} className="space-y-3">
              <div className="w-8 h-8 bg-brand-secondary text-white rounded-xl flex items-center justify-center font-black text-xs">
                {item.step}
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ConfessionsPage;
