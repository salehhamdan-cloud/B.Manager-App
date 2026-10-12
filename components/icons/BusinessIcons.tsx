import React from 'react';
import {
  Truck,
  Receipt,
  FileText,
  Calculator,
  Building2,
} from 'lucide-react';

export const TruckIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Truck className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const ReceiptPercentIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Receipt className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const DocumentTextIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <FileText className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const CalculatorIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Calculator className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);

export const BuildingOfficeIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({ className, strokeWidth, ...props }) => (
  <Building2 className={className} strokeWidth={strokeWidth ?? 2} {...(props as any)} />
);
