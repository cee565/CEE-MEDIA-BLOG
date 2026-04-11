import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../supabase';
import { Poll, PollGroup } from '../types';
import { CheckCircle2, BarChart3, Share2, Link, Check, Heart, Clock, ArrowLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { WhatsAppIcon, XIcon, TikTokIcon } from '../components/BrandIcons';
import { toast } from 'sonner';
import { AnimatePresence } from 'motion/react';
import { isAfter, intervalToDuration, format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import MetaTags from '../components/MetaTags';

const TimerBox = ({ value, label, size = 'md' }: { value: number | string, label: string, size?: 'sm' | 'md' }) => (
  <div className="flex flex-col items-center">
    <div className={`${size === 'sm' ? 'w-8 h-8 md:w-10 md:h-10' : 'w-12 h-12 md:w-16 md:h-16'} bg-brand-primary rounded-lg md:rounded-xl flex items-center justify-center shadow-lg border border-white/10`}>
      <span className={`text-white ${size === 'sm' ? 'text-xs md:text-sm' : 'text-xl md:text-2xl'} font-black tracking-tighter`}>{String(value).padStart(2, '0')}</span>
    </div>
    <span className={`${size === 'sm' ? 'text-[6px] md:text-[8px]' : 'text-[8px] md:text-[10px]'} font-black text-slate-400 mt-1 md:mt-2 uppercase tracking-[0.2em]`}>{label}</span>
  </div>
);

const GroupTimer = ({ expiresAt }: { expiresAt: string }) => {
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const end = new Date(expiresAt);
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
  }, [expiresAt]);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center space-x-1 md:space-x-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
      <TimerBox value={timeLeft.days} label="D" size="sm" />
      <span className="text-xs font-black text-slate-200 mb-4">:</span>
      <TimerBox value={timeLeft.hours} label="H" size="sm" />
      <span className="text-xs font-black text-slate-200 mb-4">:</span>
      <TimerBox value={timeLeft.minutes} label="M" size="sm" />
      <span className="text-xs font-black text-slate-200 mb-4">:</span>
      <TimerBox value={timeLeft.seconds} label="S" size="sm" />
    </div>
  );
};

const PollCard = React.memo(({ poll }: { poll: Poll }) => {
  const isUpcoming = poll.starts_at && isAfter(new Date(poll.starts_at), new Date());
  const isEnded = poll.is_ended || (poll.expires_at && isAfter(new Date(), new Date(poll.expires_at)));
  const [voted, setVoted] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [tempSelected, setTempSelected] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);
  const [startCountdown, setStartCountdown] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);
  const storageKey = `voted_poll_${poll.id}`;

  const showResults = voted || isEnded;

  useEffect(() => {
    if (!poll.expires_at || isEnded || isUpcoming) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const end = new Date(poll.expires_at!);
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
  }, [poll.expires_at, isEnded, isUpcoming]);

  useEffect(() => {
    if (!poll.starts_at || !isUpcoming) {
      setStartCountdown(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const start = new Date(poll.starts_at!);
      const diff = start.getTime() - now.getTime();

      if (diff <= 0) {
        setStartCountdown(null);
        window.location.reload(); // Refresh to update status
        return;
      }

      const duration = intervalToDuration({ start: now, end: start });
      setStartCountdown({
        days: duration.days || 0,
        hours: duration.hours || 0,
        minutes: duration.minutes || 0,
        seconds: duration.seconds || 0
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [poll.starts_at, isUpcoming]);

  useEffect(() => {
    const hasVoted = localStorage.getItem(storageKey);
    if (hasVoted) {
      setVoted(true);
      setSelected(parseInt(hasVoted));
    }
  }, [poll.id]);

  const handleVote = async () => {
    if (voted || isEnded || tempSelected === null) return;

    setIsSubmitting(true);
    try {
      // Use atomic RPC to handle high-concurrency and millions of votes accurately
      const { error } = await supabase.rpc('increment_vote', {
        p_id: poll.id,
        opt_idx: tempSelected.toString()
      });

      if (error) throw error;

      localStorage.setItem(storageKey, tempSelected.toString());
      setVoted(true);
      setSelected(tempSelected);
      toast.success('Vote cast successfully!');
    } catch (e: any) {
      console.error("Voting failed", e);
      toast.error(e.message?.includes("row-level security") 
        ? "Permission denied. Please try again later." 
        : "Failed to cast vote.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [localLikes, setLocalLikes] = useState(poll.likes || 0);
  const [liked, setLiked] = useState(false);
  const likeStorageKey = `liked_poll_${poll.id}`;

  useEffect(() => {
    setLocalLikes(poll.likes || 0);
    const hasLiked = localStorage.getItem(likeStorageKey);
    if (hasLiked) setLiked(true);
  }, [poll.id, poll.likes]);

  const handleLike = async () => {
    if (liked) return;
    
    setLocalLikes(prev => prev + 1);
    setLiked(true);
    localStorage.setItem(likeStorageKey, 'true');

    try {
      // Use atomic RPC for likes to handle high traffic
      const { error } = await supabase.rpc('increment_poll_like', {
        p_id: poll.id
      });
      
      if (error) throw error;
      toast.success('Poll liked!');
    } catch (e: any) {
      console.error("Like failed", e);
      setLocalLikes(prev => Math.max(0, prev - 1));
      setLiked(false);
      localStorage.removeItem(likeStorageKey);
      toast.error("Failed to like poll.");
    }
  };

  const shareUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}/vote?id=${poll.id}`;
  const shareText = `Vote on this on CEE MEDIA: "${poll.question}"`;

  const copyToClipboard = (silent = false) => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    if (!silent) toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToTwitter = () => {
    copyToClipboard(true);
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareToFacebook = () => {
    copyToClipboard(true);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareToWhatsApp = () => {
    copyToClipboard(true);
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
  };

  const shareToWhatsAppBusiness = () => {
    copyToClipboard(true);
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
  };

  return (
    <motion.div 
      id={`poll-${poll.id}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-10 space-y-8 overflow-hidden relative group"
    >
      <div className="space-y-6">
        {poll.image && (
          <div className="aspect-video rounded-2xl overflow-hidden shadow-inner bg-slate-100">
            <img 
              src={poll.image} 
              alt="Vote" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
            />
          </div>
        )}
        
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center space-x-3">
                {isUpcoming ? (
                  <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                    <Clock size={10} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Upcoming</span>
                  </div>
                ) : isEnded ? (
                  <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-red-50 text-red-600 rounded-full border border-red-100">
                    <span className="text-[8px] font-black uppercase tracking-widest">Ended</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-green-50 text-green-600 rounded-full border border-green-100">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Live</span>
                  </div>
                )}
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight tracking-tight">
                  {poll.question}
                </h3>
              </div>
              {poll.description && (
                <p className="text-slate-500 text-sm md:text-base leading-relaxed font-medium">
                  {poll.description}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button 
                onClick={handleLike}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${liked ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
              >
                <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
                <span className="text-sm font-black">{localLikes.toLocaleString()}</span>
              </button>
              <button 
                onClick={() => copyToClipboard()}
                className={`p-2.5 rounded-xl transition-all ${copied ? 'bg-green-50 text-green-600' : 'text-slate-400 hover:text-brand-secondary hover:bg-slate-50'}`}
              >
                {copied ? <Check size={18} /> : <Link size={18} />}
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {isUpcoming && startCountdown && (
              <div className="flex items-center space-x-2 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
                <Clock size={14} className="text-amber-600" />
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                  Starts in: {startCountdown.days}d {startCountdown.hours}h {startCountdown.minutes}m {startCountdown.seconds}s
                </span>
              </div>
            )}
            {timeLeft && !isEnded && !isUpcoming && (
              <div className="flex items-center space-x-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                <Clock size={14} className="text-slate-400" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  Ends in: {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
                </span>
              </div>
            )}
            <div className="flex items-center space-x-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <Clock size={14} className="text-slate-400" />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                {format(new Date(poll.created_at), 'MMM d, yyyy HH:mm:ss')}
              </span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
              <BarChart3 size={14} className="text-slate-400" />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                {poll.total_votes.toLocaleString()} Total Votes
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {poll.options.map((option, index) => {
          const optionText = typeof option === 'string' ? option : option.text;
          const optionImage = typeof option === 'string' ? null : option.image;
          const voteCount = poll.votes[index] || 0;
          const isSelected = selected === index;
          const isPending = tempSelected === index;
          const percentage = poll.total_votes > 0 ? Math.round((voteCount / poll.total_votes) * 100) : 0;

          return (
            <button
              key={index}
              disabled={showResults || isSubmitting}
              onClick={() => setTempSelected(index)}
              className={`w-full relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 border-2 ${
                showResults 
                  ? 'cursor-default border-transparent bg-slate-50' 
                  : isPending 
                    ? 'border-brand-secondary bg-brand-secondary/5 shadow-md scale-[1.02] z-10' 
                    : 'border-slate-100 bg-white hover:border-brand-secondary hover:bg-slate-50 hover:scale-[1.01] hover:shadow-sm'
              }`}
            >
              {/* Progress bar removed as per request to remove percentage from voting */}
              
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center space-x-4 flex-1">
                  <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-300 ${
                    isSelected || isPending ? 'border-brand-secondary bg-brand-secondary' : 'border-slate-200'
                  }`}>
                    {(isSelected || isPending) && <Check size={14} className="text-white" strokeWidth={4} />}
                  </div>
                  {optionImage && (
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 shadow-sm">
                      <img 
                        src={optionImage} 
                        alt={optionText} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className={`text-base font-black uppercase tracking-tight transition-colors ${isSelected ? 'text-brand-primary' : isPending ? 'text-brand-secondary' : 'text-slate-700'}`}>
                      {optionText}
                    </span>
                  </div>
                </div>
                {showResults && (
                  <div className="flex flex-col items-end">
                    <span className="text-xl font-black text-slate-900 tracking-tighter">{voteCount.toLocaleString()}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Votes</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {!showResults && (
        <button
          disabled={tempSelected === null || isSubmitting || isUpcoming}
          onClick={() => tempSelected !== null && !isUpcoming && handleVote()}
          className={`w-full py-5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-[0.2em] transition-all shadow-xl ${
            tempSelected === null || isSubmitting || isUpcoming
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-brand-primary text-white hover:bg-brand-secondary active:scale-95'
          }`}
        >
          {isUpcoming ? 'Voting Not Started' : isSubmitting ? 'Casting Vote...' : 'Submit Vote'}
        </button>
      )}
    </motion.div>
  );
});

const VotePage = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollGroups, setPollGroups] = useState<PollGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<PollGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const pollId = searchParams.get('id');

  // Find the specific poll if ID is provided in URL
  const sharedPoll = pollId ? polls.find(p => p.id === pollId) : null;

  useEffect(() => {
    const fetchData = async () => {
      const { data: pollsData } = await supabase
        .from('polls')
        .select('id, question, description, image, options, votes, total_votes, likes, expires_at, starts_at, is_ended, group_id, created_at')
        .order('created_at', { ascending: false });
      
      const { data: groupsData } = await supabase
        .from('poll_groups')
        .select('id, title, description, image, expires_at, starts_at, created_at')
        .order('created_at', { ascending: false });

      if (pollsData) setPolls(pollsData as Poll[]);
      if (groupsData) setPollGroups(groupsData as PollGroup[]);
      setLoading(false);

      // Handle direct link scrolling
      const pollId = searchParams.get('id');
      if (pollId) {
        setTimeout(() => {
          const element = document.getElementById(`poll-${pollId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-4', 'ring-purple-500', 'ring-offset-4');
            setTimeout(() => {
              element.classList.remove('ring-4', 'ring-purple-500', 'ring-offset-4');
            }, 3000);
          }
        }, 500);
      }
    };

    fetchData();

    // Real-time subscription - only listen for UPDATE events on polls for vote counts
    // This follows the rule: "Do NOT stream every individual vote event. Instead, send aggregated vote counts."
    const pollsSubscription = supabase
      .channel('polls_channel')
      .on('postgres_changes' as any, { event: 'UPDATE', schema: 'public', table: 'polls' }, (payload: any) => {
        // Show real-time notification for new votes
        setPolls(prev => {
          const existingPoll = prev.find(p => p.id === payload.new.id);
          if (existingPoll && payload.new.total_votes > (existingPoll.total_votes || 0)) {
            // Only show if it's a significant update or throttle it
            toast.success('Live Vote!', {
              description: `Someone just voted on: ${payload.new.question}`,
              duration: 2000,
              icon: <TrendingUp size={14} className="text-green-500" />
            });
          }
          return prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p);
        });
      })
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'polls' }, (payload: any) => {
        setPolls(prev => [payload.new as Poll, ...prev]);
      })
      .subscribe();

    // No real-time for poll groups as they change rarely
    return () => {
      supabase.removeChannel(pollsSubscription);
    };
  }, []);

  const filteredPolls = selectedGroup 
    ? polls.filter(p => p.group_id === selectedGroup.id)
    : polls.filter(p => !p.group_id);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-12 relative">
      <MetaTags 
        title={sharedPoll ? sharedPoll.question : 'Campus Voting'}
        description={sharedPoll ? `Vote now on CEE MEDIA: ${sharedPoll.question}` : 'Shape the future of your campus. Vote on trending topics in real-time.'}
        image={sharedPoll?.image || undefined}
      />

      <div className="text-center space-y-6 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center space-x-2 px-4 py-1.5 bg-white border border-slate-100 rounded-full shadow-sm"
        >
          <div className="w-2 h-2 bg-brand-secondary rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary">Live Campus Pulse</span>
        </motion.div>
        
        <div className="space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none uppercase"
          >
            SHAPE THE <span className="text-brand-secondary">FUTURE.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 text-sm md:text-lg max-w-2xl mx-auto leading-relaxed font-medium"
          >
            Your voice matters. Participate in trending votes and see what the campus is thinking.
          </motion.p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 h-64 animate-pulse space-y-4">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl" />
                <div className="h-8 bg-slate-100 rounded-xl w-3/4" />
                <div className="h-4 bg-slate-100 rounded-lg w-full" />
                <div className="h-4 bg-slate-100 rounded-lg w-5/6" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-8">
            {[1, 2].map(i => (
              <div key={i} className="bg-white p-10 rounded-[2rem] border border-slate-100 h-96 animate-pulse space-y-6">
                <div className="aspect-video rounded-2xl bg-slate-100" />
                <div className="h-10 bg-slate-100 rounded-xl w-1/2" />
                <div className="space-y-2">
                  <div className="h-12 bg-slate-100 rounded-2xl w-full" />
                  <div className="h-12 bg-slate-100 rounded-2xl w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-16 content-auto">
          {selectedGroup ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="space-y-4">
                  <button 
                    onClick={() => setSelectedGroup(null)}
                    className="group flex items-center space-x-2 text-slate-400 hover:text-brand-secondary transition-all"
                  >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
                    <span className="text-[10px] font-black uppercase tracking-widest">Back to Categories</span>
                  </button>
                  <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none uppercase">{selectedGroup.title}</h2>
                    <p className="text-slate-500 text-sm md:text-base font-medium max-w-2xl">{selectedGroup.description}</p>
                  </div>
                </div>
                {selectedGroup.expires_at && (
                  <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100">
                    <GroupTimer expiresAt={selectedGroup.expires_at} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-8">
                {filteredPolls.map((poll, index) => (
                  <motion.div
                    key={poll.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <PollCard poll={poll} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-12">
              {pollGroups.length > 0 && (
                <div className="space-y-8">
                  <div className="flex items-center space-x-3 px-4">
                    <div className="w-1.5 h-8 bg-brand-secondary rounded-full" />
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Featured Categories</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pollGroups.map((group, index) => (
                      <motion.button
                        key={group.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => setSelectedGroup(group)}
                        className="bg-white p-8 rounded-[2rem] border border-slate-100 text-left group relative overflow-hidden flex flex-col transition-all hover:border-brand-secondary hover:shadow-xl"
                      >
                        <div className="relative z-10 space-y-4 flex-1">
                          {group.image ? (
                            <div className="w-full h-32 md:h-40 rounded-2xl overflow-hidden border border-slate-100 shadow-inner mb-4 bg-slate-50">
                              <img 
                                src={group.image} 
                                alt={group.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                                referrerPolicy="no-referrer" 
                                loading="lazy"
                                decoding="async"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-brand-secondary group-hover:bg-brand-secondary group-hover:text-white transition-all">
                              <BarChart3 size={24} />
                            </div>
                          )}
                          <div className="space-y-2">
                            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase">{group.title}</h3>
                            <p className="text-slate-500 text-sm line-clamp-2 font-medium">{group.description}</p>
                          </div>
                        </div>
                        
                        <div className="relative z-10 flex items-center justify-between pt-6 mt-6 border-t border-slate-50">
                          <div className="flex items-center space-x-2">
                            {group.starts_at && isAfter(new Date(group.starts_at), new Date()) ? (
                              <>
                                <Clock size={12} className="text-amber-500" />
                                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Upcoming</span>
                              </>
                            ) : (
                              <>
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                  {polls.filter(p => p.group_id === group.id).length} Active Votes
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 text-brand-secondary font-black text-[10px] uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                            <span>Explore</span>
                            <ChevronRight size={14} />
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-8">
                <div className="flex items-center space-x-3 px-4">
                  <div className="w-1.5 h-8 bg-brand-secondary rounded-full" />
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Trending Now</h2>
                </div>
                <div className="grid grid-cols-1 gap-8">
                  {filteredPolls.length > 0 ? (
                    filteredPolls.map((poll, index) => (
                      <motion.div
                        key={poll.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <PollCard poll={poll} />
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-24 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
                      <BarChart3 size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 text-sm font-black uppercase tracking-widest">No trending votes at the moment.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VotePage;
