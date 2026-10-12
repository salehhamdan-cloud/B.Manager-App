import React from 'react';
import {
  Menu,
  LogOut,
  ArrowUpDown,
} from 'lucide-react';

export const Bars3Icon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Menu className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ArrowRightOnRectangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <LogOut className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ArrowsUpDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <ArrowUpDown className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);
