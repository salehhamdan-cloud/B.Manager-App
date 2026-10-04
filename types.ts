


export enum ProblemSeverity {
    LOW = "נמוכה",
    MEDIUM = "בינונית",
    HIGH = "גבוהה",
    CRITICAL = "קריטית"
}
export enum QuotationStatus {
    PENDING = "ממתין",
    APPROVED = "מאושר",
    REJECTED = "נדחה",
    CANCELLED = "בוטל",
    WORK_COMPLETED = "עבודה הסתיימה",
    INVOICE_PAID = "חשבונית שולמה"
}
export enum PdfTemplateStyle {
    MODERN = "מודרני",
    CONSTRUCTION = "בנייה",
    BLUEPRINT = "תכנית בניין",
    PREMIUM = "פרימיום",
    ELEGANT = "אלגנטי",
    VIBRANT = "תוסס"
}
export enum FormItemType {
    YES_NO = "yes-no",
    OK_NOT_OK = "ok-not-ok",
    OK_NOT_OK_NA = "ok-not-ok-na",
    OPTIONS = "options",
    TEXT = "text",
    DATE = "date"
}
export type RecurrenceUnit = 'days' | 'weeks' | 'months' | 'years';
export type DurationUnit = 'days' | 'weeks' | 'months' | 'years';
export interface StoredFile {
    id?: string;
    name: string;
    mimeType: string;
    dataUrl?: string;
    url?: string;
    storagePath?: string;
    uploadedAt?: string;
    originalDataUrl?: string;
    originalUrl?: string;
    originalStoragePath?: string;
}
export interface AnnotatedImage extends StoredFile {
    id: string;
    annotationData?: string;
    caption?: string;
    createdAt: string;
    folder?: string;
}
export type InventoryImage = StoredFile;
export interface Signature {
    dataUrl: string;
    signedAt: string;
    url?: string;
    storagePath?: string;
}
export interface RecurrenceRule {
    unit: RecurrenceUnit;
    interval: number;
    day?: number;
    month?: number;
}
export interface TaskDuration {
    unit: DurationUnit;
    value: number;
}
export type RecurrenceType = 'one-time' | 'recurring';
export interface InventoryOrderItem {
    id: string;
    name: string;
    quantity: number;
    photo?: StoredFile;
}
export interface InventoryItem {
    id: string;
    name: string;
    description: string;
    model: string;
    company: string;
    quantity: number;
    images: AnnotatedImage[];
    createdAt: string;
    warrantyInfo?: string;
    warrantyEndDate?: string;
    manualPdf?: StoredFile;
    checkStatus?: 'תקין' | 'דורש תיקון';
    lastCheckedDate?: string;
}
export interface InventoryItemGroup {
    id: string;
    name: string;
    items: InventoryItem[];
}
export interface InventoryLocation {
    id: string;
    name: string;
    itemGroups: InventoryItemGroup[];
}
export interface FormItem {
    id: string;
    label: string;
    description: string;
    type: FormItemType;
    required: boolean;
    options?: string[];
}
export interface FormGroup {
    id: string;
    name: string;
    items: FormItem[];
}
export interface FormTemplate {
    id: string;
    name: string;
    description: string;
    groups: FormGroup[];
    createdAt: string;
    updatedAt: string;
}
export interface FormAnswer {
    formItemId: string;
    value: string | boolean | null;
    description?: string;
    photos?: AnnotatedImage[];
}
export interface ProjectForm {
    id: string;
    projectId: string;
    reportId: string;
    formTemplateId: string;
    formTemplateName: string;
    answers: FormAnswer[];
    createdAt: string;
    updatedAt: string;
    formDate: string;
    reporterSignature?: Signature;
    managerSignature?: Signature;
    reporterComments?: string;
    managerComments?: string;
}
export interface Tenant {
    id: string;
    name: string;
    phone: string;
    email: string;
    building: string;
    floor: string;
    officeNumber: string;
    officeSpace: string;
    companyId: string;
    buildingId?: string;
    apartmentNumber?: string;
    floorNumber?: string;
    leaseStartDate?: string;
    leaseEndDate?: string;
    rentAmount?: number;
    paymentStatus?: 'שולם' | 'ממתין' | 'באיחור' | 'paid' | 'pending' | 'overdue';
    contactPerson?: string;
    emergencyContact?: string;
    contractFilePath?: string;
    contractFile?: StoredFile;
    signaturePath?: string;
    notes?: string;
}

export type BuildingSystemType = 'elevator' | 'generator' | 'hvac' | 'fire_safety' | 'water_pumps' | 'electrical' | 'other';

export interface BuildingSystemLog {
    id: string;
    buildingId: string;
    systemType: BuildingSystemType;
    title: string;
    lastInspectionDate?: string;
    nextInspectionDate?: string;
    technicianName?: string;
    technicianPhone?: string;
    status: 'תקין' | 'דורש בדיקה' | 'תקול' | 'מושבת';
    notes?: string;
    certificateFile?: StoredFile;
    createdAt?: string;
    updatedAt?: string;
}

export type MaintenanceFrequency = 'weekly' | 'monthly' | 'quarterly' | 'bi-annually' | 'annually' | 'שבועי' | 'חודשי' | 'רבעוני' | 'חצי-שנתי' | 'שנתי';

export interface PreventiveEvent {
    id: string;
    buildingId: string;
    projectName?: string;
    title: string;
    description?: string;
    scheduledDate: string;
    frequency: MaintenanceFrequency;
    isCompleted: boolean;
    completedDate?: string;
    assignedWorker?: string;
    cost?: number;
    category?: string;
    createdAt?: string;
}

export interface Invoice {
    id: string;
    buildingId: string;
    projectName?: string;
    supplierId?: string;
    supplierName?: string;
    invoiceNumber: string;
    amount: number;
    date: string;
    dueDate?: string;
    status: 'משולם' | 'ממתין' | 'באיחור' | 'paid' | 'pending' | 'overdue';
    filePath?: string;
    pdfFile?: StoredFile;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface Supplier {
    id: string;
    group: string;
    name: string;
    phone: string;
    email: string;
    address?: string;
    companyId: string;
    createdAt: string;
    updatedAt: string;
}
export interface PermitFile extends StoredFile {
    validUntil?: string;
}
export interface License {
    id: string;
    name: string;
    file?: PermitFile;
}
export interface Contractor {
    id: string;
    name: string;
    phone: string;
    email: string;
}
export interface Checker {
    name: string;
    phone: string;
    email: string;
}
export interface Worker {
    id: string;
    name: string;
    idNumber: string;
    workerNumber: string;
    phone: string;
    email: string;
    address: string;
    specialty?: string;
    hourlyRate?: number;
    insuranceExpiryDate?: string;
    notes?: string;
    photo?: StoredFile;
    safetyPermit?: PermitFile;
    workAtHeightPermit?: PermitFile;
    licenses: License[];
}
export interface HistoricalFile {
    id: string;
    name: string;
    mimeType: string;
    uploadedAt: string;
    dueDate?: string;
    url?: string;
    storagePath?: string;
}
export interface ProjectFile extends AnnotatedImage {
    group?: string;
    startDate?: string;
    dueDate?: string;
    recurrenceType?: RecurrenceType;
    recurrence?: RecurrenceRule;
    duration?: TaskDuration;
    history?: HistoricalFile[];
}
export interface ProjectTodo {
    id: string;
    description: string;
    isCompleted: boolean;
    createdAt: string;
    group?: string;
    startDate?: string;
    dueDate?: string;
    recurrenceType?: RecurrenceType;
    recurrence?: RecurrenceRule;
    duration?: TaskDuration;
    projectId?: string;
}
export interface ProjectNote {
    id: string;
    content: string;
    author: string;
    createdAt: string;
}
export interface SubProject {
    id: string;
    name: string;
    description: string;
    status: string;
    workStartDate?: string;
    workEndDate?: string;
    coverPhoto?: AnnotatedImage;
    photos: AnnotatedImage[];
    files: ProjectFile[];
    rejects: ProjectTodo[];
    contractors: Contractor[];
    checker: Checker;
    photoFolder?: string;
    budget?: number;
}
export interface ProjectImage extends StoredFile {
    id: string;
}
export interface Project {
    id: string;
    name: string;
    address: string;
    clientInfo: string;
    status: string;
    managerName?: string;
    managerPhone?: string;
    managerEmail?: string;
    images: ProjectImage[];
    files: ProjectFile[];
    todos: ProjectTodo[];
    inventory: InventoryLocation[];
    tenants?: Tenant[];
    workers?: Worker[];
    subProjects?: SubProject[];
    notes?: ProjectNote[];
    systemLogs?: BuildingSystemLog[];
    createdAt: string;
    updatedAt: string;
    numberOfFloors?: number;
    buildingArea?: number;
    parkingSpots?: number;
    apartmentsCount?: number;
}
export interface Problem {
    id: string;
    reportId: string;
    description: string;
    severity: ProblemSeverity;
    notes: string;
    images: AnnotatedImage[];
    locationTag?: string;
    createdAt: string;
    updatedAt: string;
    order: number;
    isFixed?: boolean;
    workerIds?: string[];
    supplierIds?: string[];
    tenantIds?: string[];
}
export interface Report {
    id: string;
    projectId: string;
    title: string;
    date: string;
    description: string;
    group?: string;
    files: ProjectFile[];
    createdAt: string;
    updatedAt: string;
    workerIds?: string[];
    supplierIds?: string[];
    tenantIds?: string[];
}
export interface AppThemeSettings {
    headerColor: string;
    headerTextColor: string;
    accentColor: string;
    groupHeaderBackgroundColor: string;
    groupHeaderTextColor: string;
}
export interface PdfThemeSettings {
    headerColor: string;
    headerTextColor: string;
    textColor: string;
    borderColor: string;
    accentColor: string;
    problemPhotoHeaderTextColor: string;
    formGroupHeaderColor: string;
    formPhotoHeaderColor: string;
    formPhotoHeaderTextColor: string;
    formTitleHeaderColor: string;
    formTitleTextColor: string;
    groupHeaderBackgroundColor: string;
    groupHeaderTextColor: string;
}
export interface AppSettings {
    id: string;
    companyInfo: {
        name: string;
        logo?: string;
        url?: string;
        storagePath?: string;
    };
    authorName: string;
    authorPhone: string;
    authorEmail: string;
    pdfTemplate: PdfTemplateStyle;
    appTheme: AppThemeSettings;
    pdfTheme: PdfThemeSettings;
    fontSizeSmall: number;
    fontSizeMedium: number;
    fontSizeLarge: number;
    logoSize: number;
    logoPosition: 'top-left' | 'top-right' | 'top-center';
    projectImageSize: number;
    projectImagePosition: 'below-header' | 'top-left' | 'top-right';
    problemImageSize: number;
    formImageSize: number;
    customFontUrl?: string;
    customFontStoragePath?: string;
    customFontName?: string;
    notificationDays: number;
    pdfOrientation: 'portrait' | 'landscape';
    pdfIncludeDashboard: boolean;
    pdfIncludeProblemPhotos: boolean;
    pdfDateRangeStart?: string;
    pdfDateRangeEnd?: string;
    enableEmailNotifications: boolean;
    notificationEmailAddress: string;
    notifyOnCriticalIssues: boolean;
    notifyOnFileDueSoon: boolean;
    notifyOnFileExpired: boolean;
    notifyOnTodoDueSoon: boolean;
    notifyOnTodoExpired: boolean;
    notifyOnPermitDueSoon: boolean;
    notifyOnPermitExpired: boolean;
    notifyOnWarrantyDueSoon: boolean;
    notifyOnWarrantyExpired: boolean;
    notifyOnNewReport: boolean;
    notifyOnTaskCompletion: boolean;
    notifyOnQuotationStatusChange: boolean;
    notifyOnProjectAdd: boolean;
    notifyOnProjectDelete: boolean;
    notifyOnReportDelete: boolean;
    notifyOnProblemAdd: boolean;
    notifyOnProblemDelete: boolean;
    notifyOnProblemMarkAsFixed: boolean;
    notifyOnFileAdd: boolean;
    notifyOnFileDelete: boolean;
    notifyOnTodoAdd: boolean;
    notifyOnTodoDelete: boolean;
    notifyOnTenantAdd: boolean;
    notifyOnTenantDelete: boolean;
    notifyOnSupplierAdd: boolean;
    notifyOnSupplierDelete: boolean;
    notifyOnQuotationAdd: boolean;
    notifyOnQuotationDelete: boolean;
    inventoryOrderList: InventoryOrderItem[];
    // Mobile branding and localization attributes
    taxId?: string;
    currencySymbol?: string;
    phone?: string;
    email?: string;
    address?: string;
    language?: 'he' | 'en' | 'ar';
    themeMode?: 'system' | 'light' | 'dark';
    colorPalette?: 'default' | 'emerald' | 'indigo' | 'sunset' | 'slate' | 'warm-forest';
}
export interface Quotation {
    id: string;
    projectId: string;
    projectName: string;
    subProjectId?: string;
    subProjectName?: string;
    date: string;
    supplierName: string;
    quotationNumber: string;
    quotationName: string;
    group: string;
    price: number;
    pdfFile: StoredFile;
    invoicePdfFile?: StoredFile;
    invoiceNumber?: string;
    status: QuotationStatus;
    createdAt: string;
    updatedAt: string;
}
export type NotificationItemType = 'building' | 'report' | 'problem' | 'form' | 'formTemplate' | 'file' | 'todo' | 'tenant' | 'worker' | 'supplier' | 'quotation' | 'system' | 'inventory' | 'sub-project';
export type NotificationAction = 'create' | 'update' | 'delete' | 'complete' | 'info';
export interface Notification {
    id: string;
    itemType: NotificationItemType;
    action: NotificationAction;
    itemId: string;
    itemName: string;
    projectId?: string;
    projectName?: string;
    message: string;
    createdAt: string;
    isRead: boolean;
}
export interface ReportWithContext extends Report {
    projectName: string;
}
export interface FormWithContext extends ProjectForm {
    projectName: string;
    reportGroup?: string;
}
export interface FileWithContext extends ProjectFile {
    projectId: string;
    projectName: string;
}
export interface TodoWithContext extends ProjectTodo {
    projectId: string;
    projectName: string;
}
export interface ProblemWithContext extends Problem {
    reportTitle: string;
    reportDate: string;
    projectId: string;
    projectName: string;
}
export interface TenantWithContext extends Tenant {
    projectId: string;
    projectName: string;
}
export interface WorkerWithContext extends Worker {
    projectId: string;
    projectName: string;
}
export interface SubProjectWithContext extends SubProject {
    projectId: string;
    projectName: string;
}
export interface InventoryItemWithContext extends InventoryItem {
    buildingId: string;
    buildingName: string;
    locationId: string;
    locationName: string;
    groupId: string;
    groupName: string;
}
export interface UpcomingTask {
    id: string;
    name: string;
    dueDate: string;
    type: 'file' | 'todo';
    projectId: string;
    projectName: string;
}
export interface UpcomingPermit {
    id: string;
    workerName: string;
    permitName: string;
    validUntil: string;
    projectId: string;
    projectName: string;
}
export interface UpcomingWarranty {
    id: string;
    itemName: string;
    warrantyEndDate: string;
    projectId: string;
    projectName: string;
    locationName: string;
    groupName: string;
}
export interface SearchResult {
    type: 'project' | 'report' | 'problem' | 'file' | 'todo' | 'tenant' | 'worker' | 'supplier';
    id: string;
    title: string;
    context: string;
    link: string;
}
export interface GlobalDashboardStats {
    totalProjects: number;
    activeProjects: number;
    openCriticalIssues: number;
    totalOpenIssues: number;
    expiredFiles: number;
    expiredTodos: number;
    dueSoonFiles: number;
    dueSoonTodos: number;
    statusCounts: Record<string, number>;
    criticalIssuesByProject: Record<string, number>;
    upcomingTasks: UpcomingTask[];
    dueSoonFilesList: UpcomingTask[];
    expiredFilesList: UpcomingTask[];
    dueSoonTodosList: UpcomingTask[];
    expiredTodosList: UpcomingTask[];
    dueSoonPermits: number;
    expiredPermits: number;
    dueSoonWarranties: number;
    expiredWarranties: number;
    dueSoonPermitsList: UpcomingPermit[];
    expiredPermitsList: UpcomingPermit[];
    dueSoonWarrantiesList: UpcomingWarranty[];
    expiredWarrantiesList: UpcomingWarranty[];
    // Mobile Smart Reminder Engine & Financial Metrics (MD Section 3.1)
    totalTenants: number;
    activeTenants: number;
    expiringLeasesCount: number;
    expiredLeasesCount: number;
    expiringLeasesList: { id: string; name: string; apartment?: string; buildingName: string; leaseEndDate: string; projectId: string; phone?: string; }[];
    expiredLeasesList: { id: string; name: string; apartment?: string; buildingName: string; leaseEndDate: string; projectId: string; phone?: string; }[];
    lowInventoryCount: number;
    lowInventoryList: { id: string; name: string; quantity: number; location: string; buildingName: string; }[];
    dueBuildingSystemsCount: number;
    dueBuildingSystemsList: { id: string; title: string; systemType: string; nextInspectionDate?: string; buildingId: string; buildingName: string; }[];
    overdueInvoicesCount: number;
    overdueInvoicesList: { id: string; invoiceNumber: string; amount: number; supplierName?: string; dueDate?: string; buildingId: string; }[];
    totalExpenses: number;
    unpaidExpenses: number;
}
export interface QuotationDashboardStats {
    totalCostAll: number;
    costByYear: Record<string, number>;
    costByGroup: Record<string, number>;
    costByBuilding: Record<string, number>;
}
export interface ProjectBackup {
    project: Project;
    reports: Report[];
    problems: Problem[];
    forms: ProjectForm[];
}
export interface FullAppBackup {
    projects: Project[];
    reports: Report[];
    problems: Problem[];
    forms: ProjectForm[];
    formTemplates: FormTemplate[];
    settings: AppSettings;
    suppliers: Supplier[];
    quotations: Quotation[];
    preventiveEvents?: PreventiveEvent[];
    buildingSystemLogs?: BuildingSystemLog[];
    invoices?: Invoice[];
    backupDate: string;
    version: number;
    // Android Room mobile backup compatibility metadata
    source?: 'web' | 'mobile_room_v40' | 'universal_sync';
    buildings?: any[];
    tenants?: any[];
    issues?: any[];
    todoItems?: any[];
    workers?: any[];
    inventoryItems?: any[];
    documentFiles?: any[];
    filledForms?: any[];
    appSettings?: any;
}
export interface CloudFile {
    id: string;
    name: string;
    modifiedTime: string;
}
export interface ReportPdfGenerationOptions {
    settings: AppSettings;
    project: Project;
    report: Report;
    problems: Problem[];
    allSuppliers: Supplier[];
    reportDashboardImageUrl?: string;
    globalDashboard?: {
        stats: GlobalDashboardStats;
        statusChartImage: string;
        issuesChartImage: string;
    };
}
export interface FormPdfGenerationOptions {
    settings: AppSettings;
    project: Project;
    formWithTemplate: ProjectFormWithTemplate;
}
export interface ChecklistPdfGenerationOptions {
    settings: AppSettings;
    project?: Project;
    problems: ProblemWithContext[];
    pendingProblems?: ProblemWithContext[];
    fixedProblems?: ProblemWithContext[];
    expiredFiles?: FileWithContext[];
}
export interface InventoryPdfOptions {
    settings: AppSettings;
    projects: Project[];
}
export interface NotesPdfGenerationOptions {
    settings: AppSettings;
    project: Project;
    notes: ProjectNote[];
}
export interface ElectricalToolsPdfOptions {
    settings: AppSettings;
    project: Project;
    items: InventoryItem[];
}
export interface OrderListPdfOptions {
    settings: AppSettings;
    items: InventoryOrderItem[];
}
export interface AllSubProjectsPdfOptions {
    settings: AppSettings;
    subProjects: SubProjectWithContext[];
}
export interface SubProjectDetailPdfOptions {
    settings: AppSettings;
    project: Project;
    subProject: SubProject;
    quotations: Quotation[];
}
export interface ProjectFormWithTemplate {
    form: ProjectForm;
    template: FormTemplate;
}
export interface DocumentPage {
    id: string;
    originalDataUrl: string;
    editedDataUrl: string;
    annotationData: string;
}
export type Tool = 'select' | 'pencil' | 'rectangle' | 'circle' | 'arrow' | 'text';
export interface Shape {
    id: string;
    [key: string]: any;
}