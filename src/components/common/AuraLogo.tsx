import React, { useRef } from 'react';

interface AuraLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'gold' | 'dark' | 'light';
  showWordmark?: boolean;
  stacked?: boolean;
  onAdminTrigger?: () => void;
  className?: string;
}

export const AuraLogo: React.FC<AuraLogoProps> = ({
  size = 'md',
  variant = 'gold',
  showWordmark = true,
  stacked = true,
  onAdminTrigger,
  className = '',
}) => {
  const clickCountRef = useRef<number>(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = () => {
    if (!onAdminTrigger) return;

    clickCountRef.current += 1;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      onAdminTrigger();
    } else {
      // Reset after 2.5 seconds of inactivity
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 2500);
    }
  };

  const emblemSizes = {
    xs: 24,
    sm: 36,
    md: 52,
    lg: 72,
    xl: 104,
  };

  const px = emblemSizes[size];

  return (
    <div
      onClick={handleClick}
      className={`inline-flex ${
        stacked ? 'flex-col items-center text-center' : 'flex-row items-center gap-3'
      } select-none transition-opacity duration-300 ${
        onAdminTrigger ? 'cursor-pointer active:scale-[0.99]' : ''
      } ${className}`}
      title={onAdminTrigger ? undefined : "Beki's Studio"}
    >
      {/* Circular Emblem with thin gold linework, sun rays, and monogram */}
      <svg
        width={px}
        height={px}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-[0_2px_8px_rgba(200,169,107,0.18)]"
      >
        <defs>
          <linearGradient id="bekiGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F9F4E8" />
            <stop offset="25%" stopColor="#DCCB9A" />
            <stop offset="60%" stopColor="#C8A96B" />
            <stop offset="100%" stopColor="#A68542" />
          </linearGradient>

          <linearGradient id="bekiLightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#F3E7C4" />
            <stop offset="100%" stopColor="#DCCB9A" />
          </linearGradient>

          <radialGradient id="bekiGlow" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#FFF2D6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#C8A96B" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#C8A96B" stopOpacity="0" />
          </radialGradient>

          <filter id="bekiSoftGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Soft background aura glow */}
        <circle cx="80" cy="80" r="68" fill="url(#bekiGlow)" />

        {/* Outer Fine Ring */}
        <circle
          cx="80"
          cy="80"
          r="74"
          stroke="url(#bekiGoldGrad)"
          strokeWidth="1.2"
          className="opacity-95"
        />

        {/* Second Concentric Ring */}
        <circle
          cx="80"
          cy="80"
          r="71"
          stroke="url(#bekiGoldGrad)"
          strokeWidth="0.8"
          strokeOpacity="0.7"
        />

        {/* Inner Geometric Ring */}
        <circle
          cx="80"
          cy="80"
          r="62"
          stroke="url(#bekiGoldGrad)"
          strokeWidth="0.75"
          strokeDasharray="1.5 2"
          strokeOpacity="0.5"
        />

        {/* Radiating Sunbeams around the upper hemisphere */}
        <g stroke="url(#bekiGoldGrad)" strokeWidth="0.85" strokeOpacity="0.65" strokeLinecap="round">
          <line x1="80" y1="26" x2="80" y2="39" />
          <line x1="91" y1="28" x2="88" y2="40" />
          <line x1="69" y1="28" x2="72" y2="40" />
          <line x1="102" y1="33" x2="96" y2="44" />
          <line x1="58" y1="33" x2="64" y2="44" />
          <line x1="112" y1="41" x2="103" y2="50" />
          <line x1="48" y1="41" x2="57" y2="50" />
          <line x1="120" y1="52" x2="109" y2="59" />
          <line x1="40" y1="52" x2="51" y2="59" />
          <line x1="126" y1="65" x2="114" y2="69" />
          <line x1="34" y1="65" x2="46" y2="69" />
          <line x1="128" y1="80" x2="116" y2="80" />
          <line x1="32" y1="80" x2="44" y2="80" />
        </g>

        {/* Radiant luminous ethereal halo arc */}
        <path
          d="M 45 74 C 45 50, 115 50, 115 74 C 115 90, 85 96, 73 118"
          stroke="url(#bekiLightGrad)"
          strokeWidth="2.2"
          strokeLinecap="round"
          filter="url(#bekiSoftGlow)"
          className="opacity-90"
        />

        {/* Primary Monogram stem with graceful serif styling */}
        <g id="letter-B">
          {/* Main vertical stem */}
          <path
            d="M 64 48 L 64 114"
            stroke="url(#bekiGoldGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Serifs top and bottom */}
          <path d="M 58 48 L 72 48" stroke="url(#bekiGoldGrad)" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 58 114 L 74 114" stroke="url(#bekiGoldGrad)" strokeWidth="1.6" strokeLinecap="round" />

          {/* Upper bowl */}
          <path
            d="M 64 48 C 84 48, 98 56, 98 70 C 98 81, 84 83, 64 83"
            stroke="url(#bekiGoldGrad)"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Lower bowl */}
          <path
            d="M 64 83 C 88 83, 102 91, 102 101 C 102 114, 86 114, 64 114"
            stroke="url(#bekiGoldGrad)"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* Delicate ribbon accent */}
          <path
            d="M 55 83 C 70 78, 92 78, 106 88"
            stroke="url(#bekiLightGrad)"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      </svg>

      {/* Brand Typography: Beki's Studio */}
      {showWordmark && (
        <div className={`flex flex-col ${stacked ? 'mt-2 items-center' : 'items-start'}`}>
          <span
            className={`font-serif tracking-[0.08em] font-normal leading-none ${
              size === 'xs'
                ? 'text-xs tracking-[0.05em]'
                : size === 'sm'
                ? 'text-sm'
                : size === 'md'
                ? 'text-lg'
                : size === 'lg'
                ? 'text-2xl'
                : 'text-4xl'
            } ${
              variant === 'gold'
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#8C6D2C] via-[#C8A96B] to-[#7A5D24]'
                : variant === 'light'
                ? 'text-[#F8F6F0]'
                : 'text-[#171717]'
            }`}
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Beki's Studio
          </span>
          <span
            className={`tracking-[0.42em] uppercase text-[#77736B] font-light leading-none ${
              size === 'xs'
                ? 'text-[7px] mt-0.5 tracking-[0.25em]'
                : size === 'sm'
                ? 'text-[8px] mt-1'
                : size === 'md'
                ? 'text-[10px] mt-1.5'
                : size === 'lg'
                ? 'text-[12px] mt-2'
                : 'text-sm mt-2.5'
            }`}
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            STUDIO
          </span>
        </div>
      )}
    </div>
  );
};
