import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchActiveAds();

    // No real-time for ads to save resources
    return () => {};
  }, []);

  useEffect(() => {
    // Reset video duration when ad changes
    setVideoDuration(5);
    setIsMetadataLoaded(false);
  }, [currentIndex]);

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

  const currentAd = ads[currentIndex];

  return (
    <div className="relative w-full bg-slate-50 py-4 md:py-8 px-4 overflow-hidden group">
      <div className="max-w-7xl mx-auto relative h-[350px] md:h-[500px] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentAd.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex flex-col"
          >
            <a 
              href={currentAd.link_url.startsWith('http') ? currentAd.link_url : `https://${currentAd.link_url}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="relative h-full w-full block"
            >
              {/* Media Container */}
              <div className="absolute inset-0 bg-slate-900">
                {currentAd.media_type === 'video' ? (
                  <video
                    src={currentAd.media_url}
                    autoPlay
                    muted={isMuted}
                    onEnded={nextAd}
                    onLoadedMetadata={(e) => {
                      setVideoDuration(e.currentTarget.duration);
                      setIsMetadataLoaded(true);
                    }}
                    playsInline
                    className="w-full h-full object-cover opacity-80"
                  />
                ) : (
                  <img
                    src={currentAd.media_url}
                    alt={currentAd.name}
                    className="w-full h-full object-cover opacity-80"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                )}
                
                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-transparent" />
              </div>

              {/* "Sponsored" Badge */}
              <div className="absolute top-6 left-6 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-[10px] font-black text-white uppercase tracking-[0.3em] z-10 flex items-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                <span>Sponsored</span>
              </div>

              {/* Content Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 z-10">
                <div className="max-w-3xl space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                  >
                    <h3 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-none uppercase drop-shadow-lg">
                      {currentAd.name}
                    </h3>
                  </motion.div>
                  
                  {currentAd.description && (
                    <motion.p 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="text-slate-200 text-base md:text-xl font-medium tracking-tight max-w-2xl line-clamp-2 opacity-90"
                    >
                      {currentAd.description}
                    </motion.p>
                  )}

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="pt-4"
                  >
                    <div className="inline-flex items-center space-x-3 bg-brand-accent text-brand-primary px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-brand-focus transition-all group/btn">
                      <span>Learn More</span>
                      <ExternalLink size={16} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                    </div>
                  </motion.div>
                </div>
              </div>
            </a>
          </motion.div>
        </AnimatePresence>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 z-20">
          <AnimatePresence mode="wait">
            {(currentAd.media_type === 'image' || isMetadataLoaded) && (
              <motion.div
                key={`${currentIndex}-${isMetadataLoaded}`}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: currentAd.media_type === 'video' ? videoDuration : 5, 
                  ease: "linear" 
                }}
                className="h-full bg-brand-accent"
              />
            )}
          </AnimatePresence>
        </div>

        {/* Video Controls */}
        {currentAd.media_type === 'video' && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className="absolute bottom-24 right-6 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all z-30"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        )}

        {/* Navigation Controls */}
        {ads.length > 1 && (
          <>
            <button
              onClick={(e) => { e.preventDefault(); prevAd(); }}
              className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20 backdrop-blur-md border border-white/20 z-20 hover:scale-110"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); nextAd(); }}
              className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white/20 backdrop-blur-md border border-white/20 z-20 hover:scale-110"
            >
              <ChevronRight size={24} />
            </button>

            {/* Indicators */}
            <div className="absolute top-6 right-6 flex space-x-2 z-20">
              {ads.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    index === currentIndex ? 'bg-brand-accent w-8' : 'bg-white/30 w-4'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default AdsBoard;
