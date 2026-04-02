import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Vote, BookOpen, MessageSquare, Shield, Menu, X, TrendingUp, Zap, MessageCircle, BarChart3, Users } from 'lucide-react';
import { WhatsAppIcon, TikTokIcon, XIcon } from './components/BrandIcons';
import { supabase } from './supabase';
import { format } from 'date-fns';
import { Toaster } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
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
    <nav className="fixed top-0 left-0 right-0 bg-white/70 backdrop-blur-xl z-50 border-b border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center group transition-transform hover:scale-105 active:scale-95">
            <Logo iconClassName="w-10 h-10" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-black transition-all duration-300 ${
                  location.pathname === link.path 
                    ? 'bg-white text-purple-600 shadow-sm scale-105' 
                    : 'text-slate-500 hover:text-purple-500 hover:bg-white/50'
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
            className="md:hidden p-3 rounded-2xl text-slate-600 hover:bg-slate-100 transition-colors"
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
            className="md:hidden bg-white/90 backdrop-blur-xl border-b border-slate-100 px-4 pt-2 pb-8 space-y-2 overflow-hidden"
          >
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-4 p-4 rounded-2xl text-base font-black transition-all ${
                  location.pathname === link.path 
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 scale-[1.02]' 
                    : 'text-slate-600 hover:bg-slate-50'
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
  useEffect(() => {
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
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col pt-16">
          <Navbar />
          <main className="flex-grow">
            <React.Suspense fallback={
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
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
          
          <footer className="bg-white border-t border-slate-100 py-8 mt-8">
            <div className="max-w-7xl mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center md:text-left">
                <div className="space-y-3">
                  <Link to="/" className="flex items-center justify-center md:justify-start group">
                    <Logo iconClassName="w-7 h-7" textClassName="text-left" />
                  </Link>
                  <p className="text-slate-500 text-xs">Your #1 source for campus news, trends, and anonymous confessions.</p>
                </div>

                <div className="flex flex-col items-center space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Connect With Us</h4>
                  <div className="flex space-x-4">
                    <a href="https://whatsapp.com/channel/0029Vb7LSXU11ulKZ4e1E738" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[#25D366] transition-colors">
                      <WhatsAppIcon size={18} />
                    </a>
                    <a href="https://tiktok.com/@ceemedia4" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-black transition-colors">
                      <TikTokIcon size={18} />
                    </a>
                    <a href="https://x.com/cee_studio12?s=09" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-black transition-colors">
                      <XIcon size={16} />
                    </a>
                  </div>
                </div>

                <div className="space-y-3 text-center md:text-right">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Support</h4>
                  <p className="text-slate-500 text-xs">Email: <a href="mailto:ceemedia9@gmail.com" className="text-purple-600 font-medium">ceemedia9@gmail.com</a></p>
                  <Link to="/admin" className="inline-flex items-center text-slate-300 hover:text-purple-500 transition-colors">
                    <Shield size={12} className="mr-1" />
                    <span className="text-[9px] font-bold uppercase">Admin</span>
                  </Link>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-50 text-center">
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">© 2026 CEE MEDIA. All rights reserved.</p>
              </div>
            </div>
          </footer>
        </div>
        <Toaster position="top-center" richColors />
      </Router>
    </ErrorBoundary>
  );
};

export default App;
