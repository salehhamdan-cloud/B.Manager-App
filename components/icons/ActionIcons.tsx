import React from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Camera,
  Copy,
  Download,
  Upload,
  Printer,
  ChevronUp,
  ChevronDown,
  ClipboardCheck,
  Share2,
  Eye,
  LayoutGrid,
  Search,
  PenTool,
  RefreshCw,
} from 'lucide-react';

export const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Plus className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const PencilIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Pencil className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Trash2 className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const CameraIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Camera className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const DocumentDuplicateIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Copy className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ArrowDownTrayIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Download className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ArrowUpTrayIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Upload className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const PrinterIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Printer className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ChevronUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <ChevronUp className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <ChevronDown className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ClipboardCheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <ClipboardCheck className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ShareIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Share2 className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const EyeIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Eye className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const Squares2X2Icon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <LayoutGrid className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const MagnifyingGlassIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Search className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const PencilScribbleIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <PenTool className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ArrowPathIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <RefreshCw className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);
