import React from 'react';

// Modern colored Plus Icon (Add / Create)
export const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="12" cy="12" r="9.5" fill="#0284C7" />
    <circle cx="12" cy="12" r="7.5" fill="#0369A1" fillOpacity="0.4" />
    <path d="M12 7V17M7 12H17" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// Modern colored Pencil Icon (Edit)
export const PencilIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Background note pad sheet */}
    <rect x="3" y="5" width="14" height="16" rx="2" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1.2" />
    <path d="M6 9H11M6 13H10M6 17H8" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" />
    {/* Pencil body */}
    <path d="M18.8 3.2C19.6 2.4 20.9 2.4 21.7 3.2C22.5 4 22.5 5.3 21.7 6.1L12.5 15.3L8.5 16.5L9.7 12.5L18.8 3.2Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M17 5L20 8" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
    {/* Pencil tip */}
    <polygon points="8.5,16.5 10,15 9,14" fill="#334155" />
  </svg>
);

// Modern colored Trash Icon (Delete / Remove)
export const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Red trash can container */}
    <path d="M5 7L6 20C6 21.1 6.9 22 8 22H16C17.1 22 18 21.1 18 20L19 7" fill="#FEE2E2" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
    {/* Can lid */}
    <path d="M3 6H21M9 6V4C9 3.4 9.4 3 10 3H14C14.6 3 15 3.4 15 4V6" stroke="#DC2626" strokeWidth="1.6" strokeLinecap="round" />
    {/* Vertical ridges */}
    <path d="M9.5 10V18" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M14.5 10V18" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Modern colored Camera Icon (Photos / Document Scanning)
export const CameraIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Camera body */}
    <path d="M4 8C2.9 8 2 8.9 2 10V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V10C22 8.9 21.1 8 20 8H16.5L15 5.5C14.7 5.2 14.2 5 13.7 5H10.3C9.8 5 9.3 5.2 9 5.5L7.5 8H4Z" fill="#3B82F6" fillOpacity="0.2" stroke="#2563EB" strokeWidth="1.5" strokeLinejoin="round" />
    {/* Lens outer */}
    <circle cx="12" cy="14" r="4.5" fill="#1E293B" stroke="#0F172A" strokeWidth="1.2" />
    {/* Lens inner glass */}
    <circle cx="12" cy="14" r="2.8" fill="#0284C7" />
    <circle cx="13" cy="13" r="0.8" fill="#BAE6FD" />
    {/* Red flash sensor */}
    <circle cx="18" cy="10.5" r="1" fill="#EF4444" />
  </svg>
);

// Modern colored Document Duplicate Icon (Duplicate / Forms)
export const DocumentDuplicateIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Back document (Emerald) */}
    <rect x="7" y="3" width="13" height="15" rx="2" fill="#D1FAE5" stroke="#10B981" strokeWidth="1.4" />
    {/* Front document (Indigo) */}
    <rect x="4" y="6" width="13" height="15" rx="2" fill="#EEF2FF" stroke="#6366F1" strokeWidth="1.5" />
    <path d="M7 10H13" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M7 13.5H13" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M7 17H10" stroke="#A5B4FC" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Modern colored Arrow Down Tray Icon (Download / Export)
export const ArrowDownTrayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Tray box */}
    <path d="M4 14V19C4 19.5523 4.44772 20 5 20H19C19.5523 20 20 19.5523 20 19V14" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
    <path d="M4 15.5H8L10 17.5H14L16 15.5H20" stroke="#10B981" strokeWidth="1.5" strokeLinejoin="round" />
    {/* Down Arrow (Emerald / Cyan) */}
    <path d="M12 3V13M12 13L8 9M12 13L16 9" stroke="#059669" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Modern colored Arrow Up Tray Icon (Upload / Import)
export const ArrowUpTrayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Tray */}
    <path d="M4 14V19C4 19.5523 4.44772 20 5 20H19C19.5523 20 20 19.5523 20 19V14" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
    <path d="M4 15.5H8L10 17.5H14L16 15.5H20" stroke="#3B82F6" strokeWidth="1.5" strokeLinejoin="round" />
    {/* Up Arrow (Blue / Indigo) */}
    <path d="M12 14V4M12 4L8 8M12 4L16 8" stroke="#2563EB" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Modern colored Printer Icon (Print / Export PDF)
export const PrinterIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Top paper feeder */}
    <rect x="6" y="3" width="12" height="6" rx="1" fill="#F1F5F9" stroke="#64748B" strokeWidth="1.5" />
    {/* Main printer body */}
    <rect x="3" y="7" width="18" height="9" rx="2.5" fill="#334155" stroke="#1E293B" strokeWidth="1.5" />
    {/* Power led */}
    <circle cx="18" cy="10" r="0.8" fill="#10B981" />
    {/* Bottom paper tray & output */}
    <rect x="6" y="13" width="12" height="8" rx="1.5" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5" />
    <path d="M8.5 16H15.5M8.5 18.5H13" stroke="#60A5FA" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

// Modern colored Chevron Up Icon
export const ChevronUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="12" cy="12" r="9" fill="#F1F5F9" />
    <path d="M8 14L12 10L16 14" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Modern colored Chevron Down Icon
export const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="12" cy="12" r="9" fill="#F1F5F9" />
    <path d="M8 10L12 14L16 10" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Modern colored Clipboard Check Icon
export const ClipboardCheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <rect x="4" y="4" width="16" height="18" rx="2.5" fill="#ECFDF5" stroke="#059669" strokeWidth="1.5" />
    <rect x="8.5" y="2" width="7" height="3.5" rx="1.5" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
    <circle cx="12" cy="13.5" r="4.5" fill="#10B981" />
    <path d="M9.5 13.5L11.2 15.2L14.5 11.8" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Modern colored Share Icon (Share / Export Link)
export const ShareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <line x1="8.5" y1="13.5" x2="15.5" y2="17.5" stroke="#A78BFA" strokeWidth="2" />
    <line x1="8.5" y1="10.5" x2="15.5" y2="6.5" stroke="#A78BFA" strokeWidth="2" />
    <circle cx="6" cy="12" r="3.5" fill="#7C3AED" stroke="#6D28D9" strokeWidth="1.5" />
    <circle cx="18" cy="5" r="3.5" fill="#8B5CF6" stroke="#7C3AED" strokeWidth="1.5" />
    <circle cx="18" cy="19" r="3.5" fill="#8B5CF6" stroke="#7C3AED" strokeWidth="1.5" />
  </svg>
);

// Modern colored Eye Icon (View / Preview)
export const EyeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Eyeball outer */}
    <path d="M2 12C3.8 6.8 7.5 4 12 4C16.5 4 20.2 6.8 22 12C20.2 17.2 16.5 20 12 20C7.5 20 3.8 17.2 2 12Z" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1.5" strokeLinejoin="round" />
    {/* Iris */}
    <circle cx="12" cy="12" r="4" fill="#0284C7" />
    {/* Pupil */}
    <circle cx="12" cy="12" r="2" fill="#0F172A" />
    {/* Reflection sparkle */}
    <circle cx="13" cy="10.8" r="0.9" fill="#FFFFFF" />
  </svg>
);

// Modern colored Squares 2X2 Icon (Grid view)
export const Squares2X2Icon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" fill="#0284C7" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" fill="#10B981" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" fill="#F59E0B" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" fill="#8B5CF6" />
  </svg>
);

// Modern colored Magnifying Glass Icon (Search / Filter)
export const MagnifyingGlassIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Glass lens */}
    <circle cx="11" cy="11" r="7" fill="#E0F2FE" stroke="#0284C7" strokeWidth="2" />
    {/* Glass reflection arc */}
    <path d="M7.5 8C8.3 6.8 9.5 6 11 6" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" />
    {/* Metallic handle */}
    <path d="M16 16L21 21" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// Modern colored Pencil Scribble Icon (Signatures / Notes)
export const PencilScribbleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M18.8 3.2C19.6 2.4 20.9 2.4 21.7 3.2C22.5 4 22.5 5.3 21.7 6.1L12.5 15.3L8.5 16.5L9.7 12.5L18.8 3.2Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M3 21C6 19 9 22 12 20C14 18.7 15 19 16 19" stroke="#0284C7" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// Modern colored Arrow Path (Refresh) Icon
export const ArrowPathIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);
