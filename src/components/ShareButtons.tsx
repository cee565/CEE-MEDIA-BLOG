import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Link, Check, Facebook } from 'lucide-react';
import { WhatsAppIcon, XIcon, FacebookIcon } from './BrandIcons';
import { toast } from 'sonner';

interface ShareButtonsProps {
  url: string;
  title: string;
  className?: string;
  align?: 'left' | 'right';
}

const ShareButtons: React.FC<ShareButtonsProps> = ({ url, title, className = "", align = 'right' }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareText = `Check this out on CEE MEDIA BLOG: "${title}"`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = [
    {
      name: 'Copy Link',
      icon: copied ? <Check size={14} className="text-green-500" /> : <Link size={14} />,
      onClick: copyToClipboard,
      activeColor: 'text-green-500'
    },
    {
      name: 'WhatsApp',
      icon: <WhatsAppIcon size={14} className="text-green-500" />,
      onClick: () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + url)}`, '_blank')
    },
    {
      name: 'Facebook',
      icon: <FacebookIcon size={14} className="text-blue-600" />,
      onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
    },
    {
      name: 'X (Twitter)',
      icon: <XIcon size={14} className="text-black" />,
      onClick: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`, '_blank')
    }
  ];

  return (
    <div className={`relative ${className}`}>
      <button 
        onClick={() => setShowMenu(!showMenu)}
        className={`flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest transition-colors ${showMenu ? 'text-brand-secondary' : 'text-slate-400 hover:text-brand-secondary'}`}
      >
        <Share2 size={18} />
        <span>Share</span>
      </button>

      <AnimatePresence>
        {showMenu && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`absolute bottom-full mb-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 ${align === 'right' ? 'right-0' : 'left-0'}`}
            >
              <div className="p-1.5 space-y-1">
                {shareLinks.map((link) => (
                  <button 
                    key={link.name}
                    onClick={() => { link.onClick(); setShowMenu(false); }}
                    className="w-full flex items-center space-x-2.5 px-2.5 py-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-700"
                  >
                    {link.icon}
                    <span className="text-[10px] font-bold">{link.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShareButtons;
