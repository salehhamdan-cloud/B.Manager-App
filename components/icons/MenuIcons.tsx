import React from 'react';

// Modern colored Bars3 Icon (Main Navigation Menu)
export const Bars3Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Three modern gradient bars */}
    <rect x="3" y="5" width="18" height="2.8" rx="1.4" fill="#0284C7" />
    <rect x="3" y="10.6" width="13" height="2.8" rx="1.4" fill="#6366F1" />
    <rect x="3" y="16.2" width="18" height="2.8" rx="1.4" fill="#10B981" />
  </svg>
);

// Modern colored Arrow Right On Rectangle Icon (Logout / Exit)
export const ArrowRightOnRectangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Door / Room outline */}
    <path d="M15 4H6C4.9 4 4 4.9 4 6V18C4 19.1 4.9 20 6 20H15" stroke="#64748B" strokeWidth="1.6" strokeLinecap="round" />
    {/* Exit Arrow (Crimson red) */}
    <path d="M11 12H21M21 12L17 8M21 12L17 16" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Modern colored Arrows Up Down Icon (Sort / Order)
export const ArrowsUpDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="12" cy="12" r="9.5" fill="#F1F5F9" />
    {/* Up Arrow (Blue) */}
    <path d="M8 15V6M8 6L5 9M8 6L11 9" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    {/* Down Arrow (Emerald) */}
    <path d="M16 9V18M16 18L13 15M16 18L19 15" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
