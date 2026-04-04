import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabase';
import { Ad } from '../types';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

const AdsBoard: React.FC = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveAds();

    // No real-time for ads to save resources
    return () => {};
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return;

    const timer = setInterval(() => {
      nextAd();
    }, 5000);

    return () => clearInterval(timer);
  }, [ads.length, currentIndex]);

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
    <div className="relative w-full bg-white overflow-hidden group border-b border-slate-100">
      <div className="relative h-[300px] md:h-[420px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentAd.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex flex-col"
          >
            <a 
              href={currentAd.link_url.startsWith('http') ? currentAd.link_url : `https://${currentAd.link_url}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col h-full"
            >
              <div className="relative flex-1 bg-slate-900 overflow-hidden">
                {currentAd.media_type === 'video' ? (
                  <video
                    src={currentAd.media_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={currentAd.media_url}
                    alt={currentAd.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                )}
                
                {/* "AD" Badge */}
                <div className="absolute top-4 right-4 px-2 py-1 rounded bg-black/50 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white uppercase tracking-widest z-10">
                  Sponsored
                </div>
              </div>
              
              {/* Content Below Media */}
              <div className="p-4 md:p-6 bg-white border-t border-slate-50">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="text-lg md:text-xl font-bold text-slate-900">
                      {currentAd.name}
                    </h3>
                    {currentAd.description && (
                      <p className="text-slate-500 text-sm md:text-base line-clamp-1">
                        {currentAd.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-purple-600 text-sm font-bold group-hover:translate-x-1 transition-transform">
                    <span>Visit Website</span>
                    <ExternalLink size={16} />
                  </div>
                </div>
              </div>
            </a>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Controls */}
      {ads.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); prevAd(); }}
            className="absolute left-4 top-[100px] md:top-[150px] -translate-y-1/2 p-2 rounded-full bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50 backdrop-blur-sm z-20"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); nextAd(); }}
            className="absolute right-4 top-[100px] md:top-[150px] -translate-y-1/2 p-2 rounded-full bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50 backdrop-blur-sm z-20"
          >
            <ChevronRight size={24} />
          </button>

          {/* Indicators */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
            {ads.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  index === currentIndex ? 'bg-purple-600 w-4' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdsBoard;
