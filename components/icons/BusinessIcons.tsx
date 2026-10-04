import React from 'react';

// Modern colored Truck Icon (Suppliers / Logistics / Delivery)
export const TruckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Cargo box container */}
    <rect x="2" y="5" width="12" height="10" rx="1.5" fill="#10B981" fillOpacity="0.25" stroke="#059669" strokeWidth="1.5" />
    <path d="M5 8H11" stroke="#059669" strokeWidth="1.2" strokeLinecap="round" />
    {/* Cabin */}
    <path d="M14 8H17.5C18.1 8 18.6 8.3 18.9 8.8L21.2 12.2C21.4 12.5 21.5 12.8 21.5 13.2V15H14V8Z" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.5" strokeLinejoin="round" />
    {/* Cabin window */}
    <path d="M15 9.5H17.2L19.2 12H15V9.5Z" fill="#93C5FD" />
    {/* Chassis line */}
    <path d="M2 15H22" stroke="#475569" strokeWidth="1.5" />
    {/* Headlight */}
    <rect x="20.5" y="13" width="1.2" height="1.5" rx="0.5" fill="#F59E0B" />
    {/* Wheels */}
    <circle cx="6.5" cy="17.5" r="2.5" fill="#334155" stroke="#0F172A" strokeWidth="1" />
    <circle cx="6.5" cy="17.5" r="1" fill="#94A3B8" />
    <circle cx="17.5" cy="17.5" r="2.5" fill="#334155" stroke="#0F172A" strokeWidth="1" />
    <circle cx="17.5" cy="17.5" r="1" fill="#94A3B8" />
  </svg>
);

// Modern colored Receipt Percent Icon (Quotations / Invoices / Financials)
export const ReceiptPercentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Paper receipt with serrated bottom */}
    <path d="M5 3.5C5 2.67157 5.67157 2 6.5 2H17.5C18.3284 2 19 2.67157 19 3.5V20.5L16.5 19L14 20.5L12 19L10 20.5L7.5 19L5 20.5V3.5Z" fill="#F0FDF4" stroke="#16A34A" strokeWidth="1.5" strokeLinejoin="round" />
    {/* Receipt header line */}
    <path d="M8 6H16" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" />
    {/* Percent badge */}
    <circle cx="10" cy="10" r="1.5" fill="#F59E0B" />
    <circle cx="14" cy="14" r="1.5" fill="#F59E0B" />
    <path d="M14.5 9.5L9.5 14.5" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
    {/* Price total line */}
    <path d="M8 17H13" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Modern colored Document Text Icon (Contracts / Documents / Blueprints)
export const DocumentTextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Main paper sheet */}
    <path d="M6 2H14L19 7V20C19 21.1046 18.1046 22 17 22H6C4.89543 22 4 21.1046 4 20V4C4 2.89543 4.89543 2 6 2Z" fill="#EFF6FF" stroke="#2563EB" strokeWidth="1.5" />
    {/* Folded blue corner */}
    <path d="M14 2V7H19L14 2Z" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1" strokeLinejoin="round" />
    {/* Document lines */}
    <path d="M8 10H15" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 13.5H15" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 17H12" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Modern colored Calculator Icon (Cost Estimation / Calculator)
export const CalculatorIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Body */}
    <rect x="4" y="2" width="16" height="20" rx="3" fill="#1E293B" stroke="#0F172A" strokeWidth="1.5" />
    {/* LCD Screen with numbers glow */}
    <rect x="6.5" y="4.5" width="11" height="4.5" rx="1.5" fill="#064E3B" stroke="#059669" strokeWidth="1" />
    <path d="M14 6.5H16M11.5 6.5H12" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" />
    {/* Button matrix */}
    <circle cx="8" cy="12" r="1.2" fill="#94A3B8" />
    <circle cx="12" cy="12" r="1.2" fill="#94A3B8" />
    <circle cx="16" cy="12" r="1.2" fill="#F59E0B" />
    <circle cx="8" cy="15.5" r="1.2" fill="#94A3B8" />
    <circle cx="12" cy="15.5" r="1.2" fill="#94A3B8" />
    <circle cx="16" cy="15.5" r="1.2" fill="#38BDF8" />
    <circle cx="8" cy="19" r="1.2" fill="#94A3B8" />
    <circle cx="12" cy="19" r="1.2" fill="#10B981" />
    <circle cx="16" cy="19" r="1.2" fill="#10B981" />
  </svg>
);

// Modern colored Building Office Icon (High-rise buildings)
export const BuildingOfficeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Background tower */}
    <rect x="13" y="3" width="8" height="18" rx="1" fill="#60A5FA" fillOpacity="0.3" stroke="#2563EB" strokeWidth="1.2" />
    {/* Main tower */}
    <rect x="3" y="6" width="10" height="15" rx="1" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.5" />
    {/* Luminous yellow windows */}
    <rect x="5.5" y="8.5" width="2" height="2" rx="0.5" fill="#FEF08A" />
    <rect x="8.5" y="8.5" width="2" height="2" rx="0.5" fill="#FEF08A" />
    <rect x="5.5" y="12" width="2" height="2" rx="0.5" fill="#FEF08A" />
    <rect x="8.5" y="12" width="2" height="2" rx="0.5" fill="#FEF08A" />
    {/* Entrance door */}
    <rect x="6.5" y="17" width="3" height="4" rx="0.5" fill="#1E3A8A" />
  </svg>
);
