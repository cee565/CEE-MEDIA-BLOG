import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, BookOpen, MessageCircle, Zap, ChevronRight, Send, Users, Activity, Heart, Share2, Link as LinkIcon, Check } from 'lucide-react';
import { WhatsAppIcon, XIcon, TikTokIcon } from '../components/BrandIcons';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../supabase';
import { Poll, Post, Message } from '../types';
import Logo from '../components/Logo';
import AdsBoard from '../components/AdsBoard';

const HomePage = () => {
  const [trendingPoll, setTrendingPoll] = useState<Poll | null>(null);
  const [hotPost, setHotPost] = useState<Post | null>(null);
  const [latestMessage, setLatestMessage] = useState<Message | null>(null);
  const [showShareMenu, setShowShareMenu] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleShare = (type: string, id: string, title: string) => {
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const url = `${baseUrl}/${type}?id=${id}`;
    const text = `Check out this ${type} on CEE MEDIA: "${title}"`;

    return {
      copy: () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      },
      twitter: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank'),
      facebook: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank'),
      whatsapp: () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`, '_blank'),
      whatsappBusiness: () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`, '_blank')
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch trending poll
        const { data: polls } = await supabase
          .from('polls')
          .select('*')
          .order('total_votes', { ascending: false })
          .limit(1);
        if (polls && polls.length > 0) setTrendingPoll(polls[0] as Poll);

        // Fetch hot post
        const { data: posts } = await supabase
          .from('posts')
          .select('*')
          .order('likes', { ascending: false })
          .limit(1);
        if (posts && posts.length > 0) setHotPost(posts[0] as Post);

        // Fetch latest approved message
        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .eq('approved', true)
          .order('created_at', { ascending: false })
          .limit(1);
        if (messages && messages.length > 0) setLatestMessage(messages[0] as Message);
      } catch (e) {
        console.error("Home data fetch failed", e);
        toast.error("Failed to load latest campus updates.");
      }
    };
    fetchData();

    // Real-time subscriptions
    const channels = ['polls', 'posts', 'messages'].map(table => 
      supabase.channel(`${table}_home_channel`).on('postgres_changes' as any, { event: '*', schema: 'public', table }, () => fetchData()).subscribe()
    );

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  const categories = [
    { name: 'Voting', icon: TrendingUp, color: 'bg-purple-500', path: '/vote' },
    { name: 'Blog', icon: BookOpen, color: 'bg-blue-500', path: '/blog' },
    { name: 'Confessions', icon: MessageCircle, color: 'bg-orange-500', path: '/confessions' },
    { name: 'Write Message', icon: Send, color: 'bg-green-500', path: '/confessions/submit' },
    { name: 'Campus Gist', icon: Zap, color: 'bg-pink-500', path: '/blog' },
  ];

  return (
    <div className="space-y-0">
      <AdsBoard />
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -left-24 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 -right-24 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            x: [0, 50, 0],
            y: [0, 100, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-24 left-1/3 w-80 h-80 bg-pink-500/10 blur-[80px] rounded-full"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 space-y-6 relative z-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 p-6 md:p-10 text-white text-center space-y-6 shadow-2xl border border-white/20">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white/10 blur-[80px] rounded-full -mr-36 -mt-36 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-pink-500/10 blur-[80px] rounded-full -ml-36 -mb-36 animate-pulse"></div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center space-x-2 bg-white/15 backdrop-blur-xl border border-white/25 px-4 py-2 rounded-full text-[10px] font-black tracking-[0.2em]"
        >
          <Logo iconClassName="w-4 h-4" showText={false} />
          <span className="uppercase text-[8px]">CEE MEDIA OFFICIAL</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          <h1 className="flex flex-col items-center justify-center leading-none select-none">
            <span className="text-4xl md:text-6xl font-black tracking-tighter uppercase drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)]">CEE</span>
            <span className="text-base md:text-xl font-black tracking-[0.8em] uppercase text-white/90 -mt-1 md:-mt-3 ml-3 drop-shadow-lg">MEDIA</span>
          </h1>
          
          <div className="space-y-3">
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm md:text-lg text-white max-w-4xl mx-auto font-black tracking-tight uppercase leading-tight drop-shadow-md"
            >
              Your Voice, Your Campus, Your Story.
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-purple-100/80 text-[10px] md:text-sm font-medium max-w-2xl mx-auto"
            >
              The heartbeat of campus culture. Stay connected, stay informed, and make your mark.
            </motion.p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row justify-center gap-3 pt-2"
        >
          <Link to="/vote" className="group relative bg-white text-purple-600 px-8 py-3 rounded-full font-black shadow-[0_20px_50px_rgba(255,255,255,0.2)] hover:shadow-[0_25px_60px_rgba(255,255,255,0.3)] transition-all active:scale-95 flex items-center justify-center overflow-hidden">
            <span className="relative z-10 text-xs">START VOTING</span>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-100 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </Link>
          <Link to="/blog" className="bg-white/15 backdrop-blur-xl border border-white/25 text-white px-8 py-3 rounded-full font-black hover:bg-white/25 transition-all active:scale-95 flex items-center justify-center shadow-lg text-xs">
            EXPLORE BLOG
          </Link>
        </motion.div>
      </section>

      {/* Categories - Horizontal Scroll */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Categories</h2>
          <div className="h-px flex-grow mx-4 bg-slate-200/50"></div>
        </div>
        <div className="flex overflow-x-auto gap-3 pb-3 hide-scrollbar px-2">
          {categories.map((cat, idx) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Link 
                to={cat.path}
                className="flex-shrink-0 w-32 h-40 rounded-[1.25rem] bg-white/70 backdrop-blur-xl border border-white/40 card-shadow p-4 flex flex-col items-center justify-center space-y-3 hover:scale-105 hover:bg-white/90 transition-all group"
              >
                <div className={`w-10 h-10 ${cat.color} rounded-xl flex items-center justify-center text-white shadow-xl group-hover:rotate-12 transition-transform duration-500`}>
                  <cat.icon size={20} />
                </div>
                <span className="font-black text-slate-700 uppercase tracking-wider text-[9px]">{cat.name}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Preview Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Trending Poll */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -10 }}
          className="bg-white/70 backdrop-blur-xl rounded-[1.25rem] card-shadow p-6 space-y-4 border border-white/40 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-purple-600 bg-purple-100/50 px-2.5 py-1 rounded-full border border-purple-200/50">Trending Poll</span>
            <TrendingUp size={14} className="text-purple-600" />
          </div>
          {trendingPoll?.image && (
            <div className="w-full h-28 rounded-[1rem] overflow-hidden mb-1 relative z-10 shadow-lg">
              <img 
                src={trendingPoll.image} 
                alt="Poll" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
          )}
          <h3 className="text-lg font-black text-slate-800 leading-tight relative z-10">
            {trendingPoll?.question || "Loading latest poll..."}
          </h3>
          <div className="flex items-center justify-between relative z-10 pt-1">
            <Link to="/vote" className="flex items-center text-[10px] font-black text-purple-600 group/link">
              VOTE NOW <ChevronRight size={14} className="ml-1 group-hover/link:translate-x-2 transition-transform" />
            </Link>
            <div className="relative">
              <button 
                onClick={() => setShowShareMenu(showShareMenu === 'poll' ? null : 'poll')}
                className="p-1.5 text-slate-400 hover:text-purple-600 transition-colors"
              >
                <Share2 size={14} />
              </button>
              <AnimatePresence>
                {showShareMenu === 'poll' && trendingPoll && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full right-0 mb-2 w-40 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50"
                  >
                    <div className="p-1.5 space-y-1">
                      <button onClick={() => { handleShare('vote', trendingPoll.id, trendingPoll.question).copy(); setShowShareMenu(null); }} className="w-full flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-700">
                        {copied ? <Check size={12} className="text-green-500" /> : <LinkIcon size={12} />}
                        <span className="text-[9px] font-bold">{copied ? 'Copied!' : 'Copy Link'}</span>
                      </button>
                      <button onClick={() => { handleShare('vote', trendingPoll.id, trendingPoll.question).twitter(); setShowShareMenu(null); }} className="w-full flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-700">
                        <XIcon size={12} className="text-black" />
                        <span className="text-[9px] font-bold">X</span>
                      </button>
                      <button onClick={() => { handleShare('vote', trendingPoll.id, trendingPoll.question).whatsapp(); setShowShareMenu(null); }} className="w-full flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-700">
                        <WhatsAppIcon size={12} className="text-green-500" />
                        <span className="text-[9px] font-bold">WhatsApp</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Hot Blog */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -10 }}
          className="bg-white/70 backdrop-blur-xl rounded-[1.25rem] card-shadow p-6 space-y-4 border border-white/40 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-600 bg-blue-100/50 px-2.5 py-1 rounded-full border border-blue-200/50">Hot Blog</span>
            <BookOpen size={14} className="text-blue-600" />
          </div>
          {hotPost?.image && (
            <div className="w-full h-28 rounded-[1rem] overflow-hidden mb-1 relative z-10 shadow-lg">
              <img 
                src={hotPost.image} 
                alt="Post" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
          )}
          <h3 className="text-lg font-black text-slate-800 leading-tight relative z-10">
            {hotPost?.title || "Loading latest gist..."}
          </h3>
          <div className="flex items-center justify-between relative z-10 pt-1">
            <Link to="/blog" className="flex items-center text-[10px] font-black text-blue-600 group/link">
              READ MORE <ChevronRight size={14} className="ml-1 group-hover/link:translate-x-2 transition-transform" />
            </Link>
            <div className="relative">
              <button 
                onClick={() => setShowShareMenu(showShareMenu === `post-${hotPost?.id}` ? null : `post-${hotPost?.id}`)}
                className="p-1.5 bg-slate-100/50 hover:bg-slate-200/50 rounded-xl transition-colors text-slate-600"
              >
                <Share2 size={14} />
              </button>
              <AnimatePresence>
                {showShareMenu === `post-${hotPost?.id}` && hotPost && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full right-0 mb-2 w-40 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50"
                  >
                    <div className="p-1.5 space-y-1">
                      <button onClick={() => { handleShare('blog', hotPost.id, hotPost.title).copy(); setShowShareMenu(null); }} className="w-full flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-700">
                        {copied ? <Check size={12} className="text-green-500" /> : <LinkIcon size={12} />}
                        <span className="text-[9px] font-bold">{copied ? 'Copied!' : 'Copy Link'}</span>
                      </button>
                      <button onClick={() => { handleShare('blog', hotPost.id, hotPost.title).twitter(); setShowShareMenu(null); }} className="w-full flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-700">
                        <XIcon size={12} className="text-black" />
                        <span className="text-[9px] font-bold">X</span>
                      </button>
                      <button onClick={() => { handleShare('blog', hotPost.id, hotPost.title).whatsapp(); setShowShareMenu(null); }} className="w-full flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-700">
                        <WhatsAppIcon size={12} className="text-green-500" />
                        <span className="text-[9px] font-bold">WhatsApp</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Latest Confession */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ y: -10 }}
          className="bg-white/70 backdrop-blur-xl rounded-[1.25rem] card-shadow p-6 space-y-4 border border-white/40 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-orange-600 bg-orange-100/50 px-2.5 py-1 rounded-full border border-orange-200/50">Latest Confession</span>
            <MessageCircle size={14} className="text-orange-600" />
          </div>
          <div className="bg-orange-50/50 rounded-[1rem] p-4 relative z-10 border border-orange-100/50 min-h-[120px] flex flex-col justify-between">
            <p className="text-slate-700 italic font-medium line-clamp-4 leading-relaxed text-xs">
              "{latestMessage?.content || "Loading latest confession..."}"
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Anonymous</span>
              <div className="flex items-center space-x-1 text-orange-400">
                <Heart size={8} fill="currentColor" />
                <span className="text-[8px] font-black">REAL</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between relative z-10 pt-1">
            <Link to="/confessions" className="flex items-center text-[10px] font-black text-orange-600 group/link">
              VIEW ALL <ChevronRight size={14} className="ml-1 group-hover/link:translate-x-2 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Users', value: '12K+', icon: Users, color: 'from-blue-500 to-indigo-600' },
          { label: 'Votes Cast', value: '100+', icon: Activity, color: 'from-purple-500 to-pink-600' },
          { label: 'Confessions', value: '200 +', icon: MessageCircle, color: 'from-orange-400 to-red-500' },
          { label: 'Campus Gists', value: '800+', icon: Zap, color: 'from-green-400 to-emerald-600' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + (idx * 0.1) }}
            className="bg-white/70 backdrop-blur-xl p-4 rounded-[1.25rem] card-shadow border border-white/40 flex flex-col items-center text-center space-y-1.5 group hover:scale-105 transition-all"
          >
            <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center text-white shadow-lg mb-0.5 group-hover:rotate-12 transition-transform`}>
              <stat.icon size={18} />
            </div>
            <span className="text-xl font-black text-slate-800 tracking-tighter">{stat.value}</span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</span>
          </motion.div>
        ))}
      </section>

      {/* Feature Grid */}
      <section className="bg-slate-900/80 backdrop-blur-xl rounded-[1.5rem] p-8 md:p-12 text-white overflow-hidden relative border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-purple-500/20 blur-[100px] rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/20 blur-[100px] rounded-full -ml-32 -mb-32"></div>
        
        <div className="relative z-10 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase">Campus Features</h2>
            <p className="text-slate-400 text-xs md:text-sm font-medium max-w-2xl mx-auto">Everything you need to stay engaged, informed, and connected with your campus community.</p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { name: 'Debate', icon: Zap, desc: 'Hot topics', color: 'text-purple-400' },
              { name: 'Polls', icon: TrendingUp, desc: 'Cast your vote', color: 'text-blue-400' },
              { name: 'Drama', icon: MessageCircle, desc: 'Latest gist', color: 'text-orange-400' },
              { name: 'Trends', icon: Zap, desc: 'What\'s new', color: 'text-pink-400' },
            ].map((feature, idx) => (
              <motion.div 
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + (idx * 0.1) }}
                className="bg-white/5 border border-white/10 p-6 rounded-[1.5rem] hover:bg-white/10 transition-all group hover:scale-105"
              >
                <feature.icon className={`${feature.color} mb-3 group-hover:scale-110 transition-transform`} size={28} />
                <h4 className="font-black text-base uppercase tracking-wider mb-1">{feature.name}</h4>
                <p className="text-[10px] text-slate-400 font-medium">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  </div>
);
};

export default HomePage;
