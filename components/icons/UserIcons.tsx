import React from 'react';
import {
  Users,
  Contact2,
  User,
} from 'lucide-react';

export const UserGroupIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Users className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const IdentificationIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Contact2 className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const UserIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <User className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);
