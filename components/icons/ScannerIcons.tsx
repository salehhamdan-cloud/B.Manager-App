import React from 'react';
import {
  ScanLine,
  Crop,
  RotateCcw,
  RotateCw,
  Contrast,
} from 'lucide-react';

export const DocumentScannerIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <ScanLine className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const CropIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Crop className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const RotateLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <RotateCcw className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const RotateRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <RotateCw className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const FilterBWIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Contrast className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);
