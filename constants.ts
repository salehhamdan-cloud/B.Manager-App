

import { AppSettings, PdfTemplateStyle, ProblemSeverity, RecurrenceUnit, DurationUnit, QuotationStatus, PdfThemeSettings } from './types';

// IndexedDB Constants
export const DB_NAME = 'BManagerDB';
export const DB_VERSION = 2;

// Object Store names
export const OBJECT_STORE_PROJECTS = 'projects';
export const OBJECT_STORE_REPORTS = 'reports';
export const OBJECT_STORE_PROBLEMS = 'problems';
export const OBJECT_STORE_SETTINGS = 'settings';
export const OBJECT_STORE_FORM_TEMPLATES = 'formTemplates';
export const OBJECT_STORE_PROJECT_FORMS = 'projectForms';
export const OBJECT_STORE_NOTIFICATIONS = 'notifications';
export const OBJECT_STORE_SUPPLIERS = 'suppliers';
export const OBJECT_STORE_QUOTATIONS = 'quotations';
export const OBJECT_STORE_PREVENTIVE_EVENTS = 'preventiveEvents';
export const OBJECT_STORE_SYSTEM_LOGS = 'systemLogs';
export const OBJECT_STORE_INVOICES = 'invoices';

export const OBJECT_STORES = [
    OBJECT_STORE_PROJECTS,
    OBJECT_STORE_REPORTS,
    OBJECT_STORE_PROBLEMS,
    OBJECT_STORE_SETTINGS,
    OBJECT_STORE_FORM_TEMPLATES,
    OBJECT_STORE_PROJECT_FORMS,
    OBJECT_STORE_NOTIFICATIONS,
    OBJECT_STORE_SUPPLIERS,
    OBJECT_STORE_QUOTATIONS,
    OBJECT_STORE_PREVENTIVE_EVENTS,
    OBJECT_STORE_SYSTEM_LOGS,
    OBJECT_STORE_INVOICES,
];


export const SETTINGS_ID = 'global_settings';

export const COLOR_PALETTES = [
  { id: 'default', label: 'שמיים קלאסי (Default)', headerColor: '#0284c7', accentColor: '#f59e0b' },
  { id: 'emerald', label: 'אזמרגד (Emerald)', headerColor: '#059669', accentColor: '#10b981' },
  { id: 'indigo', label: 'אינדיגו (Indigo)', headerColor: '#4f46e5', accentColor: '#818cf8' },
  { id: 'sunset', label: 'שקיעה (Sunset)', headerColor: '#ea580c', accentColor: '#f97316' },
  { id: 'slate', label: 'צפחה (Slate)', headerColor: '#334155', accentColor: '#64748b' },
  { id: 'warm-forest', label: 'יער חם (Warm Forest)', headerColor: '#15803d', accentColor: '#84cc16' },
];

export const BACKUP_SCHEMA_VERSION = 40; // Synchronized with Android Room Database v40

export const DEFAULT_SETTINGS: AppSettings = {
  id: SETTINGS_ID,
  companyInfo: { name: 'שם החברה שלך', logo: undefined },
  authorName: 'שם המחבר',
  authorPhone: '',
  authorEmail: '',
  pdfTemplate: PdfTemplateStyle.MODERN,
  taxId: '',
  currencySymbol: '₪',
  phone: '',
  email: '',
  address: '',
  language: 'he',
  themeMode: 'system',
  colorPalette: 'default',

  appTheme: {
    headerColor: '#0284c7', // sky-600
    headerTextColor: '#FFFFFF',
    accentColor: '#f59e0b', // amber-500
    groupHeaderBackgroundColor: '#f1f5f9', // slate-100
    groupHeaderTextColor: '#1e293b', // slate-800
  },

  pdfTheme: {
    headerColor: '#0284c7', // sky-600
    headerTextColor: '#FFFFFF',
    textColor: '#334155', // slate-700
    borderColor: '#e2e8f0', // slate-200
    accentColor: '#f59e0b', // amber-500
    problemPhotoHeaderTextColor: '#FFFFFF',
    formGroupHeaderColor: '#f1f5f9', // slate-100
    formPhotoHeaderColor: '#fbbf24', // amber-400
    formPhotoHeaderTextColor: '#FFFFFF',
    formTitleHeaderColor: '#dbeafe', // blue-100
    formTitleTextColor: '#1e40af', // blue-800
    groupHeaderBackgroundColor: '#f1f5f9', // slate-100
    groupHeaderTextColor: '#1e293b', // slate-800
  },

  fontSizeSmall: 10,
  fontSizeMedium: 12,
  fontSizeLarge: 16,
  logoSize: 15, // 15% of PDF width
  logoPosition: 'top-right',
  projectImageSize: 30, // 30% of PDF width
  projectImagePosition: 'below-header',
  problemImageSize: 30, // New default
  formImageSize: 25, // New default
  customFontUrl: undefined,
  customFontStoragePath: undefined,
  customFontName: undefined,
  notificationDays: 7, // Default to 7 days for notifications
  // New PDF Generation Settings
  pdfOrientation: 'portrait',
  pdfIncludeDashboard: true,
  pdfIncludeProblemPhotos: true,
  pdfDateRangeStart: undefined,
  pdfDateRangeEnd: undefined,
  // Email Notification Settings
  enableEmailNotifications: false,
  notificationEmailAddress: '',
  notifyOnCriticalIssues: true,
  notifyOnFileDueSoon: true,
  notifyOnFileExpired: false,
  notifyOnTodoDueSoon: true,
  notifyOnTodoExpired: false,
  notifyOnPermitDueSoon: true,
  notifyOnPermitExpired: false,
  notifyOnWarrantyDueSoon: true,
  notifyOnWarrantyExpired: false,
  notifyOnNewReport: false,
  notifyOnTaskCompletion: false,
  notifyOnQuotationStatusChange: false,
  // New granular settings
  notifyOnProjectAdd: false,
  notifyOnProjectDelete: false,
  notifyOnReportDelete: false,
  notifyOnProblemAdd: false,
  notifyOnProblemDelete: false,
  notifyOnProblemMarkAsFixed: false,
  notifyOnFileAdd: false,
  notifyOnFileDelete: false,
  notifyOnTodoAdd: false,
  notifyOnTodoDelete: false,
  notifyOnTenantAdd: false,
  notifyOnTenantDelete: false,
  notifyOnSupplierAdd: false,
  notifyOnSupplierDelete: false,
  notifyOnQuotationAdd: false,
  notifyOnQuotationDelete: false,
  inventoryOrderList: [],
};

export const SEVERITY_OPTIONS = [
  { value: ProblemSeverity.LOW, label: 'נמוכה' },
  { value: ProblemSeverity.MEDIUM, label: 'בינונית' },
  { value: ProblemSeverity.HIGH, label: 'גבוהה' },
  { value: ProblemSeverity.CRITICAL, label: 'קריטית' },
];

// New: Color mapping for severity levels for UI and PDF
export const SEVERITY_COLORS: Record<ProblemSeverity, { bg: string; text: string; pdfFill: string; pdfText: string; }> = {
  [ProblemSeverity.LOW]:      { bg: 'bg-green-100',  text: 'text-green-800',  pdfFill: '#dcfce7', pdfText: '#166534' },
  [ProblemSeverity.MEDIUM]:   { bg: 'bg-yellow-100', text: 'text-yellow-800', pdfFill: '#fef9c3', pdfText: '#854d0e' },
  [ProblemSeverity.HIGH]:     { bg: 'bg-orange-100', text: 'text-orange-800', pdfFill: '#ffedd5', pdfText: '#c2410c' },
  [ProblemSeverity.CRITICAL]: { bg: 'bg-red-100',    text: 'text-red-800',    pdfFill: '#fee2e2', pdfText: '#b91c1c' },
};

export const QUOTATION_STATUS_OPTIONS = [
  { value: QuotationStatus.PENDING, label: 'ממתין' },
  { value: QuotationStatus.APPROVED, label: 'מאושר' },
  { value: QuotationStatus.REJECTED, label: 'נדחה' },
  { value: QuotationStatus.CANCELLED, label: 'בוטל' },
  { value: QuotationStatus.WORK_COMPLETED, label: 'עבודה הסתיימה' },
  { value: QuotationStatus.INVOICE_PAID, label: 'חשבונית שולמה' },
];

export const QUOTATION_STATUS_COLORS: Record<QuotationStatus, { bg: string; text: string; }> = {
  [QuotationStatus.PENDING]:      { bg: 'bg-yellow-100',  text: 'text-yellow-800' },
  [QuotationStatus.APPROVED]:   { bg: 'bg-sky-100', text: 'text-sky-800' },
  [QuotationStatus.REJECTED]:     { bg: 'bg-red-100', text: 'text-red-800' },
  [QuotationStatus.CANCELLED]:    { bg: 'bg-slate-100', text: 'text-slate-600' },
  [QuotationStatus.WORK_COMPLETED]: { bg: 'bg-green-100',    text: 'text-green-800' },
  [QuotationStatus.INVOICE_PAID]: { bg: 'bg-blue-100',    text: 'text-blue-800' },
};


export const PDF_TEMPLATE_STYLES = [
  { value: PdfTemplateStyle.MODERN, label: 'מודרני' },
  { value: PdfTemplateStyle.CONSTRUCTION, label: 'בנייה' },
  { value: PdfTemplateStyle.BLUEPRINT, label: 'תכנית בניין' },
  { value: PdfTemplateStyle.PREMIUM, label: 'פרימיום' },
  { value: PdfTemplateStyle.ELEGANT, label: 'אלגנטי' },
  { value: PdfTemplateStyle.VIBRANT, label: 'תוסס' },
];

// Predefined template color schemes
export const PDF_THEMES: Record<PdfTemplateStyle, { pdfTheme: Partial<PdfThemeSettings> }> = {
  [PdfTemplateStyle.MODERN]: {
    pdfTheme: {
      headerColor: '#0284c7', textColor: '#334155', borderColor: '#e2e8f0', accentColor: '#f59e0b', headerTextColor: '#FFFFFF', problemPhotoHeaderTextColor: '#FFFFFF',
      formTitleHeaderColor: '#dbeafe', formTitleTextColor: '#1e40af', formGroupHeaderColor: '#f1f5f9', formPhotoHeaderColor: '#fbbf24', formPhotoHeaderTextColor: '#FFFFFF',
      groupHeaderBackgroundColor: '#f1f5f9', groupHeaderTextColor: '#1e293b',
    }
  },
  [PdfTemplateStyle.CONSTRUCTION]: {
    pdfTheme: {
      headerColor: '#ca8a04', textColor: '#3f3f46', borderColor: '#d4d4d8', accentColor: '#16a34a', headerTextColor: '#FFFFFF', problemPhotoHeaderTextColor: '#FFFFFF',
      formTitleHeaderColor: '#fef9c3', formTitleTextColor: '#713f12', formGroupHeaderColor: '#e7e5e4', formPhotoHeaderColor: '#4d7c0f', formPhotoHeaderTextColor: '#FFFFFF',
      groupHeaderBackgroundColor: '#e7e5e4', groupHeaderTextColor: '#3f3f46',
    }
  },
  [PdfTemplateStyle.BLUEPRINT]: {
    pdfTheme: {
      headerColor: '#2563eb', textColor: '#1e3a8a', borderColor: '#93c5fd', accentColor: '#ffffff', headerTextColor: '#FFFFFF', problemPhotoHeaderTextColor: '#1e3a8a',
      formTitleHeaderColor: '#dbeafe', formTitleTextColor: '#1e3a8a', formGroupHeaderColor: '#dbeafe', formPhotoHeaderColor: '#93c5fd', formPhotoHeaderTextColor: '#1e3a8a',
      groupHeaderBackgroundColor: '#dbeafe', groupHeaderTextColor: '#1e3a8a',
    }
  },
  [PdfTemplateStyle.PREMIUM]: {
    pdfTheme: {
      headerColor: '#4a044e', textColor: '#333333', borderColor: '#d1d5db', accentColor: '#c026d3', headerTextColor: '#FFFFFF', problemPhotoHeaderTextColor: '#FFFFFF',
      formTitleHeaderColor: '#f3e8ff', formTitleTextColor: '#581c87', formGroupHeaderColor: '#f5f3ff', formPhotoHeaderColor: '#d946ef', formPhotoHeaderTextColor: '#FFFFFF',
      groupHeaderBackgroundColor: '#f3e8ff', groupHeaderTextColor: '#581c87',
    }
  },
  [PdfTemplateStyle.ELEGANT]: {
    pdfTheme: {
      headerColor: '#7f1d1d', textColor: '#57534e', borderColor: '#e7e5e4', accentColor: '#b45309', headerTextColor: '#FFFFFF', problemPhotoHeaderTextColor: '#FFFFFF',
      formTitleHeaderColor: '#fef2f2', formTitleTextColor: '#854d0e', formGroupHeaderColor: '#f1f5f9', formPhotoHeaderColor: '#d97706', formPhotoHeaderTextColor: '#FFFFFF',
      groupHeaderBackgroundColor: '#fef2f2', groupHeaderTextColor: '#854d0e',
    }
  },
  [PdfTemplateStyle.VIBRANT]: {
    pdfTheme: {
      headerColor: '#059669', textColor: '#374151', borderColor: '#6ee7b7', accentColor: '#ec4899', headerTextColor: '#FFFFFF', problemPhotoHeaderTextColor: '#FFFFFF',
      formTitleHeaderColor: '#d1fae5', formTitleTextColor: '#065f46', formGroupHeaderColor: '#f0fdf4', formPhotoHeaderColor: '#db2777', formPhotoHeaderTextColor: '#FFFFFF',
      groupHeaderBackgroundColor: '#d1fae5', groupHeaderTextColor: '#065f46',
    }
  },
};

export const IMAGE_MAX_WIDTH = 1024;
export const IMAGE_MAX_HEIGHT = 1024;
export const IMAGE_QUALITY = 0.75; // For JPEG compression

export const PLACEHOLDER_IMAGE_URL_PROBLEM = `data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100' height='100' fill='%23e5e7eb'/%3E%3Ctext x='50' y='55' font-family='sans-serif' font-size='12' fill='%239ca3af' text-anchor='middle'%3E%D7%90%D7%99%D7%9F%20%D7%AA%D7%9E%D7%95%D7%A0%D7%94%3C/text%3E%3C/svg%3E`;

// New constants for Recurrence Editor
export const RECURRENCE_UNITS: { value: RecurrenceUnit; label: string }[] = [
    { value: 'days', label: 'ימים' },
    { value: 'weeks', label: 'שבועות' },
    { value: 'months', label: 'חודשים' },
    { value: 'years', label: 'שנים' },
];

export const DURATION_UNITS: { value: DurationUnit; label: string }[] = [
    { value: 'days', label: 'ימים' },
    { value: 'weeks', label: 'שבועות' },
    { value: 'months', label: 'חודשים' },
    { value: 'years', label: 'שנים' },
];

export const MONTHS = [
    { value: 1, label: 'ינואר' }, { value: 2, label: 'פברואר' }, { value: 3, label: 'מרץ' },
    { value: 4, label: 'אפריל' }, { value: 5, label: 'מאי' }, { value: 6, 'label': 'יוני' },
    { value: 7, label: 'יולי' }, { value: 8, label: 'אוגוסט' }, { value: 9, label: 'ספטמבר' },
    { value: 10, label: 'אוקטובר' }, { value: 11, label: 'נובמבר' }, { value: 12, label: 'דצמבר' },
];