import React from 'react';
import {
  BarChart3,
  Folder,
  ClipboardList,
  ClipboardCheck,
  ListOrdered,
  PieChart,
  MessageSquare,
  Wrench,
  Layers,
} from 'lucide-react';

export const DocumentChartBarIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <BarChart3 className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const FolderIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Folder className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ClipboardDocumentListIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <ClipboardList className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ClipboardDocumentCheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <ClipboardCheck className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const QueueListIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <ListOrdered className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ChartPieIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <PieChart className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ChatBubbleBottomCenterTextIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <MessageSquare className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const WrenchScrewdriverIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Wrench className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const RectangleGroupIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Layers className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);
