import React from 'react';
import {
  Bell,
  BellRing,
} from 'lucide-react';

export const BellIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Bell className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const BellAlertIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <BellRing className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);
