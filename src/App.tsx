import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Vote, BookOpen, MessageSquare, Shield, Menu, X, TrendingUp, Zap, MessageCircle, BarChart3, Users, Trophy } from 'lucide-react';
import { WhatsAppIcon, TikTokIcon, XIcon } from './components/BrandIcons';
import { supabase } from './supabase';
import { format } from 'date-fns';
import { Toaster, toast } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
import { HelmetProvider } from 'react-helmet-async';
import Logo from './components/Logo';
import ScrollToTop from './components/ScrollToTop';
import PWAInstallPrompt from './components/PWAInstallPrompt';

// Pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const VotePage = React.lazy(() => import('./pages/VotePage'));
const BlogPage = React.lazy(() => import('./pages/BlogPage'));
const ConfessionsPage = React.lazy(() => import('./pages/ConfessionsPage'));
const ConfessionsDisplayPage = React.lazy(() => import('./pages/ConfessionsDisplayPage'));
const TeamPage = React.lazy(() => import('./pages/TeamPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const TokenEntryPage = React.lazy(() => import('./pages/TokenEntryPage'));
const QuizPage = React.lazy(() => import('./pages/QuizPage'));
const ResultPage = React.lazy(() => import('./pages/ResultPage'));
const LeaderboardPage = React.lazy(() => import('./pages/LeaderboardPage'));
const QuizAdminPage = React.lazy(() => import('./pages/QuizAdminPage'));
const RegistrationPage = React.lazy(() => import('./pages/RegistrationPage'));

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/', icon: Home, prefetch: () => import('./pages/HomePage') },
    { name: 'Vote', path: '/vote', icon: Vote, prefetch: () => import('./pages/VotePage') },
    { name: 'Blog', path: '/blog', icon: BookOpen, prefetch: () => import('./pages/BlogPage') },
    { name: 'Confessions', path: '/confessions', icon: MessageSquare, prefetch: () => import('./pages/ConfessionsDisplayPage') },
    { name: 'Write Message', path: '/confessions/submit', icon: Zap, prefetch: () => import('./pages/ConfessionsPage') },
    { name: 'Mock Exam', path: '/mock-exam/register', icon: Trophy, prefetch: () => import('./pages/RegistrationPage') },
    { name: 'Team', path: '/team', icon: Users, prefetch: () => import('./pages/TeamPage') },
    { name: 'Admin', path: '/admin', icon: Shield, prefetch: () => import('./pages/AdminPage') },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl z-50 border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <Link to="/" className="flex items-center group transition-all active:scale-95 hover:scale-105">
            <Logo iconClassName="w-12 h-12" dark={false} />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onMouseEnter={() => link.prefetch()}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all duration-200 relative uppercase tracking-widest ${
                  location.pathname === link.path 
                    ? 'text-brand-primary bg-slate-50' 
                    : 'text-slate-400 hover:text-brand-secondary hover:bg-slate-50/50'
                }`}
              >
                {link.name === 'Admin' ? (
                  <div className="ml-2 pl-4 border-l border-slate-100 flex items-center">
                    <div className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full flex items-center space-x-1 animate-pulse">
                      <Shield size={12} strokeWidth={3} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Portal</span>
                    </div>
                  </div>
                ) : (
                  <link.icon size={14} strokeWidth={3} />
                )}
                <span>{link.name}</span>
                {location.pathname === link.path && (
                  <motion.div 
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-4 right-4 h-0.5 bg-brand-accent rounded-full"
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-3 rounded-2xl text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-white border-b border-slate-100 px-4 pt-2 pb-8 space-y-1 shadow-xl"
          >
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-4 p-4 rounded-2xl text-sm font-black transition-all uppercase tracking-widest ${
                  location.pathname === link.path 
                    ? 'bg-brand-primary text-white shadow-lg' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <link.icon size={18} strokeWidth={3} />
                <span>{link.name}</span>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/vote" element={<VotePage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/confessions" element={<ConfessionsDisplayPage />} />
          <Route path="/confessions/submit" element={<ConfessionsPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/admin/*" element={<AdminPage />} />
          <Route path="/mock-exam/register" element={<RegistrationPage />} />
          <Route path="/mock-exam/entry" element={<TokenEntryPage />} />
          <Route path="/mock-exam/start" element={<QuizPage />} />
          <Route path="/mock-exam/result" element={<ResultPage />} />
          <Route path="/mock-exam/leaderboard" element={<LeaderboardPage />} />
          <Route path="/quiz/admin" element={<QuizAdminPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => {
  const isConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    if (!isConfigured) return;
    
    // Version-based cache reset
    const APP_VERSION = '2.1.0'; // Major bump to force complete reset and fix persistent registration issues
    const storedVersion = localStorage.getItem('cee_media_version');
    if (storedVersion !== APP_VERSION) {
      // TOTAL WIPE for the new version
      localStorage.clear();
      sessionStorage.clear();
      
      localStorage.setItem('cee_media_version', APP_VERSION);
      console.log(`System performing total wipe and update to v${APP_VERSION}`);
      // Refresh to ensure all states are clean
      window.location.reload();
      return;
    }

    console.log("CEE MEDIA App Initialized - v" + APP_VERSION);
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
          <PWAInstallPrompt />
          <div className="min-h-screen flex flex-col pt-16">
            <Navbar />
            <main className="flex-grow min-h-[80vh]">
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
                <AnimatedRoutes />
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
                    <Link 
                      to="/admin" 
                      className="inline-flex items-center space-x-2 text-[11px] font-black text-white/60 hover:text-brand-accent transition-all uppercase tracking-[0.2em] pt-6 group border-t border-white/5 w-full mt-2"
                    >
                      <Shield size={14} className="group-hover:rotate-12 transition-transform" />
                      <span>Admin Management Door</span>
                    </Link>
                  </div>
                </div>
                <div className="mt-12 pt-8 border-t border-white/5 text-center flex flex-col items-center space-y-4">
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
