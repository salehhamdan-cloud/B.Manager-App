import React from 'react';

// Modern colored User Group Icon (Tenants / Team / Community)
export const UserGroupIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Secondary background user (Right, Emerald) */}
    <circle cx="16.5" cy="7.5" r="3" fill="#A7F3D0" stroke="#059669" strokeWidth="1.2" />
    <path d="M13.5 17C13.5 14.5 15.5 13 18 13C20.5 13 22.5 14.5 22.5 17" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" />
    {/* Primary foreground user (Left, Royal Blue) */}
    <circle cx="9" cy="7" r="4" fill="#BFDBFE" stroke="#2563EB" strokeWidth="1.5" />
    <path d="M2.5 20C2.5 16 6 14 9 14C12 14 15.5 16 15.5 20" fill="#3B82F6" fillOpacity="0.25" stroke="#1D4ED8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Modern colored Identification Icon (Maintenance Workers / Contractors / Badges)
export const IdentificationIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* ID Badge Card */}
    <rect x="3" y="4" width="18" height="16" rx="2.5" fill="#FAF5FF" stroke="#7C3AED" strokeWidth="1.5" />
    {/* Lanyard clip hole at top */}
    <rect x="9.5" y="2" width="5" height="3" rx="1.5" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
    {/* Worker photo frame */}
    <rect x="5.5" y="7.5" width="5.5" height="7" rx="1.5" fill="#E9D5FF" stroke="#9333EA" strokeWidth="1.2" />
    <circle cx="8.25" cy="10" r="1.5" fill="#7C3AED" />
    <path d="M6 14C6 12.8 7 12.2 8.25 12.2C9.5 12.2 10.5 12.8 10.5 14" stroke="#7C3AED" strokeWidth="1.2" strokeLinecap="round" />
    {/* Name and specialty lines */}
    <path d="M13 8.5H18" stroke="#7C3AED" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M13 11.5H17" stroke="#A855F7" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M13 14H16" stroke="#C084FC" strokeWidth="1.2" strokeLinecap="round" />
    {/* Barcode strip */}
    <path d="M6 17.5H18" stroke="#6B7280" strokeWidth="1.2" strokeDasharray="1.5 1" />
  </svg>
);

// Modern colored Single User Icon
export const UserIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <circle cx="12" cy="7.5" r="4.5" fill="#BFDBFE" stroke="#2563EB" strokeWidth="1.5" />
    <path d="M4.5 20.5C4.5 16 8 14.5 12 14.5C16 14.5 19.5 16 19.5 20.5" fill="#3B82F6" fillOpacity="0.2" stroke="#1D4ED8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
