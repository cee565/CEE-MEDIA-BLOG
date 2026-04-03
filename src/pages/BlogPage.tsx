import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { Post, PostComment } from '../types';
import { Heart, MessageCircle, Share2, User, Calendar, Send, Link, Check, Search, X } from 'lucide-react';
import { WhatsAppIcon, XIcon, TikTokIcon } from '../components/BrandIcons';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const BlogCard = React.memo(({ post }: { post: Post }) => {
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const storageKey = `liked_post_${post.id}`;

  useEffect(() => {
    if (localStorage.getItem(storageKey)) setLiked(true);
  }, [post.id]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      if (data) setComments(data as PostComment[]);
    } catch (err) {
      console.error("Failed to fetch blog comments", err);
    }
  };

  useEffect(() => {
    if (showComments) {
      fetchComments();
      
      const channel = supabase
        .channel(`post_comments_${post.id}`)
        .on('postgres_changes' as any, { 
          event: '*', 
          table: 'post_comments',
          filter: `post_id=eq.${post.id}`
        }, () => {
          fetchComments();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [showComments, post.id]);

  const [localLikes, setLocalLikes] = useState(post.likes || 0);

  useEffect(() => {
    setLocalLikes(post.likes || 0);
  }, [post.likes]);

  const handleLike = async () => {
    if (liked) return;
    
    // Optimistic update
    setLocalLikes(prev => prev + 1);
    setLiked(true);
    localStorage.setItem(storageKey, 'true');

    try {
      const { data: currentPost, error: fetchError } = await supabase
        .from('posts')
        .select('likes')
        .eq('id', post.id)
        .single();
      
      if (fetchError) throw fetchError;

      const newLikes = (currentPost?.likes || 0) + 1;
      const { error } = await supabase
        .from('posts')
        .update({ likes: newLikes })
        .eq('id', post.id);
      
      if (error) throw error;
      toast.success('Post liked!');
    } catch (e: any) {
      console.error("Like failed", e);
      // Rollback
      setLocalLikes(prev => Math.max(0, prev - 1));
      setLiked(false);
      localStorage.removeItem(storageKey);
      
      toast.error(e.message?.includes("row-level security") 
        ? "Permission denied. Please try again later." 
        : "Failed to like post.");
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: post.id,
          content: newComment.trim(),
          parent_id: replyTo ? replyTo.id : null
        });
      
      if (error) throw error;
      
      setNewComment('');
      setReplyTo(null);
      fetchComments();
      toast.success(replyTo ? 'Reply added!' : 'Comment added!');
    } catch (err: any) {
      console.error("Failed to add blog comment", err);
      toast.error(err.message || "Failed to add comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}/blog?id=${post.id}`;
  const shareText = `Check out this blog post on CEE MEDIA: "${post.title}"`;

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
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-[1.25rem] overflow-hidden card-shadow border border-slate-50 flex flex-col"
    >
      <div className="h-40 overflow-hidden relative">
        <img 
          src={post.image || `https://picsum.photos/seed/${post.id}/800/600`} 
          alt={post.title}
          className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <div className="flex items-center space-x-1.5">
            <div className="bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-700 flex items-center w-fit">
              <Calendar size={10} className="mr-1" /> {format(new Date(post.created_at), 'MMM d, yyyy')}
            </div>
            <div className="bg-green-500/90 backdrop-blur-md px-2 py-1 rounded-full text-[8px] font-black text-white flex items-center w-fit uppercase tracking-widest">
              <div className="w-1 h-1 bg-white rounded-full animate-ping mr-1" /> Live
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 flex-grow space-y-2">
        <h3 className="text-base font-bold text-slate-800 leading-tight line-clamp-2">{post.title}</h3>
        
        <p className="text-slate-600 text-[10px] line-clamp-3">{post.content}</p>
        
        <div className="flex items-center space-x-1.5 pt-0.5">
          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <User size={12} />
          </div>
          <span className="text-[10px] font-medium text-slate-700">{post.author}</span>
        </div>
      </div>

      <div className="px-3 py-2.5 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
        <div className="flex space-x-3">
          <button 
            onClick={handleLike}
            className={`flex items-center space-x-1 text-xs font-bold transition-colors ${liked ? 'text-red-500' : 'text-slate-500 hover:text-red-400'}`}
          >
            <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
            <span>{localLikes}</span>
          </button>
          <button 
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center space-x-1 text-xs font-bold transition-colors ${showComments ? 'text-blue-600' : 'text-slate-500 hover:text-blue-500'}`}
          >
            <MessageCircle size={16} />
            <span>Comments</span>
          </button>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowShareMenu(!showShareMenu)}
            className={`transition-colors ${showShareMenu ? 'text-blue-600' : 'text-slate-400 hover:text-blue-500'}`}
          >
            <Share2 size={16} />
          </button>

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
                  className="absolute bottom-full right-0 mb-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50"
                >
                  <div className="p-1.5 space-y-1">
                    <button 
                      onClick={() => { copyToClipboard(); setShowShareMenu(false); }}
                      className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 hover:bg-slate-50 rounded-xl transition-colors text-slate-700"
                    >
                      {copied ? <Check size={14} className="text-green-500" /> : <Link size={14} />}
                      <span className="text-[10px] font-bold">{copied ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                    <button 
                      onClick={() => { shareToTwitter(); setShowShareMenu(false); }}
                      className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 hover:bg-slate-50 rounded-xl transition-colors text-slate-700"
                    >
                      <XIcon size={14} className="text-black" />
                      <span className="text-[10px] font-bold">X</span>
                    </button>
                    <button 
                      onClick={() => { shareToWhatsApp(); setShowShareMenu(false); }}
                      className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 hover:bg-slate-50 rounded-xl transition-colors text-slate-700"
                    >
                      <WhatsAppIcon size={14} className="text-green-500" />
                      <span className="text-[10px] font-bold">WhatsApp</span>
                    </button>
                    <button 
                      onClick={() => { copyToClipboard(); setShowShareMenu(false); }}
                      className="w-full flex items-center space-x-2.5 px-2.5 py-1.5 hover:bg-slate-50 rounded-xl transition-colors text-slate-700"
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

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-100 bg-slate-50/50 overflow-hidden"
          >
            <div className="p-3 space-y-3">
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {comments.length > 0 ? (
                  comments
                    .filter(c => !c.parent_id)
                    .map((comment) => (
                    <div key={comment.id} className="space-y-2">
                      <div className="flex space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                          <User size={12} className="text-slate-500" />
                        </div>
                        <div className="bg-white p-2.5 rounded-xl rounded-tl-none border border-slate-100 shadow-sm flex-grow">
                          <p className="text-xs text-slate-700">{comment.content}</p>
                          <div className="flex items-center space-x-2.5 mt-1">
                            <span className="text-[9px] text-slate-400 block">
                              {formatDistanceToNow(new Date(comment.created_at))} ago
                            </span>
                            <button 
                              onClick={() => setReplyTo(comment)}
                              className="text-[9px] font-bold text-blue-500 hover:text-blue-600"
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
                              <User size={9} className="text-slate-400" />
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg rounded-tl-none border border-slate-100 shadow-sm flex-grow">
                              <p className="text-[10px] text-slate-600">{reply.content}</p>
                              <div className="flex items-center space-x-2.5 mt-1">
                                <span className="text-[8px] text-slate-400 block">
                                  {formatDistanceToNow(new Date(reply.created_at))} ago
                                </span>
                                <button 
                                  onClick={() => setReplyTo(comment)}
                                  className="text-[8px] font-bold text-blue-500 hover:text-blue-600"
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
                  <p className="text-center text-slate-400 text-xs py-3">No comments yet. Be the first to join the discussion!</p>
                )}
              </div>

              <form onSubmit={handleCommentSubmit} className="space-y-2">
                {replyTo && (
                  <div className="flex items-center justify-between bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                    <span className="text-[9px] text-blue-600 font-medium">Replying to a comment...</span>
                    <button 
                      type="button" 
                      onClick={() => setReplyTo(null)}
                      className="text-blue-600 hover:text-blue-800"
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
                    placeholder={replyTo ? "Write your reply..." : "Write a comment..."}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-full bg-white border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-xs"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-colors"
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

const BlogPage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select('*');

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (data) {
        let formattedPosts = data as Post[];

        // Filter by search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          formattedPosts = formattedPosts.filter(post => 
            post.title.toLowerCase().includes(query) || 
            post.content.toLowerCase().includes(query) ||
            post.author.toLowerCase().includes(query)
          );
        }

        setPosts(formattedPosts);
      }
    } catch (err) {
      console.error("Failed to fetch posts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();

    // Real-time subscription
    const subscription = supabase
      .channel('posts_channel')
      .on('postgres_changes' as any, { event: '*', table: 'posts' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setPosts(prev => [payload.new as Post, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setPosts(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
        } else if (payload.eventType === 'DELETE') {
          setPosts(prev => prev.filter(p => payload.old && p.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Campus Blog</h1>
          <p className="text-slate-500 text-xs md:text-sm">Stay updated with stories that matter.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
          <div className="relative flex-grow sm:flex-grow-0 sm:w-56">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-2">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-[10px] font-bold animate-pulse">Fetching latest stories...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.length > 0 ? (
            posts.map(post => <BlogCard key={post.id} post={post} />)
          ) : (
            <div className="col-span-full text-center py-12 bg-white rounded-[1.5rem] card-shadow border border-slate-100 space-y-3">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                <Search size={32} className="text-slate-300" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-lg font-bold text-slate-800">No posts found</h3>
                <p className="text-slate-500 text-xs max-w-md mx-auto">
                  We couldn't find any blog posts matching your current search.
                </p>
              </div>
              <button 
                onClick={() => setSearchQuery('')}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all text-xs"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BlogPage;
