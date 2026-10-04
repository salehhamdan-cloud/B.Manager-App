import { AppSettings, Problem, Report, Project, ProjectTodo, Quotation, ProjectFile, Tenant, Supplier, QuotationStatus, GlobalDashboardStats } from '../types';
import { formatDate } from '../utils/dateFormatter';

/**
 * Opens the user's default email client with a pre-filled email.
 * @param recipient The recipient's email address.
 * @param subject The email subject.
 * @param body The email body.
 */
function triggerMailto(recipient: string, subject: string, body: string) {
    const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_self');
}

// --- General Purpose Email Body Builder ---
function buildEmailBody(_title: string, details: Record<string, string | undefined>, actionText: string) {
    const detailsString = Object.entries(details)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

    return `
שלום,

${actionText}

פרטים:
${detailsString}

זוהי הודעה אוטומטית מאפליקציית B.Manager.
    `.trim();
}

// --- Project Actions ---
export const triggerProjectAddEmail = (project: Project, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnProjectAdd) return;
    const subject = `פרויקט חדש נוצר: ${project.name}`;
    const body = buildEmailBody('פרויקט חדש', { 'שם': project.name, 'כתובת': project.address }, 'פרויקט חדש נוצר במערכת.');
    triggerMailto(settings.notificationEmailAddress, subject, body);
};

export const triggerProjectDeleteEmail = (project: Project, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnProjectDelete) return;
    const subject = `פרויקט נמחק: ${project.name}`;
    const body = buildEmailBody('פרויקט שנמחק', { 'שם': project.name, 'כתובת': project.address }, 'הפרויקט הבא נמחק מהמערכת.');
    triggerMailto(settings.notificationEmailAddress, subject, body);
};

// --- Report Actions ---
export const triggerNewReportEmail = (report: Report, project: Project, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnNewReport) return;
    const subject = `דוח חדש נוצר: ${report.title}`;
    const body = buildEmailBody('דוח חדש', { 'בניין': project.name, 'כותרת': report.title, 'תאריך': formatDate(report.date) }, 'דוח חדש נוצר במערכת.');
    triggerMailto(settings.notificationEmailAddress, subject, body);
};

export const triggerReportDeleteEmail = (report: Report, project: Project, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnReportDelete) return;
    const subject = `דוח נמחק: ${report.title}`;
    const body = buildEmailBody('דוח שנמחק', { 'בניין': project.name, 'כותרת': report.title, 'תאריך': formatDate(report.date) }, 'הדוח הבא נמחק מהמערכת.');
    triggerMailto(settings.notificationEmailAddress, subject, body);
};


// --- Problem Actions ---
export const triggerCriticalIssueEmail = (problem: Problem, report: Report, project: Project, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnCriticalIssues) return;
    const subject = `התראה על תקלה קריטית: ${project.name}`;
    const body = buildEmailBody('תקלה קריטית חדשה', { 'בניין': project.name, 'דוח': report.title, 'תיאור': problem.description, 'מיקום': problem.locationTag }, 'זוהי התראה על תקלה חדשה שסווגה כקריטית.');
    triggerMailto(settings.notificationEmailAddress, subject, body);
};

export const triggerProblemAddEmail = (problem: Problem, report: Report, project: Project, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnProblemAdd) return;
    const subject = `תקלה חדשה נוספה: ${problem.description.substring(0, 30)}...`;
    const body = buildEmailBody('תקלה חדשה', { 'בניין': project.name, 'דוח': report.title, 'תיאור': problem.description, 'חומרה': problem.severity }, 'תקלה חדשה נוספה למערכת.');
    triggerMailto(settings.notificationEmailAddress, subject, body);
};

export const triggerProblemDeleteEmail = (problem: Problem, report: Report, project: Project, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnProblemDelete) return;
    const subject = `תקלה נמחקה: ${problem.description.substring(0, 30)}...`;
    const body = buildEmailBody('תקלה שנמחקה', { 'בניין': project.name, 'דוח': report.title, 'תיאור': problem.description }, 'התקלה הבאה נמחקה מהמערכת.');
    triggerMailto(settings.notificationEmailAddress, subject, body);
};

export const triggerProblemMarkAsFixedEmail = (problem: Problem, project: Project, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnProblemMarkAsFixed) return;
    const subject = `תקלה טופלה: ${problem.description.substring(0, 30)}...`;
    const body = buildEmailBody('תקלה סומנה כטופלה', { 'בניין': project.name, 'תיאור': problem.description }, 'התקלה הבאה סומנה כטופלה.');
    triggerMailto(settings.notificationEmailAddress, subject, body);
};

// --- File & Todo Actions ---
export const triggerFileAddEmail = (file: ProjectFile, project: Project, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnFileAdd) return;
    const subject = `קובץ חדש נוסף: ${file.name}`;
    const body = buildEmailBody('קובץ חדש', { 'בניין': project.name, 'שם קובץ': file.name, 'תאריך יעד': file.dueDate ? formatDate(file.dueDate) : 'אין' }, 'קובץ חדש נוסף למערכת.');
    triggerMailto(settings.notificationEmailAddress, subject, body);
};

export const triggerFileDeleteEmail = (file: ProjectFile, project: Project, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnFileDelete) return;
    const subject = `קובץ נמחק: ${file.name}`;
    const body = buildEmailBody('קובץ שנמחק', { 'בניין': project.name, 'שם קובץ': file.name }, 'הקובץ הבא נמחק מהמערכת.');
    triggerMailto(settings.notificationEmailAddress, subject, body);
};

export const triggerTodoAddEmail = (todo: ProjectTodo, project: Project, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnTodoAdd) return;
    const subject = `משימה חדשה: ${todo.description}`;
    const body = buildEmailBody('משימה חדשה', { 'בניין': project.name, 'תיאור': todo.description, 'תאריך יעד': todo.dueDate ? formatDate(todo.dueDate) : 'אין' }, 'משימה חדשה נוספה למערכת.');
    triggerMailto(settings.notificationEmailAddress, subject, body);
};

export const triggerTodoDeleteEmail = (todo: ProjectTodo, project: Project, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnTodoDelete) return;
    const subject = `משימה נמחקה: ${todo.description}`;
    const body = buildEmailBody('משימה שנמחקה', { 'בניין': project.name, 'תיאור': todo.description }, 'המשימה הבאה נמחקה מהמערכת.');
    triggerMailto(settings.notificationEmailAddress, subject, body);
};

export const triggerTaskCompletionEmail = (todo: ProjectTodo, project: Project, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnTaskCompletion) return;
    const subject = `משימה הושלמה: ${todo.description}`;
    const body = buildEmailBody('משימה הושלמה', { 'בניין': project.name, 'משימה': todo.description, 'תאריך יעד מקורי': todo.dueDate ? formatDate(todo.dueDate) : 'לא צוין' }, 'המשימה הבאה סומנה כהושלמה.');
    triggerMailto(settings.notificationEmailAddress, subject, body);
};

export const triggerDigestEmail = (stats: GlobalDashboardStats, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress) return;

    let body = 'שלום,\n\nלהלן סיכום התראות מהמערכת:\n\n';
    let hasContent = false;

    // --- DUE SOON SECTION ---
    const dueSoonItems: string[] = [];
    if (settings.notifyOnFileDueSoon && stats.dueSoonFilesList.length > 0) {
        stats.dueSoonFilesList.forEach(task => dueSoonItems.push(`- קובץ: ${task.name}\n  בניין: ${task.projectName}\n  תאריך יעד: ${formatDate(task.dueDate)}`));
    }
    if (settings.notifyOnTodoDueSoon && stats.dueSoonTodosList.length > 0) {
        stats.dueSoonTodosList.forEach(task => dueSoonItems.push(`- משימה: ${task.name}\n  בניין: ${task.projectName}\n  תאריך יעד: ${formatDate(task.dueDate)}`));
    }
    if (settings.notifyOnPermitDueSoon && stats.dueSoonPermitsList.length > 0) {
        stats.dueSoonPermitsList.forEach(p => dueSoonItems.push(`- היתר: ${p.permitName} (${p.workerName})\n  בניין: ${p.projectName}\n  תאריך יעד: ${formatDate(p.validUntil)}`));
    }
    if (settings.notifyOnWarrantyDueSoon && stats.dueSoonWarrantiesList.length > 0) {
        stats.dueSoonWarrantiesList.forEach(w => dueSoonItems.push(`- אחריות: ${w.itemName}\n  בניין: ${w.projectName}\n  תאריך יעד: ${formatDate(w.warrantyEndDate)}`));
    }

    if (dueSoonItems.length > 0) {
        hasContent = true;
        body += '--- פריטים הדורשים טיפול בקרוב ---\n\n';
        body += dueSoonItems.join('\n\n');
        body += '\n\n';
    }

    // --- EXPIRED SECTION ---
    const expiredItems: string[] = [];
    if (settings.notifyOnFileExpired && stats.expiredFilesList.length > 0) {
        stats.expiredFilesList.forEach(task => expiredItems.push(`- קובץ: ${task.name}\n  בניין: ${task.projectName}\n  פג תוקף ב: ${formatDate(task.dueDate)}`));
    }
    if (settings.notifyOnTodoExpired && stats.expiredTodosList.length > 0) {
        stats.expiredTodosList.forEach(task => expiredItems.push(`- משימה: ${task.name}\n  בניין: ${task.projectName}\n  פג תוקף ב: ${formatDate(task.dueDate)}`));
    }
    if (settings.notifyOnPermitExpired && stats.expiredPermitsList.length > 0) {
        stats.expiredPermitsList.forEach(p => expiredItems.push(`- היתר: ${p.permitName} (${p.workerName})\n  בניין: ${p.projectName}\n  פג תוקף ב: ${formatDate(p.validUntil)}`));
    }
    if (settings.notifyOnWarrantyExpired && stats.expiredWarrantiesList.length > 0) {
        stats.expiredWarrantiesList.forEach(w => expiredItems.push(`- אחריות: ${w.itemName}\n  בניין: ${w.projectName}\n  פג תוקף ב: ${formatDate(w.warrantyEndDate)}`));
    }

    if (expiredItems.length > 0) {
        hasContent = true;
        body += '--- פריטים שפג תוקפם ---\n\n';
        body += expiredItems.join('\n\n');
        body += '\n\n';
    }

    if (!hasContent) {
        // Don't send an empty email
        return;
    }

    body += 'זוהי הודעה אוטומטית מאפליקציית B.Manager.';
    const subject = `סיכום התראות B.Manager - ${formatDate(new Date())}`;
    triggerMailto(settings.notificationEmailAddress, subject, body.trim());
};


// --- Tenant & Supplier Actions ---
export const triggerTenantAddEmail = (tenant: Tenant, project: Project, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnTenantAdd) return;
    const subject = `דייר חדש נוסף: ${tenant.name}`;
    const body = buildEmailBody('דייר חדש', { 'בניין': project.name, 'שם': tenant.name, 'טלפון': tenant.phone }, 'דייר חדש נוסף למערכת.');
    triggerMailto(settings.notificationEmailAddress, subject, body);
};

export const triggerTenantDeleteEmail = (tenant: Tenant, project: Project, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnTenantDelete) return;
    const subject = `דייר נמחק: ${tenant.name}`;
    const body = buildEmailBody('דייר שנמחק', { 'בניין': project.name, 'שם': tenant.name }, 'הדייר הבא נמחק מהמערכת.');
    triggerMailto(settings.notificationEmailAddress, subject, body);
};

export const triggerSupplierAddEmail = (supplier: Supplier, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnSupplierAdd) return;
    const subject = `ספק חדש נוסף: ${supplier.name}`;
    const body = buildEmailBody('ספק חדש', { 'תחום': supplier.group, 'שם': supplier.name, 'טלפון': supplier.phone }, 'ספק חדש נוסף למערכת.');
    triggerMailto(settings.notificationEmailAddress, subject, body);
};

export const triggerSupplierDeleteEmail = (supplier: Supplier, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnSupplierDelete) return;
    const subject = `ספק נמחק: ${supplier.name}`;
    const body = buildEmailBody('ספק שנמחק', { 'שם': supplier.name, 'תחום': supplier.group }, 'הספק הבא נמחק מהמערכת.');
    triggerMailto(settings.notificationEmailAddress, subject, body);
};

// --- Quotation Actions ---
export const triggerQuotationAddEmail = (quotation: Quotation, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnQuotationAdd) return;
    const subject = `הצעת מחיר חדשה: ${quotation.quotationName}`;
    const body = buildEmailBody('הצעת מחיר חדשה', { 'בניין': quotation.projectName, 'שם הצעה': quotation.quotationName, 'ספק': quotation.supplierName, 'מחיר': `₪${quotation.price.toLocaleString()}` }, 'הצעת מחיר חדשה נוספה למערכת.');
    triggerMailto(settings.notificationEmailAddress, subject, body);
};

export const triggerQuotationDeleteEmail = (quotation: Quotation, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnQuotationDelete) return;
    const subject = `הצעת מחיר נמחקה: ${quotation.quotationName}`;
    const body = buildEmailBody('הצעת מחיר שנמחקה', { 'בניין': quotation.projectName, 'שם הצעה': quotation.quotationName, 'ספק': quotation.supplierName }, 'הצעת המחיר הבאה נמחקה מהמערכת.');
    triggerMailto(settings.notificationEmailAddress, subject, body);
};

export const triggerQuotationStatusChangeEmail = (quotation: Quotation, oldStatus: QuotationStatus, newStatus: QuotationStatus, settings: AppSettings) => {
    if (!settings.enableEmailNotifications || !settings.notificationEmailAddress || !settings.notifyOnQuotationStatusChange) return;
    const subject = `עדכון סטטוס להצעת מחיר: ${quotation.quotationName}`;
    
    const actionText = `סטטוס הצעת המחיר "${quotation.quotationName}" שונה מ-"${oldStatus}" ל-"${newStatus}".`;

    const body = buildEmailBody('עדכון סטטוס הצעת מחיר', {
        'בניין': quotation.projectName,
        'שם הצעה': quotation.quotationName,
        'ספק': quotation.supplierName,
        'מחיר': `₪${quotation.price.toLocaleString()}`,
    }, actionText);
    triggerMailto(settings.notificationEmailAddress, subject, body);
};