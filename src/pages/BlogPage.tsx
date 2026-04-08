import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { Post, PostComment } from '../types';
import { Heart, MessageCircle, Share2, User, Calendar, Send, Link, Check, Search, X, ExternalLink, ArrowLeft } from 'lucide-react';
import { WhatsAppIcon, XIcon, TikTokIcon } from '../components/BrandIcons';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import MetaTags from '../components/MetaTags';

const BlogCard = React.memo(({ post, fullView = false }: { post: Post, fullView?: boolean }) => {
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(fullView);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const storageKey = `liked_post_${post.id}`;

  const [commentCount, setCommentCount] = useState(post.comments_count || 0);

  useEffect(() => {
    setCommentCount(post.comments_count || 0);
  }, [post.comments_count]);

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
      
      // DO NOT use realtime for comments as per optimization rules
      // Instead, use periodic fetching every 20 seconds
      const interval = setInterval(fetchComments, 20000);

      return () => {
        clearInterval(interval);
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
      setCommentCount(prev => prev + 1);
      fetchComments();
      toast.success(replyTo ? 'Reply added!' : 'Comment added!');
    } catch (err: any) {
      console.error("Failed to add blog comment", err);
      toast.error(err.message || "Failed to add comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}/api/post/${post.id}`;
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-[2rem] overflow-hidden border border-slate-100 flex flex-col group transition-all ${fullView ? 'border-none shadow-none' : 'hover:shadow-xl'}`}
    >
      {!fullView && (
        <div className="h-48 overflow-hidden relative">
          <img 
            src={post.image || `https://picsum.photos/seed/${post.id}/600/400?blur=1`} 
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black text-slate-900 flex items-center w-fit uppercase tracking-widest shadow-sm">
              <Calendar size={12} className="mr-1.5 text-brand-secondary" /> {format(new Date(post.created_at), 'MMM d, yyyy HH:mm:ss')}
            </div>
          </div>
          {post.category && (
            <div className="absolute bottom-4 left-4">
              <div className="bg-brand-primary text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg">
                {post.category}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`p-6 flex-grow space-y-4 ${fullView ? 'px-0' : ''}`}>
        {!fullView && (
          <>
            <h3 className="text-xl font-black text-slate-900 leading-tight tracking-tighter uppercase group-hover:text-brand-secondary transition-colors">
              {post.url ? (
                <a href={post.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-2">
                  {post.title} <ExternalLink size={16} />
                </a>
              ) : post.title}
            </h3>
            
            <p className="text-slate-500 text-sm line-clamp-3 font-medium leading-relaxed">{post.content}</p>
            
            <button 
              onClick={() => {
                window.scrollTo(0, 0);
                setSearchParams({ id: post.id });
              }}
              className="text-brand-secondary text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1 group/btn"
            >
              Read Full Story <ArrowLeft size={12} className="rotate-180 group-hover/btn:translate-x-1 transition-transform" />
            </button>
            
            <div className="flex items-center space-x-2 pt-2">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-brand-secondary border border-slate-100">
                <User size={14} />
              </div>
              <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{post.author}</span>
            </div>
          </>
        )}
      </div>

      <div className={`px-6 py-4 bg-slate-50/30 border-t border-slate-50 flex justify-between items-center ${fullView ? 'px-0 bg-transparent border-none' : ''}`}>
        <div className="flex space-x-6">
          <button 
            onClick={handleLike}
            className={`flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest transition-colors ${liked ? 'text-brand-accent' : 'text-slate-400 hover:text-brand-accent'}`}
          >
            <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
            <span>{localLikes}</span>
          </button>
          <button 
            onClick={() => setShowComments(!showComments)}
            className={`flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest transition-colors ${showComments ? 'text-brand-secondary' : 'text-slate-400 hover:text-brand-secondary'}`}
          >
            <MessageCircle size={18} />
            <span>{commentCount}</span>
          </button>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowShareMenu(!showShareMenu)}
            className={`transition-colors ${showShareMenu ? 'text-brand-secondary' : 'text-slate-400 hover:text-brand-secondary'}`}
          >
            <Share2 size={18} />
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
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-brand-primary text-white rounded-full flex items-center justify-center hover:bg-brand-secondary disabled:opacity-50 transition-colors"
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
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const postId = searchParams.get('id');

  const categories = ['All', 'Gist', 'News', 'Events', 'Drama', 'Trends'];

  // Find the specific post if ID is provided in URL
  const sharedPost = postId ? posts.find(p => p.id === postId) : null;

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select('id, title, content, image, author, author_id, category, url, likes, created_at, expires_at')
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (data) {
        let formattedPosts = data as Post[];

        // Fetch comment counts for these posts
        const { data: commentData } = await supabase
          .from('post_comments')
          .select('post_id')
          .in('post_id', formattedPosts.map(p => p.id));
        
        if (commentData) {
          const counts: Record<string, number> = {};
          commentData.forEach(c => {
            counts[c.post_id] = (counts[c.post_id] || 0) + 1;
          });
          formattedPosts.forEach(p => {
            p.comments_count = counts[p.id] || 0;
          });
        }

        // Filter by category
        if (selectedCategory !== 'All') {
          formattedPosts = formattedPosts.filter(post => 
            post.category === selectedCategory || 
            (selectedCategory === 'Gist' && !post.category) // Default to Gist if no category
          );
        }

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

    // Scroll to top if a specific post is loaded
    if (postId) {
      window.scrollTo(0, 0);
    }

    // Real-time subscription for comment counts
    const channel = supabase
      .channel('blog_comments_channel')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'post_comments' }, (payload: any) => {
        setPosts(prev => prev.map(p => 
          p.id === payload.new.post_id 
            ? { ...p, comments_count: (p.comments_count || 0) + 1 } 
            : p
        ));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [searchQuery, selectedCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
      <MetaTags 
        title={sharedPost ? sharedPost.title : 'Campus Blog'}
        description={sharedPost ? sharedPost.content.substring(0, 160) + '...' : 'Stay updated with stories that matter on campus.'}
        image={sharedPost?.image || undefined}
        type={sharedPost ? 'article' : 'website'}
      />
      
      {!postId && (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase">Campus Blog</h1>
              <p className="text-slate-500 text-sm md:text-base font-medium">Stay updated with stories that matter.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <div className="relative flex-grow sm:flex-grow-0 sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-100 focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/5 outline-none transition-all text-sm font-medium shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="flex items-center space-x-3 overflow-x-auto pb-4 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                  selectedCategory === category 
                    ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20 scale-105' 
                    : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-100'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 flex flex-col h-[450px] animate-pulse">
              <div className="h-48 bg-slate-100" />
              <div className="p-6 space-y-4 flex-grow">
                <div className="h-8 bg-slate-100 rounded-xl w-3/4" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded-lg w-full" />
                  <div className="h-4 bg-slate-100 rounded-lg w-full" />
                  <div className="h-4 bg-slate-100 rounded-lg w-2/3" />
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50/30 border-t border-slate-50 flex justify-between items-center">
                <div className="h-4 bg-slate-100 rounded-lg w-24" />
                <div className="h-4 bg-slate-100 rounded-lg w-8" />
              </div>
            </div>
          ))}
        </div>
      ) : postId && sharedPost ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          <button 
            onClick={() => setSearchParams({})}
            className="flex items-center space-x-2 text-slate-500 hover:text-brand-primary transition-colors font-black uppercase tracking-widest text-xs"
          >
            <ArrowLeft size={16} />
            <span>Back to Blog</span>
          </button>

          <div className="bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-2xl shadow-slate-200/50">
            <div className="h-[400px] relative">
              <img 
                src={sharedPost.image || `https://picsum.photos/seed/${sharedPost.id}/1200/800`} 
                alt={sharedPost.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-8 left-8 right-8">
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="bg-brand-primary text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                    {sharedPost.category || 'Gist'}
                  </div>
                  <div className="bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/30">
                    {format(new Date(sharedPost.created_at), 'MMMM d, yyyy')}
                  </div>
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">
                  {sharedPost.title}
                </h1>
              </div>
            </div>

            <div className="p-8 md:p-12 space-y-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-8">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-brand-secondary border-2 border-white shadow-sm">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Written By</p>
                    <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{sharedPost.author}</p>
                  </div>
                </div>
                
                {sharedPost.url && (
                  <a 
                    href={sharedPost.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-brand-primary transition-all shadow-lg shadow-slate-900/20"
                  >
                    <span>Visit Source</span>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>

              <div className="prose prose-slate max-w-none">
                <p className="text-slate-600 text-lg md:text-xl leading-relaxed font-medium whitespace-pre-wrap">
                  {sharedPost.content}
                </p>
              </div>

              {/* Comments Section */}
              <div id="comments" className="pt-12 border-t border-slate-100 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                    Comments ({sharedPost.comments_count || 0})
                  </h3>
                </div>
                <BlogCard post={sharedPost} fullView={true} />
              </div>
            </div>
          </div>

          {/* Sticky Bottom Interaction Bar (Phoenix Browser Style) */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-100 p-3 md:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
              <div className="flex-grow">
                <div 
                  onClick={() => {
                    const el = document.getElementById('comments');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="flex items-center space-x-3 px-4 py-2.5 bg-slate-100 rounded-full text-slate-400 text-xs font-medium border border-slate-200/50 cursor-pointer"
                >
                  <MessageCircle size={16} />
                  <span>Write a comment...</span>
                </div>
              </div>
              <div className="flex items-center space-x-5 px-1">
                <button 
                  onClick={() => {
                    const el = document.getElementById('comments');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-slate-600 hover:text-brand-accent transition-colors flex flex-col items-center"
                >
                  <Heart size={22} className={sharedPost.likes > 0 ? 'text-brand-accent fill-current' : ''} />
                  <span className="text-[9px] font-black uppercase mt-0.5">{sharedPost.likes || 0}</span>
                </button>
                <button 
                  onClick={() => {
                    const el = document.getElementById('comments');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-slate-600 hover:text-brand-secondary transition-colors flex flex-col items-center"
                >
                  <MessageCircle size={22} />
                  <span className="text-[9px] font-black uppercase mt-0.5">{sharedPost.comments_count || 0}</span>
                </button>
                <button 
                  onClick={() => {
                    const el = document.getElementById('comments');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-slate-600 hover:text-brand-secondary transition-colors flex flex-col items-center"
                >
                  <Share2 size={22} />
                  <span className="text-[9px] font-black uppercase mt-0.5">Share</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.length > 0 ? (
            posts.map(post => <BlogCard key={post.id} post={post} />)
          ) : (
            <div className="col-span-full text-center py-24 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100 space-y-6">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Search size={32} className="text-slate-200" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">No posts found</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto font-medium">
                  We couldn't find any blog posts matching your current search.
                </p>
              </div>
              <button 
                onClick={() => setSearchQuery('')}
                className="px-8 py-3 bg-brand-primary text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-brand-secondary transition-all"
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
