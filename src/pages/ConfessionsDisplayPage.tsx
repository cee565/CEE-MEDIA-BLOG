import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { Message, MessageComment } from '../types';
import { MessageSquare, Heart, Clock, ShieldCheck, ChevronDown, ChevronUp, Send, User, Share2, Link, Check, X } from 'lucide-react';
import { WhatsAppIcon, XIcon, TikTokIcon } from '../components/BrandIcons';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import Logo from '../components/Logo';

const ConfessionCard = React.memo(({ message }: { message: Message }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [comments, setComments] = useState<MessageComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(message.likes || 0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const storageKey = `liked_confession_${message.id}`;

  useEffect(() => {
    if (localStorage.getItem(storageKey)) setLiked(true);
  }, [message.id]);

  useEffect(() => {
    setLocalLikes(message.likes || 0);
  }, [message.likes]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('message_comments')
        .select('*')
        .eq('message_id', message.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      if (data) setComments(data as MessageComment[]);
    } catch (err) {
      console.error("Failed to fetch comments", err);
    }
  };

  useEffect(() => {
    if (showComments) {
      fetchComments();
      
      const channel = supabase
        .channel(`comments_${message.id}`)
        .on('postgres_changes' as any, { 
          event: '*', 
          table: 'message_comments',
          filter: `message_id=eq.${message.id}`
        }, () => {
          fetchComments();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [showComments, message.id]);

  const handleSupport = async () => {
    if (liked) return;
    
    // Optimistic update
    setLocalLikes(prev => prev + 1);
    setLiked(true);
    localStorage.setItem(storageKey, 'true');

    try {
      // Fetch current message to get latest likes count
      // Using maybeSingle() instead of single() to avoid error if not found
      const { data: currentMsg, error: fetchError } = await supabase
        .from('messages')
        .select('likes')
        .eq('id', message.id)
        .maybeSingle();
      
      if (fetchError) throw fetchError;

      const newLikes = ((currentMsg?.likes || 0) + 1);
      const { error: updateError } = await supabase
        .from('messages')
        .update({ likes: newLikes })
        .eq('id', message.id);

      if (updateError) throw updateError;
      toast.success('Message supported!');
    } catch (err: any) {
      console.error("Failed to support message", err);
      // Rollback on error
      setLocalLikes(prev => Math.max(0, prev - 1));
      setLiked(false);
      localStorage.removeItem(storageKey);
      
      let errorMessage = "Failed to support message.";
      if (err.message?.includes("row-level security")) {
        errorMessage = "Permission denied. Please try again later.";
      } else if (err.code === 'PGRST116') {
        errorMessage = "Message not found.";
      } else if (err.message) {
        errorMessage = `Error: ${err.message}`;
      }
      
      toast.error(errorMessage);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('message_comments')
        .insert({
          message_id: message.id,
          content: newComment.trim(),
          parent_id: replyTo ? replyTo.id : null
        });
      
      if (error) throw error;
      
      setNewComment('');
      setReplyTo(null);
      fetchComments(); // Refresh comments
      toast.success(replyTo ? 'Reply added!' : 'Comment added!');
    } catch (err: any) {
      console.error("Failed to add comment", err);
      toast.error(err.message || "Failed to add comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}/confessions?id=${message.id}`;
  const shareText = `Check out this anonymous confession on CEE MEDIA: "${message.content.substring(0, 50)}..."`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareToWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
  };

  const shareToWhatsAppBusiness = () => {
    // WhatsApp Business uses the same API but we can label it differently in UI
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
  };

  const truncatedContent = message.content.length > 150 
    ? message.content.substring(0, 150) + "..."
    : message.content;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-[1rem] card-shadow border border-slate-100 relative overflow-hidden group flex flex-col"
    >
      <div className="p-3 space-y-3 flex-grow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-purple-600">
            <MessageSquare size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest">Anonymous</span>
          </div>
          <div className="flex items-center space-x-1 text-slate-400 text-[9px] font-medium">
            <Clock size={10} />
            <span>{format(new Date(message.created_at), 'MMM d')}</span>
          </div>
        </div>

        <div 
          className="cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <p className="text-slate-700 text-xs leading-relaxed font-medium italic">
            "{isExpanded ? message.content : truncatedContent}"
          </p>
          {message.content.length > 150 && (
            <button 
              className="mt-0.5 text-purple-600 text-[10px] font-bold flex items-center space-x-1 hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              <span>{isExpanded ? 'Show Less' : 'Read Full Story'}</span>
              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>

        <div className="pt-2.5 border-t border-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <button 
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center space-x-1 transition-colors ${showComments ? 'text-purple-600' : 'text-slate-400 hover:text-purple-500'}`}
            >
              <MessageSquare size={14} />
              <span className="text-[9px] font-bold">{showComments ? 'Hide' : 'Comments'}</span>
            </button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSupport}
              className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full transition-all ${
                liked 
                  ? 'bg-pink-50 text-pink-600 border border-pink-100' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-pink-500 border border-transparent'
              }`}
            >
              <Heart 
                size={14} 
                className={`transition-all ${liked || localLikes > 0 ? 'fill-pink-500 text-pink-500' : ''} ${liked ? 'animate-bounce' : ''}`} 
              />
              <span className="text-xs font-black">{localLikes}</span>
              <span className="text-[8px] font-bold uppercase tracking-tighter opacity-60">Support</span>
            </motion.button>
            <div className="relative">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowShareMenu(!showShareMenu)}
                className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full transition-all ${
                  showShareMenu 
                    ? 'bg-purple-50 text-purple-600 border border-purple-100' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-purple-500 border border-transparent'
                }`}
              >
                <Share2 size={14} />
                <span className="text-[8px] font-bold uppercase tracking-tighter opacity-60">Share</span>
              </motion.button>

              <AnimatePresence>
                {showShareMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowShareMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full left-0 mb-2 w-40 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50"
                    >
                      <div className="p-1.5 space-y-0.5">
                        <button 
                          onClick={() => { copyToClipboard(); setShowShareMenu(false); }}
                          className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-700"
                        >
                          {copied ? <Check size={14} className="text-green-500" /> : <Link size={14} />}
                          <span className="text-[10px] font-bold">{copied ? 'Copied!' : 'Copy Link'}</span>
                        </button>
                        <button 
                          onClick={() => { shareToTwitter(); setShowShareMenu(false); }}
                          className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-700"
                        >
                          <XIcon size={14} className="text-black" />
                          <span className="text-[10px] font-bold">X</span>
                        </button>
                        <button 
                          onClick={() => { shareToWhatsApp(); setShowShareMenu(false); }}
                          className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-700"
                        >
                          <WhatsAppIcon size={14} className="text-green-500" />
                          <span className="text-[10px] font-bold">WhatsApp</span>
                        </button>
                        <button 
                          onClick={() => { copyToClipboard(); setShowShareMenu(false); }}
                          className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-700"
                        >
                          <TikTokIcon size={14} className="text-black" />
                          <span className="text-[10px] font-bold">TikTok</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <Logo iconClassName="w-3 h-3" showText={false} />
            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
              CEE MEDIA VERIFIED
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100 bg-slate-50/50 overflow-hidden"
          >
            <div className="p-3 space-y-3">
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1.5 custom-scrollbar">
                {comments.length > 0 ? (
                  comments
                    .filter(c => !c.parent_id)
                    .map((comment) => (
                    <div key={comment.id} className="space-y-2.5">
                      <div className="flex space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                          <User size={12} className="text-slate-500" />
                        </div>
                        <div className="bg-white p-2.5 rounded-xl rounded-tl-none border border-slate-100 shadow-sm flex-grow">
                          <p className="text-xs text-slate-700">{comment.content}</p>
                          <div className="flex items-center space-x-2.5 mt-0.5">
                            <span className="text-[9px] text-slate-400 block">
                              {formatDistanceToNow(new Date(comment.created_at))} ago
                            </span>
                            <button 
                              onClick={() => setReplyTo(comment)}
                              className="text-[9px] font-bold text-purple-600 hover:text-purple-700"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Replies */}
                      {comments
                        .filter(r => r.parent_id === comment.id)
                        .map(reply => (
                          <div key={reply.id} className="flex space-x-2.5 ml-8">
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <User size={8} className="text-slate-400" />
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg rounded-tl-none border border-slate-100 shadow-sm flex-grow">
                              <p className="text-[11px] text-slate-600">{reply.content}</p>
                              <div className="flex items-center space-x-2.5 mt-0.5">
                                <span className="text-[8px] text-slate-400 block">
                                  {formatDistanceToNow(new Date(reply.created_at))} ago
                                </span>
                                <button 
                                  onClick={() => setReplyTo(comment)}
                                  className="text-[8px] font-bold text-purple-600 hover:text-purple-700"
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-400 text-xs py-3">No comments yet. Be the first to react!</p>
                )}
              </div>

              <form onSubmit={handleCommentSubmit} className="space-y-2">
                {replyTo && (
                  <div className="flex items-center justify-between bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-100">
                    <span className="text-[9px] text-purple-600 font-medium">Replying to a comment...</span>
                    <button 
                      type="button" 
                      onClick={() => setReplyTo(null)}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={replyTo ? "Write your reply..." : "Write an anonymous comment..."}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-full bg-white border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-xs"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    <Send size={12} />
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

const ConfessionsDisplayPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovedMessages();

    const channel = supabase
      .channel('approved_messages_channel')
      .on('postgres_changes' as any, { event: '*', table: 'messages' }, (payload: any) => {
        if (payload.eventType === 'INSERT' && payload.new.approved) {
          setMessages(prev => [payload.new as Message, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.approved) {
            setMessages(prev => {
              const exists = prev.find(m => m.id === payload.new.id);
              if (exists) {
                return prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m);
              } else {
                return [payload.new as Message, ...prev].sort((a, b) => 
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
              }
            });
          } else {
            setMessages(prev => prev.filter(m => m.id === payload.new.id ? false : true));
          }
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => payload.old && m.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchApprovedMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data as Message[]);
    } catch (e) {
      console.error('Error fetching messages:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-6 lg:px-8 bg-slate-50 relative overflow-hidden">
      {/* Branded Background Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] select-none overflow-hidden">
        <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-x-32 gap-y-24 rotate-[-15deg] scale-125">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-6">
              <Logo iconClassName="w-10 h-10" showText={false} />
              <div className="flex flex-col -space-y-2">
                <span className="text-5xl font-black tracking-tighter">CEE</span>
                <span className="text-lg font-bold tracking-[0.5em] opacity-60 ml-1">MEDIA</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-1.5 bg-slate-900 text-white px-3 py-1.5 rounded-full text-[10px] font-bold"
          >
            <Logo iconClassName="w-4 h-4" showText={false} />
            <span className="tracking-widest uppercase text-[9px]">VERIFIED & APPROVED</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none"
          >
            ANONYMOUS <span className="text-orange-500">CONFESSIONS</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 text-xs sm:text-sm max-w-2xl mx-auto font-medium"
          >
            Real stories, real voices, completely anonymous. All messages are reviewed by our team before appearing here.
          </motion.p>
        </div>

        {/* Messages Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {messages.map((message) => (
              <ConfessionCard key={message.id} message={message} />
            ))}
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center py-16 bg-white rounded-[1.25rem] border-2 border-dashed border-slate-200">
            <MessageSquare size={32} className="mx-auto text-slate-200 mb-2" />
            <p className="text-slate-400 font-medium text-sm">No approved confessions yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfessionsDisplayPage;
