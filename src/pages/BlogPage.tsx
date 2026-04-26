import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { Blog } from '../types';
import { Heart, MessageCircle, Share2, User, Calendar, Send, Link, Check, Search, X, ExternalLink, ArrowLeft, Clock } from 'lucide-react';
import { WhatsAppIcon, XIcon, TikTokIcon } from '../components/BrandIcons';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import MetaTags from '../components/MetaTags';

const BlogCard = React.memo(({ blog, fullView = false }: { blog: Blog, fullView?: boolean }) => {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const shareUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}/blog?id=${blog.id}`;
  const shareText = `Check out this blog post on CEE MEDIA: "${blog.title}"`;

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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-[2rem] overflow-hidden border border-slate-100 flex flex-col group transition-all ${fullView ? 'border-none shadow-none' : 'hover:shadow-xl'}`}
    >
      {!fullView && (
        <div className="h-56 overflow-hidden relative">
          {blog.image_url ? (
            <img 
              src={blog.image_url} 
              alt={blog.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
              <Clock size={48} />
            </div>
          )}
          <div className="absolute top-4 left-4">
            <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-black text-slate-900 flex items-center w-fit uppercase tracking-widest shadow-sm">
              <Calendar size={12} className="mr-1.5 text-brand-secondary" /> {format(new Date(blog.created_at), 'MMM d, yyyy')}
            </div>
          </div>
        </div>
      )}

      <div className={`p-8 flex-grow space-y-4 ${fullView ? 'px-0' : ''}`}>
        {!fullView && (
          <>
            <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tighter uppercase group-hover:text-brand-secondary transition-colors">
              {blog.title}
            </h3>
            
            <p className="text-slate-500 text-sm line-clamp-3 font-medium leading-relaxed">
              {blog.content}
            </p>
            
            <button 
              onClick={() => {
                window.scrollTo(0, 0);
                setSearchParams({ id: blog.id });
              }}
              className="text-brand-secondary text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1 group/btn"
            >
              Read Full Story <ArrowLeft size={12} className="rotate-180 group-hover/btn:translate-x-1 transition-transform" />
            </button>
            
            <div className="flex items-center space-x-2 pt-4 border-t border-slate-50">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-brand-secondary border border-slate-100">
                <User size={14} />
              </div>
              <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{blog.author}</span>
            </div>
          </>
        )}
      </div>

      <div className={`px-8 py-4 bg-slate-50/30 border-t border-slate-50 flex justify-between items-center ${fullView ? 'px-0 bg-transparent border-none' : ''}`}>
        <div className="flex space-x-6">
          <button 
            onClick={() => setShowShareMenu(!showShareMenu)}
            className={`flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest transition-colors ${showShareMenu ? 'text-brand-secondary' : 'text-slate-400 hover:text-brand-secondary'}`}
          >
            <Share2 size={18} />
            <span>Share</span>
          </button>
        </div>
        
        <div className="relative">
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
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
});

const BlogPage = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const blogId = searchParams.get('id');

  // Find the specific blog if ID is provided in URL
  const sharedBlog = blogId ? blogs.find(b => b.id === blogId) : null;

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('blogs')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      
      if (data) {
        let formattedBlogs = data as Blog[];

        // Filter by search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          formattedBlogs = formattedBlogs.filter(blog => 
            blog.title.toLowerCase().includes(query) || 
            blog.content.toLowerCase().includes(query) ||
            blog.author.toLowerCase().includes(query)
          );
        }

        setBlogs(formattedBlogs);
      }
    } catch (err) {
      console.error("Failed to fetch blogs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();

    // Scroll to top if a specific blog is loaded
    if (blogId) {
      window.scrollTo(0, 0);
    }

    // Real-time subscription for blogs
    const blogsChannel = supabase
      .channel('blogs_channel')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'blogs' }, () => {
        fetchBlogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(blogsChannel);
    };
  }, [searchQuery, blogId]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
      <MetaTags 
        title={sharedBlog ? sharedBlog.title : 'Official Blog'}
        description={sharedBlog ? sharedBlog.content.substring(0, 160) + '...' : 'Stay updated with official stories from CEE MEDIA.'}
        image={sharedBlog?.image_url || undefined}
        type={sharedBlog ? 'article' : 'website'}
      />
      
      {!blogId && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase">Official Blog</h1>
            <p className="text-slate-500 text-sm md:text-base font-medium">The heartbeat of campus culture and news.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-grow sm:flex-grow-0 sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search blogs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-100 focus:border-brand-secondary focus:ring-4 focus:ring-brand-secondary/5 outline-none transition-all text-sm font-medium shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 flex flex-col h-[450px] animate-pulse">
              <div className="h-56 bg-slate-100" />
              <div className="p-8 space-y-4 flex-grow">
                <div className="h-8 bg-slate-100 rounded-xl w-3/4" />
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded-lg w-full" />
                  <div className="h-4 bg-slate-100 rounded-lg w-full" />
                  <div className="h-4 bg-slate-100 rounded-lg w-2/3" />
                </div>
              </div>
              <div className="px-8 py-4 bg-slate-50/30 border-t border-slate-50 flex justify-between items-center">
                <div className="h-4 bg-slate-100 rounded-lg w-24" />
                <div className="h-4 bg-slate-100 rounded-lg w-8" />
              </div>
            </div>
          ))}
        </div>
      ) : blogId && sharedBlog ? (
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
              {sharedBlog.image_url ? (
                <img 
                  src={sharedBlog.image_url} 
                  alt={sharedBlog.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white/10">
                  <Clock size={120} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-8 left-8 right-8">
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="bg-brand-primary text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                    Official
                  </div>
                  <div className="bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/30">
                    {format(new Date(sharedBlog.created_at), 'MMMM d, yyyy')}
                  </div>
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none">
                  {sharedBlog.title}
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
                    <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{sharedBlog.author}</p>
                  </div>
                </div>
              </div>

              <div className="prose prose-slate max-w-none">
                <p className="text-slate-600 text-lg md:text-xl leading-relaxed font-medium whitespace-pre-wrap">
                  {sharedBlog.content}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.length > 0 ? (
            blogs.map(blog => <BlogCard key={blog.id} blog={blog} />)
          ) : (
            <div className="col-span-full text-center py-24 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100 space-y-6">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Search size={32} className="text-slate-200" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">No blogs found</h3>
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
