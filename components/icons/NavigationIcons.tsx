import React from 'react';

// Modern colored Document Chart Bar Icon (Reports / Analytics)
export const DocumentChartBarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Paper backdrop */}
    <rect x="3" y="2" width="18" height="20" rx="3" fill="#3B82F6" fillOpacity="0.15" stroke="#2563EB" strokeWidth="1.5" />
    {/* Chart Bars with distinct colors */}
    <rect x="6" y="13" width="3" height="6" rx="1" fill="#0EA5E9" />
    <rect x="10.5" y="8" width="3" height="11" rx="1" fill="#6366F1" />
    <rect x="15" y="5" width="3" height="14" rx="1" fill="#10B981" />
    {/* Trend dot */}
    <circle cx="16.5" cy="5" r="1.5" fill="#34D399" />
  </svg>
);

// Modern colored Folder Icon (Files / Directories)
export const FolderIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Back flap */}
    <path d="M2.5 7C2.5 5.61929 3.61929 4.5 5 4.5H9.2C9.8 4.5 10.37 4.77 10.74 5.24L11.8 6.5H19C20.3807 6.5 21.5 7.61929 21.5 9V17C21.5 18.3807 20.3807 19.5 19 19.5H5C3.61929 19.5 2.5 18.3807 2.5 17V7Z" fill="#F59E0B" fillOpacity="0.3" stroke="#D97706" strokeWidth="1.5" />
    {/* Front folder body */}
    <path d="M2.5 10.5C2.5 9.39543 3.39543 8.5 4.5 8.5H19.5C20.6046 8.5 21.5 9.39543 21.5 10.5V17C21.5 18.3807 20.3807 19.5 19 19.5H5C3.61929 19.5 2.5 18.3807 2.5 17V10.5Z" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" />
    {/* Folder tab accent */}
    <path d="M6 12.5H12" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Modern colored Clipboard List Icon (Todos / Tasks)
export const ClipboardDocumentListIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Clipboard base */}
    <rect x="4" y="4" width="16" height="18" rx="2.5" fill="#EEF2FF" stroke="#4F46E5" strokeWidth="1.5" />
    {/* Clipboard metallic clip */}
    <rect x="8.5" y="2" width="7" height="3.5" rx="1.5" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
    {/* Checklist lines */}
    <rect x="7" y="8.5" width="2" height="2" rx="0.5" fill="#3B82F6" />
    <path d="M11 9.5H17" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="7" y="12.5" width="2" height="2" rx="0.5" fill="#10B981" />
    <path d="M11 13.5H17" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="7" y="16.5" width="2" height="2" rx="0.5" fill="#EC4899" />
    <path d="M11 17.5H15" stroke="#EC4899" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Modern colored Clipboard Check Icon (Checklist / Inspections)
export const ClipboardDocumentCheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Board */}
    <rect x="4" y="4" width="16" height="18" rx="2.5" fill="#ECFDF5" stroke="#059669" strokeWidth="1.5" />
    {/* Gold Clip */}
    <rect x="8.5" y="2" width="7" height="3.5" rx="1.5" fill="#F59E0B" stroke="#D97706" strokeWidth="1" />
    {/* Glowing checkmark badge */}
    <circle cx="12" cy="13.5" r="4.5" fill="#10B981" />
    <path d="M9.5 13.5L11.2 15.2L14.5 11.8" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Modern colored Queue List Icon (Tasks / Logs)
export const QueueListIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Top card */}
    <rect x="3" y="3.5" width="18" height="4.5" rx="2" fill="#818CF8" fillOpacity="0.25" stroke="#6366F1" strokeWidth="1.5" />
    <circle cx="6.5" cy="5.75" r="1.25" fill="#6366F1" />
    <path d="M10 5.75H17" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round" />
    {/* Middle card */}
    <rect x="3" y="9.75" width="18" height="4.5" rx="2" fill="#38BDF8" fillOpacity="0.25" stroke="#0284C7" strokeWidth="1.5" />
    <circle cx="6.5" cy="12" r="1.25" fill="#0284C7" />
    <path d="M10 12H18" stroke="#0369A1" strokeWidth="1.5" strokeLinecap="round" />
    {/* Bottom card */}
    <rect x="3" y="16" width="18" height="4.5" rx="2" fill="#34D399" fillOpacity="0.25" stroke="#059669" strokeWidth="1.5" />
    <circle cx="6.5" cy="18.25" r="1.25" fill="#059669" />
    <path d="M10 18.25H16" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Modern colored Chart Pie Icon (Dashboard / KPI Analytics)
export const ChartPieIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Main pie slice (Large 270 deg) */}
    <path d="M11 2.05C6.05 2.55 2.15 6.67 2.05 11.75C1.94 17.27 6.42 21.85 11.95 21.95C17.03 22.05 21.35 18.15 21.95 13H11V2.05Z" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.5" />
    {/* Highlighted sector slice */}
    <path d="M14 2C14 2 18.5 2.5 21.5 5.5C21.9 5.9 22 6.5 21.7 7L14 10.5V2Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
    {/* Small accent sector */}
    <path d="M15 11.5L21.8 8C22 8.5 22 9.2 22 10H15V11.5Z" fill="#10B981" />
  </svg>
);

// Modern colored Chat Bubble Icon (Notes / Messages)
export const ChatBubbleBottomCenterTextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M3 11C3 6.58172 7.02944 3 12 3C16.9706 3 21 6.58172 21 11C21 15.4183 16.9706 19 12 19C10.5 19 9.1 18.7 7.8 18.1L3.5 20.5C3.1 20.7 2.7 20.4 2.8 20L3.5 15.8C3.2 14.3 3 12.7 3 11Z" fill="#0EA5E9" fillOpacity="0.2" stroke="#0284C7" strokeWidth="1.5" strokeLinejoin="round" />
    {/* Three message dots */}
    <circle cx="8" cy="11" r="1.5" fill="#0284C7" />
    <circle cx="12" cy="11" r="1.5" fill="#2563EB" />
    <circle cx="16" cy="11" r="1.5" fill="#4F46E5" />
  </svg>
);

// Modern colored Wrench Screwdriver Icon (Maintenance / Repair)
export const WrenchScrewdriverIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    {/* Screwdriver (Amber handle + Steel shaft) */}
    <path d="M5 19L11 13" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M11 13L17 7L19 9L13 15L11 13Z" fill="#64748B" />
    <path d="M17 7L20 4" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
    {/* Wrench (Blue / Steel) */}
    <path d="M19 19L13 13" stroke="#0284C7" strokeWidth="3" strokeLinecap="round" />
    <path d="M13 13L10.5 10.5C9.5 11.5 8 11.8 6.8 11.3L9 9L7 7L4.7 9.2C4.2 8 4.5 6.5 5.5 5.5C6.9 4.1 9.1 4.1 10.5 5.5C11.5 6.5 11.8 8 11.3 9.2L13 10.9" fill="#38BDF8" stroke="#0369A1" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

// Modern colored Rectangle Group Icon (Sub-projects / Layout)
export const RectangleGroupIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
    <rect x="3" y="3" width="8" height="8" rx="2" fill="#3B82F6" fillOpacity="0.25" stroke="#2563EB" strokeWidth="1.5" />
    <rect x="13" y="3" width="8" height="8" rx="2" fill="#10B981" fillOpacity="0.25" stroke="#059669" strokeWidth="1.5" />
    <rect x="3" y="13" width="8" height="8" rx="2" fill="#F59E0B" fillOpacity="0.25" stroke="#D97706" strokeWidth="1.5" />
    <rect x="13" y="13" width="8" height="8" rx="2" fill="#8B5CF6" fillOpacity="0.25" stroke="#7C3AED" strokeWidth="1.5" />
  </svg>
);
