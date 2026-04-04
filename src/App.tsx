import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Vote, BookOpen, MessageSquare, Shield, Menu, X, TrendingUp, Zap, MessageCircle, BarChart3, Users } from 'lucide-react';
import { WhatsAppIcon, TikTokIcon, XIcon } from './components/BrandIcons';
import { supabase } from './supabase';
import { format } from 'date-fns';
import { Toaster, toast } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
import { HelmetProvider } from 'react-helmet-async';
import Logo from './components/Logo';
import ScrollToTop from './components/ScrollToTop';

// Pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const VotePage = React.lazy(() => import('./pages/VotePage'));
const BlogPage = React.lazy(() => import('./pages/BlogPage'));
const ConfessionsPage = React.lazy(() => import('./pages/ConfessionsPage'));
const ConfessionsDisplayPage = React.lazy(() => import('./pages/ConfessionsDisplayPage'));
const TeamPage = React.lazy(() => import('./pages/TeamPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Vote', path: '/vote', icon: Vote },
    { name: 'Blog', path: '/blog', icon: BookOpen },
    { name: 'Confessions', path: '/confessions', icon: MessageSquare },
    { name: 'Write Message', path: '/confessions/submit', icon: Zap },
    { name: 'Team', path: '/team', icon: Users },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-slate-900/80 backdrop-blur-xl z-50 border-b border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.2)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center group transition-transform hover:scale-105 active:scale-95">
            <Logo iconClassName="w-14 h-14" dark={true} />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1 bg-white/5 p-1 rounded-2xl border border-white/10">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-black transition-all duration-300 relative ${
                  location.pathname === link.path 
                    ? 'bg-white text-slate-900 shadow-sm scale-105' 
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <link.icon size={16} strokeWidth={2.5} />
                <span className="tracking-tight uppercase">{link.name}</span>
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-3 rounded-2xl text-slate-300 hover:bg-white/10 transition-colors"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-slate-900/95 backdrop-blur-xl border-b border-white/10 px-4 pt-2 pb-8 space-y-2 overflow-hidden"
          >
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-4 p-4 rounded-2xl text-base font-black transition-all ${
                  location.pathname === link.path 
                    ? 'bg-white text-slate-900 shadow-lg scale-[1.02]' 
                    : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                <link.icon size={22} strokeWidth={2.5} />
                <span className="tracking-tight uppercase">{link.name}</span>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const App = () => {
  const isConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    if (!isConfigured) return;
    console.log("CEE MEDIA App Initialized - v1.0.0");
    
    // Global real-time notifications
    const globalChannel = supabase
      .channel('global_notifications')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'polls' }, (payload: any) => {
        if (window.location.pathname !== '/vote') {
          toast.info(`New Poll: ${payload.new.question}`, {
            description: "Cast your vote now!",
            action: {
              label: "Vote",
              onClick: () => window.location.href = '/vote'
            },
            icon: <TrendingUp size={14} className="text-purple-600" />
          });
        }
      })
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'messages', filter: 'approved=eq.true' }, (payload: any) => {
        if (window.location.pathname !== '/confessions') {
          toast.info("New Confession Added!", {
            description: "Someone just shared a secret...",
            action: {
              label: "View",
              onClick: () => window.location.href = '/confessions'
            },
            icon: <MessageSquare size={14} className="text-orange-600" />
          });
        }
      })
      .subscribe();

    const trackVisitor = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      try {
        const { data: snap, error } = await supabase
          .from('analytics')
          .select('*')
          .eq('id', 'main')
          .single();

        if (snap) {
          const dailyVisitors = snap.daily_visitors || {};
          dailyVisitors[today] = (dailyVisitors[today] || 0) + 1;

          await supabase
            .from('analytics')
            .update({
              total_visitors: (snap.total_visitors || 0) + 1,
              daily_visitors: dailyVisitors
            })
            .eq('id', 'main');
        } else {
          await supabase
            .from('analytics')
            .insert({
              id: 'main',
              total_visitors: 1,
              daily_visitors: { [today]: 1 }
            });
        }
      } catch (e) {
        console.error("Analytics tracking failed", e);
      }
    };

    trackVisitor();

    return () => {
      supabase.removeChannel(globalChannel);
    };
  }, [isConfigured]);

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center space-y-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600">
          <Shield size={40} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Configuration Required</h1>
          <p className="text-slate-500 max-w-md mx-auto text-sm">
            Your application is missing the required Supabase environment variables. 
            Please add <code className="bg-slate-200 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-slate-200 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to your Vercel project settings.
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl max-w-sm w-full text-left space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase">How to fix:</p>
          <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside font-medium">
            <li>Go to your Vercel Dashboard</li>
            <li>Settings &gt; Environment Variables</li>
            <li>Add the variables from your Supabase dashboard</li>
            <li>Redeploy your application</li>
          </ol>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="bg-slate-900 text-white px-8 py-3 rounded-full font-black text-xs hover:scale-105 transition-all"
        >
          CHECK AGAIN
        </button>
      </div>
    );
  }

  return (
    <HelmetProvider>
      <ErrorBoundary>
        <Router>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col pt-16">
            <Navbar />
            <main className="flex-grow">
              <React.Suspense fallback={
                <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-purple-100 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="flex flex-col items-center space-y-1">
                    <Logo iconClassName="w-6 h-6" showText={false} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Loading Experience...</span>
                  </div>
                </div>
              }>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/vote" element={<VotePage />} />
                  <Route path="/blog" element={<BlogPage />} />
                  <Route path="/confessions" element={<ConfessionsDisplayPage />} />
                  <Route path="/confessions/submit" element={<ConfessionsPage />} />
                  <Route path="/team" element={<TeamPage />} />
                  <Route path="/admin/*" element={<AdminPage />} />
                </Routes>
              </React.Suspense>
            </main>
            
            <footer className="bg-slate-900 border-t border-white/5 py-12 mt-12 text-white">
              <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-center text-center md:text-left">
                  <div className="space-y-4">
                    <Link to="/" className="flex items-center justify-center md:justify-start group">
                      <Logo iconClassName="w-12 h-12" textClassName="text-left" dark={true} />
                    </Link>
                    <p className="text-slate-400 text-sm max-w-xs mx-auto md:mx-0">Your #1 source for campus news, trends, and anonymous confessions.</p>
                  </div>

                  <div className="flex flex-col items-center space-y-4">
                    <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Connect With Us</h4>
                    <div className="flex space-x-6">
                      <a href="https://whatsapp.com/channel/0029Vb7LSXU11ulKZ4e1E738" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#25D366] transition-all hover:scale-110">
                        <WhatsAppIcon size={22} />
                      </a>
                      <a href="https://tiktok.com/@ceemedia4" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-all hover:scale-110">
                        <TikTokIcon size={22} />
                      </a>
                      <a href="https://x.com/cee_studio12?s=09" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-all hover:scale-110">
                        <XIcon size={20} />
                      </a>
                    </div>
                  </div>

                  <div className="space-y-4 text-center md:text-right">
                    <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Support</h4>
                    <p className="text-slate-400 text-sm">Email: <a href="mailto:ceemedia9@gmail.com" className="text-purple-400 font-bold hover:text-purple-300 transition-colors">ceemedia9@gmail.com</a></p>
                    <Link to="/admin" className="inline-flex items-center text-slate-500 hover:text-white transition-colors">
                      <Shield size={14} className="mr-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Admin Access</span>
                    </Link>
                  </div>
                </div>
                <div className="mt-12 pt-8 border-t border-white/5 text-center">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">© 2026 CEE MEDIA. All rights reserved.</p>
                </div>
              </div>
            </footer>
          </div>
          <Toaster position="top-center" richColors />
        </Router>
      </ErrorBoundary>
    </HelmetProvider>
  );
};

export default App;
