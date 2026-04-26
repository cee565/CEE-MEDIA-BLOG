import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Share, PlusSquare, Bell } from 'lucide-react';
import { requestNotificationPermission, subscribeUserToPush } from '../utils/pushNotifications';

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone || 
                       document.referrer.includes('android-app://');

    // Show notification prompt if installed but permission not granted
    if (isStandalone && 'Notification' in window && Notification.permission === 'default') {
      const isDismissed = localStorage.getItem('notification-prompt-dismissed');
      if (!isDismissed) {
        setTimeout(() => setShowNotificationPrompt(true), 3000);
      }
    }

    if (isStandalone) return;

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Handle Android/Chrome prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after 5 seconds if not dismissed before
      const isDismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!isDismissed) {
        setTimeout(() => setShowPrompt(true), 5000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show iOS banner if on iOS and not standalone
    if (isIOSDevice && !isStandalone) {
      const isDismissed = localStorage.getItem('pwa-ios-banner-dismissed');
      if (!isDismissed) {
        setTimeout(() => setShowIOSBanner(true), 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
      localStorage.setItem('pwa-installed', 'true');
    }
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  const dismissIOSBanner = () => {
    setShowIOSBanner(false);
    localStorage.setItem('pwa-ios-banner-dismissed', 'true');
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      await subscribeUserToPush();
      setShowNotificationPrompt(false);
    }
  };

  const dismissNotificationPrompt = () => {
    setShowNotificationPrompt(false);
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  return (
    <>
      {/* Android/Chrome Install Prompt */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 z-[100] md:left-auto md:right-6 md:w-96"
          >
            <div className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl border border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center shrink-0">
                  <Download className="text-white" size={24} />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-tight">Install CEE Media</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Get the best experience</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleInstallClick}
                  className="bg-brand-primary hover:bg-brand-primary/90 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  Install
                </button>
                <button
                  onClick={dismissPrompt}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X size={18} className="text-slate-400" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Install Banner */}
      <AnimatePresence>
        {showIOSBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 z-[100]"
          >
            <div className="bg-white text-slate-900 p-6 rounded-[2.5rem] shadow-2xl border border-slate-100">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-primary rounded-2xl flex items-center justify-center shrink-0">
                    <Download className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-tight">Install CEE Media</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Add to your home screen</p>
                  </div>
                </div>
                <button
                  onClick={dismissIOSBanner}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={18} className="text-slate-400" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-xs font-bold text-slate-600 bg-slate-50 p-3 rounded-2xl">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Share size={16} className="text-blue-500" />
                  </div>
                  <span>1. Tap the share button in Safari</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-600 bg-slate-50 p-3 rounded-2xl">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <PlusSquare size={16} className="text-slate-900" />
                  </div>
                  <span>2. Select "Add to Home Screen"</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Prompt */}
      <AnimatePresence>
        {showNotificationPrompt && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 z-[100] md:left-auto md:right-6 md:w-96"
          >
            <div className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl border border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-accent rounded-2xl flex items-center justify-center shrink-0">
                  <Bell className="text-brand-primary" size={24} />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-tight">Stay Updated</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Enable push notifications</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEnableNotifications}
                  className="bg-brand-accent text-brand-primary hover:bg-brand-accent/90 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  Enable
                </button>
                <button
                  onClick={dismissNotificationPrompt}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X size={18} className="text-slate-400" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PWAInstallPrompt;
