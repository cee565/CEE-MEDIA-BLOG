import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, BookOpen, MessageCircle, Zap, ChevronRight, Send, Users, Activity, Heart, Share2, Link as LinkIcon, Check, User, Trophy, Clock, Shield, Sparkles } from 'lucide-react';
import { WhatsAppIcon, XIcon, TikTokIcon } from '../components/BrandIcons';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../supabase';
import { Poll, Post, Message, Blog, CommissionPost } from '../types';
import Logo from '../components/Logo';
import AdsBoard from '../components/AdsBoard';
import MetaTags from '../components/MetaTags';

const HomePage = () => {
  useEffect(() => {
    // Welcome Greeting and Install Prompt
    const greetingShown = sessionStorage.getItem('ceemedia_welcome_toast');
    if (!greetingShown) {
      setTimeout(() => {
        toast('Welcome back to CEE MEDIA!', {
          description: 'Add our app to your home screen for instant updates and faster access.',
          icon: <Sparkles className="text-amber-500" size={18} />,
          action: {
            label: 'How?',
            onClick: () => {
              toast.info('iPhone: Share icon ⮕ "Add to Home Screen". Android: Menu ⮕ "Install app".', { duration: 5000 });
            },
          },
        });
        sessionStorage.setItem('ceemedia_welcome_toast', 'true');
      }, 3000);
    }
  }, []);

  const [trendingPoll, setTrendingPoll] = useState<Poll | null>(null);
  const [latestMessage, setLatestMessage] = useState<Message | null>(null);
  const [latestBlogs, setLatestBlogs] = useState<Blog[]>([]);
  const [upcomingVotes, setUpcomingVotes] = useState<CommissionPost[]>([]);
  const [activeVotes, setActiveVotes] = useState<CommissionPost[]>([]);
  const [showShareMenu, setShowShareMenu] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(new Date());

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

  const [stats, setStats] = useState({
    visitors: 0,
    votes: 0,
    confessions: 0,
    posts: 0
  });

  const fetchLatestBlogs = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('blogs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(12);
      if (data) setLatestBlogs(data as Blog[]);
    } catch (e) {
      console.error("Latest blogs fetch failed", e);
    }
  }, []);

  const fetchVotes = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('commission_posts')
        .select('*')
        .order('start_time', { ascending: true });
      
      if (data) {
        const currentTime = new Date();
        const upcoming = data.filter(p => new Date(p.start_time) > currentTime);
        const active = data.filter(p => new Date(p.start_time) <= currentTime && new Date(p.end_time) >= currentTime);
        
        setUpcomingVotes(upcoming);
        setActiveVotes(active);

        // Update status in DB if needed (auto-status system)
        for (const post of data) {
          let newStatus: 'upcoming' | 'active' | 'ended' = 'upcoming';
          const start = new Date(post.start_time);
          const end = new Date(post.end_time);
          
          if (currentTime < start) newStatus = 'upcoming';
          else if (currentTime >= start && currentTime <= end) newStatus = 'active';
          else newStatus = 'ended';

          if (post.status !== newStatus) {
            await supabase.from('commission_posts').update({ status: newStatus }).eq('id', post.id);
          }
        }
      }
    } catch (e) {
      console.error("Votes fetch failed", e);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch trending poll - optimized select
        const { data: polls } = await supabase
          .from('polls')
          .select('id, question, description, options, image, total_votes')
          .order('total_votes', { ascending: false })
          .limit(1);
        if (polls && polls.length > 0) setTrendingPoll(polls[0] as Poll);

        // Fetch latest approved message - optimized select
        const { data: messages } = await supabase
          .from('messages')
          .select('id, content, created_at')
          .eq('approved', true)
          .order('created_at', { ascending: false })
          .limit(1);
        if (messages && messages.length > 0) setLatestMessage(messages[0] as Message);

        // Fetch counts for stats
        const [
          { data: pollData },
          { count: blogCount },
          { count: messageCount },
          { data: analyticsData }
        ] = await Promise.all([
          supabase.from('polls').select('total_votes'),
          supabase.from('blogs').select('*', { count: 'exact', head: true }),
          supabase.from('messages').select('*', { count: 'exact', head: true }).eq('approved', true),
          supabase.from('analytics').select('total_visitors').eq('id', 'main').single()
        ]);

        const totalVotes = (pollData as any[])?.reduce((acc, p) => acc + (p.total_votes || 0), 0) || 0;

        setStats({
          visitors: analyticsData?.total_visitors || 0,
          votes: totalVotes,
          confessions: messageCount || 0,
          posts: blogCount || 0
        });

      } catch (e) {
        console.error("Home data fetch failed", e);
      }
    };

    fetchData();
    fetchLatestBlogs();
    fetchVotes();

    // Real-time subscriptions
    const blogsChannel = supabase
      .channel('public:blogs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blogs' }, () => {
        fetchLatestBlogs();
      })
      .subscribe();

    const votesChannel = supabase
      .channel('public:commission_posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commission_posts' }, () => {
        fetchVotes();
      })
      .subscribe();

    const messagesChannel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchData();
      })
      .subscribe();

    const pollsChannel = supabase
      .channel('public:polls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, () => {
        fetchData();
      })
      .subscribe();

    // Auto-update latest blogs every 30 seconds as fallback
    const blogInterval = setInterval(fetchLatestBlogs, 30000);
    
    // Update "now" every second for countdowns
    const timerInterval = setInterval(() => setNow(new Date()), 1000);

    return () => {
      supabase.removeChannel(blogsChannel);
      supabase.removeChannel(votesChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(pollsChannel);
      clearInterval(blogInterval);
      clearInterval(timerInterval);
    };
  }, [fetchLatestBlogs, fetchVotes]);

  const formatCountdown = (targetDate: string) => {
    const diff = new Date(targetDate).getTime() - now.getTime();
    if (diff <= 0) return "00 : 00 : 00 : 00";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${days.toString().padStart(2, '0')} : ${hours.toString().padStart(2, '0')} : ${minutes.toString().padStart(2, '0')} : ${seconds.toString().padStart(2, '0')}`;
  };

  const categories = [
    { name: 'Voting', icon: TrendingUp, path: '/vote' },
    { name: 'Blog', icon: BookOpen, path: '/blog' },
    { name: 'Confessions', icon: MessageCircle, path: '/confessions' },
    { name: 'Mock Exam', icon: Trophy, path: '/mock-exam/register' },
    { name: 'Campus Gist', icon: Zap, path: '/blog' },
  ];

  return (
    <div className="min-h-screen bg-white brand-grid">
      <MetaTags 
        image={trendingPoll?.image || undefined}
        description={trendingPoll ? `Trending Vote: ${trendingPoll.question}` : undefined}
      />
      <AdsBoard />
      
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-24 relative">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-[3rem] bg-brand-primary p-12 md:p-24 text-white text-center space-y-10 shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]"></div>
          
          <div className="inline-flex items-center space-x-3 bg-white/10 backdrop-blur-md border border-white/20 px-6 py-2.5 rounded-full text-[10px] font-black tracking-[0.3em] relative z-10">
            <Logo iconClassName="w-8 h-8" showText={false} dark={true} />
            <span className="uppercase">CEE MEDIA OFFICIAL</span>
          </div>

          <div className="space-y-8 relative z-10">
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter uppercase leading-[0.8] drop-shadow-2xl">
              CEE <span className="text-brand-accent">MEDIA</span>
            </h1>
            
            <p className="text-xl md:text-3xl text-indigo-100 font-medium tracking-tight max-w-3xl mx-auto opacity-90">
              Your Voice, Your Campus, Your Story.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-6 pt-8 relative z-10">
            <Link 
              to="/vote" 
              className="bg-brand-accent text-brand-primary px-12 py-5 rounded-2xl font-black shadow-xl hover:bg-brand-focus transition-all text-xs uppercase tracking-[0.2em]"
            >
              Start Voting
            </Link>
            <Link to="/blog" className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-12 py-5 rounded-2xl font-black hover:bg-white/20 transition-all text-xs uppercase tracking-[0.2em]">
              Explore Blog
            </Link>
          </div>
        </section>

        {/* Mock Exam Featured Section */}
        <section className="relative overflow-hidden rounded-[3rem] bg-indigo-50 border border-indigo-100 p-12 md:p-16 space-y-10 group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-accent/30 rounded-full blur-[100px] -mr-48 -mt-48 group-hover:bg-brand-accent/40 transition-colors duration-1000"></div>
          
          <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
            <div className="flex-shrink-0 w-32 h-32 md:w-48 md:h-48 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center text-brand-primary border border-slate-50 relative">
              <Trophy size={64} className="md:size-80" strokeWidth={1.5} />
              <div className="absolute -bottom-2 -right-2 bg-brand-accent text-brand-primary text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg border-2 border-white uppercase tracking-widest animate-bounce">
                Live
              </div>
            </div>

            <div className="flex-grow space-y-6 text-center md:text-left">
              <div className="inline-flex items-center space-x-2 bg-indigo-600/10 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                <Shield size={14} />
                <span>Secure Mock Examination</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                CEE MEDIA <span className="text-brand-secondary">2025 MOCKS</span>
              </h2>
              <p className="text-slate-600 text-lg font-medium tracking-tight max-w-xl">
                The ultimate preparation platform for GST and Departmental exams. Get your token, practice under real exam conditions, and top the leaderboard.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4">
                <Link 
                  to="/mock-exam/register" 
                  className="bg-brand-primary text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-brand-secondary transition-all flex items-center justify-center space-x-2"
                >
                  <span>Register Now</span>
                  <ChevronRight size={16} />
                </Link>
                <Link 
                  to="/mock-exam/entry" 
                  className="bg-white text-slate-900 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-slate-100 shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center space-x-2"
                >
                  <span>Enter Exam Portal</span>
                </Link>
              </div>
            </div>

            <div className="hidden lg:grid grid-cols-2 gap-4">
              {[
                { label: 'Science', desc: 'MTH/PHY/CHM/GST' },
                { label: 'Commercial', desc: 'ACC/ECO/GST' },
                { label: 'Duration', desc: '20 Minutes' },
                { label: 'Real-time', desc: 'Leaderboard' },
              ].map(item => (
                <div key={item.label} className="bg-white/60 backdrop-blur-sm p-6 rounded-3xl border border-white/40 shadow-sm text-center space-y-1">
                  <div className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{item.label}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Latest Blogs Section */}
        <section className="space-y-10 content-auto">
          <div className="flex items-center space-x-6">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">Latest Blogs</h2>
            <div className="h-px flex-grow bg-slate-100"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {latestBlogs.length > 0 ? latestBlogs.map(blog => (
              <Link 
                key={blog.id}
                to={`/blog?id=${blog.id}`}
                className="group bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden hover:shadow-2xl transition-all flex flex-col"
              >
                {blog.image_url && (
                  <div className="h-48 overflow-hidden">
                    <img 
                      src={blog.image_url} 
                      alt={blog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div className="p-8 space-y-4 flex-grow">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter line-clamp-2">{blog.title}</h3>
                  <p className="text-slate-500 text-xs font-medium line-clamp-3">{blog.content}</p>
                  <div className="pt-4 flex items-center justify-between border-t border-slate-50">
                    <span className="text-[10px] font-black text-brand-secondary uppercase tracking-widest">{blog.author}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Read More →</span>
                  </div>
                </div>
              </Link>
            )) : (
              <div className="col-span-full bg-slate-50 rounded-[3rem] p-20 text-center">
                <p className="text-slate-400 font-black uppercase tracking-widest">No blogs yet</p>
              </div>
            )}
          </div>
        </section>

        {/* Categories */}
        <section className="space-y-10 content-auto">
          <div className="flex items-center space-x-6">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">Explore Categories</h2>
            <div className="h-px flex-grow bg-slate-100"></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {categories.map((cat) => (
              <Link 
                key={cat.name}
                to={cat.path}
                className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-brand-secondary transition-all flex flex-col items-center text-center space-y-6"
              >
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-brand-secondary group-hover:bg-brand-secondary group-hover:text-white transition-all duration-500">
                  <cat.icon size={28} />
                </div>
                <span className="font-black text-slate-900 uppercase tracking-tighter text-xs">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Voting Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 content-auto">
          {/* Upcoming Votes */}
          <section className="space-y-8">
            <div className="flex items-center space-x-4">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">Upcoming Votes</h2>
              <div className="h-px flex-grow bg-slate-100"></div>
            </div>
            
            <div className="space-y-6">
              {upcomingVotes.length > 0 ? upcomingVotes.map(vote => (
                <div key={vote.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 flex items-center space-x-6">
                  {vote.image_url && (
                    <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                      <img src={vote.image_url} alt={vote.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <div className="flex-grow space-y-2">
                    <h3 className="font-black text-slate-900 uppercase tracking-tighter">{vote.title}</h3>
                    <div className="flex items-center space-x-2 text-brand-secondary">
                      <Clock size={14} />
                      <span className="text-[10px] font-black font-mono tracking-widest">{formatCountdown(vote.start_time)}</span>
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Voting starts soon</p>
                  </div>
                </div>
              )) : (
                <div className="p-10 border-2 border-dashed border-slate-100 rounded-[2.5rem] text-center">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No upcoming votes</p>
                </div>
              )}
            </div>
          </section>

          {/* Active Votes */}
          <section className="space-y-8">
            <div className="flex items-center space-x-4">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">Active Votes</h2>
              <div className="h-px flex-grow bg-slate-100"></div>
            </div>
            
            <div className="space-y-6">
              {activeVotes.length > 0 ? activeVotes.map(vote => (
                <div key={vote.id} className="bg-white rounded-[2.5rem] border border-brand-secondary/20 p-8 flex items-center space-x-6 shadow-lg shadow-brand-secondary/5">
                  {vote.image_url && (
                    <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                      <img src={vote.image_url} alt={vote.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <div className="flex-grow space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-slate-900 uppercase tracking-tighter">{vote.title}</h3>
                      <span className="bg-green-50 text-green-500 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Live</span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Clock size={14} />
                      <span className="text-[10px] font-black font-mono tracking-widest">{formatCountdown(vote.end_time)}</span>
                    </div>
                    <Link 
                      to={`/vote/active/${vote.id}`}
                      className="block w-full bg-brand-secondary text-white py-3 rounded-xl text-center text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary transition-all"
                    >
                      Vote Now
                    </Link>
                  </div>
                </div>
              )) : (
                <div className="p-10 border-2 border-dashed border-slate-100 rounded-[2.5rem] text-center">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No active votes</p>
                </div>
              )}
            </div>
          </section>
        </div>        {/* Featured Content */}
        <div className="grid grid-cols-1 gap-10 content-auto">
          {/* Latest Confession */}
          <div className="bg-brand-primary rounded-[3rem] shadow-2xl p-10 space-y-8 flex flex-col text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <div className="flex items-center justify-between relative z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300">Latest Confession</span>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-indigo-300">
                  <MessageCircle size={16} />
                </div>
              </div>
              <div className="flex-grow flex flex-col justify-center relative z-10">
                {latestMessage ? (
                  <p className="text-2xl font-medium italic leading-relaxed text-indigo-50 transition-transform duration-500">
                    "{latestMessage.content}"
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="h-6 bg-white/10 rounded-lg w-full animate-pulse" />
                    <div className="h-6 bg-white/10 rounded-lg w-5/6 animate-pulse" />
                    <div className="h-6 bg-white/10 rounded-lg w-2/3 animate-pulse" />
                  </div>
                )}
              </div>
              <div className="pt-8 border-t border-white/10 flex items-center justify-between relative z-10">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-indigo-300">
                    <User size={12} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Anonymous</span>
                </div>
                <Link to="/confessions" className="text-[10px] font-black text-brand-accent hover:text-brand-focus transition-colors uppercase tracking-[0.2em]">
                  VIEW ALL
                </Link>
              </div>
            </div>
          </div>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-8 content-auto">
          {[
            { label: 'Active Users', value: stats.visitors, icon: Users },
            { label: 'Votes Cast', value: stats.votes, icon: Activity },
            { label: 'Confessions', value: stats.confessions, icon: MessageCircle },
            { label: 'Campus Gists', value: stats.posts, icon: Zap },
          ].map((stat) => (
            <div key={stat.label} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm text-center space-y-3 group hover:border-brand-secondary hover:shadow-xl transition-all">
              <div className="text-4xl font-black text-slate-900 tracking-tighter transition-transform">
                {stat.value.toLocaleString()}+
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{stat.label}</div>
            </div>
          ))}
        </section>

        {/* Footer CTA */}
        <section className="bg-slate-900 rounded-[3rem] p-16 md:p-24 text-center space-y-8 relative overflow-hidden content-auto">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.15),transparent_70%)]"></div>
          <div className="relative z-10 space-y-4">
            <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">Join the Conversation</h2>
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium tracking-tight">The heartbeat of campus culture. Stay connected, stay informed, and make your mark.</p>
          </div>
          <div className="flex flex-col justify-center items-center gap-6 pt-4 relative z-10">
            <Link to="/confessions/submit" className="bg-brand-secondary text-white px-12 py-5 rounded-2xl font-black hover:bg-indigo-500 transition-all shadow-xl text-xs uppercase tracking-[0.2em]">
              Share a Secret
            </Link>
            <Link 
              to="/admin" 
              className="flex items-center space-x-2 text-[11px] font-black text-white/50 hover:text-brand-accent transition-all uppercase tracking-[0.3em] group border border-white/10 px-4 py-2 rounded-xl hover:bg-white/5"
            >
              <Shield size={14} className="group-hover:rotate-12 transition-transform" />
              <span>System Administration</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
