import React from 'react';

// Modern colored Check Circle Icon (Success)
export const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="12" cy="12" r="9.5" fill="#10B981" />
    <circle cx="12" cy="12" r="7.5" fill="#059669" fillOpacity="0.4" />
    <path d="M8 12L10.8 14.8L16 9.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Modern colored X Circle Icon (Error / Failure)
export const XCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="12" cy="12" r="9.5" fill="#EF4444" />
    <circle cx="12" cy="12" r="7.5" fill="#DC2626" fillOpacity="0.4" />
    <path d="M9 9L15 15M15 9L9 15" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// Modern colored Exclamation Triangle Icon (Warning / Hazard)
export const ExclamationTriangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Golden/Amber triangle body */}
    <path
      d="M10.268 3.866C11.038 2.533 12.962 2.533 13.732 3.866L21.392 17.134C22.162 18.467 21.2 20.134 19.66 20.134H4.34C2.8 20.134 1.838 18.467 2.608 17.134L10.268 3.866Z"
      fill="#F59E0B"
      stroke="#D97706"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M10.7 5L3.8 17H20.2L13.3 5C12.7 4 11.3 4 10.7 5Z"
      fill="#FDE68A"
      fillOpacity="0.5"
    />
    {/* Exclamation point */}
    <path d="M12 8.5V13" stroke="#92400E" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="12" cy="16.5" r="1.25" fill="#92400E" />
  </svg>
);

// Modern colored Information Circle Icon (Info / Help)
export const InformationCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="12" cy="12" r="9.5" fill="#0284C7" />
    <circle cx="12" cy="12" r="7.5" fill="#0369A1" fillOpacity="0.3" />
    <circle cx="12" cy="8" r="1.3" fill="#FFFFFF" />
    <path d="M12 11V16M10.5 16H13.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Modern colored X Mark Icon (Close / Dismiss)
export const XMarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="12" cy="12" r="9" fill="#F1F5F9" />
    <path d="M8.5 8.5L15.5 15.5M15.5 8.5L8.5 15.5" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Modern colored Arrow Path Icon (Sync / Refresh)
export const ArrowPathIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="12" cy="12" r="9" fill="#0EA5E9" fillOpacity="0.12" />
    <path d="M4 12C4 7.58172 7.58172 4 12 4C15.1944 4 17.9405 5.87354 19.2 8.5M19.2 8.5V4.5M19.2 8.5H15.2" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 12C20 16.4183 16.4183 20 12 20C8.80556 20 6.05948 18.1265 4.8 15.5M4.8 15.5V19.5M4.8 15.5H8.8" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
