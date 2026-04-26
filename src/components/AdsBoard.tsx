import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { Ad } from '../types';
import { ChevronLeft, ChevronRight, ExternalLink, Volume2, VolumeX } from 'lucide-react';

const AdsBoard: React.FC = React.memo(() => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoDuration, setVideoDuration] = useState(5);
  const [isMetadataLoaded, setIsMetadataLoaded] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchActiveAds();

    // No real-time for ads to save resources
    return () => {};
  }, []);

  useEffect(() => {
    // Reset video duration and expansion when ad changes
    setVideoDuration(5);
    setIsMetadataLoaded(false);
    setIsExpanded(false);
    
    let fallbackTimer: any;

    // Record impression
    if (ads.length > 0 && ads[currentIndex]) {
      recordImpression(ads[currentIndex].id);
    }

    // Fallback timer for all ads to ensure they don't get stuck
    const currentAd = ads[currentIndex];
    const timeoutDuration = currentAd?.media_type === 'video' ? 15000 : 6000; // 15s for video, 6s for image
    
    fallbackTimer = setTimeout(() => {
      nextAd();
    }, timeoutDuration);

    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [currentIndex, ads.length]);

  const recordImpression = async (adId: string) => {
    try {
      await supabase.rpc('increment_ad_impressions', { ad_id: adId });
    } catch (error) {
      console.error('Error recording impression:', error);
    }
  };

  const recordClick = async (adId: string) => {
    try {
      await supabase.rpc('increment_ad_clicks', { ad_id: adId });
    } catch (error) {
      console.error('Error recording click:', error);
    }
  };

  useEffect(() => {
    if (ads.length <= 1) return;

    const currentAd = ads[currentIndex];
    
    // If it's a video, we rely on onEnded to advance
    // If it's an image, we use a timer
    if (currentAd?.media_type === 'video') {
      return () => {};
    }

    const timer = setInterval(() => {
      nextAd();
    }, 5000);

    return () => clearInterval(timer);
  }, [ads.length, currentIndex, ads]);

  const fetchActiveAds = async () => {
    try {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextAd = () => {
    setCurrentIndex((prev) => (prev + 1) % ads.length);
  };

  const prevAd = () => {
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
  };

  if (loading || ads.length === 0) return null;

  const currentAd = ads[currentIndex] || ads[0];

  if (!currentAd) return null;

  const AdContent = (
    <div className="flex flex-col h-full bg-white">
      {/* Media Container */}
      <div className="relative h-[200px] md:h-[350px] bg-slate-950 flex items-center justify-center overflow-hidden">
        {currentAd?.media_type === 'video' ? (
          <video
            key={currentAd?.id}
            ref={videoRef}
            src={currentAd?.media_url}
            autoPlay
            muted={isMuted}
            onEnded={nextAd}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onCanPlay={(e) => {
              setIsBuffering(false);
              e.currentTarget.play().catch(err => console.warn("Play failed on canPlay:", err));
            }}
            onError={(e) => {
              console.error("Video failed to load, skipping...", e);
              nextAd();
            }}
            onLoadedMetadata={(e) => {
              const duration = e.currentTarget.duration;
              if (duration && !isNaN(duration)) {
                setVideoDuration(duration);
                setIsMetadataLoaded(true);
              }
            }}
            playsInline
            disablePictureInPicture
            preload="auto"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <img
            src={currentAd?.media_url}
            alt={currentAd?.name}
            className="max-w-full max-h-full object-contain"
            referrerPolicy="no-referrer"
            loading="eager"
            decoding="async"
          />
        )}
        
        {/* Buffering Indicator */}
        {isBuffering && currentAd?.media_type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="w-10 h-10 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
          </div>
        )}

        {/* "Sponsored" Badge - Moved inside media for context but kept clean */}
        <div className="absolute top-4 left-4 px-2 py-1 rounded-md bg-black/40 backdrop-blur-md border border-white/10 text-[8px] font-black text-white uppercase tracking-[0.2em] z-10 flex items-center space-x-1.5">
          <div className="w-1 h-1 rounded-full bg-brand-accent animate-pulse" />
          <span>Ad</span>
        </div>
      </div>

      {/* Text Content Section - Separated from Media */}
      <div className="flex-grow p-4 md:p-5 flex flex-col min-h-0 bg-white">
        <div className="flex-grow overflow-hidden flex flex-col space-y-1">
          <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight leading-tight uppercase truncate">
            {currentAd?.name}
          </h3>
          
          {currentAd?.description && (
            <div className="flex-grow max-h-[60px] md:max-h-[100px] overflow-y-auto custom-scrollbar pr-2 touch-pan-y">
              <p className="text-[10px] md:text-xs text-slate-500 font-medium leading-relaxed">
                {currentAd?.description}
              </p>
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          {currentAd?.link_url && (
            <div className="inline-flex items-center space-x-2 bg-brand-primary text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.1em] shadow-md hover:bg-brand-secondary transition-all group/btn cursor-pointer">
              <span>Learn More</span>
              <ExternalLink size={12} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
            </div>
          )}
          
          {/* Progress Indicator (Mini) */}
          <div className="flex space-x-1">
            {ads.map((_, index) => (
              <div 
                key={index}
                className={`h-1 rounded-full transition-all duration-300 ${index === currentIndex ? 'w-4 bg-brand-accent' : 'w-1 bg-slate-200'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative w-full bg-slate-50 py-4 md:py-6 px-4 overflow-hidden group">
      <div className="max-w-7xl mx-auto relative h-[400px] md:h-[550px] rounded-[2rem] overflow-hidden shadow-xl border border-slate-200 bg-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentAd?.id || 'empty-ad'}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute inset-0 flex flex-col will-change-[transform,opacity]"
          >
            {currentAd?.link_url ? (
              <a 
                href={currentAd?.link_url?.startsWith('http') ? currentAd.link_url : `https://${currentAd?.link_url}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="relative h-full w-full block"
                onClick={() => currentAd?.id && recordClick(currentAd.id)}
              >
                {AdContent}
              </a>
            ) : (
              <div className="relative h-full w-full block">
                {AdContent}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Progress Bar (Top) */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 z-20">
          <AnimatePresence mode="wait">
            {(currentAd?.media_type === 'image' || isMetadataLoaded) && (
              <motion.div
                key={`${currentIndex}-${isMetadataLoaded}`}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: currentAd?.media_type === 'video' ? videoDuration : 5, 
                  ease: "linear" 
                }}
                className="h-full bg-brand-accent"
              />
            )}
          </AnimatePresence>
        </div>

        {/* Video Controls */}
        {currentAd?.media_type === 'video' && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className="absolute top-4 right-4 p-2 rounded-lg bg-black/20 backdrop-blur-md border border-white/10 text-white hover:bg-black/40 transition-all z-30"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        )}

        {/* Navigation Controls */}
        {ads.length > 1 && (
          <>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); prevAd(); }}
              className="absolute left-4 top-[100px] md:top-[175px] -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg hover:bg-white transition-all z-30 md:opacity-0 md:group-hover:opacity-100"
              aria-label="Previous Ad"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); nextAd(); }}
              className="absolute right-4 top-[100px] md:top-[175px] -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg hover:bg-white transition-all z-30 md:opacity-0 md:group-hover:opacity-100"
              aria-label="Next Ad"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
});

export default AdsBoard;
