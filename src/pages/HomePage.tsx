import React, { useState, useEffect } from 'react';
import { TrendingUp, BookOpen, MessageCircle, Zap, ChevronRight, Send, Users, Activity, Heart, Share2, Link as LinkIcon, Check, User, Trophy } from 'lucide-react';
import { WhatsAppIcon, XIcon, TikTokIcon } from '../components/BrandIcons';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../supabase';
import { Poll, Post, Message } from '../types';
import Logo from '../components/Logo';
import AdsBoard from '../components/AdsBoard';
import MetaTags from '../components/MetaTags';

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

  const [stats, setStats] = useState({
    visitors: 0,
    votes: 0,
    confessions: 0,
    posts: 0
  });

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

        // Fetch hot post - optimized select
        const { data: posts } = await supabase
          .from('posts')
          .select('id, title, author, content, image, category, likes')
          .order('likes', { ascending: false })
          .limit(1);
        if (posts && posts.length > 0) setHotPost(posts[0] as Post);

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
          { count: postCount },
          { count: messageCount },
          { data: analyticsData }
        ] = await Promise.all([
          supabase.from('polls').select('total_votes'),
          supabase.from('posts').select('*', { count: 'exact', head: true }),
          supabase.from('messages').select('*', { count: 'exact', head: true }).eq('approved', true),
          supabase.from('analytics').select('total_visitors').eq('id', 'main').single()
        ]);

        const totalVotes = (pollData as any[])?.reduce((acc, p) => acc + (p.total_votes || 0), 0) || 0;

        setStats({
          visitors: analyticsData?.total_visitors || 0,
          votes: totalVotes,
          confessions: messageCount || 0,
          posts: postCount || 0
        });

      } catch (e) {
        console.error("Home data fetch failed", e);
      }
    };
    fetchData();

    return () => {};
  }, []);

  const categories = [
    { name: 'Voting', icon: TrendingUp, path: '/vote' },
    { name: 'Blog', icon: BookOpen, path: '/blog' },
    { name: 'Confessions', icon: MessageCircle, path: '/confessions' },
    // { name: 'Mock Exam', icon: Trophy, path: '/mock-exam/register' },
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

        {/* Featured Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 content-auto">
          {/* Trending Poll */}
            <Link 
              to={trendingPoll ? `/vote?id=${trendingPoll.id}` : "/vote"}
              className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 space-y-8 flex flex-col hover:shadow-2xl transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-secondary">Trending Poll</span>
                <div className="w-8 h-8 rounded-full bg-brand-secondary/10 flex items-center justify-center text-brand-secondary">
                  <TrendingUp size={16} />
                </div>
              </div>
              {trendingPoll ? (
                <>
                  {trendingPoll.image && (
                    <div className="aspect-video rounded-3xl overflow-hidden shadow-inner bg-slate-50">
                      <img 
                        src={trendingPoll.image} 
                        alt="Poll" 
                        className="w-full h-full object-cover transition-transform duration-1000" 
                        referrerPolicy="no-referrer" 
                        loading="lazy" 
                        decoding="async"
                      />
                    </div>
                  )}
                  <h3 className="text-3xl font-black text-slate-900 leading-tight flex-grow tracking-tight">
                    {trendingPoll.question}
                  </h3>
                </>
              ) : (
                <div className="space-y-6 flex-grow">
                  <div className="aspect-video rounded-3xl bg-slate-100 animate-pulse" />
                  <div className="h-8 bg-slate-100 rounded-xl w-3/4 animate-pulse" />
                  <div className="h-8 bg-slate-100 rounded-xl w-1/2 animate-pulse" />
                </div>
              )}
              <div className="inline-flex items-center text-[10px] font-black text-brand-secondary group-hover:text-brand-primary transition-colors uppercase tracking-[0.2em]">
                VOTE NOW <ChevronRight size={16} className="ml-1" />
              </div>
            </Link>

          {/* Hot Blog */}
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10 space-y-8 flex flex-col hover:shadow-2xl transition-all group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-secondary">Hot Blog</span>
              <div className="w-8 h-8 rounded-full bg-brand-secondary/10 flex items-center justify-center text-brand-secondary">
                <BookOpen size={16} />
              </div>
            </div>
            {hotPost ? (
              <>
                {hotPost.image && (
                  <div className="aspect-video rounded-3xl overflow-hidden shadow-inner bg-slate-50">
                    <img 
                      src={hotPost.image} 
                      alt="Post" 
                      className="w-full h-full object-cover transition-transform duration-1000" 
                      referrerPolicy="no-referrer" 
                      loading="lazy" 
                      decoding="async"
                    />
                  </div>
                )}
                <h3 className="text-3xl font-black text-slate-900 leading-tight flex-grow tracking-tight">
                  {hotPost.title}
                </h3>
              </>
            ) : (
              <div className="space-y-6 flex-grow">
                <div className="aspect-video rounded-3xl bg-slate-100 animate-pulse" />
                <div className="h-8 bg-slate-100 rounded-xl w-3/4 animate-pulse" />
                <div className="h-8 bg-slate-100 rounded-xl w-1/2 animate-pulse" />
              </div>
            )}
            <Link to="/blog" className="inline-flex items-center text-[10px] font-black text-brand-secondary hover:text-brand-primary transition-colors uppercase tracking-[0.2em]">
              READ MORE <ChevronRight size={16} className="ml-1" />
            </Link>
          </div>

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
          <div className="flex justify-center pt-4 relative z-10">
            <Link to="/confessions/submit" className="bg-brand-secondary text-white px-12 py-5 rounded-2xl font-black hover:bg-indigo-500 transition-all shadow-xl text-xs uppercase tracking-[0.2em]">
              Share a Secret
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
