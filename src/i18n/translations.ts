export type Language = 'he' | 'en' | 'ar';

export interface TranslationDictionary {
  [key: string]: {
    he: string;
    en: string;
    ar: string;
  };
}

export const translations: TranslationDictionary = {
  // App Branding
  appName: {
    he: 'B.Manager',
    en: 'B.Manager',
    ar: 'بي.مانجر'
  },
  appTagline: {
    he: 'מערכת ניהול ואחזקת מבנים',
    en: 'Building Management & Maintenance System',
    ar: 'نظام إدارة وصيانة المباني والعقارات'
  },

  // Navigation Groups
  navGroupOperations: {
    he: 'תפעול ונכסים',
    en: 'Operations & Assets',
    ar: 'التشغيل والأصول'
  },
  navGroupContacts: {
    he: 'אנשי קשר וכספים',
    en: 'Contacts & Finance',
    ar: 'جهات الاتصال والمالية'
  },
  navGroupForms: {
    he: 'טפסים, סקרים ומלאי',
    en: 'Forms, Surveys & Inventory',
    ar: 'النماذج والمسوحات والمخزون'
  },
  navGroupSystem: {
    he: 'חכמה ומערכת',
    en: 'Intelligence & System',
    ar: 'الذكاء والنظام'
  },

  // Sidebar & Navigation Items
  navBuildings: {
    he: 'מבנים ונכסים',
    en: 'Buildings & Properties',
    ar: 'المباني والعقارات'
  },
  navDashboard: {
    he: 'לוח בקרה ראשי',
    en: 'Main Dashboard',
    ar: 'لوحة التحكم الرئيسية'
  },
  navProblems: {
    he: 'תקלות וקריאות שירות',
    en: 'Issues & Service Calls',
    ar: 'البلاغات وطلبات الخدمة'
  },
  navReports: {
    he: 'דוחות וסקרי מבנה',
    en: 'Reports & Building Surveys',
    ar: 'التقارير ومسوحات المبنى'
  },
  navBuildingSystems: {
    he: 'מערכות תשתית ובטיחות',
    en: 'Building Systems & Safety',
    ar: 'أنظمة البنية التحتية والسلامة'
  },
  navCalendar: {
    he: 'לוח תחזוקה מונעת',
    en: 'Preventive Maintenance Calendar',
    ar: 'تقويم الصيانة الوقائية'
  },
  navSubProjects: {
    he: 'פרויקטי משנה',
    en: 'Sub-Projects',
    ar: 'المشاريع الفرعية'
  },
  navTodos: {
    he: 'משימות תפעוליות',
    en: 'Operational Tasks',
    ar: 'المهام التشغيلية'
  },
  navFiles: {
    he: 'מסמכים וקבצי בניין',
    en: 'Documents & Files',
    ar: 'المستندات وملفات المبنى'
  },
  navTenants: {
    he: 'ספר דיירים',
    en: 'Tenants Directory',
    ar: 'دليل السكان'
  },
  navWorkers: {
    he: 'עובדי תחזוקה',
    en: 'Maintenance Staff',
    ar: 'عمال الصيانة'
  },
  navSuppliers: {
    he: 'ספקים וקבלנים',
    en: 'Suppliers & Contractors',
    ar: 'الموردون والمقاولون'
  },
  navQuotations: {
    he: 'הצעות מחיר וחשבוניות',
    en: 'Quotations & Invoices',
    ar: 'عروض الأسعار والفواتير'
  },
  navCalculator: {
    he: 'מחשבון עלויות',
    en: 'Cost Calculator',
    ar: 'حاسبة التكاليف'
  },
  navForms: {
    he: 'שאלוני ביקורת וסקרים',
    en: 'Inspection Forms & Surveys',
    ar: 'استبيانات الفحص والمسوحات'
  },
  navTemplates: {
    he: 'תבניות סקרים וטפסים',
    en: 'Survey & Form Templates',
    ar: 'قوالب النماذج والمسوحات'
  },
  navInventory: {
    he: 'מלאי חלפים וציוד',
    en: 'Parts & Equipment Inventory',
    ar: 'مخزون قطع الغيار والمعدات'
  },
  navOrderList: {
    he: 'פריטים להזמנה',
    en: 'Order List',
    ar: 'قائمة الطلبات'
  },
  navSmartImport: {
    he: 'ייבוא חכם ב-AI ✨',
    en: 'AI Smart Import ✨',
    ar: 'الاستيراد الذكي بالذكاء الاصطناعي ✨'
  },
  navSettings: {
    he: 'הגדרות וסנכרון גיבויים',
    en: 'Settings & Backups',
    ar: 'الإعدادات والنسخ الاحتياطي'
  },
  navAbout: {
    he: 'אודות המערכת',
    en: 'About the System',
    ar: 'حول النظام'
  },
  navNotifications: {
    he: 'יומן פעילות',
    en: 'Activity Log',
    ar: 'سجل النشاط'
  },
  installApp: {
    he: 'התקן אפליקציה במכשיר',
    en: 'Install App on Device',
    ar: 'تثبيت التطبيق على الجهاز'
  },

  // Common Actions & Labels
  add: { he: 'הוסף', en: 'Add', ar: 'إضافة' },
  edit: { he: 'ערוך', en: 'Edit', ar: 'تعديل' },
  delete: { he: 'מחק', en: 'Delete', ar: 'حذف' },
  save: { he: 'שמור', en: 'Save', ar: 'حفظ' },
  saving: { he: 'שומר...', en: 'Saving...', ar: 'جاري الحفظ...' },
  cancel: { he: 'ביטול', en: 'Cancel', ar: 'إلغاء' },
  search: { he: 'חיפוש', en: 'Search', ar: 'بحث' },
  filter: { he: 'סינון', en: 'Filter', ar: 'تصفية' },
  all: { he: 'הכל', en: 'All', ar: 'الكل' },
  export: { he: 'ייצוא', en: 'Export', ar: 'تصدير' },
  import: { he: 'ייבוא', en: 'Import', ar: 'استيراد' },
  download: { he: 'הורד', en: 'Download', ar: 'تنزيل' },
  back: { he: 'חזור', en: 'Back', ar: 'رجوع' },
  home: { he: 'דף הבית', en: 'Home', ar: 'الرئيسية' },
  menu: { he: 'תפריט', en: 'Menu', ar: 'القائمة' },
  close: { he: 'סגור', en: 'Close', ar: 'إغلاق' },
  viewAll: { he: 'צפה בכל', en: 'View all', ar: 'عرض الكل' },
  total: { he: 'סה״כ', en: 'Total', ar: 'الإجمالي' },
  status: { he: 'סטטוס', en: 'Status', ar: 'الحالة' },
  active: { he: 'פעיל', en: 'Active', ar: 'نشط' },
  completed: { he: 'הושלם', en: 'Completed', ar: 'مكتمل' },
  pending: { he: 'ממתין', en: 'Pending', ar: 'قيد الانتظار' },
  inProgress: { he: 'בביצוע', en: 'In Progress', ar: 'قيد التنفيذ' },
  expired: { he: 'פג תוקף', en: 'Expired', ar: 'منتهي الصلاحية' },
  valid: { he: 'בתוקף', en: 'Valid', ar: 'سارٍ' },
  dueSoon: { he: 'פג בקרוב', en: 'Due Soon', ar: 'ينتهي قريباً' },
  loading: { he: 'טוען נתונים...', en: 'Loading...', ar: 'جاري التحميل...' },
  itemsRegistered: { he: 'פריטים רשומים', en: 'registered items', ar: 'عناصر مسجلة' },
  itemRegistered: { he: 'פריט רשום', en: 'registered item', ar: 'عنصر مسجل' },
  offlineBanner: {
    he: 'אתה במצב לא מקוון. שינויים יישמרו מקומית.',
    en: 'You are currently offline. Changes will be saved locally.',
    ar: 'أنت في وضع عدم الاتصال. سيتم حفظ التغييرات محلياً.'
  },

  // Page Titles in App Header
  pageTitleDashboard: { he: 'לוח בקרה', en: 'Dashboard', ar: 'لوحة التحكم' },
  pageTitleBuildings: { he: 'בניינים', en: 'Buildings', ar: 'المباني' },
  pageTitleSettings: { he: 'הגדרות', en: 'Settings', ar: 'الإعدادات' },
  pageTitleAbout: { he: 'אודות', en: 'About', ar: 'حول النظام' },
  pageTitleNotifications: { he: 'יומן פעילות', en: 'Activity Log', ar: 'سجل النشاط' },
  pageTitleFormTemplates: { he: 'תבניות טפסים', en: 'Form Templates', ar: 'قوالب النماذج' },
  pageTitleFillForm: { he: 'מילוי טופס', en: 'Fill Form', ar: 'تعبئة النموذج' },
  pageTitleAllReports: { he: 'כל הדוחות', en: 'All Reports', ar: 'كافة التقارير' },
  pageTitleAllProblems: { he: 'רשימת תקלות כללית', en: 'All Issues Checklist', ar: 'قائمة البلاغات العامة' },
  pageTitleAllForms: { he: 'כל הטפסים', en: 'All Forms', ar: 'كافة النماذج' },
  pageTitleAllFiles: { he: 'כל הקבצים', en: 'All Files', ar: 'كافة الملفات' },
  pageTitleAllTodos: { he: 'כל המשימות', en: 'All Tasks', ar: 'كافة المهام' },
  pageTitleSuppliers: { he: 'ספקים', en: 'Suppliers', ar: 'الموردون' },
  pageTitleAllTenants: { he: 'כל הדיירים', en: 'All Tenants', ar: 'كافة السكان' },
  pageTitleAllWorkers: { he: 'כל עובדי התחזוקה', en: 'All Maintenance Workers', ar: 'كافة عمال الصيانة' },
  pageTitleQuotations: { he: 'הצעות מחיר מאושרות', en: 'Approved Quotations', ar: 'عروض الأسعار المعتمدة' },
  pageTitleAllInventory: { he: 'מלאי כללי', en: 'General Inventory', ar: 'المخزون العام' },
  pageTitleOrderList: { he: 'פריטים להזמנה', en: 'Order List', ar: 'قائمة الطلبات' },
  pageTitleCalculator: { he: 'מחשבון', en: 'Calculator', ar: 'الحاسبة' },
  pageTitleAllSubProjects: { he: 'כל פרויקטי המשנה', en: 'All Sub-Projects', ar: 'كافة المشاريع الفرعية' },
  pageTitleCalendar: { he: 'לוח שנה ותחזוקה מונעת', en: 'Preventive Calendar', ar: 'تقويم الصيانة الوقائية' },
  pageTitleBuildingSystems: { he: 'מערכות תשתית ובטיחות', en: 'Building Systems & Safety', ar: 'أنظمة البنية التحتية والسلامة' },

  // Project Specific Page Titles
  projectReportsTitle: { he: 'דוחות הבניין', en: 'Building Reports', ar: 'تقارير المبنى' },
  projectFilesTitle: { he: 'קבצי הבניין', en: 'Building Files', ar: 'ملفات المبنى' },
  projectTodosTitle: { he: 'משימות הבניין', en: 'Building Tasks', ar: 'مهام المبنى' },
  projectFormsTitle: { he: 'טפסי הבניין', en: 'Building Forms', ar: 'نماذج المبنى' },
  projectTenantsTitle: { he: 'דיירים', en: 'Tenants', ar: 'السكان' },
  projectWorkersTitle: { he: 'עובדי תחזוקה', en: 'Maintenance Staff', ar: 'عمال الصيانة' },
  projectInventoryTitle: { he: 'מלאי הבניין', en: 'Building Inventory', ar: 'مخزون المبنى' },
  projectNotesTitle: { he: 'הערות ומידע', en: 'Notes & Info', ar: 'الملاحظات والمعلومات' },
  projectElectricalToolsTitle: { he: 'כלי עבודה חשמליים', en: 'Electrical Tools', ar: 'الأدوات الكهربائية' },
  projectSubProjectsTitle: { he: 'פרויקטים', en: 'Projects', ar: 'المشاريع' },
  subProjectDetailTitle: { he: 'פרטי פרויקט', en: 'Project Details', ar: 'تفاصيل المشروع' },
  reportProblemsTitle: { he: 'תקלות בדוח', en: 'Report Issues', ar: 'بلاغات التقرير' },
  reportFormsTitle: { he: 'טפסים בדוח', en: 'Report Forms', ar: 'نماذج التقرير' },
  editProblemTitle: { he: 'עריכת תקלה', en: 'Edit Issue', ar: 'تعديل البلاغ' },
  reportDetailTitle: { he: 'פרטי דוח', en: 'Report Details', ar: 'تفاصيل التقرير' },
  checklistTitle: { he: 'רשימת תקלות לטיפול', en: 'Checklist', ar: 'قائمة معالجة البلاغات' },

  // Building Detail & Cards
  buildingDetail: { he: 'פרטי בניין', en: 'Building Details', ar: 'تفاصيل المبنى' },
  buildings: { he: 'בניינים', en: 'Buildings', ar: 'المباني' },
  reports: { he: 'דוחות', en: 'Reports', ar: 'التقارير' },
  forms: { he: 'טפסים', en: 'Forms', ar: 'النماذج' },
  tenants: { he: 'דיירים', en: 'Tenants', ar: 'السكان' },
  workers: { he: 'עובדי תחזוקה', en: 'Maintenance Workers', ar: 'عمال الصيانة' },
  notes: { he: 'הערות ומידע', en: 'Notes & Info', ar: 'الملاحظات والمعلومات' },
  projects: { he: 'פרויקטים', en: 'Projects', ar: 'المشاريع' },
  files: { he: 'קבצים', en: 'Files', ar: 'الملفات' },
  todos: { he: 'משימות', en: 'Tasks', ar: 'المهام' },
  problems: { he: 'תקלות', en: 'Issues', ar: 'البلاغات' },
  inventory: { he: 'מלאי', en: 'Inventory', ar: 'المخزون' },
  electricalTools: { he: 'בדיקת כלי עבודה חשמליים', en: 'Electrical Tools Inspection', ar: 'فحص الأدوات الكهربائية' },

  // Building Card Action Labels
  addReport: { he: 'הוסף דוח', en: 'Add Report', ar: 'إضافة تقرير' },
  addReportAi: { he: 'הוסף מ-PDF (AI)', en: 'Add from PDF (AI)', ar: 'إضافة من PDF (AI)' },
  addTenantAi: { he: 'הוסף מ-PDF/CSV (AI)', en: 'Add from PDF/CSV (AI)', ar: 'إضافة من PDF/CSV (AI)' },
  addFile: { he: 'הוסף קובץ', en: 'Add File', ar: 'إضافة ملف' },
  addTodo: { he: 'הוסף משימה', en: 'Add Task', ar: 'إضافة مهمة' },

  // Building Systems Card & Page
  buildingSystems: {
    he: 'מערכות ותשתיות',
    en: 'Systems & Infrastructure',
    ar: 'الأنظمة والبنية التحتية'
  },
  buildingSystemsSubtitle: {
    he: 'מעליות, גנרטורים, כיבוי אש, משאבות מים ומיזוג אוויר',
    en: 'Elevators, generators, fire safety, water pumps & HVAC',
    ar: 'المصاعد والمولدات ومكافحة الحرائق ومضخات المياه والتكييف'
  },
  buildingSystemsPageTitle: {
    he: 'מערכות ותשתיות הבניין',
    en: 'Building Systems & Infrastructure',
    ar: 'أنظمة وتجهيزات البنية التحتية للمبنى'
  },
  newSystem: {
    he: 'מערכת חדשה',
    en: 'New System',
    ar: 'نظام جديد'
  },
  addSystemLog: {
    he: 'הוסף מערכת / בדיקה',
    en: 'Add System / Inspection',
    ar: 'إضافة نظام / فحص'
  },
  systemType: {
    he: 'סוג מערכת',
    en: 'System Type',
    ar: 'نوع النظام'
  },
  systemTitle: {
    he: 'שם / תיאור המערכת',
    en: 'System Name / Description',
    ar: 'اسم / وصف النظام'
  },
  lastInspectionDate: {
    he: 'תאריך בדיקה אחרונה',
    en: 'Last Inspection Date',
    ar: 'تاريخ آخر فحص'
  },
  nextInspectionDate: {
    he: 'תאריך בדיקה הבאה',
    en: 'Next Inspection Date',
    ar: 'تاريخ الفحص القادم'
  },
  inspectionFrequencyMonths: {
    he: 'תדירות בדיקה (בחודשים)',
    en: 'Frequency (Months)',
    ar: 'وتيرة الفحص (بالأشهر)'
  },
  serviceProviderVendor: {
    he: 'ספק / חברת שירות',
    en: 'Service Provider / Company',
    ar: 'مزود الخدمة / الشركة'
  },
  technicianName: {
    he: 'שם הטכנאי הבודק',
    en: 'Technician Name',
    ar: 'اسم الفني الفاحص'
  },
  licenseNumber: {
    he: 'מספר רישיון / היתר',
    en: 'License / Certificate #',
    ar: 'رقم الترخيص / الشهادة'
  },
  testResult: {
    he: 'תוצאת בדיקה',
    en: 'Test Result',
    ar: 'نتيجة الفحص'
  },
  testResultPass: {
    he: 'תקין / עבר בהצלחה',
    en: 'Passed / Good Condition',
    ar: 'سليم / اجتاز بنجاح'
  },
  testResultWarning: {
    he: 'ליקויים קלים לתיקון',
    en: 'Minor Deficiencies',
    ar: 'ملاحظات طفيفة تحتاج معالجة'
  },
  testResultFail: {
    he: 'נכשל / סכנה בטיחותית',
    en: 'Failed / Safety Risk',
    ar: 'راسب / خطر على السلامة'
  },
  noSystemsFound: {
    he: 'עדיין לא הוגדרו מערכות ותשתיות לבניין זה.',
    en: 'No systems or infrastructure configured for this building yet.',
    ar: 'لم يتم تكوين أنظمة أو بنية تحتية لهذا المبنى بعد.'
  },
  noSystemsFoundPrompt: {
    he: 'לחץ על "מערכת חדשה" כדי להוסיף מעליות, גנרטור, או מערכות כיבוי.',
    en: 'Click "New System" to add elevators, generator, fire protection, etc.',
    ar: 'انقر على "نظام جديد" لإضافة مصاعد، مولدات، أو أنظمة إطفاء الحرائق.'
  },
  systemsSummaryTotal: {
    he: 'סה״כ מערכות רשומות',
    en: 'Total Registered Systems',
    ar: 'إجمالي الأنظمة المسجلة'
  },
  systemsSummaryDueSoon: {
    he: 'לבדיקה ב-30 יום',
    en: 'Due in 30 Days',
    ar: 'تستحق الفحص خلال 30 يوماً'
  },
  systemsSummaryExpired: {
    he: 'באיחור בדיקה',
    en: 'Overdue Inspections',
    ar: 'متأخرة عن موعد الفحص'
  },

  // System Type Labels
  sysElevator: { he: 'מעלית', en: 'Elevator', ar: 'مصعد' },
  sysElevators: { he: 'מעליות ומעלונים', en: 'Elevators & Lifts', ar: 'المصاعد والرافعات' },
  sysGenerator: { he: 'גנרטור חירום ודלק', en: 'Emergency Generator & Fuel', ar: 'مولد الطوارئ والوقود' },
  sysGenerators: { he: 'גנרטור חירום ומצברים', en: 'Generators & Battery Backup', ar: 'المولدات وبطاريات الطوارئ' },
  sysFireSafety: { he: 'מערכות גילוי וכיבוי אש', en: 'Fire Detection & Suppression', ar: 'أنظمة إنذار وإطفاء الحريق' },
  sysHVAC: { he: 'מיזוג אוויר ו-HVAC', en: 'HVAC & Air Conditioning', ar: 'التكييف والتهوية' },
  sysWaterPumps: { he: 'משאבות מים ומאגרים', en: 'Water Pumps & Tanks', ar: 'مضخات وخزانات المياه' },
  sysElectrical: { he: 'חדר חשמל ומדידה', en: 'Electrical Room & Panels', ar: 'غرفة ولوحات الكهرباء' },
  sysOther: { he: 'תשתית נוספת', en: 'Other Infrastructure', ar: 'بنية تحتية أخرى' },

  // Status Labels
  statusNormal: { he: 'תקין', en: 'Normal', ar: 'سليم' },
  statusNeedsCheck: { he: 'דורש בדיקה', en: 'Needs Inspection', ar: 'يتطلب فحصاً' },
  statusFaulty: { he: 'תקול', en: 'Faulty', ar: 'معطل' },
  statusDisabled: { he: 'מושבת', en: 'Out of Service', ar: 'خارج الخدمة' },

  // Dashboard & List Page Texts
  searchBuildings: { he: 'חפש בניין לפי שם, כתובת, מנהל...', en: 'Search building by name, address, manager...', ar: 'ابحث عن مبنى بالاسم، العنوان، المدير...' },
  newBuilding: { he: 'הוסף בניין', en: 'Add Building', ar: 'إضافة مبنى' },
  noBuildingsFound: { he: 'לא נמצאו מבנים', en: 'No buildings found', ar: 'لم يتم العثور على مبانٍ' },
  totalBuildings: { he: 'סה״כ מבנים', en: 'Total Buildings', ar: 'إجمالي المباني' },
  openProblems: { he: 'תקלות פתוחות', en: 'Open Issues', ar: 'البلاغات المفتوحة' },
  pendingTodos: { he: 'משימות לביצוע', en: 'Pending Tasks', ar: 'المهام المعلقة' },
  systemsDue: { he: 'מערכות לבדיקה', en: 'Systems Due', ar: 'أنظمة تستحق الفحص' },
  buildingsList: { he: 'רשימת בניינים', en: 'Buildings List', ar: 'قائمة المباني' },
  propertiesCount: { he: 'נכסים', en: 'properties', ar: 'عقارات' },
  managePropertiesSubtitle: {
    he: 'ניהול כל הנכסים, פרטי קשר, קומות, מערכות ודיירים.',
    en: 'Manage all properties, contacts, floors, systems and tenants.',
    ar: 'إدارة كافة العقارات، جهات الاتصال، الطوابق، الأنظمة والسكان.'
  },

  // Sort Options
  sortName: { he: 'שם', en: 'Name', ar: 'الاسم' },
  sortCreated: { he: 'תאריך יצירה', en: 'Created Date', ar: 'تاريخ الإنشاء' },
  sortUpdated: { he: 'עודכן לאחרונה', en: 'Last Updated', ar: 'آخر تحديث' },

  // Settings
  languageSelectLabel: {
    he: 'שפת ממשק (Language)',
    en: 'Interface Language',
    ar: 'لغة الواجهة'
  },
  hebrewLang: {
    he: 'עברית (Hebrew - RTL)',
    en: 'Hebrew (עברית - RTL)',
    ar: 'العبرية (עברית - RTL)'
  },
  englishLang: {
    he: 'English (אנגלית - LTR)',
    en: 'English (LTR)',
    ar: 'الإنجليزية (English - LTR)'
  },
  arabicLang: {
    he: 'العربية (Arabic - RTL)',
    en: 'Arabic (العربية - RTL)',
    ar: 'العربية (RTL)'
  },
  languageChangedToast: {
    he: 'שפת הממשק עודכנה בהצלחה',
    en: 'Interface language updated successfully',
    ar: 'تم تحديث لغة الواجهة بنجاح'
  },
  buildingNotFound: {
    he: 'בניין לא נמצא',
    en: 'Building not found',
    ar: 'المبنى غير موجود'
  },
  errorLoadingSystems: {
    he: 'שגיאה בטעינת מערכות המבנה',
    en: 'Error loading building systems',
    ar: 'خطأ في تحميل أنظمة المبنى'
  },

  // Building Page & Cards
  buildingSystemsCard: {
    he: 'מערכות ותשתיות המבנה',
    en: 'Building Systems & Infrastructure',
    ar: 'أنظمة وتجهيزات البنية التחתية'
  },
  enterProperty: {
    he: 'כניסה לנכס',
    en: 'Open Property',
    ar: 'الدخول للعقار'
  },
  floors: {
    he: 'קומות',
    en: 'Floors',
    ar: 'الطوابق'
  },
  units: {
    he: 'דירות/יחידות',
    en: 'Apartments / Units',
    ar: 'شقق / وحدات'
  },
  parking: {
    he: 'חניות',
    en: 'Parking',
    ar: 'مواقف'
  },
  parkingSpots: {
    he: 'חניות',
    en: 'Parking Spots',
    ar: 'مواقف السيارات'
  },
  buildingArea: {
    he: 'שטח (מ"ר)',
    en: 'Area (sq.m)',
    ar: 'المساحة (م²)'
  },
  manager: {
    he: 'מנהל',
    en: 'Manager',
    ar: 'المدير'
  },
  details: {
    he: 'פרטים',
    en: 'Details',
    ar: 'تفاصيل'
  },
  addressNotSet: {
    he: 'כתובת טרם הוגדרה',
    en: 'Address not specified',
    ar: 'لم يتم تحديد العنوان'
  },
  client: {
    he: 'לקוח',
    en: 'Client',
    ar: 'العميل'
  },
  buildingManager: {
    he: 'מנהל בניין',
    en: 'Building Manager',
    ar: 'مدير المبنى'
  },
  phone: {
    he: 'טלפון',
    en: 'Phone',
    ar: 'الهاتف'
  },
  email: {
    he: 'אימייל',
    en: 'Email',
    ar: 'البريد الإلكتروني'
  },
  createdAt: {
    he: 'נוצר ב:',
    en: 'Created:',
    ar: 'تم الإنشاء:'
  },
  updatedAt: {
    he: 'עודכן לאחרונה:',
    en: 'Last Updated:',
    ar: 'آخر تحديث:'
  },
  checklistButton: {
    he: 'רשימת תקלות לטיפול',
    en: 'Issues Checklist',
    ar: 'قائمة معالجة البلاغات'
  },
  exportBackup: {
    he: 'ייצא גיבוי',
    en: 'Export Backup',
    ar: 'تصدير نسخة احتياطية'
  },
  importBackup: {
    he: 'ייבא גיבוי',
    en: 'Import Backup',
    ar: 'استيراد نسخة احتياطية'
  },
  buildingSummary: {
    he: 'סיכום בניין',
    en: 'Building Summary',
    ar: 'ملخص المبنى'
  },
  totalProblems: {
    he: 'סה״כ תקלות',
    en: 'Total Issues',
    ar: 'إجمالي البلاغات'
  },
  openCritical: {
    he: 'תקלות קריטיות פתוחות',
    en: 'Critical Open Issues',
    ar: 'بلاغات حرجة مفتوحة'
  },
  fixedProblems: {
    he: 'תקלות שטופלו',
    en: 'Resolved Issues',
    ar: 'بلاغات معالجة'
  },
  expiredFiles: {
    he: 'קבצים שפג תוקפם',
    en: 'Expired Files',
    ar: 'ملفات منتهية الصلاحية'
  },
  expiredTodos: {
    he: 'משימות שפג תוקפן',
    en: 'Expired Tasks',
    ar: 'مهام متأخرة'
  },
  expiredPermits: {
    he: 'היתרים שפג תוקפם',
    en: 'Expired Permits',
    ar: 'تصاريح منتهية'
  },
  expiredWarranties: {
    he: 'אחריות שפג תוקפה',
    en: 'Expired Warranties',
    ar: 'ضمانات منتهية'
  },
  dueSoonFiles: {
    he: 'קבצים לקראת תפוגה',
    en: 'Files Expiring Soon',
    ar: 'ملفات تنتهي قريباً'
  },
  dueSoonTodos: {
    he: 'משימות לקראת תפוגה',
    en: 'Tasks Due Soon',
    ar: 'مهام تستحق قريباً'
  },
  dueSoonPermits: {
    he: 'היתרים לקראת תפוגה',
    en: 'Permits Due Soon',
    ar: 'تصاريح تنتهي قريباً'
  },
  dueSoonWarranties: {
    he: 'אחריות לקראת תפוגה',
    en: 'Warranties Due Soon',
    ar: 'ضمانات تنتهي قريباً'
  },
  openProblemsBySeverity: {
    he: 'תקלות פתוחות לפי חומרה',
    en: 'Open Issues by Severity',
    ar: 'البلاغات المفتوحة حسب الخطورة'
  },
  problemsGeneralStatus: {
    he: 'סטטוס תקלות כללי',
    en: 'Overall Issues Status',
    ar: 'الحالة العامة للبلاغات'
  },
  noOpenProblems: {
    he: 'אין תקלות פתוחות.',
    en: 'No open issues.',
    ar: 'لا توجد بلاغات مفتوحة.'
  },
  noProblems: {
    he: 'אין תקלות.',
    en: 'No issues.',
    ar: 'لا توجد بلاغات.'
  },
  buildingName: {
    he: 'שם הבניין',
    en: 'Building Name',
    ar: 'اسم المبنى'
  },
  buildingAddress: {
    he: 'כתובת',
    en: 'Address',
    ar: 'العنوان'
  },
  editBuilding: {
    he: 'ערוך פרטי בניין',
    en: 'Edit Building',
    ar: 'تعديل بيانات المبنى'
  },
  addBuildingModalTitle: {
    he: 'הוספת בניין חדש',
    en: 'Add New Building',
    ar: 'إضافة مبنى جديد'
  },
  editBuildingModalTitle: {
    he: 'עריכת פרטי בניין',
    en: 'Edit Building Details',
    ar: 'تعديل بيانات المبنى'
  },
  newReportModalTitle: {
    he: 'הוספת דוח חדש',
    en: 'Add New Report',
    ar: 'إضافة تقرير جديد'
  },
  reportTitle: {
    he: 'כותרת הדוח',
    en: 'Report Title',
    ar: 'عنوان التقرير'
  },
  reportDate: {
    he: 'תאריך הדוח',
    en: 'Report Date',
    ar: 'تاريخ التقرير'
  },
  reportGroup: {
    he: 'קבוצה',
    en: 'Group',
    ar: 'المجموعة'
  },
  description: {
    he: 'תיאור',
    en: 'Description',
    ar: 'الوصف'
  },
  assignedWorkers: {
    he: 'עובדים משויכים',
    en: 'Assigned Workers',
    ar: 'العمال المعينون'
  },
  assignedSuppliers: {
    he: 'ספקים משויכים',
    en: 'Assigned Suppliers',
    ar: 'الموردون المعينون'
  },
  optional: {
    he: 'אופציונלי',
    en: 'Optional',
    ar: 'اختياري'
  },
  loadingBuildingDetails: {
    he: 'טוען פרטי בניין...',
    en: 'Loading building details...',
    ar: 'جاري تحميل تفاصيل المبنى...'
  },
  analyzingAi: {
    he: 'מנתח קובץ בעזרת AI...',
    en: 'Analyzing file with AI...',
    ar: 'جاري تحليل الملف بالذكاء الاصطناعي...'
  },
  analyzingAiDesc: {
    he: 'תהליך זה עשוי לקחת כדקה.',
    en: 'This process may take about a minute.',
    ar: 'قد تستغرق هذه العملية حوالي دقيقة.'
  },
  saveSettings: {
    he: 'שמור הגדרות',
    en: 'Save Settings',
    ar: 'حفظ الإعدادات'
  },
  settingsSaved: {
    he: 'ההגדרות נשמרו בהצלחה',
    en: 'Settings saved successfully',
    ar: 'تم حفظ الإعدادات بنجاح'
  },
  companyInfo: {
    he: 'פרטי חברה ומותג',
    en: 'Company & Branding',
    ar: 'بيانات الشركة والهوية'
  },
  generalPdfSettings: {
    he: 'הגדרות PDF כלליות',
    en: 'General PDF Settings',
    ar: 'إعدادات PDF العامة'
  }
};
