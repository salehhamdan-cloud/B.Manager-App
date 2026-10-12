import React from 'react';
import {
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';

export const PhoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Phone className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const EnvelopeIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Mail className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const MapPinIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <MapPin className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);
