import React from 'react';

// Modern colored Sparkles Icon (AI Assistant / Smart Analysis / Magic)
export const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Large primary star (Indigo / Pink gradient feel) */}
    <path
      d="M9.5 2C9.5 2 11 6.5 13 8.5C15 10.5 19.5 12 19.5 12C19.5 12 15 13.5 13 15.5C11 17.5 9.5 22 9.5 22C9.5 22 8 17.5 6 15.5C4 13.5 -0.5 12 -0.5 12C-0.5 12 4 10.5 6 8.5C8 6.5 9.5 2 9.5 2Z"
      transform="translate(1, 0) scale(0.9)"
      fill="#8B5CF6"
      stroke="#7C3AED"
      strokeWidth="1.2"
    />
    <circle cx="9.5" cy="11" r="1.5" fill="#F472B6" />

    {/* Medium accent star (Gold / Amber) */}
    <path
      d="M18 2C18 2 18.7 4.2 19.7 5.2C20.7 6.2 23 7 23 7C23 7 20.7 7.8 19.7 8.8C18.7 9.8 18 12 18 12C18 12 17.3 9.8 16.3 8.8C15.3 7.8 13 7 13 7C13 7 15.3 6.2 16.3 5.2C17.3 4.2 18 2 18 2Z"
      fill="#F59E0B"
      stroke="#D97706"
      strokeWidth="1"
    />

    {/* Small accent sparkle (Cyan) */}
    <path
      d="M17 15C17 15 17.5 16.5 18.2 17.2C18.9 17.9 20.5 18.5 20.5 18.5C20.5 18.5 18.9 19.1 18.2 19.8C17.5 20.5 17 22 17 22C17 22 16.5 20.5 15.8 19.8C15.1 19.1 13.5 18.5 13.5 18.5C13.5 18.5 15.1 17.9 15.8 17.2C16.5 16.5 17 15 17 15Z"
      fill="#06B6D4"
      stroke="#0891B2"
      strokeWidth="0.8"
    />
  </svg>
);

// Modern colored CPU Chip Icon
export const CpuChipIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Microchip main die */}
    <rect x="5" y="5" width="14" height="14" rx="2.5" fill="#1E293B" stroke="#0F172A" strokeWidth="1.5" />
    {/* Silicon core plate */}
    <rect x="8" y="8" width="8" height="8" rx="1.5" fill="#6366F1" stroke="#4F46E5" strokeWidth="1.2" />
    <circle cx="12" cy="12" r="1.5" fill="#38BDF8" />
    {/* Pins (Gold) */}
    <path d="M8 2V5M12 2V5M16 2V5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 19V22M12 19V22M16 19V22" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M2 8H5M2 12H5M2 16H5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M19 8H22M19 12H22M19 16H22" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
