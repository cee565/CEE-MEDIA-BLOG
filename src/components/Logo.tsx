import React from 'react';

interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
  dark?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  iconClassName = "w-10 h-10", 
  textClassName = "", 
  showText = true,
  dark = false 
}) => (
  <div className={`flex items-center space-x-3 ${className}`}>
    <div className={`relative ${iconClassName}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer Ring */}
        <path 
          d="M72 28C65 20 54 16 42 16C23 16 8 31 8 50C8 69 23 84 42 84C54 84 65 80 72 72" 
          stroke="currentColor" 
          strokeWidth="9" 
          strokeLinecap="round" 
        />
        {/* Middle Ring */}
        <path 
          d="M62 40C58 35 52 33 42 33C32.6 33 25 40.6 25 50C25 59.4 32.6 67 42 67C52 67 58 65 62 60" 
          stroke="currentColor" 
          strokeWidth="9" 
          strokeLinecap="round" 
        />
        {/* Inner Ring */}
        <path 
          d="M52 48C50 47 47 46 42 46C39.8 46 38 47.8 38 50C38 52.2 39.8 54 42 54C47 54 50 53 52 52" 
          stroke="currentColor" 
          strokeWidth="9" 
          strokeLinecap="round" 
        />
        {/* Center Dot */}
        <circle cx="82" cy="50" r="9" fill="currentColor" />
      </svg>
    </div>
    {showText && (
      <div className={`flex flex-col justify-center ${dark ? 'text-white' : 'text-slate-900'} ${textClassName}`}>
        <span className="font-black text-2xl tracking-tighter leading-none">CEE</span>
        <span className="font-bold text-[10px] tracking-[0.6em] uppercase opacity-80 leading-none mt-1 ml-0.5">MEDIA</span>
      </div>
    )}
  </div>
);

export default Logo;
