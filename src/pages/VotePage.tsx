import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../supabase';
import { Poll, PollGroup } from '../types';
import { CheckCircle2, BarChart3, Share2, Link, Check, Heart, Clock, ArrowLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { WhatsAppIcon, XIcon, TikTokIcon } from '../components/BrandIcons';
import { toast } from 'sonner';
import { AnimatePresence } from 'motion/react';
import { isAfter, intervalToDuration } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

const TimerBox = ({ value, label, size = 'md' }: { value: number | string, label: string, size?: 'sm' | 'md' }) => (
  <div className="flex flex-col items-center">
    <div className={`${size === 'sm' ? 'w-8 h-8 md:w-10 md:h-10' : 'w-12 h-12 md:w-16 md:h-16'} bg-[#E11D48] rounded-lg md:rounded-xl flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(225,29,72,0.4)] border border-white/20`}>
      <span className={`text-white ${size === 'sm' ? 'text-xs md:text-sm' : 'text-xl md:text-2xl'} font-black tracking-tighter`}>{String(value).padStart(2, '0')}</span>
    </div>
    <span className={`${size === 'sm' ? 'text-[6px] md:text-[8px]' : 'text-[8px] md:text-[10px]'} font-black text-slate-500 mt-1 md:mt-2 uppercase tracking-[0.2em]`}>{label}</span>
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
    <div className="flex items-center space-x-1 md:space-x-2 bg-white/60 backdrop-blur-md p-2 rounded-xl border border-white/40 shadow-sm">
      <TimerBox value={timeLeft.days} label="D" size="sm" />
      <span className="text-xs font-black text-slate-300 mb-4">:</span>
      <TimerBox value={timeLeft.hours} label="H" size="sm" />
      <span className="text-xs font-black text-slate-300 mb-4">:</span>
      <TimerBox value={timeLeft.minutes} label="M" size="sm" />
      <span className="text-xs font-black text-slate-300 mb-4">:</span>
      <TimerBox value={timeLeft.seconds} label="S" size="sm" />
    </div>
  );
};

const PollCard = React.memo(({ poll }: { poll: Poll }) => {
  const isEnded = poll.is_ended || (poll.expires_at && isAfter(new Date(), new Date(poll.expires_at)));
  const [voted, setVoted] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [tempSelected, setTempSelected] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);
  const storageKey = `voted_poll_${poll.id}`;

  const showResults = voted || isEnded;

  useEffect(() => {
    if (!poll.expires_at || isEnded) {
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
  }, [poll.expires_at, isEnded]);

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
      const updatedVotes = { ...poll.votes };
      updatedVotes[tempSelected] = (updatedVotes[tempSelected] || 0) + 1;

      const { error } = await supabase
        .from('polls')
        .update({
          votes: updatedVotes,
          total_votes: (poll.total_votes || 0) + 1
        })
        .eq('id', poll.id);

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
      const { data: currentPoll, error: fetchError } = await supabase
        .from('polls')
        .select('likes')
        .eq('id', poll.id)
        .maybeSingle();
      
      if (fetchError) throw fetchError;

      const newLikes = (currentPoll?.likes || 0) + 1;
      const { error } = await supabase
        .from('polls')
        .update({ likes: newLikes })
        .eq('id', poll.id);
      
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
  const shareText = `Vote on this poll on CEE MEDIA: "${poll.question}"`;

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
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white/40 backdrop-blur-2xl rounded-[1.5rem] card-shadow p-4 md:p-8 space-y-6 border border-white/60 overflow-hidden group/card relative"
    >
      {/* Dynamic background glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] -z-10 group-hover/card:bg-purple-500/20 transition-all duration-1000" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -z-10 group-hover/card:bg-blue-500/20 transition-all duration-1000" />

      <div className="space-y-4">
        {poll.image && (
          <div className="w-full h-40 md:h-64 rounded-[1rem] overflow-hidden mb-4 relative group/img shadow-2xl">
            <img 
              src={poll.image} 
              alt="Poll" 
              className="w-full h-full object-cover transform group-hover/img:scale-105 transition-transform duration-[2000ms] ease-out"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-80 group-hover/img:opacity-60 transition-opacity duration-700" />
            
            {/* Floating stats on image */}
            <div className="absolute bottom-4 left-4 flex items-center space-x-2.5">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="px-3 py-1.5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl"
              >
                {poll.total_votes.toLocaleString()} Votes
              </motion.div>
              {isEnded && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="px-3 py-1.5 bg-red-500/20 backdrop-blur-xl border border-red-500/30 rounded-lg text-red-100 text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl"
                >
                  Final Results
                </motion.div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-3 flex-1">
            <div className="space-y-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-1 h-6 bg-gradient-to-b from-purple-600 to-blue-600 rounded-full shadow-lg shadow-purple-200" />
                <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-[1.1] tracking-tight drop-shadow-sm">
                  {poll.question}
                </h3>
              </div>
              
              {poll.description && (
                <p className="text-slate-500 text-sm md:text-base leading-relaxed max-w-3xl font-medium opacity-80">
                  {poll.description}
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
              {timeLeft && !isEnded && (
                <div className="w-full py-6 flex items-center justify-center space-x-2 md:space-x-4 bg-slate-50/50 backdrop-blur-xl rounded-3xl border border-white shadow-inner">
                  <TimerBox value={timeLeft.days} label="Days" />
                  <span className="text-xl font-black text-slate-300 mt-[-20px]">:</span>
                  <TimerBox value={timeLeft.hours} label="Hour" />
                  <span className="text-xl font-black text-slate-300 mt-[-20px]">:</span>
                  <TimerBox value={timeLeft.minutes} label="Min" />
                  <span className="text-xl font-black text-slate-300 mt-[-20px]">:</span>
                  <TimerBox value={timeLeft.seconds} label="Sec" />
                </div>
              )}
              {isEnded && (
                <div className="flex items-center space-x-1.5 bg-red-50/50 backdrop-blur-md text-red-600 px-3 py-1.5 rounded-lg border border-red-100 shadow-sm">
                  <Clock size={14} />
                  <span className="text-[9px] font-black uppercase tracking-[0.15em]">Poll Closed</span>
                </div>
              )}
              <div className="flex items-center space-x-1.5 bg-white/50 backdrop-blur-md text-slate-500 px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                <BarChart3 size={14} />
                <span className="text-[9px] font-black uppercase tracking-[0.15em]">{poll.total_votes.toLocaleString()} Total Votes</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 self-end lg:self-start bg-white/40 backdrop-blur-md p-1.5 rounded-[1rem] border border-white/60 shadow-sm">
            <button 
              onClick={handleLike}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg transition-all duration-500 ${liked ? 'text-red-500 bg-white shadow-md scale-105' : 'text-slate-400 hover:text-red-500 hover:bg-white/80'}`}
            >
              <Heart size={16} fill={liked ? 'currentColor' : 'none'} className={liked ? 'animate-bounce' : 'group-hover:scale-110 transition-transform'} />
              <span className="text-xs font-black">{localLikes.toLocaleString()}</span>
            </button>
            <div className="w-px h-5 bg-slate-200/50" />
            <button 
              onClick={() => copyToClipboard()}
              className={`p-2 rounded-lg transition-all duration-500 ${copied ? 'bg-green-50 text-green-600 shadow-md scale-105' : 'text-slate-400 hover:text-green-500 hover:bg-white/80'}`}
              title="Copy Poll Link"
            >
              {copied ? <Check size={16} /> : <Link size={16} />}
            </button>
            <div className="w-px h-5 bg-slate-200/50" />
            <div className="relative">
              <button 
                onClick={() => setShowShareMenu(!showShareMenu)}
                className={`p-2 rounded-lg transition-all duration-500 ${showShareMenu ? 'bg-white text-purple-600 shadow-md scale-105' : 'text-slate-400 hover:text-purple-500 hover:bg-white/80'}`}
              >
                <Share2 size={16} />
              </button>
            <AnimatePresence>
              {showShareMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.9, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: 15, scale: 0.9, filter: 'blur(10px)' }}
                    className="absolute bottom-full right-0 mb-4 w-56 bg-white/90 backdrop-blur-2xl rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/60 overflow-hidden z-50 p-2"
                  >
                    <div className="space-y-1">
                      <button onClick={() => { copyToClipboard(); setShowShareMenu(false); }} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-purple-50 rounded-xl transition-all group/item">
                        {copied ? <Check size={18} className="text-green-500" /> : <Link size={18} className="text-slate-400 group-hover/item:text-purple-500 transition-colors" />}
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{copied ? 'Copied!' : 'Copy Link'}</span>
                      </button>
                      <button onClick={() => { shareToTwitter(); setShowShareMenu(false); }} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 rounded-xl transition-all group/item">
                        <XIcon size={18} className="text-black group-hover/item:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">X</span>
                      </button>
                      <button onClick={() => { shareToWhatsApp(); setShowShareMenu(false); }} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-green-50 rounded-xl transition-all group/item">
                        <WhatsAppIcon size={18} className="text-green-500 group-hover/item:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">WhatsApp</span>
                      </button>
                      <button onClick={() => { copyToClipboard(); setShowShareMenu(false); }} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 rounded-xl transition-all group/item">
                        <TikTokIcon size={18} className="text-black group-hover/item:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">TikTok</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {poll.options.map((option, index) => {
          const optionText = typeof option === 'string' ? option : option.text;
          const optionImage = typeof option === 'string' ? null : option.image;
          const voteCount = poll.votes[index] || 0;
          const percentage = poll.total_votes > 0 ? Math.round((voteCount / poll.total_votes) * 100) : 0;
          const isSelected = selected === index;
          const isPending = tempSelected === index;

          const maxVotes = Math.max(...Object.values(poll.votes), 0);
          const isTopPick = showResults && voteCount === maxVotes && voteCount > 0;

          return (
            <button
              key={index}
              disabled={showResults || isSubmitting}
              onClick={() => setTempSelected(index)}
              className={`w-full relative overflow-hidden rounded-2xl p-4 md:p-6 text-left transition-all duration-500 group/opt border-2 ${
                showResults 
                  ? 'cursor-default border-transparent bg-slate-50/50' 
                  : 'hover:shadow-[0_20px_40px_rgba(124,58,237,0.15)] border-white/60 hover:border-purple-400 active:scale-[0.99] bg-white/40 backdrop-blur-md'
              } ${
                isSelected 
                  ? 'border-purple-500 bg-white shadow-2xl scale-[1.02] ring-4 ring-purple-100' 
                  : isPending 
                    ? 'border-purple-400 bg-white ring-8 ring-purple-100/50 shadow-2xl scale-[1.02]' 
                    : ''
              }`}
            >
              {/* Progress Bar Background */}
              {showResults && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                  className={`absolute top-0 left-0 h-full ${
                    isSelected 
                      ? 'bg-gradient-to-r from-purple-600/15 to-purple-400/5' 
                      : isTopPick
                        ? 'bg-gradient-to-r from-amber-500/10 to-amber-200/5'
                        : 'bg-gradient-to-r from-slate-200/40 to-slate-100/10'
                  }`}
                />
              )}

              <div className="relative flex justify-between items-center z-10">
                <div className="flex items-center space-x-4">
                  {!showResults && (
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${
                      isPending ? 'border-purple-500 bg-purple-500 scale-125 shadow-lg shadow-purple-200' : 'border-slate-300 group-hover/opt:border-purple-400 group-hover/opt:scale-110'
                    }`}>
                      {isPending && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                  )}
                  {optionImage && (
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 border-white flex-shrink-0 shadow-2xl group-hover/opt:scale-110 transition-transform duration-700">
                      <img src={optionImage} alt={optionText} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                    </div>
                  )}
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg md:text-xl font-black tracking-tight leading-tight ${isSelected || isPending ? 'text-purple-900' : 'text-slate-900'}`}>
                        {optionText}
                      </span>
                      {isTopPick && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[7px] font-black uppercase tracking-widest border border-amber-200 flex items-center space-x-1">
                          <TrendingUp size={8} />
                          <span>Top Pick</span>
                        </span>
                      )}
                    </div>
                    {showResults && (
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          {voteCount.toLocaleString()} {voteCount === 1 ? 'Vote' : 'Votes'}
                        </span>
                        {isSelected && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full text-[8px] font-black uppercase tracking-widest">Your Choice</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {showResults && (
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-end">
                      <span className={`text-2xl md:text-3xl font-black ${isSelected ? 'text-purple-600' : isTopPick ? 'text-amber-600' : 'text-slate-700'}`}>
                        {percentage}%
                      </span>
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="bg-purple-600 p-2 rounded-full shadow-xl shadow-purple-200"
                      >
                        <CheckCircle2 size={20} className="text-white" />
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {!showResults && tempSelected !== null && (
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleVote}
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white rounded-2xl font-black text-lg shadow-[0_20px_50px_rgba(124,58,237,0.3)] hover:shadow-[0_25px_60px_rgba(124,58,237,0.5)] transition-all disabled:opacity-50 flex items-center justify-center space-x-3 mt-6 group/btn border-t border-white/20"
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span className="tracking-tight">CONFIRM MY VOTE</span>
                <div className="bg-white/20 p-1 rounded-lg group-hover:bg-white/30 transition-colors">
                  <CheckCircle2 size={20} className="group-hover:rotate-12 transition-transform" />
                </div>
              </>
            )}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
});

const VotePage = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollGroups, setPollGroups] = useState<PollGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<PollGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const fetchData = async () => {
      const { data: pollsData } = await supabase
        .from('polls')
        .select('*')
        .order('created_at', { ascending: false });
      
      const { data: groupsData } = await supabase
        .from('poll_groups')
        .select('*')
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

    // Real-time subscription
    const pollsSubscription = supabase
      .channel('polls_channel')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'polls' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setPolls(prev => [payload.new as Poll, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setPolls(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
        } else if (payload.eventType === 'DELETE') {
          setPolls(prev => prev.filter(p => payload.old && p.id !== payload.old.id));
        }
      })
      .subscribe();

    const groupsSubscription = supabase
      .channel('groups_channel')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'poll_groups' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setPollGroups(prev => [payload.new as PollGroup, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setPollGroups(prev => prev.map(g => g.id === payload.new.id ? { ...g, ...payload.new } : g));
        } else if (payload.eventType === 'DELETE') {
          setPollGroups(prev => prev.filter(g => payload.old && g.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(pollsSubscription);
      supabase.removeChannel(groupsSubscription);
    };
  }, []);

  const filteredPolls = selectedGroup 
    ? polls.filter(p => p.group_id === selectedGroup.id)
    : polls.filter(p => !p.group_id);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 relative">
      {/* Immersive Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full -z-20 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-400/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[30%] right-[10%] w-[20%] h-[20%] bg-pink-400/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <div className="text-center space-y-4 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-white/40 backdrop-blur-xl border border-white/60 rounded-full shadow-lg"
        >
          <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-ping" />
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-purple-700">Live Campus Pulse</span>
        </motion.div>
        
        <div className="space-y-2">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter leading-none"
          >
            SHAPE THE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600">FUTURE.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="text-slate-500 text-xs md:text-base max-w-2xl mx-auto leading-relaxed font-medium opacity-80"
          >
            Your voice is the heartbeat of our campus. Cast your vote, spark change, and see the impact in real-time.
          </motion.p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-100 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[9px] animate-pulse">Synchronizing Data...</p>
        </div>
      ) : (
        <div className="space-y-16">
          {selectedGroup ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <button 
                onClick={() => setSelectedGroup(null)}
                className="group flex items-center space-x-1.5 text-slate-500 font-black uppercase tracking-widest text-[9px] hover:text-purple-600 transition-all bg-white/50 backdrop-blur-md px-5 py-2.5 rounded-xl border border-white/60 shadow-sm hover:shadow-xl hover:-translate-y-1"
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-2 transition-transform" /> 
                <span>Back to Categories</span>
              </button>
              
              <div className="bg-white/40 backdrop-blur-3xl rounded-[1.25rem] card-shadow p-5 md:p-8 border border-white/60 relative overflow-hidden group/hero">
                {selectedGroup.image && (
                  <div className="absolute inset-0 opacity-10 group-hover/hero:opacity-20 transition-all duration-1000 scale-110 group-hover/hero:scale-100">
                    <img src={selectedGroup.image} alt="" className="w-full h-full object-cover blur-sm" loading="lazy" />
                  </div>
                )}
                <div className="relative z-10 space-y-4">
                  <div className="space-y-3">
                    <div className="inline-block px-3 py-1 bg-purple-600 text-white rounded-lg text-[8px] font-black uppercase tracking-[0.3em] shadow-xl shadow-purple-200">
                      Active Category
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter leading-none">{selectedGroup.title}</h2>
                    <div className="h-1 w-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full shadow-lg shadow-purple-100" />
                  </div>
                  {selectedGroup.description && (
                    <p className="text-slate-600 text-sm md:text-base leading-relaxed max-w-4xl font-medium opacity-90">{selectedGroup.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center space-x-1.5 bg-white/80 px-5 py-2.5 rounded-[1rem] shadow-sm border border-white">
                      <BarChart3 size={16} className="text-purple-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{filteredPolls.length} Active Polls</span>
                    </div>
                    {selectedGroup.expires_at && (
                      <div className="flex items-center space-x-1.5 bg-white/80 px-5 py-2.5 rounded-[1rem] shadow-sm border border-white">
                        <Clock size={16} className="text-blue-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Ends {new Date(selectedGroup.expires_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {filteredPolls.map((poll, index) => (
                  <motion.div
                    key={poll.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.15, duration: 0.6 }}
                  >
                    <PollCard poll={poll} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-12">
              {pollGroups.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-4">
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 flex items-center tracking-tighter">
                      <BarChart3 className="mr-2.5 text-purple-600" size={20} /> 
                      FEATURED CATEGORIES
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pollGroups.map((group, index) => (
                      <motion.button
                        key={group.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1, duration: 0.6 }}
                        whileHover={{ y: -8, scale: 1.02 }}
                        onClick={() => setSelectedGroup(group)}
                        className="bg-white/40 backdrop-blur-2xl p-4 md:p-6 rounded-[1.25rem] card-shadow border border-white/60 text-left group relative overflow-hidden h-64 flex flex-col transition-all duration-500"
                      >
                        {group.image && (
                          <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-all duration-1000 scale-110 group-hover:scale-100">
                            <img src={group.image} alt="" className="w-full h-full object-cover" loading="lazy" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-white/40 pointer-events-none" />
                        
                        <div className="relative z-10 space-y-3 flex-1">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-purple-600 mb-3 shadow-xl group-hover:bg-purple-600 group-hover:text-white transition-all duration-500 group-hover:rotate-6">
                            <BarChart3 size={20} />
                          </div>
                          <h3 className="text-lg md:text-xl font-black text-slate-900 group-hover:text-purple-700 transition-colors tracking-tighter leading-none">
                            {group.title}
                          </h3>
                          <p className="text-slate-600 text-xs md:text-sm line-clamp-3 leading-relaxed font-medium opacity-80">
                            {group.description}
                          </p>
                        </div>
                        
                        <div className="relative z-10 flex items-center justify-between pt-4 mt-auto">
                          <div className="flex flex-col space-y-2">
                            <div className="flex items-center space-x-1.5 bg-white/80 px-3 py-1.5 rounded-lg shadow-sm border border-white/60 w-fit">
                              <span className={`w-1.5 h-1.5 rounded-full ${group.expires_at && isAfter(new Date(), new Date(group.expires_at)) ? 'bg-slate-400' : 'bg-green-500 animate-pulse'}`} />
                              <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.2em]">
                                {polls.filter(p => p.group_id === group.id).length} Active Polls
                              </span>
                            </div>
                            {group.expires_at && <GroupTimer expiresAt={group.expires_at} />}
                          </div>
                          <div className="flex items-center space-x-1 text-purple-600 font-black text-[8px] uppercase tracking-[0.2em] group-hover:translate-x-2 transition-transform duration-500 self-end mb-2">
                            <span>Explore</span>
                            <ChevronRight size={14} />
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 flex items-center tracking-tighter">
                    <Clock className="mr-2.5 text-purple-600" size={20} /> 
                    TRENDING NOW
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {filteredPolls.length > 0 ? (
                    filteredPolls.map((poll, index) => (
                      <motion.div
                        key={poll.id}
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.2, duration: 0.8 }}
                      >
                        <PollCard poll={poll} />
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-16 bg-white/30 backdrop-blur-xl rounded-[1.25rem] border-4 border-dashed border-white/60 shadow-inner">
                      <BarChart3 size={48} className="mx-auto text-slate-200 mb-4 opacity-50" />
                      <p className="text-slate-400 text-lg font-black uppercase tracking-[0.3em]">Quiet on the front...</p>
                      <p className="text-slate-400 mt-1.5 font-medium text-xs">No trending polls at the moment. Check back soon!</p>
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
