import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
  RefreshCw,
} from 'lucide-react';

export const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <CheckCircle2 className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const XCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <XCircle className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ExclamationTriangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <AlertTriangle className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const InformationCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Info className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const XMarkIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <X className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ArrowPathIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <RefreshCw className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);
