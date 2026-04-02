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
        .select('*')
        .in('id', storedIds)
        .eq('approved', false) // Only show pending messages here
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
      toast.success('Message sent! Awaiting admin approval.');
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

  const isSupabaseConfigured = !!(import.meta as any).env.VITE_SUPABASE_URL && !!(import.meta as any).env.VITE_SUPABASE_ANON_KEY;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {!isSupabaseConfigured && (
        <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl text-red-700 text-[10px] font-medium flex items-center space-x-2">
          <ShieldAlert size={14} />
          <span>Supabase is not configured. Please check your environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).</span>
        </div>
      )}
      <div className="text-center space-y-1.5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center space-x-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-full text-[10px] font-bold"
        >
          <Logo iconClassName="w-4 h-4" showText={false} />
          <span className="tracking-widest uppercase text-[9px]">ANONYMOUS PORTAL</span>
        </motion.div>
        <h1 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">WRITE YOUR <span className="text-orange-500">MESSAGE</span></h1>
        <p className="text-slate-500 text-sm max-w-xl mx-auto font-bold tracking-tight uppercase">Share your thoughts, secrets, or gist anonymously.</p>
      </div>

      {/* Message Form */}
      <section className="bg-white rounded-[1.25rem] card-shadow p-4 md:p-5 border border-slate-50 space-y-3">
        <div className="flex items-center space-x-1.5 text-orange-500">
          <ShieldAlert size={18} />
          <span className="font-bold text-xs">Completely Anonymous</span>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind? (Your identity is safe)"
            className="w-full h-24 p-3 rounded-xl bg-slate-50 border border-slate-100 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all resize-none text-slate-700 text-xs"
            maxLength={500}
          />
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-slate-400">{content.length}/500 characters</span>
            <button
              type="submit"
              disabled={!content.trim() || sending}
              className="bg-orange-500 text-white px-5 py-1.5 rounded-full font-bold shadow-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all text-xs"
            >
              {sending ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send size={14} />
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
              className="flex flex-col items-center justify-center space-y-2 text-green-600 font-bold text-xs bg-green-50 p-4 rounded-2xl border border-green-100"
            >
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 size={18} />
                <span>Sent! Awaiting admin approval.</span>
              </div>
              <p className="text-[10px] text-green-500 font-medium">Your message will appear on the confessions board once approved.</p>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center space-x-1.5 text-red-600 font-bold text-xs bg-red-50 p-2.5 rounded-xl"
            >
              <ShieldAlert size={16} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* History Section */}
      {myMessages.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-800 flex items-center">
            <History size={18} className="mr-2 text-orange-500" />
            Your Recent Submissions
          </h2>
          <div className="space-y-2.5">
            {myMessages.map((msg) => (
              <div key={msg.id} className="bg-white p-3 rounded-xl border border-slate-100 card-shadow space-y-1.5">
                <p className="text-slate-600 italic text-xs">"{msg.content}"</p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-1.5 text-[9px] text-slate-400">
                    <Clock size={10} />
                    <span>{formatDistanceToNow(new Date(msg.created_at))} ago</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-[8px] font-bold uppercase tracking-wider">
                    Pending Approval
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Info Section */}
      <section className="bg-purple-50 rounded-[1.25rem] p-5 border border-purple-100 space-y-2.5">
        <h2 className="text-base font-bold text-purple-900 flex items-center">
          <MessageCircle size={18} className="mr-2 text-purple-600" />
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <div className="w-6 h-6 bg-purple-200 rounded-lg flex items-center justify-center text-purple-700 font-bold text-[10px]">1</div>
            <p className="text-[10px] text-purple-800 font-medium">Write your message anonymously.</p>
          </div>
          <div className="space-y-1">
            <div className="w-6 h-6 bg-purple-200 rounded-lg flex items-center justify-center text-purple-700 font-bold text-[10px]">2</div>
            <p className="text-[10px] text-purple-800 font-medium">Our admin team reviews it for safety.</p>
          </div>
          <div className="space-y-1">
            <div className="w-6 h-6 bg-purple-200 rounded-lg flex items-center justify-center text-purple-700 font-bold text-[10px]">3</div>
            <p className="text-[10px] text-purple-800 font-medium">Approved messages appear on the board.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ConfessionsPage;
