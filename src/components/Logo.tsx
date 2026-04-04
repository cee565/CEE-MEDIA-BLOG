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
    <div className={`relative ${iconClassName} flex items-center justify-center overflow-hidden rounded-xl bg-white/5`}>
      <img 
        src="https://media.base44.com/images/public/user_69c58cd8140b12f4f7e0ba23/fed4f0662_Screenshot_20260326-200402.jpg" 
        alt="CEE MEDIA" 
        className="w-full h-full object-cover scale-[1.8]"
        style={{ 
          mixBlendMode: dark ? 'screen' : 'multiply',
          filter: dark 
            ? 'invert(1) brightness(2) contrast(1.2)' 
            : 'grayscale(1) brightness(0)'
        }}
        referrerPolicy="no-referrer"
      />
    </div>
    {showText && (
      <div className={`flex flex-col justify-center ${dark ? 'text-white' : 'text-black'} ${textClassName}`}>
        <span className="font-black text-2xl md:text-3xl tracking-tighter leading-none">CEE</span>
        <span className="font-black text-[12px] md:text-[14px] tracking-[0.4em] uppercase leading-none mt-1">MEDIA</span>
      </div>
    )}
  </div>
));

export default Logo;
