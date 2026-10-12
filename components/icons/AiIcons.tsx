import React from 'react';
import {
  Sparkles,
  Cpu,
} from 'lucide-react';

export const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Sparkles className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const CpuChipIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Cpu className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);
