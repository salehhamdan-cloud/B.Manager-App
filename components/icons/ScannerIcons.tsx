import React from 'react';

// Modern colored Document Scanner Icon (Document Scanner / OCR)
export const DocumentScannerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Corner targeting brackets (Cyan / Blue) */}
    <path d="M4 8V5C4 4.4 4.4 4 5 4H8" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M16 4H19C19.6 4 20 4.4 20 5V8" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M4 16V19C4 19.6 4.4 20 5 20H8" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M16 20H19C19.6 20 20 19.6 20 19V16" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" />
    {/* Document sheet inside */}
    <rect x="7" y="6" width="10" height="12" rx="1.5" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.2" />
    <path d="M9 9H15M9 12H13M9 15H11" stroke="#93C5FD" strokeWidth="1.2" strokeLinecap="round" />
    {/* Glowing laser scan beam */}
    <line x1="3" y1="12" x2="21" y2="12" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="12" r="1.5" fill="#EF4444" />
  </svg>
);

// Modern colored Crop Icon
export const CropIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M6 2V18C6 19.1 6.9 20 8 20H24" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
    <path d="M18 22V6C18 4.9 17.1 4 16 4H0" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" />
    <rect x="8" y="6" width="8" height="12" fill="#818CF8" fillOpacity="0.2" />
  </svg>
);

// Modern colored Rotate Left Icon
export const RotateLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="12" cy="12" r="9" fill="#0EA5E9" fillOpacity="0.12" />
    <path d="M9 15L3 9M3 9L9 3M3 9H15C18.3 9 21 11.7 21 15C21 18.3 18.3 21 15 21H12" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Modern colored Rotate Right Icon
export const RotateRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="12" cy="12" r="9" fill="#0EA5E9" fillOpacity="0.12" />
    <path d="M15 15L21 9M21 9L15 3M21 9H9C5.7 9 3 11.7 3 15C3 18.3 5.7 21 9 21H12" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Modern colored Filter B&W Icon
export const FilterBWIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="12" cy="12" r="9.5" fill="#FFFFFF" stroke="#334155" strokeWidth="1.5" />
    <path d="M12 2.5C17.2 2.5 21.5 6.8 21.5 12C21.5 17.2 17.2 21.5 12 21.5V2.5Z" fill="#334155" />
  </svg>
);
