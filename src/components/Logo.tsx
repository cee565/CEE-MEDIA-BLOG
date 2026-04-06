import React from 'react';

interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
  dark?: boolean;
}

export const Logo: React.FC<LogoProps> = React.memo(({ 
  className = "", 
  iconClassName = "w-12 h-12", 
  textClassName = "", 
  showText = true,
  dark = true 
}) => (
  <div className={`flex items-center space-x-3 ${className}`}>
    <div className={`relative ${iconClassName} flex items-center justify-center overflow-hidden rounded-2xl bg-brand-primary shadow-lg transition-all duration-500`}>
      {/* Static Glow Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15),transparent_70%)]" />
      
      <img 
        src="https://media.base44.com/images/public/user_69c58cd8140b12f4f7e0ba23/fed4f0662_Screenshot_20260326-200402.jpg" 
        alt="CEE MEDIA" 
        className="w-full h-full object-cover scale-[1.8] relative z-10"
        style={{ 
          mixBlendMode: 'screen',
          filter: 'invert(1) brightness(2) contrast(1.2)'
        }}
        referrerPolicy="no-referrer"
      />
      
      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 pointer-events-none"></div>
    </div>
    {showText && (
      <div className={`flex flex-col justify-center ${dark ? 'text-white' : 'text-slate-900'} ${textClassName}`}>
        <div className="relative">
          <span className="font-black text-2xl md:text-3xl tracking-tighter leading-none block">CEE</span>
          <div className="absolute -right-4 top-0 w-2 h-2 bg-brand-accent rounded-full"></div>
        </div>
        <span className="font-black text-[10px] md:text-[12px] tracking-[0.5em] uppercase leading-none mt-1.5 opacity-80">MEDIA</span>
      </div>
    )}
  </div>
));

export default Logo;
