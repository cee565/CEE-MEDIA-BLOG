import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { CommissionPost, CommissionVote } from '../types';
import { CheckCircle2, BarChart3, Share2, Link, Check, Heart, Clock, ArrowLeft, ChevronRight, TrendingUp, User, Activity } from 'lucide-react';
import { WhatsAppIcon, XIcon, TikTokIcon } from '../components/BrandIcons';
import { toast } from 'sonner';
import { isAfter, intervalToDuration, format, isBefore } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import MetaTags from '../components/MetaTags';

const CountdownTimer = ({ targetDate, label }: { targetDate: string, label: string }) => {
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const end = new Date(targetDate);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      const duration = intervalToDuration({ start: now, end });
      setTimeLeft({
        days: duration.days || 0,
        hours: duration.hours || 0,
        minutes: duration.minutes || 0,
        seconds: duration.seconds || 0
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
      <Clock size={14} className="text-white/80" />
      <span className="text-[10px] font-black text-white uppercase tracking-widest">
        {label}: {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
      </span>
    </div>
  );
};

const VoteCard = React.memo(({ post, onVote }: { post: CommissionPost, onVote: (postId: string) => Promise<void> }) => {
  const [voted, setVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const storageKey = `voted_commission_${post.id}`;

  useEffect(() => {
    if (localStorage.getItem(storageKey)) {
      setVoted(true);
    }
  }, [post.id]);

  const handleVote = async () => {
    if (voted || post.status !== 'active' || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onVote(post.id);
      setVoted(true);
      localStorage.setItem(storageKey, 'true');
      toast.success('Vote recorded successfully!');
    } catch (err: any) {
      console.error("Vote failed", err);
      toast.error(err.message || "Failed to record vote.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}/vote?id=${post.id}`;
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-2xl transition-all"
    >
      <div className="aspect-video relative overflow-hidden bg-slate-100">
        {post.image_url ? (
          <img 
            src={post.image_url} 
            alt={post.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Activity size={64} />
          </div>
        )}
        <div className="absolute top-6 left-6 flex flex-wrap gap-3">
          {post.status === 'active' ? (
            <div className="bg-green-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              <span>Live Now</span>
            </div>
          ) : post.status === 'upcoming' ? (
            <div className="bg-amber-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center space-x-2">
              <Clock size={12} />
              <span>Upcoming</span>
            </div>
          ) : (
            <div className="bg-slate-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
              Ended
            </div>
          )}
        </div>
        
        {post.status === 'active' && (
          <div className="absolute bottom-6 left-6 right-6">
            <CountdownTimer targetDate={post.end_time} label="Ends in" />
          </div>
        )}
        {post.status === 'upcoming' && (
          <div className="absolute bottom-6 left-6 right-6">
            <CountdownTimer targetDate={post.start_time} label="Starts in" />
          </div>
        )}
      </div>

      <div className="p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight tracking-tighter uppercase">
            {post.title}
          </h3>
          <button 
            onClick={copyToClipboard}
            className={`p-3 rounded-2xl transition-all ${copied ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400 hover:text-brand-secondary'}`}
          >
            {copied ? <Check size={20} /> : <Share2 size={20} />}
          </button>
        </div>

        <div className="flex items-center space-x-6 text-slate-400">
          <div className="flex items-center space-x-2">
            <User size={16} />
            <span className="text-xs font-black uppercase tracking-widest">
              {post.votes_count?.toLocaleString() || 0} Votes
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock size={16} />
            <span className="text-xs font-black uppercase tracking-widest">
              {format(new Date(post.created_at), 'MMM d, yyyy')}
            </span>
          </div>
        </div>

        {post.status === 'active' && (
          <button
            disabled={voted || isSubmitting}
            onClick={handleVote}
            className={`w-full py-5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-[0.2em] transition-all shadow-xl ${
              voted 
                ? 'bg-green-50 text-green-600 cursor-default border-2 border-green-100' 
                : 'bg-brand-primary text-white hover:bg-brand-secondary active:scale-95'
            }`}
          >
            {voted ? (
              <span className="flex items-center justify-center space-x-2">
                <CheckCircle2 size={18} />
                <span>Voted Successfully</span>
              </span>
            ) : isSubmitting ? 'Recording Vote...' : 'Cast Your Vote'}
          </button>
        )}

        {post.status === 'upcoming' && (
          <div className="w-full py-5 rounded-2xl bg-slate-50 text-slate-400 font-black text-xs md:text-sm uppercase tracking-[0.2em] text-center border-2 border-dashed border-slate-200">
            Voting Opens Soon
          </div>
        )}

        {post.status === 'ended' && (
          <div className="w-full py-5 rounded-2xl bg-slate-100 text-slate-500 font-black text-xs md:text-sm uppercase tracking-[0.2em] text-center flex items-center justify-center space-x-2">
            <BarChart3 size={18} />
            <span>Voting has Ended</span>
          </div>
        )}
      </div>
    </motion.div>
  );
});

const VotePage = () => {
  const [posts, setPosts] = useState<CommissionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const postId = searchParams.get('id');

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('commission_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const now = new Date();
        const formattedPosts = await Promise.all(data.map(async (post: any) => {
          // Auto-status management
          let status = post.status;
          const start = new Date(post.start_time);
          const end = new Date(post.end_time);

          if (isBefore(now, start)) {
            status = 'upcoming';
          } else if (isAfter(now, end)) {
            status = 'ended';
          } else {
            status = 'active';
          }

          // Update status in DB if changed
          if (status !== post.status) {
            await supabase
              .from('commission_posts')
              .update({ status })
              .eq('id', post.id);
          }

          // Fetch vote count
          const { count } = await supabase
            .from('votes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          return { ...post, status, votes_count: count || 0 };
        }));

        setPosts(formattedPosts);
      }
    } catch (err) {
      console.error("Failed to fetch commission posts", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (postId: string) => {
    // Get user identifier (IP or simple random ID stored in localStorage)
    let userIdentifier = localStorage.getItem('user_identifier');
    if (!userIdentifier) {
      userIdentifier = 'user_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('user_identifier', userIdentifier);
    }

    // Check if already voted in DB
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_identifier', userIdentifier)
      .single();

    if (existingVote) {
      throw new Error("You have already voted on this post.");
    }

    // Record vote
    const { error } = await supabase
      .from('votes')
      .insert({
        post_id: postId,
        user_identifier: userIdentifier
      });

    if (error) throw error;
    
    // Refresh posts to update counts
    fetchPosts();
  };

  useEffect(() => {
    fetchPosts();
    
    // Real-time updates
    const channel = supabase
      .channel('commission_votes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const activePosts = posts.filter(p => p.status === 'active');
  const upcomingPosts = posts.filter(p => p.status === 'upcoming');
  const endedPosts = posts.filter(p => p.status === 'ended');

  const sharedPost = postId ? posts.find(p => p.id === postId) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-16">
      <MetaTags 
        title={sharedPost ? sharedPost.title : 'Campus Voting'}
        description={sharedPost ? `Vote now on CEE MEDIA: ${sharedPost.title}` : 'Participate in campus decisions and trending polls.'}
        image={sharedPost?.image_url || undefined}
      />

      <div className="text-center space-y-6">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-white border border-slate-100 rounded-full shadow-sm">
          <div className="w-2 h-2 bg-brand-secondary rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary">Live Campus Pulse</span>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none uppercase">
            YOUR VOICE. <span className="text-brand-secondary text-stroke-slate-900">YOUR CHOICE.</span>
          </h1>
          <p className="text-slate-500 text-sm md:text-xl max-w-2xl mx-auto leading-relaxed font-medium">
            Participate in official campus polls and make your opinion count.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-[2.5rem] border border-slate-100 h-[500px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-24">
          {/* Active Votes */}
          {activePosts.length > 0 && (
            <section className="space-y-10">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-8 bg-green-500 rounded-full" />
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Active Voting</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {activePosts.map(post => (
                  <VoteCard key={post.id} post={post} onVote={handleVote} />
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Votes */}
          {upcomingPosts.length > 0 && (
            <section className="space-y-10">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-8 bg-amber-500 rounded-full" />
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Upcoming Votes</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {upcomingPosts.map(post => (
                  <VoteCard key={post.id} post={post} onVote={handleVote} />
                ))}
              </div>
            </section>
          )}

          {/* Ended Votes */}
          {endedPosts.length > 0 && (
            <section className="space-y-10 opacity-75">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-8 bg-slate-400 rounded-full" />
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Past Results</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {endedPosts.map(post => (
                  <VoteCard key={post.id} post={post} onVote={handleVote} />
                ))}
              </div>
            </section>
          )}

          {posts.length === 0 && (
            <div className="text-center py-32 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100 space-y-6">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                <BarChart3 size={40} className="text-slate-200" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">No active votes</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto font-medium">
                  Check back later for new campus polls and decisions.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VotePage;
