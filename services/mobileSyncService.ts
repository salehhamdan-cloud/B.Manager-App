import { 
    Project, Report, Problem, FormTemplate, ProjectForm, FullAppBackup,
    Supplier, Quotation, Tenant, Worker, ProjectTodo, ProjectFile,
    PreventiveEvent, BuildingSystemLog, Invoice, AppSettings, ProblemSeverity, QuotationStatus
} from '../types';
import { generateId } from '../utils/idGenerator';
import { DEFAULT_SETTINGS, SETTINGS_ID, BACKUP_SCHEMA_VERSION } from '../constants';

/**
 * Mobile App (Android Room Schema v40) <--> Web App Synchronization Service
 * Supports bidirectional translation of all entities from Building Manager Android Room Database.
 */

export interface MobileRoomBackup {
    version?: number;
    schemaVersion?: number;
    backupDate?: string;
    buildings?: any[];
    tenants?: any[];
    issues?: any[];
    projects?: any[];
    todoItems?: any[];
    preventiveEvents?: any[];
    workers?: any[];
    suppliers?: any[];
    inventoryItems?: any[];
    documentFiles?: any[];
    invoices?: any[];
    formTemplates?: any[];
    filledForms?: any[];
    buildingSystemLogs?: any[];
    appSettings?: any;
    // Alternative casing or table naming from Room JSON exports
    Building?: any[];
    Tenant?: any[];
    Issue?: any[];
    Project?: any[];
    TodoItem?: any[];
    PreventiveEvent?: any[];
    Worker?: any[];
    Supplier?: any[];
    InventoryItem?: any[];
    DocumentFile?: any[];
    Invoice?: any[];
    FormTemplate?: any[];
    FilledForm?: any[];
    BuildingSystemLog?: any[];
    AppSettings?: any;
}

/**
 * Checks if raw data is from the Android Mobile Room Backup.
 */
export const isMobileBackup = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    
    // If it has web 'projects' and not mobile 'buildings', it is a WEB backup, NOT a mobile backup!
    if (Array.isArray(data.projects) && !Array.isArray(data.buildings) && !Array.isArray(data.Building)) {
        return false;
    }

    // A mobile Room backup must contain 'buildings' or 'Building' or 'issues' or 'Issue' or any mobile entity
    const mobileKeys = [
        'buildings', 'Building', 'building', 'properties', 'property',
        'issues', 'Issue', 'faults', 'problems', 'defects',
        'tenants', 'Tenant', 'residents',
        'todoItems', 'TodoItem', 'todos', 'tasks',
        'documentFiles', 'documents', 'files',
        'inventoryItems', 'inventory', 'items',
        'invoices', 'bills', 'expenses',
        'preventiveEvents', 'maintenance',
        'buildingSystemLogs', 'systems'
    ];
    return mobileKeys.some(key => Array.isArray(data[key]));
};

/**
 * Universal helper to find an array of table rows from a container object,
 * testing exact keys, case-insensitive keys, and common Room/SQLite naming variations.
 */
export const findEntityList = <T = any>(obj: any, ...candidateKeys: string[]): T[] => {
    if (!obj || typeof obj !== 'object') return [];

    // 1. Exact match on candidateKeys
    for (const key of candidateKeys) {
        if (Array.isArray(obj[key]) && obj[key].length > 0) return obj[key];
    }

    // 2. Case-insensitive and normalized match
    const objKeys = Object.keys(obj);
    for (const cand of candidateKeys) {
        const candNorm = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const k of objKeys) {
            const kNorm = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            // Clean table prefixes and suffixes like tbl_, _table, _entity
            const kClean = kNorm.replace(/^(tbl|table)/, '').replace(/(table|entity|list|tbl|items)$/, '');
            const candClean = candNorm.replace(/^(tbl|table)/, '').replace(/(table|entity|list|tbl|items)$/, '');
            
            if (
                kNorm === candNorm ||
                (kClean && candClean && (
                    kClean === candClean ||
                    kClean === candClean + 's' ||
                    candClean === kClean + 's'
                ))
            ) {
                if (Array.isArray(obj[k]) && obj[k].length > 0) return obj[k];
            }
        }
    }

    // 3. Fallback: return first empty array if found
    for (const key of candidateKeys) {
        if (Array.isArray(obj[key])) return obj[key];
    }

    return [];
};

/**
 * Universal safe row value extractor.
 * Checks original key, lowercased key, camelCase, snake_case, etc.
 */
export const getRowVal = (row: any, ...keys: string[]): any => {
    if (!row || typeof row !== 'object') return undefined;
    for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
        const lowerK = k.toLowerCase();
        if (row[lowerK] !== undefined && row[lowerK] !== null && row[lowerK] !== '') return row[lowerK];
        const camelK = k.replace(/_([a-z0-9])/gi, (_, g) => g.toUpperCase());
        if (row[camelK] !== undefined && row[camelK] !== null && row[camelK] !== '') return row[camelK];
        const snakeK = k.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (row[snakeK] !== undefined && row[snakeK] !== null && row[snakeK] !== '') return row[snakeK];
    }
    return undefined;
};

/**
 * Extracts a buildingId from any row record, checking various column naming conventions.
 */
export const getRowBuildingId = (row: any): string | undefined => {
    const val = getRowVal(row, 'buildingId', 'building_id', 'building', 'projectId', 'project_id', 'propertyId', 'property_id');
    return val !== undefined && val !== null ? String(val).trim() : undefined;
};

/**
 * Determines whether a child row belongs to a specific building.
 */
export const belongsToBuilding = (row: any, buildingId: string, buildingName?: string, totalBuildings = 1): boolean => {
    const rowBId = getRowBuildingId(row);
    if (rowBId && (String(rowBId) === String(buildingId) || String(rowBId) === `b-${buildingId}`)) return true;

    const rowBName = getRowVal(row, 'buildingName', 'building_name', 'building');
    if (buildingName && rowBName && String(rowBName).trim().toLowerCase() === String(buildingName).trim().toLowerCase()) {
        return true;
    }

    // If there is only 1 building in the app, all child items belong to it
    if (totalBuildings === 1) return true;

    return false;
};

/**
 * Derives MIME type from a file name extension.
 */
export const getMimeTypeFromFilename = (filename: string): string => {
    if (!filename) return 'application/octet-stream';
    const ext = filename.toLowerCase().split('.').pop() || '';
    switch (ext) {
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'png':
            return 'image/png';
        case 'webp':
            return 'image/webp';
        case 'gif':
            return 'image/gif';
        case 'svg':
            return 'image/svg+xml';
        case 'pdf':
            return 'application/pdf';
        case 'csv':
            return 'text/csv';
        case 'json':
            return 'application/json';
        case 'txt':
            return 'text/plain';
        case 'doc':
            return 'application/msword';
        case 'docx':
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case 'xls':
            return 'application/vnd.ms-excel';
        case 'xlsx':
            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        case 'dwg':
            return 'application/acad';
        default:
            return 'application/octet-stream';
    }
};

/**
 * Intelligently determines or preserves the folder category for building documents,
 * preventing them from being dumped into a generic "all/קבצים מצורפים" category.
 */
export const getFolderCategoryForDocument = (doc: any, filePath?: string): string => {
    // 1. Explicit folder or category from mobile database
    const explicit = getRowVal(doc, 'category', 'group', 'folder', 'folderName', 'folder_name', 'section', 'categoryName', 'category_name', 'docType', 'doc_type', 'type');
    if (explicit && typeof explicit === 'string') {
        const trimmed = explicit.trim();
        const lower = trimmed.toLowerCase();
        if (trimmed && !['כללי', 'general', 'default', 'files', 'file', 'קבצים', 'קבצים מצורפים', 'מסמכי ארכיון', 'other'].includes(lower)) {
            return trimmed;
        }
    }

    // 2. Subfolder from zip file path (e.g. files/חוזים והסכמים/lease.pdf -> "חוזים והסכמים")
    const pathStr = String(filePath || getRowVal(doc, 'filePath', 'file_path', 'path', 'url') || '');
    if (pathStr && !pathStr.startsWith('data:')) {
        const parts = pathStr.split('/').filter(Boolean);
        if (parts.length >= 3 && (parts[0] === 'files' || parts[0] === 'documents')) {
            const folderPart = parts[1].trim();
            const lowerFolder = folderPart.toLowerCase();
            if (!['images', 'photos', 'temp', 'cache', 'all', 'files', 'documents'].includes(lowerFolder)) {
                return folderPart;
            }
        }
    }

    // 3. Smart Hebrew classification based on file name or title
    const name = String(getRowVal(doc, 'name', 'title', 'fileName', 'file_name', 'docName', 'doc_name') || pathStr.split('/').pop() || '').toLowerCase();
    
    if (name.includes('ביטוח') || name.includes('insurance') || name.includes('פוליס') || name.includes('policy')) {
        return 'ביטוחים';
    }
    if (name.includes('חוזה') || name.includes('הסכם') || name.includes('שכירות') || name.includes('contract') || name.includes('agreement') || name.includes('lease')) {
        return 'חוזים והסכמים';
    }
    if (name.includes('תוכני') || name.includes('תכני') || name.includes('היתר') || name.includes('שרטוט') || name.includes('גרמושק') || name.includes('plan') || name.includes('blueprint') || name.includes('permit')) {
        return 'תוכניות והיתרים';
    }
    if (name.includes('אישור') || name.includes('טופס 4') || name.includes('כיבוי') || name.includes('בטיחות') || name.includes('תקן') || name.includes('approval') || name.includes('license') || name.includes('cert')) {
        return 'אישורים ותקנים';
    }
    if (name.includes('דוח') || name.includes('דו"ח') || name.includes('בדק') || name.includes('מהנדס') || name.includes('report') || name.includes('audit')) {
        return 'דוחות ובדיקות';
    }
    if (name.includes('פרוטוקול') || name.includes('אסיפ') || name.includes('protocol') || name.includes('meeting')) {
        return 'פרוטוקולים ואסיפות';
    }
    if (name.includes('תחזוק') || name.includes('מעלית') || name.includes('משאב') || name.includes('גנרטור') || name.includes('מערכת') || name.includes('maintenance')) {
        return 'תחזוקה ומערכות';
    }
    if (name.includes('מכתב') || name.includes('התכתב') || name.includes('הודע') || name.includes('letter') || name.includes('notice')) {
        return 'התכתבויות ומכתבים';
    }

    if (explicit && typeof explicit === 'string' && explicit.trim()) {
        return explicit.trim();
    }

    return 'מסמכים כלליים';
};

/**
 * Checks if a document or file attachment belongs to a specific entity
 * (Tenants, Issues/Problems, Invoices, Workers, System Logs, Reports, Forms, Inventory)
 * so it won't be dumped into the building files section!
 */
export const isEntitySpecificFile = (doc: any, filePath?: string): { isSpecific: boolean; targetSection?: string; targetId?: string } => {
    if (!doc || typeof doc !== 'object') return { isSpecific: false };

    const targetType = String(
        getRowVal(doc, 'targetType', 'target_type', 'entityType', 'entity_type', 'module', 'section', 'table', 'tableName', 'table_name') || ''
    ).toLowerCase();

    const tenantId = String(getRowVal(doc, 'tenantId', 'tenant_id') || '');
    const issueId = String(getRowVal(doc, 'issueId', 'issue_id', 'problemId', 'problem_id', 'defectId', 'defect_id') || '');
    const invoiceId = String(getRowVal(doc, 'invoiceId', 'invoice_id', 'receiptId', 'receipt_id') || '');
    const workerId = String(getRowVal(doc, 'workerId', 'worker_id', 'contractorId', 'contractor_id') || '');
    const reportId = String(getRowVal(doc, 'reportId', 'report_id') || '');
    const systemId = String(getRowVal(doc, 'systemId', 'system_id', 'systemLogId', 'system_log_id') || '');
    const formId = String(getRowVal(doc, 'formId', 'form_id', 'filledFormId', 'filled_form_id') || '');
    const inventoryId = String(getRowVal(doc, 'inventoryId', 'inventory_id', 'itemId', 'item_id') || '');
    const targetId = String(getRowVal(doc, 'targetId', 'target_id', 'entityId', 'entity_id') || '');

    if (tenantId || ['tenant', 'tenants', 'resident', 'residents', 'דייר', 'דיירים'].includes(targetType)) {
        return { isSpecific: true, targetSection: 'tenants', targetId: tenantId || targetId };
    }
    if (issueId || ['issue', 'issues', 'problem', 'problems', 'fault', 'faults', 'defect', 'defects', 'תקלה', 'תקלות'].includes(targetType)) {
        return { isSpecific: true, targetSection: 'issues', targetId: issueId || targetId };
    }
    if (invoiceId || ['invoice', 'invoices', 'receipt', 'receipts', 'bill', 'bills', 'expense', 'expenses', 'חשבונית', 'חשבוניות'].includes(targetType)) {
        return { isSpecific: true, targetSection: 'invoices', targetId: invoiceId || targetId };
    }
    if (workerId || ['worker', 'workers', 'contractor', 'contractors', 'technician', 'technicians', 'עובד', 'עובדים'].includes(targetType)) {
        return { isSpecific: true, targetSection: 'workers', targetId: workerId || targetId };
    }
    if (reportId || ['report', 'reports', 'דוח', 'דוחות'].includes(targetType)) {
        return { isSpecific: true, targetSection: 'reports', targetId: reportId || targetId };
    }
    if (systemId || ['system', 'systems', 'system_log', 'system_logs', 'מערכת', 'מערכות'].includes(targetType)) {
        return { isSpecific: true, targetSection: 'systems', targetId: systemId || targetId };
    }
    if (formId || ['form', 'forms', 'inspection', 'inspections', 'טופס', 'טפסים'].includes(targetType)) {
        return { isSpecific: true, targetSection: 'forms', targetId: formId || targetId };
    }
    if (inventoryId || ['inventory', 'inventory_item', 'inventory_items', 'stock', 'מלאי'].includes(targetType)) {
        return { isSpecific: true, targetSection: 'inventory', targetId: inventoryId || targetId };
    }

    // Check path directory or file name
    const pathStr = String(filePath || getRowVal(doc, 'filePath', 'file_path', 'path', 'url') || '').toLowerCase();
    if (pathStr.includes('/issues/') || pathStr.includes('/faults/') || pathStr.includes('/problems/') || pathStr.includes('issue_') || pathStr.includes('fault_') || pathStr.includes('problem_')) {
        return { isSpecific: true, targetSection: 'issues' };
    }
    if (pathStr.includes('/tenants/') || pathStr.includes('/residents/') || pathStr.includes('tenant_') || pathStr.includes('sig_tenant')) {
        return { isSpecific: true, targetSection: 'tenants' };
    }
    if (pathStr.includes('/invoices/') || pathStr.includes('/receipts/') || pathStr.includes('/bills/') || pathStr.includes('invoice_') || pathStr.includes('receipt_')) {
        return { isSpecific: true, targetSection: 'invoices' };
    }
    if (pathStr.includes('/workers/') || pathStr.includes('/technicians/') || pathStr.includes('worker_') || pathStr.includes('license_')) {
        return { isSpecific: true, targetSection: 'workers' };
    }
    if (pathStr.includes('/systems/') || pathStr.includes('system_log_') || pathStr.includes('sys_log_')) {
        return { isSpecific: true, targetSection: 'systems' };
    }
    if (pathStr.includes('/forms/') || pathStr.includes('/inspections/') || pathStr.includes('form_') || pathStr.includes('inspection_')) {
        return { isSpecific: true, targetSection: 'forms' };
    }
    if (pathStr.includes('/inventory/') || pathStr.includes('inventory_') || pathStr.includes('item_photo_')) {
        return { isSpecific: true, targetSection: 'inventory' };
    }

    return { isSpecific: false };
};

/**
 * Normalizes priority from mobile string to ProblemSeverity
 */
const mapPriority = (priority?: string): ProblemSeverity => {
    const p = (priority || '').toLowerCase();
    if (p.includes('critical') || p.includes('קריטית') || p.includes('urgent') || p.includes('high') || p.includes('גבוהה')) return ProblemSeverity.HIGH;
    if (p.includes('medium') || p.includes('בינונית')) return ProblemSeverity.MEDIUM;
    return ProblemSeverity.LOW;
};

/**
 * Parses mobile Room database backup into the web application's structure.
 */
export const parseMobileBackup = (raw: any): FullAppBackup => {
    // If raw already has webData with projects, return webData immediately!
    if (raw && raw.webData && Array.isArray(raw.webData.projects) && raw.webData.projects.length > 0) {
        return {
            ...raw.webData,
            backupDate: raw.backupDate || new Date().toISOString(),
            version: BACKUP_SCHEMA_VERSION,
        };
    }

    // If raw has 'rawProjects' from universal backup:
    if (raw && Array.isArray(raw.rawProjects) && raw.rawProjects.length > 0) {
        return {
            projects: raw.rawProjects,
            reports: Array.isArray(raw.reports) ? raw.reports : [],
            problems: Array.isArray(raw.problems) ? raw.problems : [],
            forms: Array.isArray(raw.forms) ? raw.forms : [],
            formTemplates: Array.isArray(raw.formTemplates) ? raw.formTemplates : [],
            settings: raw.settings || DEFAULT_SETTINGS,
            suppliers: Array.isArray(raw.suppliers) ? raw.suppliers : [],
            quotations: Array.isArray(raw.quotations) ? raw.quotations : [],
            preventiveEvents: Array.isArray(raw.preventiveEvents) ? raw.preventiveEvents : [],
            buildingSystemLogs: Array.isArray(raw.buildingSystemLogs) ? raw.buildingSystemLogs : [],
            invoices: Array.isArray(raw.invoices) ? raw.invoices : [],
            backupDate: raw.backupDate || new Date().toISOString(),
            version: BACKUP_SCHEMA_VERSION,
        };
    }

    // If raw is already a full web backup with projects (and no mobile buildings array):
    if (raw && Array.isArray(raw.projects) && raw.projects.length > 0 && !Array.isArray(raw.buildings) && !Array.isArray(raw.Building)) {
        return {
            projects: raw.projects,
            reports: Array.isArray(raw.reports) ? raw.reports : [],
            problems: Array.isArray(raw.problems) ? raw.problems : [],
            forms: Array.isArray(raw.forms) ? raw.forms : [],
            formTemplates: Array.isArray(raw.formTemplates) ? raw.formTemplates : [],
            settings: raw.settings || DEFAULT_SETTINGS,
            suppliers: Array.isArray(raw.suppliers) ? raw.suppliers : [],
            quotations: Array.isArray(raw.quotations) ? raw.quotations : [],
            preventiveEvents: Array.isArray(raw.preventiveEvents) ? raw.preventiveEvents : [],
            buildingSystemLogs: Array.isArray(raw.buildingSystemLogs) ? raw.buildingSystemLogs : [],
            invoices: Array.isArray(raw.invoices) ? raw.invoices : [],
            backupDate: raw.backupDate || new Date().toISOString(),
            version: BACKUP_SCHEMA_VERSION,
        };
    }

    const rawBuildings = findEntityList(raw, 'buildings', 'Building', 'building', 'properties', 'property', 'tbl_buildings', 'BuildingEntity');
    const rawTenants = findEntityList(raw, 'tenants', 'Tenant', 'tenant', 'residents', 'resident', 'occupants', 'renters', 'tbl_tenants', 'TenantEntity');
    const rawIssues = findEntityList(raw, 'issues', 'Issue', 'issue', 'problems', 'problem', 'faults', 'fault', 'defects', 'defect', 'tasks', 'task', 'tickets', 'ticket', 'reports', 'tbl_issues', 'IssueEntity');
    const rawProjects = findEntityList(raw, 'projects', 'Project', 'project', 'subProjects', 'sub_projects', 'subprojects', 'SubProject', 'SubProjects');
    const rawTodoItems = findEntityList(raw, 'todoItems', 'TodoItem', 'todo_items', 'todoitems', 'todos', 'todo', 'tasks', 'task', 'checklists', 'checklist', 'tbl_todo_items');
    const rawPreventive = findEntityList(raw, 'preventiveEvents', 'PreventiveEvent', 'preventive_events', 'preventiveevents', 'preventive', 'maintenance', 'maintenances', 'periodic_maintenance', 'tbl_preventive_events');
    const rawWorkers = findEntityList(raw, 'workers', 'Worker', 'worker', 'contractors', 'contractor', 'technicians', 'technician', 'professionals', 'employees', 'tbl_workers');
    const rawSuppliers = findEntityList(raw, 'suppliers', 'Supplier', 'supplier', 'vendors', 'vendor', 'providers', 'provider', 'tbl_suppliers');
    const rawInventory = findEntityList(raw, 'inventoryItems', 'InventoryItem', 'inventory_items', 'inventoryitems', 'inventory', 'items', 'item', 'stock', 'warehouse', 'materials', 'equipment', 'tbl_inventory');
    const rawDocs = findEntityList(raw, 'documentFiles', 'DocumentFile', 'document_files', 'documentfiles', 'documents', 'document', 'files', 'file', 'attachments', 'attachment', 'media', 'tbl_documents');
    const rawInvoices = findEntityList(raw, 'invoices', 'Invoice', 'invoice', 'bills', 'bill', 'receipts', 'receipt', 'expenses', 'expense', 'payments', 'payment', 'tbl_invoices');
    const rawFormTemplates = findEntityList(raw, 'formTemplates', 'FormTemplate', 'form_templates', 'formtemplates', 'forms', 'form', 'templates', 'template', 'tbl_form_templates');
    const rawFilledForms = findEntityList(raw, 'filledForms', 'FilledForm', 'filled_forms', 'filledforms', 'inspections', 'inspection', 'inspection_reports', 'protocols', 'reports', 'tbl_filled_forms');
    const rawSystemLogs = findEntityList(raw, 'buildingSystemLogs', 'BuildingSystemLog', 'building_system_logs', 'buildingsystemlogs', 'system_logs', 'systemlogs', 'systems', 'system', 'inspections', 'equipment', 'tbl_building_system_logs');
    const rawSettings = raw.appSettings || raw.AppSettings || raw.app_settings || raw.settings || raw.preferences || raw.config || {};
    const unreferencedFiles: any[] = Array.isArray(raw.unreferencedFiles) ? raw.unreferencedFiles : [];

    const now = new Date().toISOString();

    // Map AppSettings
    const compName = getRowVal(rawSettings, 'companyName', 'company_name', 'businessName', 'business_name', 'name') || rawSettings.companyInfo?.name || DEFAULT_SETTINGS.companyInfo.name;
    const authorName = getRowVal(rawSettings, 'authorName', 'author_name', 'managerName', 'manager_name', 'userName', 'user_name') || compName || DEFAULT_SETTINGS.authorName;
    const authorPhone = String(getRowVal(rawSettings, 'authorPhone', 'author_phone', 'phone', 'companyPhone', 'company_phone', 'mobile') || '');
    const authorEmail = String(getRowVal(rawSettings, 'authorEmail', 'author_email', 'email', 'companyEmail', 'company_email', 'mail') || '');
    const address = getRowVal(rawSettings, 'address', 'companyAddress', 'company_address', 'city') || '';
    const taxId = String(getRowVal(rawSettings, 'taxId', 'tax_id', 'vatId', 'vat_id', 'vatNumber', 'vat_number', 'hp') || '');
    const currencySymbol = String(getRowVal(rawSettings, 'currencySymbol', 'currency_symbol', 'currency', 'symbol') || '₪');
    const langRaw = String(getRowVal(rawSettings, 'language', 'selected_language', 'selectedLanguage', 'locale', 'lang') || 'he').toLowerCase();
    const language = (langRaw === 'en' || langRaw === 'ar') ? langRaw : 'he';
    const themeRaw = String(getRowVal(rawSettings, 'theme', 'app_theme', 'appTheme', 'themeMode', 'theme_mode') || 'system').toLowerCase();
    const themeMode = (themeRaw === 'dark' || themeRaw === 'light') ? themeRaw : 'system';
    const logoUrl = getRowVal(rawSettings, 'logoPath', 'logo_path', 'logo', 'logoUrl', 'logo_url') || rawSettings.companyInfo?.logo;

    const settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        id: SETTINGS_ID,
        companyInfo: {
            ...DEFAULT_SETTINGS.companyInfo,
            name: compName,
            logo: logoUrl || undefined,
        },
        taxId,
        currencySymbol,
        authorName,
        authorPhone,
        authorEmail,
        phone: authorPhone,
        email: authorEmail,
        address,
        language,
        themeMode,
        colorPalette: getRowVal(rawSettings, 'colorPalette', 'color_palette') || 'default',
        appTheme: {
            ...DEFAULT_SETTINGS.appTheme,
            headerColor: getRowVal(rawSettings, 'headerColor', 'header_color') || DEFAULT_SETTINGS.appTheme.headerColor,
            accentColor: getRowVal(rawSettings, 'accentColor', 'accent_color') || DEFAULT_SETTINGS.appTheme.accentColor,
        },
    };

    // Map Suppliers
    const suppliers: Supplier[] = rawSuppliers.map((s: any, idx: number) => ({
        id: String(getRowVal(s, 'id', 'supplierId', 'supplier_id') || `supplier-${idx + 1}`),
        name: getRowVal(s, 'name', 'supplierName', 'supplier_name', 'companyName', 'company_name') || 'ספק',
        group: getRowVal(s, 'category', 'group', 'type') || 'כללי',
        phone: String(getRowVal(s, 'phone', 'phoneNumber', 'phone_number', 'mobile', 'tel') || ''),
        email: String(getRowVal(s, 'email', 'mail') || ''),
        address: getRowVal(s, 'address', 'city') || '',
        companyId: String(getRowVal(s, 'companyId', 'company_id', 'id') || `sup-comp-${idx + 1}`),
        createdAt: getRowVal(s, 'createdAt', 'created_at') || now,
        updatedAt: getRowVal(s, 'updatedAt', 'updated_at') || now,
    }));

    // Map Workers
    const workers: Worker[] = rawWorkers.map((w: any, idx: number) => {
        const certPath = getRowVal(w, 'certificatePath', 'certificate_path', 'photo', 'photoPath', 'photo_path', 'license');
        return {
            id: String(getRowVal(w, 'id', 'workerId', 'worker_id') || `worker-${idx + 1}`),
            name: getRowVal(w, 'name', 'workerName', 'worker_name', 'fullName', 'full_name') || 'איש מקצוע',
            idNumber: String(getRowVal(w, 'idNumber', 'id_number', 'tradeLicenseNumber', 'trade_license_number') || ''),
            workerNumber: String(getRowVal(w, 'workerNumber', 'worker_number', 'id') || `W-${idx + 1}`),
            phone: String(getRowVal(w, 'phone', 'phoneNumber', 'phone_number', 'mobile', 'tel') || ''),
            email: String(getRowVal(w, 'email', 'mail') || ''),
            address: getRowVal(w, 'specialty', 'profession', 'trade', 'address') || '',
            specialty: getRowVal(w, 'specialty', 'profession', 'trade') || '',
            hourlyRate: typeof getRowVal(w, 'hourlyRate', 'hourly_rate', 'rate') === 'number' 
                ? getRowVal(w, 'hourlyRate', 'hourly_rate', 'rate') 
                : parseFloat(getRowVal(w, 'hourlyRate', 'hourly_rate', 'rate')) || undefined,
            insuranceExpiryDate: getRowVal(w, 'insuranceExpiryDate', 'insurance_expiry_date'),
            notes: getRowVal(w, 'notes', 'comments') || '',
            photo: certPath ? { name: 'תעודה', mimeType: 'image/jpeg', url: certPath } : undefined,
            licenses: [],
        };
    });

    // Map Buildings -> Projects
    const totalBuildings = rawBuildings.length;
    const projects: Project[] = rawBuildings.map((b: any, bIdx: number) => {
        const buildingId = String(getRowVal(b, 'id', 'buildingId', 'building_id') || `b-${bIdx + 1}`);
        const buildingName = getRowVal(b, 'name', 'title', 'buildingName', 'address') || `בניין ${bIdx + 1}`;
        const buildingAddress = getRowVal(b, 'address', 'location', 'street') || '';
        const managerName = getRowVal(b, 'managerName', 'manager_name', 'contactName', 'contact_name') || '';
        const managerPhone = String(getRowVal(b, 'managerPhone', 'manager_phone', 'contactPhone', 'contact_phone') || '');
        const managerEmail = String(getRowVal(b, 'managerEmail', 'manager_email', 'contactEmail', 'contact_email') || '');
        const imagePath = getRowVal(b, 'imagePath', 'image_path', 'photoPath', 'photo_path', 'cover', 'image');

        // Find tenants belonging to this building
        const buildingTenants: Tenant[] = rawTenants
            .filter((t: any) => belongsToBuilding(t, buildingId, buildingName, totalBuildings) || (!getRowBuildingId(t) && bIdx === 0))
            .map((t: any, tIdx: number) => {
                const tenantId = String(getRowVal(t, 'id', 'tenantId', 'tenant_id') || `tenant-${buildingId}-${tIdx + 1}`);
                let contractPath = getRowVal(t, 'contractFilePath', 'contract_file_path', 'contractFile', 'contract_file', 'contract');
                const sigPath = getRowVal(t, 'signaturePath', 'signature_path', 'signature', 'sign');

                if (!contractPath) {
                    const docForTenant = rawDocs.find((d: any) => {
                        const spec = isEntitySpecificFile(d);
                        return spec.targetSection === 'tenants' && (spec.targetId === tenantId || !spec.targetId);
                    });
                    if (docForTenant) {
                        contractPath = getRowVal(docForTenant, 'filePath', 'file_path', 'path', 'url');
                    }
                }

                return {
                    id: tenantId,
                    buildingId,
                    name: getRowVal(t, 'name', 'tenantName', 'tenant_name', 'fullName', 'full_name') || 'דייר',
                    phone: String(getRowVal(t, 'phone', 'phoneNumber', 'phone_number', 'mobile', 'tel') || ''),
                    email: String(getRowVal(t, 'email', 'mail', 'emailAddress', 'email_address') || ''),
                    building: buildingName,
                    floor: String(getRowVal(t, 'floorNumber', 'floor_number', 'floor') || ''),
                    officeNumber: String(getRowVal(t, 'apartmentNumber', 'apartment_number', 'apartment', 'unit', 'officeNumber', 'office_number') || ''),
                    officeSpace: String(getRowVal(t, 'officeSpace', 'office_space', 'area', 'size') || ''),
                    companyId: String(getRowVal(t, 'companyId', 'company_id') || ''),
                    apartmentNumber: String(getRowVal(t, 'apartmentNumber', 'apartment_number', 'apartment', 'unit', 'officeNumber') || ''),
                    floorNumber: String(getRowVal(t, 'floorNumber', 'floor_number', 'floor') || ''),
                    leaseStartDate: getRowVal(t, 'leaseStartDate', 'lease_start_date', 'startDate', 'start_date'),
                    leaseEndDate: getRowVal(t, 'leaseEndDate', 'lease_end_date', 'endDate', 'end_date'),
                    rentAmount: typeof getRowVal(t, 'rentAmount', 'rent_amount', 'rent', 'price') === 'number' 
                        ? getRowVal(t, 'rentAmount', 'rent_amount', 'rent', 'price') 
                        : parseFloat(getRowVal(t, 'rentAmount', 'rent_amount', 'rent', 'price')) || undefined,
                    paymentStatus: getRowVal(t, 'paymentStatus', 'payment_status', 'status') || 'שולם',
                    contactPerson: getRowVal(t, 'contactPerson', 'contact_person', 'emergencyContact', 'emergency_contact'),
                    emergencyContact: getRowVal(t, 'emergencyContact', 'emergency_contact'),
                    contractFilePath: contractPath,
                    contractFile: contractPath ? {
                        name: 'חוזה שכירות',
                        mimeType: 'application/pdf',
                        url: contractPath,
                    } : undefined,
                    signaturePath: sigPath,
                    notes: getRowVal(t, 'notes', 'comments', 'remark', 'remarks'),
                };
            });

        // Find todos for this building
        const buildingTodos: ProjectTodo[] = rawTodoItems
            .filter((todo: any) => belongsToBuilding(todo, buildingId, buildingName, totalBuildings) || (!getRowBuildingId(todo) && bIdx === 0))
            .map((todo: any, todoIdx: number) => {
                const isDone = Boolean(
                    getRowVal(todo, 'isDone', 'is_done', 'isCompleted', 'is_completed', 'completed') ||
                    ['done', 'completed', 'נפתרה', 'בוצע', 'הושלם'].includes(String(getRowVal(todo, 'status') || '').toLowerCase())
                );
                return {
                    id: String(getRowVal(todo, 'id', 'todoId', 'todo_id') || `todo-${buildingId}-${todoIdx + 1}`),
                    description: getRowVal(todo, 'title', 'description', 'name', 'task', 'text') || 'משימה',
                    isCompleted: isDone,
                    createdAt: getRowVal(todo, 'createdAt', 'created_at', 'date') || now,
                    dueDate: getRowVal(todo, 'dueDate', 'due_date', 'deadline', 'target_date'),
                    group: getRowVal(todo, 'category', 'group', 'categoryName') || (getRowVal(todo, 'isPreventive', 'is_preventive') ? 'תחזוקה מונעת' : 'כללי'),
                    projectId: buildingId,
                };
            });

        // Find files for this building - ONLY real building documents, sorted into proper folders!
        const buildingFiles: ProjectFile[] = rawDocs
            .filter((doc: any) => {
                if (doc._isAttachedToEntity) return false;
                const specific = isEntitySpecificFile(doc);
                if (specific.isSpecific) return false;
                return belongsToBuilding(doc, buildingId, buildingName, totalBuildings) || (!getRowBuildingId(doc) && bIdx === 0);
            })
            .map((doc: any, docIdx: number) => {
                const filePath = getRowVal(doc, 'filePath', 'file_path', 'path', 'url', 'uri');
                const group = getFolderCategoryForDocument(doc, filePath);
                return {
                    id: String(getRowVal(doc, 'id', 'docId', 'doc_id', 'fileId', 'file_id') || `file-${buildingId}-${docIdx + 1}`),
                    name: getRowVal(doc, 'title', 'name', 'fileName', 'file_name', 'docName', 'doc_name') || 'מסמך',
                    mimeType: getRowVal(doc, 'fileType', 'file_type', 'mimeType', 'mime_type') || getMimeTypeFromFilename(filePath || '') || 'application/pdf',
                    url: filePath,
                    group: group,
                    createdAt: getRowVal(doc, 'uploadDate', 'upload_date', 'createdAt', 'created_at', 'date') || now,
                };
            });

        // Only append legitimate building document files that don't belong to other sections
        if (bIdx === 0 && unreferencedFiles.length > 0) {
            unreferencedFiles
                .filter((uf: any) => uf.isDocumentFile || (!uf.targetSection && !isEntitySpecificFile(uf).isSpecific))
                .forEach((uf: any, ufIdx: number) => {
                    const existing = buildingFiles.some(f => f.url === uf.url || (f.name === uf.name && f.group === uf.group));
                    if (!existing) {
                        const group = uf.group || getFolderCategoryForDocument(uf, uf.url);
                        buildingFiles.push({
                            id: String(uf.id || `unref-doc-${ufIdx + 1}`),
                            name: uf.name || `מסמך ${ufIdx + 1}`,
                            mimeType: uf.mimeType || 'application/pdf',
                            url: uf.url,
                            group: group,
                            createdAt: uf.createdAt || now,
                        });
                    }
                });
        }

        // Find inventory for this building
        const buildingInventoryItems = rawInventory
            .filter((inv: any) => belongsToBuilding(inv, buildingId, buildingName, totalBuildings) || (!getRowBuildingId(inv) && bIdx === 0))
            .map((inv: any, invIdx: number) => {
                const photoPath = getRowVal(inv, 'photoPath', 'photo_path', 'image', 'imagePath', 'image_path');
                return {
                    id: String(getRowVal(inv, 'id', 'itemId', 'item_id', 'inventoryId', 'inventory_id') || `inv-${buildingId}-${invIdx + 1}`),
                    name: getRowVal(inv, 'name', 'itemName', 'item_name', 'title') || 'פריט מלאי',
                    description: getRowVal(inv, 'description', 'notes', 'details') || (getRowVal(inv, 'sku', 'barcode', 'model') ? `מק״ט: ${getRowVal(inv, 'sku', 'barcode', 'model')}` : ''),
                    model: getRowVal(inv, 'sku', 'barcode', 'model', 'code') || '',
                    company: getRowVal(inv, 'company', 'brand', 'manufacturer') || '',
                    quantity: typeof getRowVal(inv, 'quantity', 'qty', 'count', 'amount') === 'number' 
                        ? getRowVal(inv, 'quantity', 'qty', 'count', 'amount') 
                        : parseInt(getRowVal(inv, 'quantity', 'qty', 'count', 'amount')) || 0,
                    images: photoPath ? [{ id: generateId(), name: getRowVal(inv, 'name') || 'פריט', mimeType: 'image/jpeg', url: photoPath, createdAt: now }] : [],
                    createdAt: getRowVal(inv, 'createdAt', 'created_at', 'date') || now,
                };
            });

        // Find subProjects for this building
        const buildingSubProjects = rawProjects
            .filter((proj: any) => belongsToBuilding(proj, buildingId, buildingName, totalBuildings) || (!getRowBuildingId(proj) && bIdx === 0))
            .map((proj: any, pIdx: number) => ({
                id: String(getRowVal(proj, 'id', 'projectId', 'project_id') || `subproj-${buildingId}-${pIdx + 1}`),
                name: getRowVal(proj, 'title', 'name', 'projectName', 'project_name') || 'פרויקט משנה',
                description: getRowVal(proj, 'description', 'notes', 'details') || '',
                status: getRowVal(proj, 'status', 'state') || 'בביצוע',
                budget: typeof getRowVal(proj, 'estimatedBudget', 'estimated_budget', 'budget') === 'number' 
                    ? getRowVal(proj, 'estimatedBudget', 'estimated_budget', 'budget') 
                    : parseFloat(getRowVal(proj, 'estimatedBudget', 'estimated_budget', 'budget')) || undefined,
                photos: [],
                files: [],
                rejects: [],
                contractors: [],
                checker: { name: '', phone: '', email: '' }
            }));

        const buildingNotes = getRowVal(b, 'notes', 'description', 'comments');

        return {
            id: buildingId,
            name: buildingName,
            address: buildingAddress,
            clientInfo: managerName ? `מנהל: ${managerName} ${managerPhone || ''}` : '',
            status: 'פעיל',
            managerName,
            managerPhone,
            managerEmail,
            numberOfFloors: typeof getRowVal(b, 'floors', 'numberOfFloors', 'number_of_floors') === 'number' 
                ? getRowVal(b, 'floors', 'numberOfFloors', 'number_of_floors') 
                : parseInt(getRowVal(b, 'floors', 'numberOfFloors', 'number_of_floors')) || undefined,
            apartmentsCount: typeof getRowVal(b, 'apartmentsCount', 'apartments_count', 'apartments') === 'number' 
                ? getRowVal(b, 'apartmentsCount', 'apartments_count', 'apartments') 
                : parseInt(getRowVal(b, 'apartmentsCount', 'apartments_count', 'apartments')) || undefined,
            parkingSpots: typeof getRowVal(b, 'parkingSpots', 'parking_spots', 'parking') === 'number' 
                ? getRowVal(b, 'parkingSpots', 'parking_spots', 'parking') 
                : parseInt(getRowVal(b, 'parkingSpots', 'parking_spots', 'parking')) || undefined,
            images: imagePath ? [{ id: generateId(), name: buildingName, mimeType: 'image/jpeg', url: imagePath }] : [],
            files: buildingFiles,
            todos: buildingTodos,
            inventory: buildingInventoryItems.length > 0 ? [{
                id: generateId(),
                name: 'מחסן ראשי',
                itemGroups: [{
                    id: generateId(),
                    name: 'פריטי אחזקה',
                    items: buildingInventoryItems
                }]
            }] : [],
            tenants: buildingTenants,
            workers: workers,
            subProjects: buildingSubProjects,
            systemLogs: [],
            notes: buildingNotes ? [{ id: generateId(), content: buildingNotes, author: 'מובייל', createdAt: now }] : [],
            createdAt: getRowVal(b, 'createdAt', 'created_at') || now,
            updatedAt: getRowVal(b, 'updatedAt', 'updated_at') || now,
        };
    });

    // If projects are empty but we had raw issues or raw tenants, create a default project to hold them
    let primaryProjectId = projects[0]?.id;
    if (!primaryProjectId) {
        primaryProjectId = generateId();
        projects.push({
            id: primaryProjectId,
            name: 'בניין ראשי',
            address: '',
            clientInfo: '',
            status: 'פעיל',
            images: [],
            files: unreferencedFiles.map((uf: any, ufIdx: number) => ({
                id: String(uf.id || `unref-file-${ufIdx + 1}`),
                name: uf.name || `קובץ מובייל ${ufIdx + 1}`,
                mimeType: uf.mimeType || 'application/pdf',
                url: uf.url,
                group: 'מסמכי ארכיון',
                createdAt: now,
            })),
            todos: [],
            inventory: [],
            tenants: rawTenants.map((t: any, tIdx: number) => ({
                id: String(getRowVal(t, 'id', 'tenantId', 'tenant_id') || `tenant-${primaryProjectId}-${tIdx + 1}`),
                buildingId: primaryProjectId,
                name: getRowVal(t, 'name', 'tenantName', 'tenant_name') || 'דייר',
                phone: String(getRowVal(t, 'phone', 'phoneNumber', 'phone_number') || ''),
                email: String(getRowVal(t, 'email', 'mail') || ''),
                building: 'בניין ראשי',
                floor: String(getRowVal(t, 'floorNumber', 'floor_number', 'floor') || ''),
                officeNumber: String(getRowVal(t, 'apartmentNumber', 'apartment_number', 'apartment') || ''),
                officeSpace: '',
                companyId: '',
                apartmentNumber: String(getRowVal(t, 'apartmentNumber', 'apartment_number', 'apartment') || ''),
                floorNumber: String(getRowVal(t, 'floorNumber', 'floor_number', 'floor') || ''),
                paymentStatus: getRowVal(t, 'paymentStatus', 'payment_status') || 'שולם',
            })),
            workers: workers,
            createdAt: now,
            updatedAt: now,
        });
    }

    // Map Preventive Events
    const preventiveEvents: PreventiveEvent[] = rawPreventive.map((e: any, idx: number) => {
        let bId = getRowBuildingId(e);
        if (!bId || !projects.some(p => p.id === bId)) {
            const matchedProj = projects.find(p => belongsToBuilding(e, p.id, p.name, projects.length));
            bId = matchedProj ? matchedProj.id : primaryProjectId;
        }
        const proj = projects.find(p => p.id === bId);
        return {
            id: String(getRowVal(e, 'id', 'eventId', 'event_id') || `pe-${idx + 1}`),
            buildingId: String(bId || ''),
            projectName: proj?.name || '',
            title: getRowVal(e, 'title', 'name', 'subject') || 'תחזוקה מונעת',
            description: getRowVal(e, 'description', 'notes', 'details') || '',
            scheduledDate: getRowVal(e, 'scheduledDate', 'scheduled_date', 'date', 'scheduled_at') || now.split('T')[0],
            frequency: getRowVal(e, 'frequency', 'period', 'interval') || 'monthly',
            isCompleted: Boolean(getRowVal(e, 'isCompleted', 'is_completed', 'completed') || ['completed', 'done', 'בוצע'].includes(String(getRowVal(e, 'status') || '').toLowerCase())),
            completedDate: getRowVal(e, 'completedDate', 'completed_date'),
            assignedWorker: getRowVal(e, 'assignedWorker', 'assigned_worker', 'worker'),
            cost: typeof getRowVal(e, 'cost', 'price', 'amount') === 'number' 
                ? getRowVal(e, 'cost', 'price', 'amount') 
                : parseFloat(getRowVal(e, 'cost', 'price', 'amount')) || undefined,
            category: getRowVal(e, 'category', 'group') || 'תחזוקה מונעת',
            createdAt: getRowVal(e, 'createdAt', 'created_at', 'date') || now,
        };
    });

    // Map Building System Logs
    const buildingSystemLogs: BuildingSystemLog[] = rawSystemLogs.map((log: any, idx: number) => {
        let bId = getRowBuildingId(log);
        if (!bId || !projects.some(p => p.id === bId)) {
            const matchedProj = projects.find(p => belongsToBuilding(log, p.id, p.name, projects.length));
            bId = matchedProj ? matchedProj.id : primaryProjectId;
        }
        const certPath = getRowVal(log, 'certificatePath', 'certificate_path', 'certificateFile', 'filePath', 'file_path');
        return {
            id: String(getRowVal(log, 'id', 'logId', 'log_id', 'systemId', 'system_id') || `sys-${idx + 1}`),
            buildingId: String(bId || ''),
            systemType: getRowVal(log, 'systemType', 'system_type', 'type') || 'other',
            title: getRowVal(log, 'title', 'systemName', 'system_name', 'name') || 'מערכת בניין',
            lastInspectionDate: getRowVal(log, 'lastInspectionDate', 'last_inspection_date', 'lastDate', 'last_date'),
            nextInspectionDate: getRowVal(log, 'nextInspectionDate', 'next_inspection_date', 'nextDate', 'next_date'),
            technicianName: getRowVal(log, 'technicianName', 'technician_name', 'inspector'),
            technicianPhone: String(getRowVal(log, 'technicianPhone', 'technician_phone') || ''),
            status: getRowVal(log, 'status', 'condition') || 'תקין',
            notes: getRowVal(log, 'notes', 'comments', 'description') || '',
            certificateFile: certPath ? { name: getRowVal(log, 'title') || 'אישור', mimeType: 'application/pdf', url: certPath } : undefined,
            createdAt: getRowVal(log, 'createdAt', 'created_at') || now,
            updatedAt: getRowVal(log, 'updatedAt', 'updated_at') || now,
        };
    });

    // Update project systemLogs reference
    projects.forEach(p => {
        p.systemLogs = buildingSystemLogs.filter(l => l.buildingId === p.id);
    });

    // Map Invoices (and quotations)
    const invoices: Invoice[] = rawInvoices.map((inv: any, idx: number) => {
        let bId = getRowBuildingId(inv);
        if (!bId || !projects.some(p => p.id === bId)) {
            const matchedProj = projects.find(p => belongsToBuilding(inv, p.id, p.name, projects.length));
            bId = matchedProj ? matchedProj.id : primaryProjectId;
        }
        const proj = projects.find(p => p.id === bId);
        const invNum = String(getRowVal(inv, 'invoiceNumber', 'invoice_number', 'number', 'ref') || `INV-${idx + 1}`);
        const invAmount = typeof getRowVal(inv, 'amount', 'total', 'price', 'cost') === 'number' 
            ? getRowVal(inv, 'amount', 'total', 'price', 'cost') 
            : parseFloat(getRowVal(inv, 'amount', 'total', 'price', 'cost')) || 0;
        let filePath = getRowVal(inv, 'filePath', 'file_path', 'url', 'pdf_path');
        if (!filePath) {
            const docForInv = rawDocs.find((d: any) => {
                const spec = isEntitySpecificFile(d);
                return spec.targetSection === 'invoices' && (spec.targetId === inv.id || spec.targetId === invNum || !spec.targetId);
            });
            if (docForInv) {
                filePath = getRowVal(docForInv, 'filePath', 'file_path', 'path', 'url');
            }
        }

        return {
            id: String(getRowVal(inv, 'id', 'invoiceId', 'invoice_id') || `inv-${idx + 1}`),
            buildingId: String(bId || ''),
            projectName: proj?.name || '',
            supplierId: getRowVal(inv, 'supplierId', 'supplier_id') ? String(getRowVal(inv, 'supplierId', 'supplier_id')) : undefined,
            supplierName: getRowVal(inv, 'supplierName', 'supplier_name', 'supplier', 'vendor'),
            invoiceNumber: invNum,
            amount: invAmount,
            date: getRowVal(inv, 'date', 'invoiceDate', 'invoice_date', 'createdAt', 'created_at') || now.split('T')[0],
            dueDate: getRowVal(inv, 'dueDate', 'due_date'),
            status: getRowVal(inv, 'status', 'paymentStatus', 'payment_status') || 'ממתין',
            filePath: filePath,
            pdfFile: filePath ? { name: `חשבונית ${invNum}`, mimeType: 'application/pdf', url: filePath } : undefined,
            notes: getRowVal(inv, 'notes', 'description', 'remarks') || '',
            createdAt: getRowVal(inv, 'createdAt', 'created_at') || now,
            updatedAt: getRowVal(inv, 'updatedAt', 'updated_at') || now,
        };
    });

    // Convert invoices also to quotations store so they appear in quotations list
    const quotations: Quotation[] = invoices.map(inv => ({
        id: inv.id,
        projectId: inv.buildingId,
        projectName: inv.projectName || '',
        date: inv.date,
        supplierName: inv.supplierName || 'ספק',
        quotationNumber: inv.invoiceNumber,
        quotationName: `חשבונית ${inv.invoiceNumber}`,
        group: 'חשבוניות מובייל',
        price: inv.amount,
        pdfFile: inv.pdfFile || { name: `חשבונית_${inv.invoiceNumber}`, mimeType: 'application/pdf' },
        status: inv.status === 'paid' || inv.status === 'משולם' ? QuotationStatus.INVOICE_PAID : QuotationStatus.PENDING,
        createdAt: inv.createdAt || now,
        updatedAt: inv.updatedAt || now,
    }));

    // Map Issues -> Reports & Problems
    const reports: Report[] = [];
    const problems: Problem[] = [];

    // Group issues by buildingId
    const issuesByBuilding: Record<string, any[]> = {};
    rawIssues.forEach((issue: any) => {
        let bId = getRowBuildingId(issue);
        if (!bId || !projects.some(p => p.id === bId)) {
            const matchedProj = projects.find(p => belongsToBuilding(issue, p.id, p.name, projects.length));
            bId = matchedProj ? matchedProj.id : primaryProjectId;
        }
        if (!bId) bId = primaryProjectId;
        if (!issuesByBuilding[bId]) issuesByBuilding[bId] = [];
        issuesByBuilding[bId].push(issue);
    });

    Object.entries(issuesByBuilding).forEach(([bId, issuesList]) => {
        const reportId = generateId();
        const project = projects.find(p => p.id === bId);
        const reportDate = getRowVal(issuesList[0], 'reportedDate', 'reported_date', 'date', 'createdAt', 'created_at') || now.split('T')[0];

        // Attach any report-specific documents to this report
        const reportFiles: ProjectFile[] = [];
        rawDocs.forEach((d: any) => {
            const spec = isEntitySpecificFile(d);
            if (spec.targetSection === 'reports') {
                const docUrl = getRowVal(d, 'filePath', 'file_path', 'path', 'url');
                if (docUrl && !reportFiles.some(rf => rf.url === docUrl)) {
                    reportFiles.push({
                        id: String(getRowVal(d, 'id') || generateId()),
                        name: getRowVal(d, 'name', 'title', 'fileName') || 'קובץ דוח',
                        mimeType: getRowVal(d, 'fileType', 'mimeType') || 'application/pdf',
                        url: docUrl,
                        group: 'דוחות',
                        createdAt: getRowVal(d, 'uploadDate', 'createdAt') || now,
                    });
                }
            }
        });

        reports.push({
            id: reportId,
            projectId: bId,
            title: `דוח תקלות מובייל - ${project?.name || 'בניין'}`,
            date: reportDate,
            description: `דוח שסונכרן מאפליקציית מובייל (${issuesList.length} תקלות)`,
            files: reportFiles,
            createdAt: now,
            updatedAt: now,
        });

        issuesList.forEach((issue: any, index: number) => {
            const problemId = String(getRowVal(issue, 'id', 'issueId', 'issue_id', 'problemId', 'problem_id') || generateId());
            const images: any[] = [];
            const photoPath = getRowVal(issue, 'photoPath', 'photo_path', 'photo', 'imagePath', 'image_path', 'image');
            const afterPhotoPath = getRowVal(issue, 'afterPhotoPath', 'after_photo_path', 'afterPhoto', 'after_photo', 'repairPhoto');
            if (photoPath) {
                images.push({ id: generateId(), name: 'תמונה ראשונית', mimeType: 'image/jpeg', url: photoPath, createdAt: now });
            }
            if (afterPhotoPath) {
                images.push({ id: generateId(), name: 'תמונה לאחר תיקון', mimeType: 'image/jpeg', url: afterPhotoPath, createdAt: now });
            }

            // Include any already-resolved images array from issue
            if (Array.isArray(issue.images)) {
                issue.images.forEach((img: any) => {
                    const imgUrl = typeof img === 'string' ? img : (img.url || img.filePath || img.dataUrl);
                    if (imgUrl && !images.some(i => i.url === imgUrl)) {
                        images.push({
                            id: generateId(),
                            name: (typeof img === 'object' && img.name) ? img.name : 'תמונה',
                            mimeType: (typeof img === 'object' && img.mimeType) ? img.mimeType : 'image/jpeg',
                            url: imgUrl,
                            createdAt: (typeof img === 'object' && img.createdAt) ? img.createdAt : now,
                        });
                    }
                });
            }

            // Include any document from rawDocs linked to this issue
            rawDocs.forEach((d: any) => {
                const spec = isEntitySpecificFile(d);
                if (spec.targetSection === 'issues' && (spec.targetId === problemId || !spec.targetId)) {
                    const docUrl = getRowVal(d, 'filePath', 'file_path', 'path', 'url');
                    if (docUrl && !images.some(i => i.url === docUrl)) {
                        images.push({
                            id: String(getRowVal(d, 'id') || generateId()),
                            name: getRowVal(d, 'name', 'title') || 'תמונה מצורפת',
                            mimeType: getRowVal(d, 'fileType', 'mimeType') || 'image/jpeg',
                            url: docUrl,
                            createdAt: getRowVal(d, 'uploadDate', 'createdAt') || now,
                        });
                    }
                }
            });

            const issueTitle = getRowVal(issue, 'title', 'subject', 'name', 'headline');
            const issueDesc = getRowVal(issue, 'description', 'details', 'notes', 'desc');
            const apartmentNum = getRowVal(issue, 'apartmentNumber', 'apartment_number', 'apartment', 'unit', 'location');
            const assignedTo = getRowVal(issue, 'assignedTo', 'assigned_to', 'worker', 'assignedWorker', 'contractor');
            const cost = getRowVal(issue, 'cost', 'price', 'amount');
            const status = String(getRowVal(issue, 'status', 'state') || '').toLowerCase();
            const resolvedDate = getRowVal(issue, 'resolvedDate', 'resolved_date', 'completedDate', 'completed_date');
            const isFixed = status === 'resolved' || status === 'נפתרה' || status === 'הושלם' || status === 'closed' || Boolean(resolvedDate);

            problems.push({
                id: problemId,
                reportId,
                description: issueTitle ? `${issueTitle}${issueDesc ? ' - ' + issueDesc : ''}` : (issueDesc || 'תקלה'),
                severity: mapPriority(getRowVal(issue, 'priority', 'severity', 'urgency', 'level')),
                notes: [
                    apartmentNum ? `דירה/מיקום: ${apartmentNum}` : '',
                    assignedTo ? `איש מקצוע: ${assignedTo}` : '',
                    cost ? `עלות: ₪${cost}` : '',
                ].filter(Boolean).join(' | '),
                locationTag: apartmentNum ? `דירה ${apartmentNum}` : undefined,
                images,
                order: index + 1,
                isFixed,
                createdAt: getRowVal(issue, 'reportedDate', 'reported_date', 'date', 'createdAt', 'created_at') || now,
                updatedAt: resolvedDate || now,
            });
        });
    });

    // Map Forms
    const forms: ProjectForm[] = rawFilledForms.map((ff: any, ffIdx: number) => {
        let answers = [];
        const rawAnswers = getRowVal(ff, 'answersJson', 'answers_json', 'answers', 'data');
        if (typeof rawAnswers === 'string') {
            try { answers = JSON.parse(rawAnswers); } catch { answers = []; }
        } else if (Array.isArray(rawAnswers)) {
            answers = rawAnswers;
        }
        let bId = getRowBuildingId(ff);
        if (!bId || !projects.some(p => p.id === bId)) {
            bId = primaryProjectId;
        }
        return {
            id: String(getRowVal(ff, 'id', 'formId', 'form_id') || `form-${ffIdx + 1}`),
            projectId: String(bId || ''),
            reportId: String(getRowVal(ff, 'reportId', 'report_id') || ''),
            formTemplateId: String(getRowVal(ff, 'formTemplateId', 'form_template_id') || ''),
            formTemplateName: getRowVal(ff, 'formTemplateName', 'form_template_name', 'title') || 'טופס',
            answers,
            createdAt: getRowVal(ff, 'createdAt', 'created_at', 'date') || now,
            updatedAt: getRowVal(ff, 'updatedAt', 'updated_at') || now,
            formDate: getRowVal(ff, 'formDate', 'form_date', 'date') || now.split('T')[0],
        };
    });

    // Map Form Templates
    const formTemplates: FormTemplate[] = rawFormTemplates.map((t: any, idx: number) => {
        let groups = [];
        const rawFields = getRowVal(t, 'fieldsJson', 'fields_json', 'fields', 'groups');
        if (typeof rawFields === 'string') {
            try { groups = JSON.parse(rawFields); } catch { groups = []; }
        } else if (Array.isArray(rawFields)) {
            groups = rawFields;
        }
        return {
            id: String(getRowVal(t, 'id', 'templateId', 'template_id') || `tmpl-${idx + 1}`),
            name: getRowVal(t, 'title', 'name', 'templateName', 'template_name') || 'תבנית טופס',
            description: getRowVal(t, 'description', 'notes') || '',
            groups,
            createdAt: getRowVal(t, 'createdAt', 'created_at') || now,
            updatedAt: getRowVal(t, 'updatedAt', 'updated_at') || now,
        };
    });

    return {
        projects,
        reports,
        problems,
        forms,
        formTemplates,
        settings,
        suppliers,
        quotations,
        preventiveEvents,
        buildingSystemLogs,
        invoices,
        backupDate: raw.backupDate || now,
        version: 40,
        source: 'mobile_room_v40',
    };
};

/**
 * Creates an all-in-one universal backup JSON compatible with BOTH:
 * 1) Android Mobile Room Database v40
 * 2) Web App IndexedDB
 */
export const createUniversalSyncBackup = (rawBackup: any): any => {
    if (!rawBackup || typeof rawBackup !== 'object') return {};

    // If already in universal format with all Room tables and isUniversalSync flag, return directly
    if (rawBackup.isUniversalSync && Array.isArray(rawBackup.buildings) && Array.isArray(rawBackup.issues)) {
        return rawBackup;
    }

    const fullBackup: FullAppBackup = normalizeBackup(rawBackup);
    const projects: Project[] = Array.isArray(fullBackup.projects) ? fullBackup.projects : [];
    const reports: Report[] = Array.isArray(fullBackup.reports) ? fullBackup.reports : [];
    const problems: Problem[] = Array.isArray(fullBackup.problems) ? fullBackup.problems : [];
    const formTemplates: FormTemplate[] = Array.isArray(fullBackup.formTemplates) ? fullBackup.formTemplates : [];
    const suppliers: Supplier[] = Array.isArray(fullBackup.suppliers) ? fullBackup.suppliers : [];
    const quotations: Quotation[] = Array.isArray(fullBackup.quotations) ? fullBackup.quotations : [];
    const settings: AppSettings = fullBackup.settings || DEFAULT_SETTINGS;

    // Build Mobile Room tables
    const buildings: any[] = [];
    const tenants: any[] = [];
    const todoItems: any[] = [];
    const documentFiles: any[] = [];
    const inventoryItems: any[] = [];
    const mobileProjects: any[] = [];

    projects.forEach(p => {
        buildings.push({
            id: p.id,
            name: p.name,
            address: p.address,
            floors: p.numberOfFloors || 1,
            apartmentsCount: p.apartmentsCount || p.tenants?.length || 0,
            parkingSpots: p.parkingSpots || 0,
            managerName: p.managerName || '',
            managerPhone: p.managerPhone || '',
            managerEmail: p.managerEmail || '',
            notes: Array.isArray(p.notes) ? p.notes.map(n => n.content).join('\n') : (typeof p.notes === 'string' ? p.notes : ''),
            imagePath: p.images?.[0]?.url || p.images?.[0]?.dataUrl || '',
        });

        // Tenants
        (p.tenants || []).forEach(t => {
            tenants.push({
                id: t.id,
                buildingId: p.id,
                name: t.name,
                apartmentNumber: t.apartmentNumber || t.officeNumber || '',
                floorNumber: t.floorNumber || t.floor || '',
                phone: t.phone || '',
                email: t.email || '',
                leaseStartDate: t.leaseStartDate || '',
                leaseEndDate: t.leaseEndDate || '',
                rentAmount: t.rentAmount || 0,
                paymentStatus: t.paymentStatus || 'שולם',
                contactPerson: t.contactPerson || '',
                emergencyContact: t.emergencyContact || '',
                contractFilePath: t.contractFilePath || t.contractFile?.url || '',
                signaturePath: t.signaturePath || '',
            });
        });

        // Todos
        (p.todos || []).forEach(t => {
            todoItems.push({
                id: t.id,
                buildingId: p.id,
                title: t.description,
                description: '',
                dueDate: t.dueDate || '',
                isDone: Boolean(t.isCompleted),
                isPreventive: t.group === 'תחזוקה מונעת',
                category: t.group || 'כללי',
            });
        });

        // Files
        (p.files || []).forEach(f => {
            documentFiles.push({
                id: f.id,
                buildingId: p.id,
                title: f.name,
                category: f.group || 'כללי',
                filePath: f.url || f.dataUrl || '',
                fileType: f.mimeType,
                uploadDate: f.createdAt || '',
                fileSizeBytes: 0,
            });
        });

        // Inventory
        (p.inventory || []).forEach(l => {
            (l.itemGroups || []).forEach(g => {
                (g.items || []).forEach(i => {
                    inventoryItems.push({
                        id: i.id,
                        buildingId: p.id,
                        name: i.name,
                        sku: i.model || '',
                        quantity: i.quantity || 0,
                        minThreshold: 1,
                        unitPrice: 0,
                        location: l.name || '',
                        catalogFilePath: i.manualPdf?.url || '',
                        photoPath: i.images?.[0]?.url || i.images?.[0]?.dataUrl || '',
                    });
                });
            });
        });

        // SubProjects as mobile Project table
        (p.subProjects || []).forEach(sp => {
            mobileProjects.push({
                id: sp.id,
                buildingId: p.id,
                title: sp.name,
                description: sp.description || '',
                status: sp.status || 'Planning',
                priority: 'Medium',
                dueDate: sp.workEndDate || '',
                assignedWorker: sp.contractors?.[0]?.name || '',
                estimatedBudget: sp.budget || 0,
                actualCost: 0,
                stepsJson: JSON.stringify(sp.rejects || []),
            });
        });
    });

    // Mobile Issues from problems & reports
    const reportMap = new Map((reports || []).map(r => [r.id, r]));
    const issues: any[] = (problems || []).map(prob => {
        const report = reportMap.get(prob.reportId);
        return {
            id: prob.id,
            buildingId: report?.projectId || '',
            apartmentNumber: prob.locationTag || '',
            title: prob.description,
            description: prob.notes || '',
            priority: prob.severity,
            status: prob.isFixed ? 'Resolved' : 'Open',
            reportedDate: prob.createdAt || report?.date || '',
            resolvedDate: prob.isFixed ? (prob.updatedAt || '') : '',
            assignedTo: '',
            cost: 0,
            photoPath: prob.images?.[0]?.url || prob.images?.[0]?.dataUrl || '',
            afterPhotoPath: prob.images?.[1]?.url || prob.images?.[1]?.dataUrl || '',
            signaturePath: '',
        };
    });

    // Mobile Invoices from quotations / invoices
    const invoices: any[] = (fullBackup.invoices || []).map(inv => ({
        id: inv.id,
        buildingId: inv.buildingId,
        supplierId: inv.supplierId || '',
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        date: inv.date,
        status: inv.status,
        filePath: inv.filePath || inv.pdfFile?.url || '',
        notes: inv.notes || '',
    }));

    // If invoices is empty, populate from quotations
    if (invoices.length === 0) {
        quotations.forEach(q => {
            invoices.push({
                id: q.id,
                buildingId: q.projectId,
                supplierId: '',
                invoiceNumber: q.quotationNumber,
                amount: q.price,
                date: q.date,
                status: q.status === QuotationStatus.INVOICE_PAID ? 'paid' : 'pending',
                filePath: q.pdfFile?.url || q.pdfFile?.dataUrl || '',
                notes: q.quotationName,
            });
        });
    }

    // Mobile AppSettings
    const appSettings = {
        id: 'default',
        companyName: settings.companyInfo?.name || DEFAULT_SETTINGS.companyInfo.name,
        taxId: settings.taxId || '',
        phone: settings.phone || settings.authorPhone || '',
        email: settings.email || settings.authorEmail || '',
        address: settings.address || '',
        currencySymbol: settings.currencySymbol || '₪',
        logoPath: settings.companyInfo?.logo || '',
        theme: settings.themeMode || 'system',
        language: settings.language || 'he',
        lastBackupDate: new Date().toISOString(),
    };

    return {
        // Metadata
        schemaVersion: 40,
        version: 40,
        backupDate: new Date().toISOString(),
        source: 'universal_sync',
        isUniversalSync: true,

        // Android Room Database v40 Entity Arrays
        buildings,
        tenants,
        issues,
        projects: mobileProjects,
        rawProjects: projects,
        reports,
        problems,
        forms: fullBackup.forms || [],
        quotations,
        settings,
        todoItems,
        preventiveEvents: fullBackup.preventiveEvents || [],
        workers: (projects || []).flatMap(p => p.workers || []).map(w => ({
            id: w.id,
            name: w.name,
            specialty: w.address,
            phone: w.phone,
            email: w.email,
            hourlyRate: 0,
            insuranceExpiryDate: w.safetyPermit?.validUntil || '',
            notes: '',
            certificatePath: w.photo?.url || '',
        })),
        suppliers: (suppliers || []).map(s => ({
            id: s.id,
            name: s.name,
            category: s.group,
            contactPerson: '',
            phone: s.phone,
            email: s.email,
            address: s.address || '',
            contractFilePath: '',
        })),
        inventoryItems,
        documentFiles,
        invoices,
        formTemplates: (formTemplates || []).map(t => ({
            id: t.id,
            title: t.name,
            description: t.description,
            category: 'כללי',
            fieldsJson: JSON.stringify(t.groups || []),
            createdAt: t.createdAt,
        })),
        filledForms: fullBackup.forms || [],
        buildingSystemLogs: fullBackup.buildingSystemLogs || [],
        appSettings,

        // Web Application Native Structure
        webData: {
            projects,
            reports,
            problems,
            forms: fullBackup.forms || [],
            formTemplates,
            suppliers,
            quotations,
            settings,
            preventiveEvents: fullBackup.preventiveEvents || [],
            buildingSystemLogs: fullBackup.buildingSystemLogs || [],
            invoices: fullBackup.invoices || [],
        }
    };
};

/**
 * Universal auto-detection and import of either format (JSON, Android Room v40, or Markdown MD backup).
 */
export const normalizeBackup = (raw: any): FullAppBackup => {
    // If raw is a string, check if it's JSON or Markdown
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                return normalizeBackup(JSON.parse(trimmed));
            } catch (e) {
                return parseMarkdownBackup(trimmed);
            }
        } else {
            return parseMarkdownBackup(trimmed);
        }
    }

    // If it's already a universal sync object with webData, prioritize webData if present
    if (raw && raw.webData && Array.isArray(raw.webData.projects) && raw.webData.projects.length > 0) {
        return {
            ...raw.webData,
            backupDate: raw.backupDate || new Date().toISOString(),
            version: 40,
        };
    }

    // If it has rawProjects:
    if (raw && Array.isArray(raw.rawProjects) && raw.rawProjects.length > 0) {
        return {
            projects: raw.rawProjects,
            reports: Array.isArray(raw.reports) ? raw.reports : [],
            problems: Array.isArray(raw.problems) ? raw.problems : [],
            forms: Array.isArray(raw.forms) ? raw.forms : [],
            formTemplates: Array.isArray(raw.formTemplates) ? raw.formTemplates : [],
            settings: raw.settings ? { ...DEFAULT_SETTINGS, ...raw.settings } : DEFAULT_SETTINGS,
            suppliers: Array.isArray(raw.suppliers) ? raw.suppliers : [],
            quotations: Array.isArray(raw.quotations) ? raw.quotations : [],
            preventiveEvents: Array.isArray(raw.preventiveEvents) ? raw.preventiveEvents : [],
            buildingSystemLogs: Array.isArray(raw.buildingSystemLogs) ? raw.buildingSystemLogs : [],
            invoices: Array.isArray(raw.invoices) ? raw.invoices : [],
            backupDate: raw.backupDate || new Date().toISOString(),
            version: 40,
        };
    }

    // If it already has projects (Web format) and not mobile 'buildings':
    if (raw && Array.isArray(raw.projects) && !Array.isArray(raw.buildings) && !Array.isArray(raw.Building)) {
        return {
            projects: raw.projects,
            reports: Array.isArray(raw.reports) ? raw.reports : [],
            problems: Array.isArray(raw.problems) ? raw.problems : [],
            forms: Array.isArray(raw.forms) ? raw.forms : [],
            formTemplates: Array.isArray(raw.formTemplates) ? raw.formTemplates : [],
            settings: raw.settings ? { ...DEFAULT_SETTINGS, ...raw.settings } : DEFAULT_SETTINGS,
            suppliers: Array.isArray(raw.suppliers) ? raw.suppliers : [],
            quotations: Array.isArray(raw.quotations) ? raw.quotations : [],
            preventiveEvents: Array.isArray(raw.preventiveEvents) ? raw.preventiveEvents : [],
            buildingSystemLogs: Array.isArray(raw.buildingSystemLogs) ? raw.buildingSystemLogs : [],
            invoices: Array.isArray(raw.invoices) ? raw.invoices : [],
            backupDate: raw.backupDate || new Date().toISOString(),
            version: 40,
        };
    }

    if (isMobileBackup(raw)) {
        return parseMobileBackup(raw);
    }

    // Normal web backup format: verify essential arrays exist
    return {
        projects: Array.isArray(raw?.projects) ? raw.projects : [],
        reports: Array.isArray(raw?.reports) ? raw.reports : [],
        problems: Array.isArray(raw?.problems) ? raw.problems : [],
        forms: Array.isArray(raw?.forms) ? raw.forms : [],
        formTemplates: Array.isArray(raw?.formTemplates) ? raw.formTemplates : [],
        settings: raw?.settings ? { ...DEFAULT_SETTINGS, ...raw.settings } : DEFAULT_SETTINGS,
        suppliers: Array.isArray(raw?.suppliers) ? raw.suppliers : [],
        quotations: Array.isArray(raw?.quotations) ? raw.quotations : [],
        preventiveEvents: Array.isArray(raw?.preventiveEvents) ? raw.preventiveEvents : [],
        buildingSystemLogs: Array.isArray(raw?.buildingSystemLogs) ? raw.buildingSystemLogs : [],
        invoices: Array.isArray(raw?.invoices) ? raw.invoices : [],
        backupDate: raw?.backupDate || new Date().toISOString(),
        version: raw?.version || 40,
    };
};

/**
 * Generates an exhaustive, well-structured Markdown (.md) backup document
 * that is both human-readable and machine-restorable.
 */
export const exportToMarkdown = (rawBackup: any): string => {
    const fullBackup: FullAppBackup = normalizeBackup(rawBackup);
    const universal = createUniversalSyncBackup(fullBackup);
    const dateStr = new Date().toISOString().split('T')[0];
    const settings = fullBackup.settings || DEFAULT_SETTINGS;

    let md = `# Building Manager - Full System Backup & Documentation\n`;
    md += `> **Export Date:** ${new Date().toISOString()}  \n`;
    md += `> **Schema Version:** 40 (Android Room Database v40 & Web Synchronized)  \n`;
    md += `> **Company / Organization:** ${settings?.companyInfo?.name || 'ניהול מבנים'}  \n`;
    md += `> **Author:** ${settings?.authorName || 'B.Manager'} | ${settings?.authorPhone || ''} | ${settings?.authorEmail || ''}\n\n`;
    md += `---\n\n`;

    // 1. Buildings
    md += `## 1. Buildings & Properties (מבנים ונכסים)\n`;
    md += `**Total Managed Buildings:** ${(fullBackup.projects || []).length}\n\n`;
    md += `| ID | Building Name | Address | Floors | Apartments | Parking Spots | Manager Name | Manager Phone |\n`;
    md += `|---|---|---|---|---|---|---|---|\n`;
    (fullBackup.projects || []).forEach(p => {
        md += `| ${p.id} | ${p.name || ''} | ${p.address || ''} | ${p.numberOfFloors ?? 1} | ${p.apartmentsCount ?? p.tenants?.length ?? 0} | ${p.parkingSpots ?? 0} | ${p.managerName || ''} | ${p.managerPhone || ''} |\n`;
    });
    md += `\n---\n\n`;

    // 2. Tenants
    const allTenants: any[] = [];
    (fullBackup.projects || []).forEach(p => {
        (p.tenants || []).forEach(t => {
            allTenants.push({ ...t, buildingName: p.name, bId: p.id });
        });
    });
    md += `## 2. Tenants & Occupancy (דיירים והסכמי שכירות)\n`;
    md += `**Total Tenants:** ${allTenants.length}\n\n`;
    md += `| Building | Apt/Unit | Tenant Name | Phone | Email | Monthly Rent | Payment Status | Lease Start | Lease End |\n`;
    md += `|---|---|---|---|---|---|---|---|---|\n`;
    allTenants.forEach(t => {
        md += `| ${t.buildingName} | ${t.apartmentNumber || t.officeNumber || '-'} | ${t.name} | ${t.phone || '-'} | ${t.email || '-'} | ₪${t.rentAmount ?? 0} | ${t.paymentStatus || 'שולם'} | ${t.leaseStartDate || '-'} | ${t.leaseEndDate || '-'} |\n`;
    });
    md += `\n---\n\n`;

    // 3. Maintenance Issues
    const problemsList = fullBackup.problems || [];
    md += `## 3. Maintenance Issues & Work Orders (תקלות וקריאות שירות)\n`;
    md += `**Total Issues Recorded:** ${problemsList.length}\n\n`;
    md += `| ID | Location / Building | Severity | Status | Description | Notes |\n`;
    md += `|---|---|---|---|---|---|\n`;
    const reportMap = new Map((fullBackup.reports || []).map(r => [r.id, r]));
    const projectMap = new Map((fullBackup.projects || []).map(p => [p.id, p]));
    problemsList.forEach(prob => {
        const report = reportMap.get(prob.reportId);
        const project = report ? projectMap.get(report.projectId) : undefined;
        const bName = project ? project.name : (report ? report.title : '-');
        const loc = prob.locationTag ? `${bName} (${prob.locationTag})` : bName;
        const status = prob.isFixed ? 'נפתרה (Resolved)' : 'פתוחה (Open)';
        const desc = (prob.description || '').replace(/\n/g, ' ');
        const notes = (prob.notes || '').replace(/\n/g, ' ');
        md += `| ${prob.id} | ${loc} | ${prob.severity} | ${status} | ${desc} | ${notes} |\n`;
    });
    md += `\n---\n\n`;

    // 4. Infrastructure Systems Logs
    const systemLogs = fullBackup.buildingSystemLogs || [];
    md += `## 4. Building Infrastructure Systems & Logs (מערכות תשתית ורישוי)\n`;
    md += `**Total Systems Tracked:** ${systemLogs.length}\n\n`;
    md += `| Building | System Type | System Title | Status | Next Inspection | Technician | Technician Phone |\n`;
    md += `|---|---|---|---|---|---|---|\n`;
    systemLogs.forEach(s => {
        const project = projectMap.get(s.buildingId);
        md += `| ${project ? project.name : s.buildingId} | ${s.systemType} | ${s.title} | ${s.status} | ${s.nextInspectionDate || '-'} | ${s.technicianName || '-'} | ${s.technicianPhone || '-'} |\n`;
    });
    md += `\n---\n\n`;

    // 5. Preventive Events
    const preventive = fullBackup.preventiveEvents || [];
    md += `## 5. Preventive Maintenance Schedule (תחזוקה מונעת תקופתית)\n`;
    md += `**Total Preventive Events:** ${preventive.length}\n\n`;
    md += `| Building | Event Title | Frequency | Scheduled Date | Done | Assigned Worker | Estimated Cost |\n`;
    md += `|---|---|---|---|---|---|---|\n`;
    preventive.forEach(e => {
        const project = projectMap.get(e.buildingId);
        md += `| ${project ? project.name : e.buildingId} | ${e.title} | ${e.frequency} | ${e.scheduledDate} | ${e.isCompleted ? 'כן' : 'לא'} | ${e.assignedWorker || '-'} | ₪${e.cost ?? 0} |\n`;
    });
    md += `\n---\n\n`;

    // 6. Suppliers & Contractors
    md += `## 6. Suppliers & Contractors (ספקים וקבלנים)\n`;
    md += `**Total Suppliers:** ${fullBackup.suppliers.length}\n\n`;
    md += `| Supplier Name | Category / Trade | Phone | Email | Address |\n`;
    md += `|---|---|---|---|---|\n`;
    fullBackup.suppliers.forEach(s => {
        md += `| ${s.name} | ${s.group} | ${s.phone || '-'} | ${s.email || '-'} | ${s.address || '-'} |\n`;
    });
    md += `\n---\n\n`;

    // 7. Invoices & Expenses
    const invoices = fullBackup.invoices || [];
    md += `## 7. Invoices & Financials (חשבוניות והוצאות)\n`;
    md += `**Total Invoices:** ${invoices.length}\n\n`;
    md += `| Invoice # | Building | Supplier | Amount | Date | Status |\n`;
    md += `|---|---|---|---|---|---|\n`;
    invoices.forEach(inv => {
        const project = projectMap.get(inv.buildingId);
        md += `| ${inv.invoiceNumber} | ${project ? project.name : inv.buildingId} | ${inv.supplierName || '-'} | ₪${inv.amount} | ${inv.date} | ${inv.status} |\n`;
    });
    md += `\n---\n\n`;

    // Embedded Universal Sync Payload (enables 100% loss-free roundtrip restore)
    const jsonStr = JSON.stringify(universal);
    md += `<!-- BMANAGER_SYNC_PAYLOAD_START\n${jsonStr}\nBMANAGER_SYNC_PAYLOAD_END -->\n`;

    return md;
};

/**
 * Parses a Markdown (.md) backup file into full app database entities.
 */
export const parseMarkdownBackup = (mdContent: string): FullAppBackup => {
    // 1. Look for embedded BMANAGER_SYNC_PAYLOAD
    const startTag = '<!-- BMANAGER_SYNC_PAYLOAD_START';
    const endTag = 'BMANAGER_SYNC_PAYLOAD_END -->';
    const startIndex = mdContent.indexOf(startTag);
    const endIndex = mdContent.indexOf(endTag);

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        try {
            const jsonPart = mdContent.substring(startIndex + startTag.length, endIndex).trim();
            const rawParsed = JSON.parse(jsonPart);
            return normalizeBackup(rawParsed);
        } catch (e) {
            console.warn('Failed to parse embedded JSON from MD, falling back to markdown table parser:', e);
        }
    }

    // 2. Fallback: Parse markdown tables manually
    const now = new Date().toISOString();
    const lines = mdContent.split('\n').map(l => l.trim());
    
    let currentSection = '';
    const parsedBuildings: any[] = [];
    const parsedTenants: any[] = [];
    const parsedIssues: any[] = [];
    const parsedSystems: any[] = [];
    const parsedPreventive: any[] = [];
    const parsedSuppliers: any[] = [];
    const parsedInvoices: any[] = [];

    lines.forEach(line => {
        if (line.startsWith('## 1.')) currentSection = 'buildings';
        else if (line.startsWith('## 2.')) currentSection = 'tenants';
        else if (line.startsWith('## 3.')) currentSection = 'issues';
        else if (line.startsWith('## 4.')) currentSection = 'systems';
        else if (line.startsWith('## 5.')) currentSection = 'preventive';
        else if (line.startsWith('## 6.')) currentSection = 'suppliers';
        else if (line.startsWith('## 7.')) currentSection = 'invoices';
        else if (line.startsWith('|') && !line.includes('---') && !line.includes('Building Name') && !line.includes('Tenant Name') && !line.includes('Severity') && !line.includes('System Type') && !line.includes('Event Title') && !line.includes('Supplier Name') && !line.includes('Invoice #')) {
            const cols = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
            if (cols.length >= 2) {
                if (currentSection === 'buildings') {
                    // ID | Name | Address | Floors | Apartments | Parking | Manager | Phone
                    parsedBuildings.push({
                        id: cols[0] || generateId(),
                        name: cols[1],
                        address: cols[2] || '',
                        floors: parseInt(cols[3]) || 1,
                        apartmentsCount: parseInt(cols[4]) || 0,
                        parkingSpots: parseInt(cols[5]) || 0,
                        managerName: cols[6] || '',
                        managerPhone: cols[7] || '',
                    });
                } else if (currentSection === 'tenants') {
                    // Building | Apt | Name | Phone | Email | Rent | Status | Start | End
                    parsedTenants.push({
                        id: generateId(),
                        buildingName: cols[0],
                        apartmentNumber: cols[1] !== '-' ? cols[1] : '',
                        name: cols[2],
                        phone: cols[3] !== '-' ? cols[3] : '',
                        email: cols[4] !== '-' ? cols[4] : '',
                        rentAmount: parseFloat((cols[5] || '').replace(/[^\d.]/g, '')) || 0,
                        paymentStatus: cols[6] || 'שולם',
                        leaseStartDate: cols[7] !== '-' ? cols[7] : '',
                        leaseEndDate: cols[8] !== '-' ? cols[8] : '',
                    });
                } else if (currentSection === 'issues') {
                    // ID | Location/Building | Severity | Status | Description | Notes
                    parsedIssues.push({
                        id: cols[0] || generateId(),
                        buildingName: cols[1],
                        priority: cols[2],
                        status: cols[3],
                        description: cols[4],
                        notes: cols[5] || '',
                    });
                } else if (currentSection === 'systems') {
                    // Building | System Type | Title | Status | Next Inspection | Technician | Phone
                    parsedSystems.push({
                        id: generateId(),
                        buildingName: cols[0],
                        systemType: cols[1] || 'other',
                        title: cols[2],
                        status: cols[3],
                        nextInspectionDate: cols[4] !== '-' ? cols[4] : '',
                        technicianName: cols[5] !== '-' ? cols[5] : '',
                        technicianPhone: cols[6] !== '-' ? cols[6] : '',
                    });
                } else if (currentSection === 'preventive') {
                    // Building | Title | Frequency | Date | Done | Worker | Cost
                    parsedPreventive.push({
                        id: generateId(),
                        buildingName: cols[0],
                        title: cols[1],
                        frequency: cols[2],
                        scheduledDate: cols[3] || now.split('T')[0],
                        isCompleted: cols[4] === 'כן' || cols[4] === 'true',
                        assignedWorker: cols[5] !== '-' ? cols[5] : '',
                        cost: parseFloat((cols[6] || '').replace(/[^\d.]/g, '')) || 0,
                    });
                } else if (currentSection === 'suppliers') {
                    // Name | Category | Phone | Email | Address
                    parsedSuppliers.push({
                        id: generateId(),
                        name: cols[0],
                        group: cols[1] || 'כללי',
                        phone: cols[2] !== '-' ? cols[2] : '',
                        email: cols[3] !== '-' ? cols[3] : '',
                        address: cols[4] !== '-' ? cols[4] : '',
                    });
                } else if (currentSection === 'invoices') {
                    // Invoice # | Building | Supplier | Amount | Date | Status
                    parsedInvoices.push({
                        id: generateId(),
                        invoiceNumber: cols[0],
                        buildingName: cols[1],
                        supplierName: cols[2] !== '-' ? cols[2] : '',
                        amount: parseFloat((cols[3] || '').replace(/[^\d.]/g, '')) || 0,
                        date: cols[4] || now.split('T')[0],
                        status: cols[5] || 'ממתין',
                    });
                }
            }
        }
    });

    // Reconstruct raw mobile object from parsed markdown lines
    const raw: any = {
        buildings: parsedBuildings.length > 0 ? parsedBuildings : [{ id: generateId(), name: 'בניין שחולץ מ-MD' }],
        tenants: parsedTenants,
        issues: parsedIssues,
        buildingSystemLogs: parsedSystems,
        preventiveEvents: parsedPreventive,
        suppliers: parsedSuppliers,
        invoices: parsedInvoices,
        backupDate: now,
    };

    return parseMobileBackup(raw);
};

