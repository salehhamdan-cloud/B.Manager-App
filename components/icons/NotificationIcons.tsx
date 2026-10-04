import React from 'react';

// Modern colored Bell Icon (Alerts / Reminders / Warnings)
export const BellIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Bell body (Golden amber) */}
    <path
      d="M12 3C9.23858 3 7 5.23858 7 8V11.2C7 12.3 6.5 13.4 5.7 14.1L4.8 15C4.2 15.6 4.6 16.5 5.5 16.5H18.5C19.4 16.5 19.8 15.6 19.2 15L18.3 14.1C17.5 13.4 17 12.3 17 11.2V8C17 5.23858 14.7614 3 12 3Z"
      fill="#FBBF24"
      stroke="#D97706"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Top hook */}
    <path d="M10 3C10 1.9 10.9 1 12 1C13.1 1 14 1.9 14 3" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" />
    {/* Bell clapper */}
    <path d="M9.5 17C9.8 18.8 10.8 20 12 20C13.2 20 14.2 18.8 14.5 17" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" />
    {/* Notification active red dot */}
    <circle cx="18" cy="5.5" r="2.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
  </svg>
);

// Modern colored Bell Alert Icon
export const BellAlertIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <path
      d="M12 3C9.23858 3 7 5.23858 7 8V11.2C7 12.3 6.5 13.4 5.7 14.1L4.8 15C4.2 15.6 4.6 16.5 5.5 16.5H18.5C19.4 16.5 19.8 15.6 19.2 15L18.3 14.1C17.5 13.4 17 12.3 17 11.2V8C17 5.23858 14.7614 3 12 3Z"
      fill="#FDE047"
      stroke="#CA8A04"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M10 3C10 1.9 10.9 1 12 1C13.1 1 14 1.9 14 3" stroke="#A16207" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M9.5 17C9.8 18.8 10.8 20 12 20C13.2 20 14.2 18.8 14.5 17" fill="#EAB308" stroke="#A16207" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="18.5" cy="5.5" r="3" fill="#DC2626" stroke="#FFFFFF" strokeWidth="1.5" />
  </svg>
);
