import React from 'react';

// Modern colored Phone Icon (Phone / Support / Tenant Call)
export const PhoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Soft green circle backdrop */}
    <circle cx="12" cy="12" r="9.5" fill="#ECFDF5" />
    {/* Phone handset */}
    <path
      d="M6.5 4.5H9C9.5 4.5 9.9 4.8 10 5.3L10.7 7.5C10.8 7.9 10.7 8.4 10.4 8.7L9 9.8C10 11.8 11.7 13.5 13.7 14.5L14.8 13.1C15.1 12.8 15.6 12.7 16 12.8L18.2 13.5C18.7 13.6 19 14 19 14.5V17C19 17.8 18.3 18.5 17.5 18.5C10.6 18.5 5 12.9 5 6C5 5.2 5.7 4.5 6.5 4.5Z"
      fill="#10B981"
      stroke="#059669"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Sound waves */}
    <path d="M15 5C16.8 5.6 18.2 7 18.8 8.8" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Modern colored Envelope Icon (Email / Notifications)
export const EnvelopeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Envelope body */}
    <rect x="3" y="5" width="18" height="14" rx="2.5" fill="#EFF6FF" stroke="#2563EB" strokeWidth="1.5" />
    {/* Envelope flap */}
    <path d="M3 6.5L12 13L21 6.5" stroke="#1D4ED8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    {/* Red notification dot */}
    <circle cx="19" cy="6" r="2" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1" />
  </svg>
);

// Modern colored Map Pin Icon (Building Address / Location)
export const MapPinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Ground drop shadow */}
    <ellipse cx="12" cy="20.5" rx="5" ry="1.5" fill="#94A3B8" fillOpacity="0.4" />
    {/* Pin body */}
    <path
      d="M12 2C8.134 2 5 5.134 5 9C5 14.25 12 20 12 20C12 20 19 14.25 19 9C19 5.134 15.866 2 12 2Z"
      fill="#EF4444"
      stroke="#DC2626"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Pin center glass hole */}
    <circle cx="12" cy="9" r="3" fill="#FFFFFF" />
    <circle cx="12" cy="9" r="1.5" fill="#B91C1C" />
  </svg>
);
