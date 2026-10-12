import React from 'react';
import {
  Settings,
  Home,
  ArrowRight,
  ArrowLeft,
  ClipboardList,
  Archive,
  ChevronLeft,
  Calendar,
  Wrench,
  Folder,
  FileText,
  ShieldAlert,
} from 'lucide-react';

export const SettingsIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Settings className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const HomeIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Home className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ArrowRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <ArrowRight className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <ArrowLeft className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ClipboardDocumentListIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <ClipboardList className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ArchiveBoxIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Archive className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ChevronLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <ChevronLeft className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const CalendarDaysIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Calendar className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const WrenchScrewdriverIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Wrench className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const FolderIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Folder className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const DocumentTextIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <FileText className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ShieldExclamationIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <ShieldAlert className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);
