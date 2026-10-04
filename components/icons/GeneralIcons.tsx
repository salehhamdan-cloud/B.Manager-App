import React from 'react';

// Modern colored Settings Icon (System / App Preferences)
export const SettingsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Outer mechanical gear ring */}
    <path
      d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
      fill="#0EA5E9"
      stroke="#0284C7"
      strokeWidth="1.5"
    />
    <path
      d="M19.4 15C19.3 15.3 19.3 15.7 19.2 16L20.8 17.2C21.1 17.5 21.2 17.9 21 18.2L19.5 20.8C19.3 21.1 18.9 21.2 18.6 21.1L16.7 20.3C16.3 20.6 15.9 20.8 15.5 21L15.2 23.1C15.1 23.5 14.8 23.8 14.4 23.8H11.4C11 23.8 10.7 23.5 10.6 23.1L10.3 21C9.9 20.8 9.5 20.6 9.1 20.3L7.2 21.1C6.9 21.2 6.5 21.1 6.3 20.8L4.8 18.2C4.6 17.9 4.7 17.5 5 17.2L6.6 16C6.5 15.7 6.5 15.3 6.4 15L4.3 14.7C3.9 14.6 3.6 14.3 3.6 13.9V10.9C3.6 10.5 3.9 10.2 4.3 10.1L6.4 9.8C6.5 9.5 6.5 9.1 6.6 8.8L5 7.6C4.7 7.3 4.6 6.9 4.8 6.6L6.3 4C6.5 3.7 6.9 3.6 7.2 3.7L9.1 4.5C9.5 4.2 9.9 4 10.3 3.8L10.6 1.7C10.7 1.3 11 1 11.4 1H14.4C14.8 1 15.1 1.3 15.2 1.7L15.5 3.8C15.9 4 16.3 4.2 16.7 4.5L18.6 3.7C18.9 3.6 19.3 3.7 19.5 4L21 6.6C21.2 6.9 21.1 7.3 20.8 7.6L19.2 8.8C19.3 9.1 19.3 9.5 19.4 9.8L21.5 10.1C21.9 10.2 22.2 10.5 22.2 10.9V13.9C22.2 14.3 21.9 14.6 21.5 14.7L19.4 15Z"
      fill="#64748B"
      fillOpacity="0.25"
      stroke="#475569"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

// Modern colored Home Icon (Main Buildings / Estate)
export const HomeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Roof (Terracotta / Red coral) */}
    <path d="M12 2.5L2 11H5V20.5C5 21.0523 5.44772 21.5 6 21.5H18C18.5523 21.5 19 21.0523 19 20.5V11H22L12 2.5Z" fill="#F87171" fillOpacity="0.25" stroke="#EF4444" strokeWidth="1.5" strokeLinejoin="round" />
    {/* House walls */}
    <path d="M5 10.5V20.5C5 21.05 5.45 21.5 6 21.5H18C18.55 21.5 19 21.05 19 20.5V10.5L12 4.5L5 10.5Z" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" />
    {/* Chimney */}
    <path d="M17 7.5V4H19V9L17 7.5Z" fill="#EF4444" />
    {/* Entrance Door */}
    <rect x="9.5" y="14" width="5" height="7.5" rx="1" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.2" />
    <circle cx="13" cy="18" r="0.6" fill="#FBBF24" />
    {/* Attic window */}
    <circle cx="12" cy="9.5" r="1.8" fill="#38BDF8" stroke="#0284C7" strokeWidth="1" />
  </svg>
);

// Modern colored Arrow Right Icon
export const ArrowRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="12" cy="12" r="9" fill="#0284C7" fillOpacity="0.15" />
    <path d="M10 8L14 12L10 16M14 12H6" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Modern colored Arrow Left Icon
export const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="12" cy="12" r="9" fill="#0284C7" fillOpacity="0.15" />
    <path d="M14 16L10 12L14 8M10 12H18" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Modern colored Clipboard Document List Icon
export const ClipboardDocumentListIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <rect x="4" y="4" width="16" height="18" rx="2.5" fill="#EEF2FF" stroke="#4F46E5" strokeWidth="1.5" />
    <rect x="8.5" y="2" width="7" height="3.5" rx="1.5" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
    <rect x="7" y="8.5" width="2" height="2" rx="0.5" fill="#3B82F6" />
    <path d="M11 9.5H17" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="7" y="12.5" width="2" height="2" rx="0.5" fill="#10B981" />
    <path d="M11 13.5H17" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="7" y="16.5" width="2" height="2" rx="0.5" fill="#EC4899" />
    <path d="M11 17.5H15" stroke="#EC4899" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Modern colored Archive Box Icon (Warehouse Inventory / Storage)
export const ArchiveBoxIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Box body */}
    <rect x="4" y="7" width="16" height="14" rx="2" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.5" />
    {/* Box lid */}
    <rect x="2.5" y="3.5" width="19" height="4.5" rx="1.5" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
    {/* Handle cutout */}
    <rect x="9" y="10.5" width="6" height="2" rx="1" fill="#D97706" />
    {/* Delivery badge tape */}
    <path d="M10 7V15M14 7V15" stroke="#10B981" strokeWidth="1.2" strokeDasharray="1 1" />
  </svg>
);

// Modern colored Chevron Left Icon
export const ChevronLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="12" cy="12" r="9" fill="#F1F5F9" />
    <path d="M14 16L10 12L14 8" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Modern colored Calendar Days Icon (Preventive Maintenance / Calendar)
export const CalendarDaysIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Calendar sheet */}
    <rect x="3" y="4" width="18" height="17" rx="3" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
    {/* Red Top Banner */}
    <path d="M3 7C3 5.34315 4.34315 4 6 4H18C19.6569 4 21 5.34315 21 7V8.5H3V7Z" fill="#EF4444" stroke="#DC2626" strokeWidth="1" />
    {/* Spiral bindings */}
    <rect x="7" y="2" width="2" height="4" rx="1" fill="#475569" />
    <rect x="15" y="2" width="2" height="4" rx="1" fill="#475569" />
    {/* Event dot markers */}
    <circle cx="7.5" cy="12.5" r="1.5" fill="#3B82F6" />
    <circle cx="12" cy="12.5" r="1.5" fill="#10B981" />
    <circle cx="16.5" cy="12.5" r="1.5" fill="#94A3B8" />
    <circle cx="7.5" cy="16.5" r="1.5" fill="#F59E0B" />
    <circle cx="12" cy="16.5" r="1.5" fill="#EC4899" />
    <circle cx="16.5" cy="16.5" r="1.5" fill="#8B5CF6" />
  </svg>
);

// Modern colored Wrench Screwdriver Icon
export const WrenchScrewdriverIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M5 19L11 13" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M11 13L17 7L19 9L13 15L11 13Z" fill="#64748B" />
    <path d="M17 7L20 4" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M19 19L13 13" stroke="#0284C7" strokeWidth="3" strokeLinecap="round" />
    <path d="M13 13L10.5 10.5C9.5 11.5 8 11.8 6.8 11.3L9 9L7 7L4.7 9.2C4.2 8 4.5 6.5 5.5 5.5C6.9 4.1 9.1 4.1 10.5 5.5C11.5 6.5 11.8 8 11.3 9.2L13 10.9" fill="#38BDF8" stroke="#0369A1" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

// Modern colored Folder Icon
export const FolderIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M2.5 7C2.5 5.61929 3.61929 4.5 5 4.5H9.2C9.8 4.5 10.37 4.77 10.74 5.24L11.8 6.5H19C20.3807 6.5 21.5 7.61929 21.5 9V17C21.5 18.3807 20.3807 19.5 19 19.5H5C3.61929 19.5 2.5 18.3807 2.5 17V7Z" fill="#F59E0B" fillOpacity="0.3" stroke="#D97706" strokeWidth="1.5" />
    <path d="M2.5 10.5C2.5 9.39543 3.39543 8.5 4.5 8.5H19.5C20.6046 8.5 21.5 9.39543 21.5 10.5V17C21.5 18.3807 20.3807 19.5 19 19.5H5C3.61929 19.5 2.5 18.3807 2.5 17V10.5Z" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" />
    <path d="M6 12.5H12" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Modern colored Document Text Icon
export const DocumentTextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M6 2H14L19 7V20C19 21.1046 18.1046 22 17 22H6C4.89543 22 4 21.1046 4 20V4C4 2.89543 4.89543 2 6 2Z" fill="#EFF6FF" stroke="#2563EB" strokeWidth="1.5" />
    <path d="M14 2V7H19L14 2Z" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1" strokeLinejoin="round" />
    <path d="M8 10H15" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 13.5H15" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 17H12" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Modern colored Shield Exclamation Icon (Urgent Warnings / Hazards)
export const ShieldExclamationIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Shield plate */}
    <path
      d="M12 2L4 5.5V11.5C4 16.5 7.5 21 12 22.5C16.5 21 20 16.5 20 11.5V5.5L12 2Z"
      fill="#FEF3C7"
      stroke="#F59E0B"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Warning Exclamation in Amber/Red */}
    <circle cx="12" cy="12" r="5" fill="#F59E0B" fillOpacity="0.2" />
    <path d="M12 8V13" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="12" cy="16.5" r="1.2" fill="#DC2626" />
  </svg>
);
