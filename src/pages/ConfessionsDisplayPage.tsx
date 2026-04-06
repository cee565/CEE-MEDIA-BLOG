import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { Message, MessageComment } from '../types';
import { MessageSquare, Heart, Clock, ShieldCheck, ChevronDown, ChevronUp, Send, User, Share2, Link, Check, X } from 'lucide-react';
import { WhatsAppIcon, XIcon, TikTokIcon } from '../components/BrandIcons';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo';
import MetaTags from '../components/MetaTags';

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

  const [commentCount, setCommentCount] = useState(message.comments_count || 0);

  useEffect(() => {
    setCommentCount(message.comments_count || 0);
  }, [message.comments_count]);

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
      
      // DO NOT use realtime for comments as per optimization rules
      // Instead, use periodic fetching every 20 seconds
      const interval = setInterval(fetchComments, 20000);

      return () => {
        clearInterval(interval);
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
      setCommentCount(prev => prev + 1);
      fetchComments(); // Refresh comments
      toast.success(replyTo ? 'Reply added!' : 'Comment added!');
    } catch (err: any) {
      console.error("Failed to add comment", err);
      toast.error(err.message || "Failed to add comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}/api/conversation/${message.id}`;
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden group flex flex-col hover:shadow-xl transition-all"
    >
      <div className="p-6 md:p-8 space-y-6 flex-grow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-brand-secondary border border-slate-100">
              <User size={20} />
            </div>
            <div className="space-y-0.5">
              <span className="block text-xs font-black text-slate-900 uppercase tracking-widest">Anonymous</span>
              <div className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Clock size={12} />
                <span>{format(new Date(message.created_at), 'MMM d, yyyy HH:mm:ss')}</span>
              </div>
            </div>
          </div>
          <div className="bg-green-50 text-green-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center space-x-1.5">
            <ShieldCheck size={12} />
            <span>Verified</span>
          </div>
        </div>

        <div 
          className="cursor-pointer space-y-4"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <p className="text-slate-600 font-medium leading-relaxed italic">
            "{isExpanded ? message.content : truncatedContent}"
          </p>
          {message.content.length > 150 && (
            <button 
              className="text-brand-secondary font-black text-[10px] uppercase tracking-widest flex items-center space-x-1 hover:translate-x-1 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              <span>{isExpanded ? 'Show Less' : 'Read Full Story'}</span>
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>

        <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest transition-colors ${showComments ? 'text-brand-secondary' : 'text-slate-400 hover:text-brand-secondary'}`}
            >
              <MessageSquare size={18} />
              <span>{commentCount}</span>
            </button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSupport}
              className={`flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest transition-colors ${liked ? 'text-brand-accent' : 'text-slate-400 hover:text-brand-accent'}`}
            >
              <Heart 
                size={18} 
                fill={liked || localLikes > 0 ? 'currentColor' : 'none'}
                className={liked ? 'animate-bounce' : ''} 
              />
              <span>{localLikes}</span>
            </motion.button>
            <div className="relative">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowShareMenu(!showShareMenu)}
                className={`transition-colors ${showShareMenu ? 'text-brand-secondary' : 'text-slate-400 hover:text-brand-secondary'}`}
              >
                <Share2 size={18} />
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
            <div className="text-[8px] font-black text-black uppercase tracking-tighter">
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
                              {format(new Date(comment.created_at), 'MMM d, yyyy HH:mm:ss')}
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
                                  {format(new Date(reply.created_at), 'MMM d, yyyy HH:mm:ss')}
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
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [searchParams] = useSearchParams();
  const confessionId = searchParams.get('id');

  // Find the specific confession if ID is provided in URL
  const sharedConfession = confessionId ? messages.find(m => m.id === confessionId) : null;

  useEffect(() => {
    fetchApprovedMessages(0);

    // Use limited realtime: Only subscribe to NEW confessions (INSERT events)
    // This follows the rule: "Only subscribe to NEW confessions (INSERT events)"
    const channel = supabase
      .channel('approved_messages_channel')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        if (payload.new.approved) {
          setMessages(prev => [payload.new as Message, ...prev].slice(0, 50)); // Limit feed to latest 50 items
        }
      })
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload: any) => {
        // If it was just approved, add it to the list if not already there
        if (payload.new.approved && !payload.old.approved) {
          setMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [payload.new as Message, ...prev].slice(0, 50);
          });
        } else {
          // Regular update (likes, etc.)
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        }
      })
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'message_comments' }, (payload: any) => {
        setMessages(prev => prev.map(m => 
          m.id === payload.new.message_id 
            ? { ...m, comments_count: (m.comments_count || 0) + 1 } 
            : m
        ));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchApprovedMessages = async (pageNumber: number) => {
    try {
      const from = pageNumber * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('messages')
        .select('id, content, likes, created_at, approved')
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      if (data) {
        const newMessages = data as Message[];
        
        // Fetch comment counts for these messages
        const { data: commentData } = await supabase
          .from('message_comments')
          .select('message_id')
          .in('message_id', newMessages.map(m => m.id));
        
        if (commentData) {
          const counts: Record<string, number> = {};
          commentData.forEach(c => {
            counts[c.message_id] = (counts[c.message_id] || 0) + 1;
          });
          newMessages.forEach(m => {
            m.comments_count = counts[m.id] || 0;
          });
        }

        if (pageNumber === 0) {
          setMessages(newMessages);
        } else {
          setMessages(prev => [...prev, ...newMessages]);
        }
        setHasMore(data.length === PAGE_SIZE);
      }
    } catch (e) {
      console.error('Error fetching messages:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchApprovedMessages(nextPage);
  };

  return (
    <div className="min-h-screen pt-24 pb-24 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
      <MetaTags 
        title={sharedConfession ? 'Anonymous Confession' : 'Campus Confessions'}
        description={sharedConfession ? sharedConfession.content.substring(0, 160) + '...' : 'Read anonymous confessions from your campus on CEE MEDIA.'}
        type="article"
      />

      <div className="max-w-5xl mx-auto space-y-12 relative z-10">
        <MetaTags 
          title={sharedConfession ? `Confession: ${sharedConfession.content.substring(0, 30)}...` : 'Campus Confessions'}
          description={sharedConfession ? sharedConfession.content.substring(0, 160) : 'Read and share anonymous campus confessions.'}
        />
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 bg-brand-primary text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase"
          >
            <Logo iconClassName="w-4 h-4" showText={false} />
            <span>Verified & Approved</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none"
          >
            ANONYMOUS <span className="text-brand-accent">CONFESSIONS</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 text-sm md:text-base max-w-2xl mx-auto font-medium"
          >
            Real stories, real voices, completely anonymous. All messages are reviewed by our team before appearing here.
          </motion.p>
        </div>

        {/* Messages Grid */}
        {loading && page === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-[2rem] border border-slate-100 h-64 animate-pulse p-8 space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100" />
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-24" />
                    <div className="h-2 bg-slate-100 rounded w-16" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-slate-100 rounded w-full" />
                  <div className="h-4 bg-slate-100 rounded w-full" />
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {messages.map((message) => (
                <ConfessionCard key={message.id} message={message} />
              ))}
            </div>
            
            {hasMore && (
              <div className="flex justify-center pt-12">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-10 py-4 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-100 shadow-sm hover:shadow-xl hover:border-brand-secondary transition-all flex items-center space-x-2 group"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Load More Confessions</span>
                      <ChevronDown size={14} className="group-hover:translate-y-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center py-24 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100 space-y-4">
            <MessageSquare size={48} className="mx-auto text-slate-200" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No approved confessions yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfessionsDisplayPage;
