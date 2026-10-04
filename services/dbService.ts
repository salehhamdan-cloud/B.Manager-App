import { 
    DB_NAME, DB_VERSION, OBJECT_STORES,
    OBJECT_STORE_PROJECTS, OBJECT_STORE_REPORTS, OBJECT_STORE_PROBLEMS, 
    OBJECT_STORE_SETTINGS, OBJECT_STORE_FORM_TEMPLATES, OBJECT_STORE_PROJECT_FORMS, 
    DEFAULT_SETTINGS, SETTINGS_ID, BACKUP_SCHEMA_VERSION, 
    OBJECT_STORE_NOTIFICATIONS, OBJECT_STORE_SUPPLIERS, OBJECT_STORE_QUOTATIONS,
    OBJECT_STORE_PREVENTIVE_EVENTS, OBJECT_STORE_SYSTEM_LOGS, OBJECT_STORE_INVOICES
} from '../constants';
import { 
    Project, Report, Problem, AppSettings, FormTemplate, ProjectForm, FullAppBackup, 
    GlobalDashboardStats, UpcomingTask, UpcomingPermit, UpcomingWarranty, FormWithContext, FileWithContext, 
    TodoWithContext, ProblemWithContext, 
    Notification, Supplier, Quotation, QuotationStatus, TenantWithContext, SearchResult,
    NotificationItemType, NotificationAction,
    WorkerWithContext, SubProjectWithContext, InventoryItemWithContext,
    PreventiveEvent, BuildingSystemLog, Invoice
} from '../types';
import { generateId } from '../utils/idGenerator';
import { createUniversalSyncBackup, normalizeBackup, exportToMarkdown } from './mobileSyncService';
import { recordPendingChange, isAppOffline, SyncAction, SyncEntityType } from './syncQueueService';

const trackOfflineChange = (
    action: SyncAction,
    entityType: SyncEntityType,
    entityId: string,
    entityName?: string,
    details?: string
) => {
    if (isAppOffline()) {
        recordPendingChange(action, entityType, entityId, entityName, details);
    }
};

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            OBJECT_STORES.forEach(storeName => {
                if (!db.objectStoreNames.contains(storeName)) {
                    const store = db.createObjectStore(storeName, { keyPath: 'id' });
                    // Example of creating an index. More can be added for performance.
                    if (storeName === OBJECT_STORE_REPORTS) {
                        store.createIndex('projectId', 'projectId', { unique: false });
                    }
                     if (storeName === OBJECT_STORE_PROBLEMS) {
                        store.createIndex('reportId', 'reportId', { unique: false });
                    }
                }
            });
        };

        request.onsuccess = (event) => {
            resolve((event?.target as any)?.result || request.result);
        };

        request.onerror = (event) => {
            console.error('IndexedDB error:', (event?.target as any)?.error || request.error);
            reject('IndexedDB error');
            dbPromise = null;
        };
    });
    return dbPromise;
};

const getStore = async (storeName: string, mode: IDBTransactionMode): Promise<IDBObjectStore> => {
    const db = await openDB();
    return db.transaction(storeName, mode).objectStore(storeName);
};

const getAllFromStore = async <T>(storeName: string): Promise<T[]> => {
    const store = await getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const getFromStore = async <T>(storeName: string, id: string): Promise<T | null> => {
    const store = await getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
};

const putToStore = async <T>(storeName: string, item: T): Promise<void> => {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const deleteFromStore = async (storeName: string, id: string): Promise<void> => {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const clearStore = async (storeName: string): Promise<void> => {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// --- Helper Functions ---
const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return undefined;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(removeUndefined).filter(v => v !== undefined);
    return Object.fromEntries(
        Object.entries(obj)
            .map(([key, value]) => [key, removeUndefined(value)])
            .filter(([, value]) => value !== undefined)
    );
};

// --- Notifications ---
const addNotification = (notification: Notification) => {
    putToStore(OBJECT_STORE_NOTIFICATIONS, removeUndefined(notification))
        .catch(error => console.error("Failed to add notification:", error));
};

const createAndAddNotification = (
    itemType: NotificationItemType,
    action: NotificationAction,
    itemId: string,
    itemName: string,
    projectId?: string,
    projectName?: string
) => {
    const itemTypeHebrew: Record<NotificationItemType, { singular: string, gender: 'm' | 'f' }> = {
        building: { singular: 'בניין', gender: 'm' }, report: { singular: 'דוח', gender: 'm' },
        problem: { singular: 'תקלה', gender: 'f' }, form: { singular: 'טופס', gender: 'm' },
        formTemplate: { singular: 'תבנית', gender: 'f' }, file: { singular: 'קובץ', gender: 'm' },
        todo: { singular: 'משימה', gender: 'f' }, tenant: { singular: 'דייר', gender: 'm' },
        worker: { singular: 'עובד', gender: 'm' }, supplier: { singular: 'ספק', gender: 'm' },
        quotation: { singular: 'הצעת מחיר', gender: 'f' }, system: { singular: 'מערכת', gender: 'f' },
        inventory: { singular: 'פריט מלאי', gender: 'm' }, 'sub-project': { singular: 'פרויקט משנה', gender: 'm' },
    };
    const actionTypeHebrew: Record<NotificationAction, { m: string, f: string }> = {
        create: { m: 'נוצר', f: 'נוצרה' }, update: { m: 'עודכן', f: 'עודכנה' },
        delete: { m: 'נמחק', f: 'נמחקה' }, complete: { m: 'הושלם', f: 'הושלמה' },
        info: { m: 'מידע', f: 'מידע' },
    };
    
    const itemInfo = itemTypeHebrew[itemType] || { singular: itemType, gender: 'm' };
    const actionInfo = actionTypeHebrew[action] || actionTypeHebrew.info;
    const actionText = actionInfo[itemInfo.gender];
    
    let message = `${itemInfo.singular} ${actionText}: "${itemName}"`;
    if (projectName && itemType !== 'building') message += ` בבניין "${projectName}"`;

    addNotification({
        id: generateId(), itemType, action, itemId, itemName, projectId, projectName, message,
        createdAt: new Date().toISOString(), isRead: false,
    });
};

export const getAllNotifications = (): Promise<Notification[]> => getAllFromStore<Notification>(OBJECT_STORE_NOTIFICATIONS);

export const markAllNotificationsAsRead = async (): Promise<void> => {
    const notifications = await getAllNotifications();
    await Promise.all(notifications.map(n => putToStore(OBJECT_STORE_NOTIFICATIONS, { ...n, isRead: true })));
};

export const markNotificationAsRead = async (id: string): Promise<void> => {
    const notification = await getFromStore<Notification>(OBJECT_STORE_NOTIFICATIONS, id);
    if (notification) {
        await putToStore(OBJECT_STORE_NOTIFICATIONS, { ...notification, isRead: true });
    }
};

export const logSystemError = (itemName: string, message: string) => {
    addNotification({
        id: generateId(), itemId: generateId(), itemType: 'system', action: 'info',
        itemName, message, createdAt: new Date().toISOString(), isRead: false,
    });
};

// --- Settings ---
export const getSettings = async (): Promise<AppSettings> => {
    let settings = await getFromStore<AppSettings>(OBJECT_STORE_SETTINGS, SETTINGS_ID);
    if (!settings) {
        await putToStore(OBJECT_STORE_SETTINGS, DEFAULT_SETTINGS);
        settings = DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...settings };
};

export const updateSettings = (settings: AppSettings): Promise<void> => {
    return putToStore(OBJECT_STORE_SETTINGS, removeUndefined(settings));
};

// --- Projects ---
export const getAllProjects = (): Promise<Project[]> => getAllFromStore<Project>(OBJECT_STORE_PROJECTS);
export const getProject = (id: string): Promise<Project | null> => getFromStore<Project>(OBJECT_STORE_PROJECTS, id);

export const addProject = async (project: Project): Promise<void> => {
    await putToStore(OBJECT_STORE_PROJECTS, removeUndefined(project));
    createAndAddNotification('building', 'create', project.id, project.name);
    trackOfflineChange('create', 'project', project.id, project.name);
};

export const updateProject = async (project: Project): Promise<void> => {
    await putToStore(OBJECT_STORE_PROJECTS, removeUndefined(project));
    trackOfflineChange('update', 'project', project.id, project.name);
};

export const deleteProject = async (id: string): Promise<void> => {
    const project = await getProject(id);
    if (!project) return;
    
    const reports = await getReportsByProjectId(id);
    for (const report of reports) {
        await deleteReport(report.id); // This will cascade delete problems and forms
    }
    
    await deleteFromStore(OBJECT_STORE_PROJECTS, id);
    createAndAddNotification('building', 'delete', project.id, project.name);
    trackOfflineChange('delete', 'project', id, project.name);
};

export const deleteProjectFile = async (projectId: string, fileId: string): Promise<void> => {
    const project = await getProject(projectId);
    if (!project) throw new Error("Project not found");
    const fileToDelete = project.files.find(f => f.id === fileId);
    project.files = project.files.filter(f => f.id !== fileId);
    await updateProject(project);
    if (fileToDelete) createAndAddNotification('file', 'delete', fileId, fileToDelete.name, project.id, project.name);
};

export const deleteProjectTodo = async (projectId: string, todoId: string): Promise<void> => {
    const project = await getProject(projectId);
    if (!project) throw new Error("Project not found");
    const todoToDelete = project.todos?.find(t => t.id === todoId);
    project.todos = (project.todos || []).filter(t => t.id !== todoId);
    await updateProject(project);
    if (todoToDelete) createAndAddNotification('todo', 'delete', todoId, todoToDelete.description, project.id, project.name);
};

export const deleteWorker = async (projectId: string, workerId: string): Promise<void> => {
    const project = await getProject(projectId);
    if (!project) throw new Error("Project not found");
    const workerToDelete = project.workers?.find(w => w.id === workerId);
    project.workers = (project.workers || []).filter(w => w.id !== workerId);
    await updateProject(project);
    if(workerToDelete) createAndAddNotification('worker', 'delete', workerId, workerToDelete.name, project.id, project.name);
};

export const deleteFiles = async (fileIdentifiers: { fileId: string; projectId: string }[]): Promise<void> => {
    const filesByProject = fileIdentifiers.reduce((acc, { fileId, projectId }) => {
        if (!acc[projectId]) acc[projectId] = [];
        acc[projectId].push(fileId);
        return acc;
    }, {} as Record<string, string[]>);

    for (const projectId in filesByProject) {
        const project = await getProject(projectId);
        if (project) {
            const fileIdsToDelete = new Set(filesByProject[projectId]);
            project.files.forEach(f => {
                if(fileIdsToDelete.has(f.id)) createAndAddNotification('file', 'delete', f.id, f.name, projectId, project.name);
            });
            project.files = project.files.filter(f => !fileIdsToDelete.has(f.id));
            await updateProject(project);
        }
    }
};

// --- Reports ---
export const getReportsByProjectId = async (projectId: string): Promise<Report[]> => {
    const db = await openDB();
    const tx = db.transaction(OBJECT_STORE_REPORTS, 'readonly');
    const index = tx.objectStore(OBJECT_STORE_REPORTS).index('projectId');
    return new Promise((resolve, reject) => {
        const request = index.getAll(projectId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getReport = (id: string): Promise<Report | null> => getFromStore<Report>(OBJECT_STORE_REPORTS, id);
export const getAllReports = (): Promise<Report[]> => getAllFromStore<Report>(OBJECT_STORE_REPORTS);
export const addReport = async (report: Report): Promise<void> => {
    await putToStore(OBJECT_STORE_REPORTS, removeUndefined(report));
    const project = await getProject(report.projectId);
    createAndAddNotification('report', 'create', report.id, report.title, project?.id, project?.name);
    trackOfflineChange('create', 'report', report.id, report.title);
};
export const updateReport = async (report: Report): Promise<void> => {
    await putToStore(OBJECT_STORE_REPORTS, removeUndefined(report));
    const project = await getProject(report.projectId);
    createAndAddNotification('report', 'update', report.id, report.title, project?.id, project?.name);
    trackOfflineChange('update', 'report', report.id, report.title);
};
export const deleteReport = async (id: string): Promise<void> => {
    const report = await getReport(id);
    if (!report) return;
    const problems = await getProblemsByReportId(id);
    await Promise.all(problems.map(p => deleteProblem(p.id)));
    const forms = await getProjectFormsByReportId(id);
    await Promise.all(forms.map(f => deleteProjectForm(f.id)));
    await deleteFromStore(OBJECT_STORE_REPORTS, id);
    const project = await getProject(report.projectId);
    createAndAddNotification('report', 'delete', report.id, report.title, project?.id, project?.name);
    trackOfflineChange('delete', 'report', id, report.title);
};

// --- Problems ---
export const getProblemsByReportId = async (reportId: string): Promise<Problem[]> => {
    const db = await openDB();
    const tx = db.transaction(OBJECT_STORE_PROBLEMS, 'readonly');
    const index = tx.objectStore(OBJECT_STORE_PROBLEMS).index('reportId');
    return new Promise((resolve, reject) => {
        const request = index.getAll(reportId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getProblem = (id: string): Promise<Problem | null> => getFromStore<Problem>(OBJECT_STORE_PROBLEMS, id);
export const addProblem = async (problem: Problem): Promise<void> => {
    await putToStore(OBJECT_STORE_PROBLEMS, removeUndefined(problem));
    const report = await getReport(problem.reportId);
    const project = report ? await getProject(report.projectId) : null;
    createAndAddNotification('problem', 'create', problem.id, problem.description, project?.id, project?.name);
    trackOfflineChange('create', 'problem', problem.id, problem.description);
};
export const updateProblem = async (problem: Problem): Promise<void> => {
    const originalProblem = await getProblem(problem.id);
    await putToStore(OBJECT_STORE_PROBLEMS, removeUndefined(problem));
    const report = await getReport(problem.reportId);
    const project = report ? await getProject(report.projectId) : null;
    if (originalProblem && originalProblem.isFixed !== problem.isFixed) {
        if (problem.isFixed) createAndAddNotification('problem', 'complete', problem.id, problem.description, project?.id, project?.name);
        else createAndAddNotification('problem', 'update', problem.id, 'הוחזר לטיפול: ' + problem.description, project?.id, project?.name);
    } else {
        createAndAddNotification('problem', 'update', problem.id, problem.description, project?.id, project?.name);
    }
    trackOfflineChange('update', 'problem', problem.id, problem.description);
};
export const deleteProblem = async (id: string): Promise<void> => {
    const problem = await getProblem(id);
    if (!problem) return;
    await deleteFromStore(OBJECT_STORE_PROBLEMS, id);
    const report = await getReport(problem.reportId);
    const project = report ? await getProject(report.projectId) : null;
    createAndAddNotification('problem', 'delete', problem.id, problem.description, project?.id, project?.name);
    trackOfflineChange('delete', 'problem', id, problem.description);
};
export const updateProblemsOrder = (problems: Problem[]): Promise<void[]> => Promise.all(problems.map(p => putToStore(OBJECT_STORE_PROBLEMS, p)));

// --- Form Templates ---
export const getAllFormTemplates = (): Promise<FormTemplate[]> => getAllFromStore<FormTemplate>(OBJECT_STORE_FORM_TEMPLATES);
export const getFormTemplate = (id: string): Promise<FormTemplate | null> => getFromStore<FormTemplate>(OBJECT_STORE_FORM_TEMPLATES, id);
export const addFormTemplate = async (template: FormTemplate): Promise<void> => {
    await putToStore(OBJECT_STORE_FORM_TEMPLATES, removeUndefined(template));
    createAndAddNotification('formTemplate', 'create', template.id, template.name);
};
export const updateFormTemplate = async (template: FormTemplate): Promise<void> => {
    await putToStore(OBJECT_STORE_FORM_TEMPLATES, removeUndefined(template));
    createAndAddNotification('formTemplate', 'update', template.id, template.name);
};
export const deleteFormTemplate = async (id: string): Promise<void> => {
    const template = await getFormTemplate(id);
    if (!template) return;
    await deleteFromStore(OBJECT_STORE_FORM_TEMPLATES, id);
    createAndAddNotification('formTemplate', 'delete', id, template.name);
};

// --- Project Forms ---
export const getProjectFormsByReportId = async (reportId: string): Promise<ProjectForm[]> => {
    const allForms = await getAllFromStore<ProjectForm>(OBJECT_STORE_PROJECT_FORMS);
    return allForms.filter(form => form.reportId === reportId);
};
export const getProjectFormsByProjectId = async (projectId: string): Promise<ProjectForm[]> => {
    const allForms = await getAllFromStore<ProjectForm>(OBJECT_STORE_PROJECT_FORMS);
    return allForms.filter(form => form.projectId === projectId);
};
export const getProjectForm = (id: string): Promise<ProjectForm | null> => getFromStore<ProjectForm>(OBJECT_STORE_PROJECT_FORMS, id);
export const addProjectForm = async (form: ProjectForm): Promise<void> => {
    await putToStore(OBJECT_STORE_PROJECT_FORMS, removeUndefined(form));
    const project = await getProject(form.projectId);
    createAndAddNotification('form', 'create', form.id, form.formTemplateName, project?.id, project?.name);
};
export const updateProjectForm = async (form: ProjectForm): Promise<void> => {
    await putToStore(OBJECT_STORE_PROJECT_FORMS, removeUndefined(form));
    const project = await getProject(form.projectId);
    createAndAddNotification('form', 'update', form.id, form.formTemplateName, project?.id, project?.name);
};
export const deleteProjectForm = async (id: string): Promise<void> => {
    const form = await getProjectForm(id);
    if (!form) return;
    await deleteFromStore(OBJECT_STORE_PROJECT_FORMS, id);
    const project = await getProject(form.projectId);
    createAndAddNotification('form', 'delete', id, form.formTemplateName, project?.id, project?.name);
};

// --- Suppliers & Quotations ---
export const getAllSuppliers = (): Promise<Supplier[]> => getAllFromStore<Supplier>(OBJECT_STORE_SUPPLIERS);
export const addSupplier = async (supplier: Supplier): Promise<void> => {
    await putToStore(OBJECT_STORE_SUPPLIERS, removeUndefined(supplier));
    createAndAddNotification('supplier', 'create', supplier.id, supplier.name);
};
export const updateSupplier = async (supplier: Supplier): Promise<void> => {
    await putToStore(OBJECT_STORE_SUPPLIERS, removeUndefined(supplier));
    createAndAddNotification('supplier', 'update', supplier.id, supplier.name);
};
export const deleteSupplier = async (id: string): Promise<void> => {
    const supplier = await getFromStore<Supplier>(OBJECT_STORE_SUPPLIERS, id);
    if (!supplier) return;
    await deleteFromStore(OBJECT_STORE_SUPPLIERS, id);
    createAndAddNotification('supplier', 'delete', id, supplier.name);
};
export const deleteSuppliers = (ids: string[]): Promise<void[]> => Promise.all(ids.map(id => deleteSupplier(id)));

export const getAllQuotations = (): Promise<Quotation[]> => getAllFromStore<Quotation>(OBJECT_STORE_QUOTATIONS);
export const addQuotation = async (quotation: Quotation): Promise<void> => {
    await putToStore(OBJECT_STORE_QUOTATIONS, removeUndefined(quotation));
    createAndAddNotification('quotation', 'create', quotation.id, quotation.quotationName, quotation.projectId, quotation.projectName);
};
export const updateQuotation = async (quotation: Quotation): Promise<void> => {
    await putToStore(OBJECT_STORE_QUOTATIONS, removeUndefined(quotation));
    createAndAddNotification('quotation', 'update', quotation.id, quotation.quotationName, quotation.projectId, quotation.projectName);
};
export const deleteQuotation = async (id: string): Promise<void> => {
    const quotation = await getFromStore<Quotation>(OBJECT_STORE_QUOTATIONS, id);
    if (!quotation) return;
    await deleteFromStore(OBJECT_STORE_QUOTATIONS, id);
    createAndAddNotification('quotation', 'delete', id, quotation.quotationName, quotation.projectId, quotation.projectName);
};
export const deleteQuotations = (ids: string[]): Promise<void[]> => Promise.all(ids.map(id => deleteQuotation(id)));

// --- Aggregate Queries ---
export const getAllFiles = async (): Promise<FileWithContext[]> => {
    const projects = await getAllProjects();
    return projects.flatMap(p => (p.files || []).map(f => ({ ...f, projectId: p.id, projectName: p.name })));
};
export const getAllTodos = async (): Promise<TodoWithContext[]> => {
    const projects = await getAllProjects();
    return projects.flatMap(p => (p.todos || []).map(t => ({ ...t, projectId: p.id, projectName: p.name })));
};
export const getAllTenantsWithContext = async (): Promise<TenantWithContext[]> => {
    const projects = await getAllProjects();
    return projects.flatMap(p => (p.tenants || []).map(t => ({ ...t, projectId: p.id, projectName: p.name })));
};
export const getAllWorkersWithContext = async (): Promise<WorkerWithContext[]> => {
    const projects = await getAllProjects();
    return projects.flatMap(p => (p.workers || []).map(w => ({ ...w, projectId: p.id, projectName: p.name })));
};
export const deleteTenants = async (tenants: TenantWithContext[]): Promise<void> => {
    const tenantsByProject = tenants.reduce((acc, tenant) => {
        if (!acc[tenant.projectId]) acc[tenant.projectId] = [];
        acc[tenant.projectId].push(tenant.id);
        return acc;
    }, {} as Record<string, string[]>);
    for (const projectId in tenantsByProject) {
        const project = await getProject(projectId);
        if (project) {
            const tenantIdsToDelete = new Set(tenantsByProject[projectId]);
            project.tenants = (project.tenants || []).filter(t => !tenantIdsToDelete.has(t.id));
            await updateProject(project);
        }
    }
};
export const deleteWorkers = async (workers: WorkerWithContext[]): Promise<void> => {
    const workersByProject = workers.reduce((acc, worker) => {
        if (!acc[worker.projectId]) acc[worker.projectId] = [];
        acc[worker.projectId].push(worker.id);
        return acc;
    }, {} as Record<string, string[]>);

    for (const projectId in workersByProject) {
        const project = await getProject(projectId);
        if (project) {
            const workerIdsToDelete = new Set(workersByProject[projectId]);
            project.workers = (project.workers || []).filter(w => !workerIdsToDelete.has(w.id));
            await updateProject(project);
        }
    }
};

export const getAllProblemsWithContext = async (): Promise<ProblemWithContext[]> => {
    const [projects, reports, problems] = await Promise.all([getAllProjects(), getAllReports(), getAllFromStore<Problem>(OBJECT_STORE_PROBLEMS)]);
    const projectsMap = new Map(projects.map(p => [p.id, p]));
    const reportsMap = new Map(reports.map(r => [r.id, r]));
    return problems.map(problem => {
        const report = reportsMap.get(problem.reportId);
        if (!report) return { ...problem, reportTitle: 'N/A', reportDate: 'N/A', projectId: 'N/A', projectName: 'N/A' };
        const project = projectsMap.get(report.projectId);
        return { ...problem, reportTitle: report.title, reportDate: report.date, projectId: project?.id || 'N/A', projectName: project?.name || 'N/A' };
    });
};

export const getAllProjectFormsWithContext = async (): Promise<FormWithContext[]> => {
    const [forms, projects, reports] = await Promise.all([getAllFromStore<ProjectForm>(OBJECT_STORE_PROJECT_FORMS), getAllProjects(), getAllReports()]);
    const projectsMap = new Map(projects.map(p => [p.id, p.name]));
    const reportsMap = new Map(reports.map(r => [r.id, r.group]));
    return forms.map(form => ({ ...form, projectName: projectsMap.get(form.projectId) || 'Unknown', reportGroup: reportsMap.get(form.reportId) }));
};

export const getAllUniqueInventoryGroupNames = async (): Promise<string[]> => {
    const projects = await getAllProjects();
    const groupNames = new Set<string>();
    projects.forEach(p => (p.inventory || []).forEach(l => l.itemGroups.forEach(g => groupNames.add(g.name))));
    return Array.from(groupNames).sort((a, b) => a.localeCompare(b, 'he'));
};

export const getGlobalDashboardStats = async (): Promise<GlobalDashboardStats> => {
    const [projects, problems, settings, reports, preventiveEvents, systemLogs, invoices, quotations] = await Promise.all([
        getAllProjects(),
        getAllFromStore<Problem>(OBJECT_STORE_PROBLEMS),
        getSettings(),
        getAllReports(),
        getAllPreventiveEvents(),
        getAllSystemLogs(),
        getAllInvoices(),
        getAllQuotations(),
    ]);

    const notificationDays = settings?.notificationDays || 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const notificationDateLimit = new Date();
    notificationDateLimit.setDate(today.getDate() + notificationDays);
    const leaseExpiringLimit = new Date();
    leaseExpiringLimit.setDate(today.getDate() + 30);

    const openIssues = problems.filter(p => !p.isFixed);
    const criticalIssuesByProject: Record<string, number> = {};
    const reportsMap = new Map(reports.map(r => [r.id, r]));

    openIssues.forEach(p => {
        if (p.severity === "קריטית") {
            const report = reportsMap.get(p.reportId);
            if (report) {
                criticalIssuesByProject[report.projectId] = (criticalIssuesByProject[report.projectId] || 0) + 1;
            }
        }
    });

    const allFiles = projects.flatMap(p => (p.files || []).map(f => ({ ...f, projectId: p.id, projectName: p.name })));
    const allTodos = projects.flatMap(p => (p.todos || []).map(t => ({ ...t, projectId: p.id, projectName: p.name })));
    const allTenantsList = projects.flatMap(p => (p.tenants || []).map(t => ({ ...t, projectId: p.id, projectName: p.name })));

    const dueSoonFilesList: UpcomingTask[] = [];
    const expiredFilesList: UpcomingTask[] = [];
    allFiles.forEach(file => {
        if (file.dueDate) {
            const dueDate = new Date(file.dueDate);
            if (dueDate < today) {
                expiredFilesList.push({ id: file.id, name: file.name, dueDate: file.dueDate, type: 'file', projectId: file.projectId, projectName: file.projectName });
            } else if (dueDate <= notificationDateLimit) {
                dueSoonFilesList.push({ id: file.id, name: file.name, dueDate: file.dueDate, type: 'file', projectId: file.projectId, projectName: file.projectName });
            }
        }
    });

    const dueSoonTodosList: UpcomingTask[] = [];
    const expiredTodosList: UpcomingTask[] = [];
    allTodos.forEach(todo => {
        if (!todo.isCompleted && todo.dueDate) {
            const dueDate = new Date(todo.dueDate);
            if (dueDate < today) {
                expiredTodosList.push({ id: todo.id, name: todo.description, dueDate: todo.dueDate, type: 'todo', projectId: todo.projectId, projectName: todo.projectName });
            } else if (dueDate <= notificationDateLimit) {
                dueSoonTodosList.push({ id: todo.id, name: todo.description, dueDate: todo.dueDate, type: 'todo', projectId: todo.projectId, projectName: todo.projectName });
            }
        }
    });
    
    // Permits and Warranties
    const dueSoonPermitsList: UpcomingPermit[] = [];
    const expiredPermitsList: UpcomingPermit[] = [];
    const dueSoonWarrantiesList: UpcomingWarranty[] = [];
    const expiredWarrantiesList: UpcomingWarranty[] = [];
    const lowInventoryList: { id: string; name: string; quantity: number; location: string; buildingName: string; }[] = [];

    projects.forEach(p => {
        (p.workers || []).forEach(w => {
            const permits = [w.safetyPermit, w.workAtHeightPermit, ...w.licenses.map(l => l.file)];
            permits.forEach(permit => {
                if (permit?.validUntil) {
                    const dueDate = new Date(permit.validUntil);
                    const permitDetails = { id: permit.id!, workerName: w.name, permitName: permit.name, validUntil: permit.validUntil, projectId: p.id, projectName: p.name };
                    if (dueDate < today) expiredPermitsList.push(permitDetails);
                    else if (dueDate <= notificationDateLimit) dueSoonPermitsList.push(permitDetails);
                }
            });
        });
        (p.inventory || []).forEach(l => l.itemGroups.forEach(g => g.items.forEach(i => {
            if (i.warrantyEndDate) {
                const dueDate = new Date(i.warrantyEndDate);
                const warrantyDetails = { id: i.id, itemName: i.name, warrantyEndDate: i.warrantyEndDate, projectId: p.id, projectName: p.name, locationName: l.name, groupName: g.name };
                if (dueDate < today) expiredWarrantiesList.push(warrantyDetails);
                else if (dueDate <= notificationDateLimit) dueSoonWarrantiesList.push(warrantyDetails);
            }
            if (i.quantity <= 1) {
                lowInventoryList.push({ id: i.id, name: i.name, quantity: i.quantity, location: l.name, buildingName: p.name });
            }
        })));
    });

    // Mobile Smart Reminders: Lease expirations
    const expiringLeasesList: { id: string; name: string; apartment?: string; buildingName: string; leaseEndDate: string; projectId: string; phone?: string; }[] = [];
    const expiredLeasesList: { id: string; name: string; apartment?: string; buildingName: string; leaseEndDate: string; projectId: string; phone?: string; }[] = [];

    allTenantsList.forEach(t => {
        if (t.leaseEndDate) {
            const leaseEnd = new Date(t.leaseEndDate);
            const tenantInfo = {
                id: t.id,
                name: t.name,
                apartment: t.apartmentNumber || t.officeNumber,
                buildingName: t.projectName,
                leaseEndDate: t.leaseEndDate,
                projectId: t.projectId,
                phone: t.phone
            };
            if (leaseEnd < today) {
                expiredLeasesList.push(tenantInfo);
            } else if (leaseEnd <= leaseExpiringLimit) {
                expiringLeasesList.push(tenantInfo);
            }
        }
    });

    // Mobile Smart Reminders: Building systems due for inspection
    const projectMap = new Map(projects.map(p => [p.id, p.name]));
    const dueBuildingSystemsList: { id: string; title: string; systemType: string; nextInspectionDate?: string; buildingId: string; buildingName: string; }[] = [];
    
    // Check both independent store and project nested systemLogs
    const allSystemLogs = [...systemLogs, ...projects.flatMap(p => p.systemLogs || [])];
    const uniqueLogs = Array.from(new Map(allSystemLogs.map(l => [l.id, l])).values());
    uniqueLogs.forEach(log => {
        if (log.status === 'תקול' || log.status === 'דורש בדיקה' || (log.nextInspectionDate && new Date(log.nextInspectionDate) <= notificationDateLimit)) {
            dueBuildingSystemsList.push({
                id: log.id,
                title: log.title,
                systemType: log.systemType,
                nextInspectionDate: log.nextInspectionDate,
                buildingId: log.buildingId,
                buildingName: projectMap.get(log.buildingId) || 'בניין'
            });
        }
    });

    // Mobile Smart Reminders: Overdue / unpaid invoices
    const overdueInvoicesList: { id: string; invoiceNumber: string; amount: number; supplierName?: string; dueDate?: string; buildingId: string; }[] = [];
    invoices.forEach(inv => {
        if (inv.status === 'באיחור' || (inv.dueDate && new Date(inv.dueDate) < today && inv.status !== 'משולם' && inv.status !== 'paid')) {
            overdueInvoicesList.push({
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                amount: inv.amount,
                supplierName: inv.supplierName,
                dueDate: inv.dueDate,
                buildingId: inv.buildingId
            });
        }
    });

    // Financial Metrics
    const invoiceTotal = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const quotationTotal = quotations.reduce((sum, q) => sum + (q.price || 0), 0);
    const totalExpenses = invoiceTotal > 0 ? invoiceTotal : quotationTotal;
    
    const unpaidInvoices = invoices.filter(inv => inv.status !== 'משולם' && inv.status !== 'paid').reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const unpaidQuotations = quotations.filter(q => q.status !== QuotationStatus.INVOICE_PAID).reduce((sum, q) => sum + (q.price || 0), 0);
    const unpaidExpenses = unpaidInvoices > 0 ? unpaidInvoices : unpaidQuotations;

    const upcomingTasks = [...dueSoonFilesList, ...dueSoonTodosList].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 5);
    const statusCounts = projects.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {} as Record<string, number>);

    return {
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'פעיל').length,
        openCriticalIssues: openIssues.filter(p => p.severity === "קריטית").length,
        totalOpenIssues: openIssues.length,
        expiredFiles: expiredFilesList.length,
        expiredTodos: expiredTodosList.length,
        dueSoonFiles: dueSoonFilesList.length,
        dueSoonTodos: dueSoonTodosList.length,
        statusCounts,
        criticalIssuesByProject,
        upcomingTasks,
        dueSoonFilesList,
        expiredFilesList,
        dueSoonTodosList,
        expiredTodosList,
        dueSoonPermits: dueSoonPermitsList.length,
        expiredPermits: expiredPermitsList.length,
        dueSoonWarranties: dueSoonWarrantiesList.length,
        expiredWarranties: expiredWarrantiesList.length,
        dueSoonPermitsList,
        expiredPermitsList,
        dueSoonWarrantiesList,
        expiredWarrantiesList,
        // Mobile smart reminder engine stats
        totalTenants: allTenantsList.length,
        activeTenants: allTenantsList.filter(t => !t.leaseEndDate || new Date(t.leaseEndDate) >= today).length,
        expiringLeasesCount: expiringLeasesList.length,
        expiredLeasesCount: expiredLeasesList.length,
        expiringLeasesList,
        expiredLeasesList,
        lowInventoryCount: lowInventoryList.length,
        lowInventoryList,
        dueBuildingSystemsCount: dueBuildingSystemsList.length,
        dueBuildingSystemsList,
        overdueInvoicesCount: overdueInvoicesList.length,
        overdueInvoicesList,
        totalExpenses,
        unpaidExpenses,
    };
};

// --- Mobile Entity Store Helpers ---

export const getAllPreventiveEvents = (): Promise<PreventiveEvent[]> => getAllFromStore<PreventiveEvent>(OBJECT_STORE_PREVENTIVE_EVENTS);
export const getPreventiveEventsByBuildingId = async (buildingId: string): Promise<PreventiveEvent[]> => {
    const all = await getAllPreventiveEvents();
    return all.filter(e => e.buildingId === buildingId);
};
export const addPreventiveEvent = (event: PreventiveEvent): Promise<void> => putToStore(OBJECT_STORE_PREVENTIVE_EVENTS, event);
export const updatePreventiveEvent = (event: PreventiveEvent): Promise<void> => putToStore(OBJECT_STORE_PREVENTIVE_EVENTS, event);
export const deletePreventiveEvent = (id: string): Promise<void> => deleteFromStore(OBJECT_STORE_PREVENTIVE_EVENTS, id);

export const getAllSystemLogs = (): Promise<BuildingSystemLog[]> => getAllFromStore<BuildingSystemLog>(OBJECT_STORE_SYSTEM_LOGS);
export const getSystemLogsByBuildingId = async (buildingId: string): Promise<BuildingSystemLog[]> => {
    const [all, project] = await Promise.all([getAllSystemLogs(), getProject(buildingId)]);
    const fromStore = all.filter(l => l.buildingId === buildingId);
    const fromProject = project?.systemLogs || [];
    return Array.from(new Map([...fromStore, ...fromProject].map(item => [item.id, item])).values());
};
export const addSystemLog = async (log: BuildingSystemLog): Promise<void> => {
    await putToStore(OBJECT_STORE_SYSTEM_LOGS, log);
    const project = await getProject(log.buildingId);
    if (project) {
        project.systemLogs = [...(project.systemLogs || []).filter(l => l.id !== log.id), log];
        await updateProject(project);
    }
};
export const updateSystemLog = async (log: BuildingSystemLog): Promise<void> => {
    await putToStore(OBJECT_STORE_SYSTEM_LOGS, log);
    const project = await getProject(log.buildingId);
    if (project) {
        project.systemLogs = (project.systemLogs || []).map(l => l.id === log.id ? log : l);
        await updateProject(project);
    }
};
export const deleteSystemLog = async (id: string, buildingId: string): Promise<void> => {
    await deleteFromStore(OBJECT_STORE_SYSTEM_LOGS, id);
    const project = await getProject(buildingId);
    if (project && project.systemLogs) {
        project.systemLogs = project.systemLogs.filter(l => l.id !== id);
        await updateProject(project);
    }
};

export const getAllInvoices = (): Promise<Invoice[]> => getAllFromStore<Invoice>(OBJECT_STORE_INVOICES);
export const getInvoicesByBuildingId = async (buildingId: string): Promise<Invoice[]> => {
    const all = await getAllInvoices();
    return all.filter(i => i.buildingId === buildingId);
};
export const addInvoice = (invoice: Invoice): Promise<void> => putToStore(OBJECT_STORE_INVOICES, invoice);
export const updateInvoice = (invoice: Invoice): Promise<void> => putToStore(OBJECT_STORE_INVOICES, invoice);
export const deleteInvoice = (id: string): Promise<void> => deleteFromStore(OBJECT_STORE_INVOICES, id);

export const globalSearch = async (term: string): Promise<SearchResult[]> => {
    if (term.length < 2) return [];
    const lowercasedTerm = term.toLowerCase();
    const results: SearchResult[] = [];

    const [projects, reports, problems, suppliers] = await Promise.all([
        getAllProjects(),
        getAllReports(),
        getAllFromStore<Problem>(OBJECT_STORE_PROBLEMS),
        getAllSuppliers(),
    ]);

    // Search Projects & nested items
    projects.forEach(p => {
        if (p.name.toLowerCase().includes(lowercasedTerm) || p.address.toLowerCase().includes(lowercasedTerm)) {
            results.push({ type: 'project', id: p.id, title: p.name, context: p.address, link: `/project/${p.id}` });
        }
        (p.files || []).forEach(f => {
            if(f.name.toLowerCase().includes(lowercasedTerm)) {
                results.push({ type: 'file', id: f.id, title: f.name, context: `קובץ בבניין: ${p.name}`, link: `/project/${p.id}/files` });
            }
        });
        (p.todos || []).forEach(t => {
            if(t.description.toLowerCase().includes(lowercasedTerm)) {
                results.push({ type: 'todo', id: t.id, title: t.description, context: `משימה בבניין: ${p.name}`, link: `/project/${p.id}/todos` });
            }
        });
        (p.tenants || []).forEach(t => {
            if(t.name.toLowerCase().includes(lowercasedTerm)) {
                results.push({ type: 'tenant', id: t.id, title: t.name, context: `דייר בבניין: ${p.name}`, link: `/project/${p.id}/tenants` });
            }
        });
        (p.workers || []).forEach(w => {
            if(w.name.toLowerCase().includes(lowercasedTerm)) {
                results.push({ type: 'worker', id: w.id, title: w.name, context: `עובד בבניין: ${p.name}`, link: `/project/${p.id}/workers` });
            }
        });
    });

    // Search Reports
    reports.forEach(r => {
        if (r.title.toLowerCase().includes(lowercasedTerm) || r.description.toLowerCase().includes(lowercasedTerm)) {
            const project = projects.find(p => p.id === r.projectId);
            results.push({ type: 'report', id: r.id, title: r.title, context: `דוח בבניין: ${project?.name || 'לא ידוע'}`, link: `/project/${r.projectId}/report/${r.id}` });
        }
    });

    // Search Problems
    problems.forEach(prob => {
        if (prob.description.toLowerCase().includes(lowercasedTerm) || (prob.locationTag || '').toLowerCase().includes(lowercasedTerm)) {
            const report = reports.find(r => r.id === prob.reportId);
            const project = report ? projects.find(p => p.id === report.projectId) : undefined;
            results.push({ type: 'problem', id: prob.id, title: prob.description, context: `תקלה בדוח "${report?.title || ''}" בבניין: ${project?.name || ''}`, link: `/project/${project?.id}/report/${report?.id}` });
        }
    });

    // Search Suppliers
    suppliers.forEach(s => {
        if (s.name.toLowerCase().includes(lowercasedTerm) || s.group.toLowerCase().includes(lowercasedTerm)) {
            results.push({ type: 'supplier', id: s.id, title: s.name, context: `ספק מתחום: ${s.group}`, link: `/suppliers` });
        }
    });
    
    // De-duplicate results, favoring more specific types
    const uniqueResults = Array.from(new Map(results.map(item => [item.id, item])).values());

    return uniqueResults.slice(0, 50); // Limit results for performance
};

export const checkAndGenerateNotifications = async (_settings: AppSettings) => {
    // Handled dynamically by NotificationsContext
};

// --- Universal Backup/Restore (Mobile Android Room v40 <--> Web IndexedDB) ---

export const exportAllData = async (): Promise<FullAppBackup> => {
    const [projects, reports, problems, forms, formTemplates, settings, suppliers, quotations, preventiveEvents, buildingSystemLogs, invoices] = await Promise.all([
        getAllProjects(), getAllReports(), getAllFromStore<Problem>(OBJECT_STORE_PROBLEMS),
        getAllFromStore<ProjectForm>(OBJECT_STORE_PROJECT_FORMS), getAllFormTemplates(),
        getSettings(), getAllSuppliers(), getAllQuotations(),
        getAllPreventiveEvents(), getAllSystemLogs(), getAllInvoices()
    ]);
    
    const baseBackup: FullAppBackup = {
        projects: projects || [],
        reports: reports || [],
        problems: problems || [],
        forms: forms || [],
        formTemplates: formTemplates || [],
        settings: settings || DEFAULT_SETTINGS,
        suppliers: suppliers || [],
        quotations: quotations || [],
        preventiveEvents: preventiveEvents || [],
        buildingSystemLogs: buildingSystemLogs || [],
        invoices: invoices || [],
        backupDate: new Date().toISOString(),
        version: BACKUP_SCHEMA_VERSION,
    };

    return baseBackup;
};

export const exportAllDataAsMarkdown = async (): Promise<string> => {
    const [projects, reports, problems, forms, formTemplates, settings, suppliers, quotations, preventiveEvents, buildingSystemLogs, invoices] = await Promise.all([
        getAllProjects(), getAllReports(), getAllFromStore<Problem>(OBJECT_STORE_PROBLEMS),
        getAllFromStore<ProjectForm>(OBJECT_STORE_PROJECT_FORMS), getAllFormTemplates(),
        getSettings(), getAllSuppliers(), getAllQuotations(),
        getAllPreventiveEvents(), getAllSystemLogs(), getAllInvoices()
    ]);
    
    const baseBackup: FullAppBackup = {
        projects, reports, problems, forms, formTemplates, settings: settings!, suppliers, quotations,
        preventiveEvents, buildingSystemLogs, invoices,
        backupDate: new Date().toISOString(), version: BACKUP_SCHEMA_VERSION,
    };

    return exportToMarkdown(baseBackup);
};

export const exportAllDataAsMobileZip = async () => {
    const { createMobileZipBackup } = await import('./mobileZipSyncService');
    return createMobileZipBackup();
};

export const importAllDataFromMobileZip = async (zipFile: File | Blob | ArrayBuffer) => {
    const { restoreFromMobileZip } = await import('./mobileZipSyncService');
    return restoreFromMobileZip(zipFile);
};

const yieldTick = (ms = 40) => new Promise(resolve => setTimeout(resolve, ms));

const bulkPutToStore = async (storeName: string, items: any[]): Promise<void> => {
    if (!items || items.length === 0) return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
        try {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            for (const item of items) {
                if (!item || typeof item !== 'object') continue;
                const cleaned = removeUndefined(item);
                if (!cleaned.id) cleaned.id = generateId();
                store.put(cleaned);
            }
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        } catch (e) {
            reject(e);
        }
    });
};

export const importAllData = async (
    raw: any,
    onProgress?: (progress: { percent: number; message: string; details?: string }) => void
): Promise<void> => {
    // If raw input is a ZIP archive or File/Blob ending in .zip, delegate to mobileZipSyncService
    if (raw && (raw instanceof File || raw instanceof Blob || raw instanceof ArrayBuffer)) {
        const { isZipArchive, restoreFromMobileZip } = await import('./mobileZipSyncService');
        if (await isZipArchive(raw)) {
            await restoreFromMobileZip(raw, onProgress as any);
            return;
        }
    }

    onProgress?.({ percent: 15, message: 'מפענח ומאמת את מבנה קובץ הגיבוי...' });
    await yieldTick(40);

    const data = normalizeBackup(raw);

    onProgress?.({ percent: 30, message: 'מפנה ומכין מאגרי נתונים מקומיים...', details: 'IndexedDB cleanup' });
    await yieldTick(40);
    await clearAllData();

    onProgress?.({ percent: 45, message: `מייבא ${data.projects?.length || 0} מבנים ופרויקטים...` });
    await yieldTick(30);
    await bulkPutToStore(OBJECT_STORE_PROJECTS, data.projects || []);

    onProgress?.({ percent: 60, message: `מייבא ${data.reports?.length || 0} דוחות ו-${data.problems?.length || 0} תקלות...` });
    await yieldTick(30);
    await bulkPutToStore(OBJECT_STORE_REPORTS, data.reports || []);
    await bulkPutToStore(OBJECT_STORE_PROBLEMS, data.problems || []);

    onProgress?.({ percent: 75, message: `מייבא ${data.forms?.length || 0} טפסים ו-${data.formTemplates?.length || 0} תבניות...` });
    await yieldTick(30);
    await bulkPutToStore(OBJECT_STORE_PROJECT_FORMS, data.forms || []);
    await bulkPutToStore(OBJECT_STORE_FORM_TEMPLATES, data.formTemplates || []);

    onProgress?.({ percent: 85, message: `מייבא ספקים, הצעות מחיר וחשבוניות...` });
    await yieldTick(30);
    await bulkPutToStore(OBJECT_STORE_SUPPLIERS, data.suppliers || []);
    await bulkPutToStore(OBJECT_STORE_QUOTATIONS, data.quotations || []);
    await bulkPutToStore(OBJECT_STORE_INVOICES, data.invoices || []);

    onProgress?.({ percent: 95, message: 'שומר יומני מערכות, תחזוקה מונעת והגדרות...' });
    await yieldTick(30);
    await bulkPutToStore(OBJECT_STORE_PREVENTIVE_EVENTS, data.preventiveEvents || []);
    await bulkPutToStore(OBJECT_STORE_SYSTEM_LOGS, data.buildingSystemLogs || []);
    await putToStore(OBJECT_STORE_SETTINGS, removeUndefined({ ...(data.settings || DEFAULT_SETTINGS), id: SETTINGS_ID }));

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-data-imported', { detail: data }));
        if (data.settings) {
            window.dispatchEvent(new CustomEvent('app-settings-updated', { detail: data.settings }));
        }
    }

    onProgress?.({ percent: 100, message: 'הייבוא והסנכרון הושלמו בהצלחה מלאה!' });
    await yieldTick(30);
};

export const clearAllData = (): Promise<void[]> => Promise.all(OBJECT_STORES.map(store => clearStore(store)));

export const uploadRawFile = async (file: File, path: string, fileId: string): Promise<{ url: string, storagePath: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            resolve({ url: dataUrl, storagePath: `local://${path}/${fileId}-${file.name}` });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};