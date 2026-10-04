import JSZip from 'jszip';
import initSqlJs from 'sql.js/dist/sql-asm.js';
import { 
    FullAppBackup, Project, Report, Problem, FormTemplate, ProjectForm,
    Supplier, Quotation, Tenant, Worker, ProjectTodo, ProjectFile,
    PreventiveEvent, BuildingSystemLog, Invoice, AppSettings, ProblemSeverity, QuotationStatus
} from '../types';
import { generateId } from '../utils/idGenerator';
import { DEFAULT_SETTINGS, SETTINGS_ID } from '../constants';
import { createUniversalSyncBackup, parseMobileBackup, normalizeBackup, findEntityList, getRowVal } from './mobileSyncService';
import * as dbService from './dbService';

/**
 * Mobile ZIP Backup & Restore Service
 * Fully compatible with the Android Room Mobile App:
 * Archive Name: building_manager_backup.zip (MIME: application/zip)
 *
 * Contents:
 * - databases/
 *   - building_manager_database (Complete SQLite database)
 *   - database_export.json (cross-format fallback)
 * - files/
 *   - Attached documents, photos, PDF contracts, blueprints, inspection checklists, digital signatures
 * - shared_prefs/
 *   - building_manager_preferences.xml (Android SharedPreferences XML)
 *   - app_settings.json
 */

export const BACKUP_ZIP_FILENAME = 'building_manager_backup.zip';
export const BACKUP_MIME_TYPE = 'application/zip';

export interface SyncProgress {
    stage: 'preparing' | 'reading' | 'extracting' | 'sqlite' | 'compressing' | 'restoring' | 'saving' | 'complete' | 'error';
    message: string;
    percent: number;
    details?: string;
}

let sqlInstancePromise: Promise<any> | null = null;
const getSqlInstance = async () => {
    if (!sqlInstancePromise) {
        sqlInstancePromise = (initSqlJs as any)();
    }
    return sqlInstancePromise;
};

// --- Binary & Base64 Utilities ---

export const getMimeTypeFromFilename = (filename: string): string => {
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
        default:
            return 'application/octet-stream';
    }
};

export const getExtensionFromMimeType = (mimeType: string): string => {
    switch (mimeType.toLowerCase()) {
        case 'image/jpeg': return 'jpg';
        case 'image/png': return 'png';
        case 'image/webp': return 'webp';
        case 'image/gif': return 'gif';
        case 'image/svg+xml': return 'svg';
        case 'application/pdf': return 'pdf';
        case 'text/csv': return 'csv';
        case 'application/json': return 'json';
        case 'text/plain': return 'txt';
        default: return 'bin';
    }
};

export const dataUrlToUint8Array = (dataUrl: string): { bytes: Uint8Array; mimeType: string } | null => {
    if (!dataUrl || !dataUrl.startsWith('data:')) return null;
    try {
        const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches || matches.length < 3) return null;
        const mimeType = matches[1];
        const base64Data = matches[2];
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return { bytes, mimeType };
    } catch (e) {
        console.warn('Failed to convert dataUrl to Uint8Array', e);
        return null;
    }
};

export const uint8ArrayToDataUrl = (bytes: Uint8Array, mimeType: string): string => {
    let binary = '';
    const len = bytes.byteLength;
    const chunk = 8192;
    for (let i = 0; i < len; i += chunk) {
        const sub = bytes.subarray(i, Math.min(i + chunk, len));
        binary += String.fromCharCode.apply(null, sub as any);
    }
    const base64 = btoa(binary);
    return `data:${mimeType};base64,${base64}`;
};

export const isZipArchive = async (file: File | Blob | ArrayBuffer | Uint8Array): Promise<boolean> => {
    if (file instanceof File && (file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip'))) {
        return true;
    }
    let bytes: Uint8Array;
    if (file instanceof ArrayBuffer) {
        bytes = new Uint8Array(file);
    } else if (file instanceof Uint8Array) {
        bytes = file;
    } else {
        const slice = await (file as Blob).slice(0, 4).arrayBuffer();
        bytes = new Uint8Array(slice);
    }
    // ZIP magic bytes: PK\x03\x04
    return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04;
};

// --- Android SharedPreferences XML Parser & Serializer ---

export const parseSharedPreferencesXml = (xmlStr: string): Record<string, any> => {
    const result: Record<string, any> = {};
    try {
        if (typeof DOMParser === 'undefined') return result;
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlStr, 'application/xml');
        const map = doc.querySelector('map') || doc.documentElement;
        if (!map) return result;

        Array.from(map.children).forEach(el => {
            const name = el.getAttribute('name');
            if (!name) return;
            const tagName = el.tagName.toLowerCase();
            if (tagName === 'string') {
                result[name] = el.textContent || '';
            } else if (tagName === 'boolean') {
                result[name] = el.getAttribute('value') === 'true';
            } else if (tagName === 'int' || tagName === 'long' || tagName === 'float') {
                result[name] = Number(el.getAttribute('value') || el.textContent);
            } else {
                result[name] = el.getAttribute('value') || el.textContent || '';
            }
        });
    } catch (e) {
        console.warn('Failed to parse shared_preferences XML:', e);
    }
    return result;
};

export const generateSharedPreferencesXml = (settings: AppSettings): string => {
    const pairs: [string, string][] = [
        ['company_name', settings.companyInfo?.name || ''],
        ['tax_id', settings.taxId || ''],
        ['company_phone', settings.phone || settings.authorPhone || ''],
        ['company_email', settings.email || settings.authorEmail || ''],
        ['company_address', settings.address || ''],
        ['currency_symbol', settings.currencySymbol || '₪'],
        ['selected_language', settings.language || 'he'],
        ['language', settings.language || 'he'],
        ['app_theme', settings.themeMode || 'system'],
        ['theme', settings.themeMode || 'system'],
        ['author_name', settings.authorName || ''],
        ['author_phone', settings.authorPhone || ''],
        ['author_email', settings.authorEmail || ''],
        ['color_palette', settings.colorPalette || 'default'],
        ['header_color', settings.appTheme?.headerColor || '#0284c7'],
        ['accent_color', settings.appTheme?.accentColor || '#f59e0b'],
        ['last_backup_date', new Date().toISOString()],
    ];

    let xml = `<?xml version='1.0' encoding='utf-8' standalone='yes' ?>\n<map>\n`;
    pairs.forEach(([k, v]) => {
        const safeVal = (v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        xml += `    <string name="${k}">${safeVal}</string>\n`;
    });
    xml += `</map>\n`;
    return xml;
};

// --- SQLite Database Creator for Android Room v40 ---

export const createRoomSqliteDatabase = async (universalBackup: any): Promise<Uint8Array> => {
    const SQL = await getSqlInstance();
    const db = new SQL.Database();

    // 1. Android Room Internal Tables
    db.run(`CREATE TABLE IF NOT EXISTS android_metadata (locale TEXT);`);
    db.run(`INSERT INTO android_metadata VALUES ('en_US');`);

    db.run(`CREATE TABLE IF NOT EXISTS room_master_table (id INTEGER PRIMARY KEY, identity_hash TEXT);`);
    db.run(`INSERT OR REPLACE INTO room_master_table VALUES (42, 'bmanager_universal_v40_identity_hash');`);

    // 2. Room v40 Schema Tables
    db.run(`
        CREATE TABLE IF NOT EXISTS buildings (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT,
            address TEXT,
            floors INTEGER DEFAULT 1,
            apartmentsCount INTEGER DEFAULT 0,
            parkingSpots INTEGER DEFAULT 0,
            managerName TEXT,
            managerPhone TEXT,
            managerEmail TEXT,
            notes TEXT,
            imagePath TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS tenants (
            id TEXT PRIMARY KEY NOT NULL,
            buildingId TEXT,
            name TEXT,
            apartmentNumber TEXT,
            floorNumber TEXT,
            phone TEXT,
            email TEXT,
            leaseStartDate TEXT,
            leaseEndDate TEXT,
            rentAmount REAL DEFAULT 0,
            paymentStatus TEXT,
            contactPerson TEXT,
            emergencyContact TEXT,
            contractFilePath TEXT,
            signaturePath TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS issues (
            id TEXT PRIMARY KEY NOT NULL,
            buildingId TEXT,
            apartmentNumber TEXT,
            title TEXT,
            description TEXT,
            priority TEXT,
            status TEXT,
            reportedDate TEXT,
            resolvedDate TEXT,
            assignedTo TEXT,
            cost REAL DEFAULT 0,
            photoPath TEXT,
            afterPhotoPath TEXT,
            signaturePath TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY NOT NULL,
            buildingId TEXT,
            title TEXT,
            description TEXT,
            status TEXT,
            priority TEXT,
            dueDate TEXT,
            assignedWorker TEXT,
            estimatedBudget REAL DEFAULT 0,
            actualCost REAL DEFAULT 0,
            stepsJson TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS todoItems (
            id TEXT PRIMARY KEY NOT NULL,
            buildingId TEXT,
            title TEXT,
            description TEXT,
            dueDate TEXT,
            isDone INTEGER DEFAULT 0,
            isPreventive INTEGER DEFAULT 0,
            category TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS preventiveEvents (
            id TEXT PRIMARY KEY NOT NULL,
            buildingId TEXT,
            title TEXT,
            description TEXT,
            scheduledDate TEXT,
            frequency TEXT,
            isCompleted INTEGER DEFAULT 0,
            completedDate TEXT,
            assignedWorker TEXT,
            cost REAL DEFAULT 0
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS workers (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT,
            specialty TEXT,
            phone TEXT,
            email TEXT,
            hourlyRate REAL DEFAULT 0,
            insuranceExpiryDate TEXT,
            notes TEXT,
            certificatePath TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS suppliers (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT,
            category TEXT,
            contactPerson TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            contractFilePath TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS inventoryItems (
            id TEXT PRIMARY KEY NOT NULL,
            buildingId TEXT,
            name TEXT,
            sku TEXT,
            quantity INTEGER DEFAULT 0,
            minThreshold INTEGER DEFAULT 1,
            unitPrice REAL DEFAULT 0,
            location TEXT,
            catalogFilePath TEXT,
            photoPath TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS documentFiles (
            id TEXT PRIMARY KEY NOT NULL,
            buildingId TEXT,
            title TEXT,
            category TEXT,
            filePath TEXT,
            fileType TEXT,
            uploadDate TEXT,
            fileSizeBytes INTEGER DEFAULT 0
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY NOT NULL,
            buildingId TEXT,
            supplierId TEXT,
            invoiceNumber TEXT,
            amount REAL DEFAULT 0,
            date TEXT,
            status TEXT,
            filePath TEXT,
            notes TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS formTemplates (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT,
            description TEXT,
            category TEXT,
            fieldsJson TEXT,
            createdAt TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS filledForms (
            id TEXT PRIMARY KEY NOT NULL,
            projectId TEXT,
            reportId TEXT,
            formTemplateId TEXT,
            formTemplateName TEXT,
            answersJson TEXT,
            createdAt TEXT,
            updatedAt TEXT,
            formDate TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS buildingSystemLogs (
            id TEXT PRIMARY KEY NOT NULL,
            buildingId TEXT,
            systemType TEXT,
            title TEXT,
            status TEXT,
            lastInspectionDate TEXT,
            nextInspectionDate TEXT,
            technicianName TEXT,
            technicianPhone TEXT,
            technicianCompany TEXT,
            inspectionFrequency TEXT,
            notes TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS appSettings (
            id TEXT PRIMARY KEY NOT NULL,
            companyName TEXT,
            taxId TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            currencySymbol TEXT,
            logoPath TEXT,
            theme TEXT,
            language TEXT,
            lastBackupDate TEXT
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS _bmanager_metadata (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT
        );
    `);

    // 3. Populate Rows
    const insertRow = (tableName: string, row: Record<string, any>) => {
        try {
            const keys = Object.keys(row);
            const placeholders = keys.map(() => '?').join(', ');
            const sql = `INSERT OR REPLACE INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders});`;
            const values = keys.map(k => {
                const val = row[k];
                if (typeof val === 'boolean') return val ? 1 : 0;
                if (val === undefined || val === null) return null;
                if (typeof val === 'object') return JSON.stringify(val);
                return val;
            });
            db.run(sql, values);
        } catch (e) {
            console.warn(`Failed to insert into ${tableName}:`, e, row);
        }
    };

    (universalBackup.buildings || []).forEach((b: any) => insertRow('buildings', b));
    (universalBackup.tenants || []).forEach((t: any) => insertRow('tenants', t));
    (universalBackup.issues || []).forEach((i: any) => insertRow('issues', i));
    (universalBackup.projects || []).forEach((p: any) => insertRow('projects', p));
    (universalBackup.todoItems || []).forEach((t: any) => insertRow('todoItems', t));
    (universalBackup.preventiveEvents || []).forEach((pe: any) => insertRow('preventiveEvents', pe));
    (universalBackup.workers || []).forEach((w: any) => insertRow('workers', w));
    (universalBackup.suppliers || []).forEach((s: any) => insertRow('suppliers', s));
    (universalBackup.inventoryItems || []).forEach((inv: any) => insertRow('inventoryItems', inv));
    (universalBackup.documentFiles || []).forEach((d: any) => insertRow('documentFiles', d));
    (universalBackup.invoices || []).forEach((inv: any) => insertRow('invoices', inv));
    (universalBackup.formTemplates || []).forEach((ft: any) => insertRow('formTemplates', ft));
    (universalBackup.filledForms || []).forEach((ff: any) => {
        insertRow('filledForms', {
            id: ff.id,
            projectId: ff.projectId,
            reportId: ff.reportId,
            formTemplateId: ff.formTemplateId,
            formTemplateName: ff.formTemplateName,
            answersJson: JSON.stringify(ff.answers || []),
            createdAt: ff.createdAt,
            updatedAt: ff.updatedAt,
            formDate: ff.formDate,
        });
    });
    (universalBackup.buildingSystemLogs || []).forEach((bsl: any) => insertRow('buildingSystemLogs', bsl));
    if (universalBackup.appSettings) {
        insertRow('appSettings', universalBackup.appSettings);
    }

    // Embed universal payload in metadata table for instant 100% loss-free roundtrip
    db.run(`INSERT OR REPLACE INTO _bmanager_metadata VALUES (?, ?);`, [
        'universal_sync_payload',
        JSON.stringify(universalBackup)
    ]);

    const binaryExport: Uint8Array = db.export();
    db.close();
    return binaryExport;
};

// --- Reading SQLite Database From Uint8Array ---

export const parseRoomSqliteDatabase = async (bytes: Uint8Array): Promise<any> => {
    const SQL = await getSqlInstance();
    const db = new SQL.Database(bytes);

    // 1. Check for embedded universal sync payload in _bmanager_metadata
    try {
        const metaRes = db.exec(`SELECT value FROM _bmanager_metadata WHERE key = 'universal_sync_payload';`);
        if (metaRes.length > 0 && metaRes[0].values.length > 0) {
            const rawJson = metaRes[0].values[0][0] as string;
            if (rawJson) {
                const parsed = JSON.parse(rawJson);
                db.close();
                return parsed;
            }
        }
    } catch {
        // Table may not exist in pure mobile Room database - continue to table extractor
    }

    // 2. Discover all tables in sqlite_master
    const masterRes = db.exec(`
        SELECT name FROM sqlite_master 
        WHERE type = 'table' 
          AND name NOT LIKE 'sqlite_%' 
          AND name NOT LIKE 'android_metadata' 
          AND name NOT LIKE 'room_master_table';
    `);

    const tableNames: string[] = (masterRes[0]?.values || []).map((row: any[]) => String(row[0]));
    const result: Record<string, any[]> = {};

    tableNames.forEach(tableName => {
        try {
            const queryRes = db.exec(`SELECT * FROM "${tableName}";`);
            if (queryRes.length > 0 && queryRes[0]) {
                const columns = queryRes[0].columns || [];
                const rawValues = queryRes[0].values || [];
                const rows = rawValues.map((valArr: any[]) => {
                    const rowObj: Record<string, any> = {};
                    columns.forEach((col: string, idx: number) => {
                        const val = valArr[idx];
                        rowObj[col] = val;
                        rowObj[col.toLowerCase()] = val;
                        const camel = col.replace(/_([a-z0-9])/gi, (_, g) => g.toUpperCase());
                        rowObj[camel] = val;
                        const snake = col.replace(/([A-Z])/g, '_$1').toLowerCase();
                        rowObj[snake] = val;
                    });
                    return rowObj;
                });
                result[tableName] = rows;
                result[tableName.toLowerCase()] = rows;
                const camelTable = tableName.replace(/_([a-z0-9])/gi, (_, g) => g.toUpperCase());
                result[camelTable] = rows;
                const snakeTable = tableName.replace(/([A-Z])/g, '_$1').toLowerCase();
                result[snakeTable] = rows;
                const cleanTable = tableName.toLowerCase().replace(/_/g, '');
                result[cleanTable] = rows;
            } else {
                result[tableName] = [];
                result[tableName.toLowerCase()] = [];
            }
        } catch (e) {
            console.warn(`Failed to read table ${tableName}:`, e);
        }
    });

    db.close();
    return result;
};

// --- Full Mobile ZIP Creation (building_manager_backup.zip) ---

export interface MobileZipExportResult {
    blob: Blob;
    filename: string;
    fileCount: number;
    dbSize: number;
}

export const createMobileZipBackup = async (
    fullBackup?: FullAppBackup,
    onProgress?: (progress: SyncProgress) => void
): Promise<MobileZipExportResult> => {
    onProgress?.({ stage: 'preparing', percent: 5, message: 'מכין נתונים לארכיון הגיבוי...' });
    // 1. Get complete application state
    const backup: FullAppBackup = fullBackup || (await dbService.exportAllData());
    const universal = createUniversalSyncBackup(backup);
    const zip = new JSZip();

    onProgress?.({ stage: 'extracting', percent: 15, message: 'אורז קבצים מצורפים, תמונות וחתימות...' });

    // 2. Collect and extract attached files to 'files/' directory
    let fileCounter = 0;
    const addFileToZip = (dataUrlOrPath: string | undefined, prefix: string, suggestedName?: string): string => {
        if (!dataUrlOrPath) return '';
        if (!dataUrlOrPath.startsWith('data:')) {
            // Already a relative path or external URL
            return dataUrlOrPath;
        }

        const parsed = dataUrlToUint8Array(dataUrlOrPath);
        if (!parsed) return dataUrlOrPath;

        fileCounter++;
        const ext = getExtensionFromMimeType(parsed.mimeType);
        const cleanSuggested = suggestedName ? suggestedName.replace(/[^a-zA-Z0-9_\u0590-\u05FF.-]/g, '_') : '';
        const fileName = cleanSuggested && cleanSuggested.includes('.')
            ? `${prefix}_${cleanSuggested}`
            : `${prefix}_${fileCounter}.${ext}`;

        const relativeZipPath = `files/${fileName}`;
        zip.file(relativeZipPath, parsed.bytes);
        return relativeZipPath;
    };

    // Replace dataUrls with relative zip paths in the Room tables
    (universal.buildings || []).forEach((b: any, idx: number) => {
        if (b.imagePath) {
            b.imagePath = addFileToZip(b.imagePath, `building_${b.id || idx}`, 'cover.jpg');
        }
    });

    (universal.tenants || []).forEach((t: any) => {
        if (t.contractFilePath) {
            t.contractFilePath = addFileToZip(t.contractFilePath, `contract_${t.id}`);
        }
        if (t.signaturePath) {
            t.signaturePath = addFileToZip(t.signaturePath, `tenant_sig_${t.id}`, 'sig.png');
        }
    });

    (universal.issues || []).forEach((i: any) => {
        if (i.photoPath) {
            i.photoPath = addFileToZip(i.photoPath, `issue_${i.id}_before`);
        }
        if (i.afterPhotoPath) {
            i.afterPhotoPath = addFileToZip(i.afterPhotoPath, `issue_${i.id}_after`);
        }
        if (i.signaturePath) {
            i.signaturePath = addFileToZip(i.signaturePath, `issue_sig_${i.id}`, 'sig.png');
        }
    });

    (universal.inventoryItems || []).forEach((inv: any) => {
        if (inv.photoPath) {
            inv.photoPath = addFileToZip(inv.photoPath, `inv_${inv.id}`);
        }
        if (inv.catalogFilePath) {
            inv.catalogFilePath = addFileToZip(inv.catalogFilePath, `inv_manual_${inv.id}`, 'manual.pdf');
        }
    });

    (universal.documentFiles || []).forEach((d: any) => {
        if (d.filePath) {
            d.filePath = addFileToZip(d.filePath, `doc_${d.id}`, d.title);
        }
    });

    (universal.invoices || []).forEach((inv: any) => {
        if (inv.filePath) {
            inv.filePath = addFileToZip(inv.filePath, `invoice_${inv.id}`, `${inv.invoiceNumber || 'inv'}.pdf`);
        }
    });

    (universal.workers || []).forEach((w: any) => {
        if (w.certificatePath) {
            w.certificatePath = addFileToZip(w.certificatePath, `worker_cert_${w.id}`);
        }
    });

    if (universal.appSettings?.logoPath) {
        universal.appSettings.logoPath = addFileToZip(universal.appSettings.logoPath, 'company_logo', 'logo.png');
    }

    onProgress?.({ 
        stage: 'sqlite', 
        percent: 45, 
        message: 'יוצר מסד נתונים SQLite / Android Room v40 מלא (building_manager_database)...' 
    });

    // 3. Create databases/ SQLite database
    const sqliteBytes = await createRoomSqliteDatabase(universal);
    zip.file('databases/building_manager_database', sqliteBytes);
    // Include Android SQLite companion files (-wal, -shm) for standard Room layout
    zip.file('databases/building_manager_database-wal', new Uint8Array(0));
    zip.file('databases/building_manager_database-shm', new Uint8Array(0));
    zip.file('databases/database_export.json', JSON.stringify(universal, null, 2));

    onProgress?.({ 
        stage: 'preparing', 
        percent: 60, 
        message: 'מייצר קובצי SharedPreferences וקונפיגורציית מובייל...' 
    });

    // 4. Create shared_prefs/
    const appSettingsObj = backup.settings || (backup as any).appSettings || (backup as any).webData?.settings || universal.settings || DEFAULT_SETTINGS;
    const sharedPrefsXml = generateSharedPreferencesXml(appSettingsObj);
    zip.file('shared_prefs/building_manager_preferences.xml', sharedPrefsXml);
    zip.file('shared_prefs/app_settings.json', JSON.stringify(universal.appSettings || {}, null, 2));

    onProgress?.({ 
        stage: 'compressing', 
        percent: 70, 
        message: 'דוחס ארכיון ZIP (building_manager_backup.zip)...' 
    });

    // 5. Generate ZIP archive
    const zipBlob = await zip.generateAsync({
        type: 'blob',
        mimeType: BACKUP_MIME_TYPE,
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    }, (metadata) => {
        const compPercent = 70 + Math.round((metadata.percent / 100) * 28);
        onProgress?.({
            stage: 'compressing',
            percent: Math.min(compPercent, 98),
            message: `דוחס ארכיון ZIP (${Math.round(metadata.percent)}%)...`,
            details: metadata.currentFile || undefined
        });
    });

    onProgress?.({ 
        stage: 'complete', 
        percent: 100, 
        message: 'הייצוא הושלם בהצלחה!' 
    });

    return {
        blob: zipBlob,
        filename: BACKUP_ZIP_FILENAME,
        fileCount: fileCounter,
        dbSize: sqliteBytes.byteLength,
    };
};

// --- Full Mobile ZIP Restoration (Read & Restore) ---

export interface RestoreSummary {
    buildings: number;
    tenants: number;
    issues: number;
    projects: number;
    todoItems: number;
    suppliers: number;
    invoices: number;
    files: number;
}

const yieldTick = (ms = 40) => new Promise(resolve => setTimeout(resolve, ms));

export const restoreFromMobileZip = async (
    zipInput: File | Blob | ArrayBuffer,
    onProgress?: (progress: SyncProgress) => void
): Promise<RestoreSummary> => {
    onProgress?.({ 
        stage: 'reading', 
        percent: 10, 
        message: 'קורא ומנתח ארכיון ZIP של אפליקציית המובייל...' 
    });
    await yieldTick(30);

    // Reliably convert zipInput to Uint8Array to avoid FileReader/Blob hangs in browser
    let zipBytes: Uint8Array;
    if (zipInput instanceof Uint8Array) {
        zipBytes = zipInput;
    } else if (zipInput instanceof ArrayBuffer) {
        zipBytes = new Uint8Array(zipInput);
    } else if (typeof (zipInput as any)?.arrayBuffer === 'function') {
        const ab = await (zipInput as Blob).arrayBuffer();
        zipBytes = new Uint8Array(ab);
    } else {
        zipBytes = await new Promise<Uint8Array>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
            reader.onerror = (e) => reject(e || new Error('Failed to read zip file'));
            reader.readAsArrayBuffer(zipInput as Blob);
        });
    }

    onProgress?.({ 
        stage: 'reading', 
        percent: 18, 
        message: 'טוען קבצי ארכיון מתוך ה-ZIP...' 
    });
    await yieldTick(30);

    const zip = await JSZip.loadAsync(zipBytes);

    onProgress?.({ 
        stage: 'extracting', 
        percent: 25, 
        message: 'מחלץ קבצים מצורפים, תמונות, חוזים וחתימות דיגיטליות מ-files/...' 
    });
    await yieldTick(30);

    // 1. Extract all attached files into Data URLs
    const filesMap = new Map<string, string>();
    const allFilePaths = Object.keys(zip.files).filter(path => !zip.files[path].dir);

    // Only legitimate file attachments (exclude databases, preferences, metadata)
    const isSpecialOrDbFile = (p: string) => {
        const lower = p.toLowerCase();
        return (
            lower.startsWith('__macosx/') ||
            lower.endsWith('.ds_store') ||
            lower.startsWith('databases/') ||
            lower.startsWith('shared_prefs/') ||
            lower.endsWith('.db') ||
            lower.endsWith('.sqlite') ||
            lower.endsWith('-wal') ||
            lower.endsWith('-shm') ||
            lower.endsWith('.json') ||
            lower.endsWith('.xml') ||
            lower.includes('building_manager_database')
        );
    };

    const attachmentEntries = allFilePaths.filter(p => !isSpecialOrDbFile(p) && (p.startsWith('files/') || p.includes('/')));

    let extractedCount = 0;
    const totalToExtract = attachmentEntries.length;
    for (const path of attachmentEntries) {
        try {
            const entry = zip.file(path);
            if (entry) {
                const buffer = await entry.async('uint8array');
                const mime = getMimeTypeFromFilename(path);
                const dataUrl = uint8ArrayToDataUrl(buffer, mime);
                const baseName = path.split('/').pop() || path;
                
                filesMap.set(path, dataUrl);
                filesMap.set(baseName, dataUrl);
                filesMap.set(baseName.toLowerCase(), dataUrl);
            }
        } catch (e) {
            console.warn(`Could not extract file ${path}:`, e);
        }

        extractedCount++;
        if (totalToExtract > 0 && (totalToExtract <= 5 || extractedCount % Math.max(1, Math.floor(totalToExtract / 5)) === 0 || extractedCount === totalToExtract)) {
            const subPct = 25 + Math.round((extractedCount / totalToExtract) * 25);
            onProgress?.({
                stage: 'extracting',
                percent: Math.min(subPct, 50),
                message: `מחלץ קבצים ותמונות (${extractedCount} מתוך ${totalToExtract})...`,
                details: path.split('/').pop() || path
            });
            await yieldTick(15);
        }
    }

    if (totalToExtract === 0) {
        onProgress?.({
            stage: 'extracting',
            percent: 50,
            message: 'נבדקו קבצים מצורפים ותמונות',
        });
        await yieldTick(25);
    }

    // Helper to resolve a stored path to an in-memory data URL
    const resolveFileUrl = (storedPath?: string): string | undefined => {
        if (!storedPath) return undefined;
        if (storedPath.startsWith('data:')) return storedPath; // Already data URL

        const direct = filesMap.get(storedPath);
        if (direct) return direct;

        const baseName = storedPath.split('/').pop() || storedPath;
        const fromBase = filesMap.get(baseName) || filesMap.get(baseName.toLowerCase());
        if (fromBase) return fromBase;

        // Try fuzzy match by ID or prefix
        for (const [key, val] of filesMap.entries()) {
            if (baseName && (key.includes(baseName) || baseName.includes(key))) {
                return val;
            }
        }
        return storedPath;
    };

    onProgress?.({ 
        stage: 'sqlite', 
        percent: 55, 
        message: 'קורא ומפענח מסד נתונים SQLite / Android Room (databases/building_manager_database)...' 
    });
    await yieldTick(40);

    // 2. Locate and parse SQLite database or JSON in databases/ or root
    let roomData: any = null;

    // Search for SQLite database in databases/ or root
    const dbPath = 
        Object.keys(zip.files).find(p => !zip.files[p].dir && (
            p === 'databases/building_manager_database' ||
            p === 'building_manager_database' ||
            p === 'databases/building_manager_database.db' ||
            p === 'building_manager_database.db' ||
            p === 'databases/building_manager_database.sqlite' ||
            p === 'building_manager_database.sqlite' ||
            (p.startsWith('databases/') && !p.endsWith('.json') && !p.endsWith('-wal') && !p.endsWith('-shm')) ||
            (p.endsWith('.db') && !p.startsWith('__MACOSX')) ||
            (p.endsWith('.sqlite') && !p.startsWith('__MACOSX'))
        ));

    const dbFileEntry = dbPath ? zip.file(dbPath) : null;

    if (dbFileEntry) {
        try {
            const dbBytes = await dbFileEntry.async('uint8array');
            roomData = await parseRoomSqliteDatabase(dbBytes);
        } catch (e) {
            console.warn('Failed to parse SQLite database from zip, trying JSON fallback:', e);
        }
    }

    // Fallback: check for JSON database export in databases/ or root
    if (!roomData) {
        const jsonPath = Object.keys(zip.files).find(p => !zip.files[p].dir && (
            p === 'databases/database_export.json' ||
            p === 'database_export.json' ||
            p === 'databases/backup.json' ||
            p === 'backup.json' ||
            (p.endsWith('.json') && !p.includes('shared_prefs') && !p.startsWith('__MACOSX'))
        ));

        const jsonEntry = jsonPath ? zip.file(jsonPath) : null;
        if (jsonEntry) {
            try {
                const jsonText = await jsonEntry.async('text');
                roomData = JSON.parse(jsonText);
            } catch (e) {
                console.warn('Failed to parse JSON backup from zip:', e);
            }
        }
    }

    if (!roomData) {
        throw new Error('לא נמצא קובץ מסד נתונים (building_manager_database או JSON) בתוך ארכיון ה-ZIP.');
    }

    onProgress?.({ 
        stage: 'restoring', 
        percent: 70, 
        message: 'קורא הגדרות יישום, שפה ועיצוב מ-shared_prefs/...' 
    });
    await yieldTick(40);

    // 3. Parse all shared_prefs XML files in the ZIP archive
    let parsedPrefs: Record<string, any> = {};
    const xmlFilePaths = Object.keys(zip.files).filter(p => 
        !zip.files[p].dir && 
        p.endsWith('.xml') && 
        !p.startsWith('__MACOSX') && 
        !p.includes('android_metadata')
    );

    for (const xmlPath of xmlFilePaths) {
        try {
            const entry = zip.file(xmlPath);
            if (entry) {
                const xmlText = await entry.async('text');
                const prefs = parseSharedPreferencesXml(xmlText);
                parsedPrefs = { ...parsedPrefs, ...prefs };
            }
        } catch (e) {
            console.warn(`Could not parse shared_prefs XML ${xmlPath}:`, e);
        }
    }

    onProgress?.({ 
        stage: 'restoring', 
        percent: 82, 
        message: 'מסנכרן ומקשר מבנים, דיירים, תקלות, מלאי וספקים...' 
    });
    await yieldTick(40);

    // Track URLs already bound to specific entities
    const boundUrls = new Set<string>();
    const markBound = (url?: string) => {
        if (url && typeof url === 'string') boundUrls.add(url);
    };

    // 4. Resolve attached files into entities across all tables
    const rawBuildingsList = findEntityList(roomData, 'buildings', 'Building', 'building', 'properties', 'property', 'tbl_buildings');
    const buildings = rawBuildingsList.map((b: any) => {
        const img = resolveFileUrl(getRowVal(b, 'imagePath', 'image_path', 'photoPath', 'photo_path', 'cover', 'image'));
        markBound(img);
        return {
            ...b,
            imagePath: img,
        };
    });

    const rawTenantsList = findEntityList(roomData, 'tenants', 'Tenant', 'tenant', 'residents', 'resident', 'tbl_tenants');
    const tenants = rawTenantsList.map((t: any) => {
        const contract = resolveFileUrl(getRowVal(t, 'contractFilePath', 'contract_file_path', 'contractFile', 'contract_file'));
        const sig = resolveFileUrl(getRowVal(t, 'signaturePath', 'signature_path', 'signature', 'sign'));
        markBound(contract);
        markBound(sig);
        return {
            ...t,
            contractFilePath: contract,
            signaturePath: sig,
        };
    });

    const rawIssuesList = findEntityList(roomData, 'issues', 'Issue', 'issue', 'problems', 'problem', 'faults', 'fault', 'defects', 'defect', 'tasks', 'task', 'tickets', 'tbl_issues');
    const issues = rawIssuesList.map((i: any) => {
        const photo = resolveFileUrl(getRowVal(i, 'photoPath', 'photo_path', 'photo', 'imagePath', 'image_path', 'image'));
        const afterPhoto = resolveFileUrl(getRowVal(i, 'afterPhotoPath', 'after_photo_path', 'afterPhoto', 'after_photo', 'repairPhoto'));
        const sig = resolveFileUrl(getRowVal(i, 'signaturePath', 'signature_path', 'signature', 'sign'));
        markBound(photo);
        markBound(afterPhoto);
        markBound(sig);
        return {
            ...i,
            photoPath: photo,
            afterPhotoPath: afterPhoto,
            signaturePath: sig,
        };
    });

    const rawInventoryList = findEntityList(roomData, 'inventoryItems', 'InventoryItem', 'inventory_items', 'inventoryitems', 'inventory', 'items', 'item', 'stock', 'warehouse', 'tbl_inventory');
    const inventoryItems = rawInventoryList.map((inv: any) => {
        const photo = resolveFileUrl(getRowVal(inv, 'photoPath', 'photo_path', 'image', 'imagePath', 'image_path'));
        const catalog = resolveFileUrl(getRowVal(inv, 'catalogFilePath', 'catalog_file_path', 'manual', 'document'));
        markBound(photo);
        markBound(catalog);
        return {
            ...inv,
            photoPath: photo,
            catalogFilePath: catalog,
        };
    });

    const rawDocsList = findEntityList(roomData, 'documentFiles', 'DocumentFile', 'document_files', 'documentfiles', 'documents', 'document', 'files', 'file', 'attachments', 'tbl_documents');
    const documentFiles = rawDocsList.map((d: any) => {
        const fp = resolveFileUrl(getRowVal(d, 'filePath', 'file_path', 'path', 'url', 'uri'));
        markBound(fp);
        return {
            ...d,
            filePath: fp,
        };
    });

    const rawInvoicesList = findEntityList(roomData, 'invoices', 'Invoice', 'invoice', 'bills', 'bill', 'receipts', 'receipt', 'expenses', 'tbl_invoices');
    const invoices = rawInvoicesList.map((inv: any) => {
        const fp = resolveFileUrl(getRowVal(inv, 'filePath', 'file_path', 'url', 'pdf_path'));
        markBound(fp);
        return {
            ...inv,
            filePath: fp,
        };
    });

    const rawWorkersList = findEntityList(roomData, 'workers', 'Worker', 'worker', 'contractors', 'contractor', 'technicians', 'technician', 'tbl_workers');
    const workers = rawWorkersList.map((w: any) => {
        const cert = resolveFileUrl(getRowVal(w, 'certificatePath', 'certificate_path', 'photo', 'photoPath', 'photo_path', 'license'));
        markBound(cert);
        return {
            ...w,
            certificatePath: cert,
        };
    });

    const rawSystemLogsList = findEntityList(roomData, 'buildingSystemLogs', 'BuildingSystemLog', 'building_system_logs', 'systems', 'system', 'system_logs');
    const buildingSystemLogs = rawSystemLogsList.map((log: any) => {
        const cert = resolveFileUrl(getRowVal(log, 'certificatePath', 'certificate_path', 'certificateFile', 'filePath', 'file_path'));
        markBound(cert);
        return {
            ...log,
            certificatePath: cert,
        };
    });

    const rawSuppliersList = findEntityList(roomData, 'suppliers', 'Supplier', 'supplier', 'vendors', 'vendor', 'tbl_suppliers');
    const suppliers = rawSuppliersList.map((s: any) => {
        const contract = resolveFileUrl(getRowVal(s, 'contractFilePath', 'contract_file_path'));
        markBound(contract);
        return {
            ...s,
            contractFilePath: contract,
        };
    });

    const rawTodoList = findEntityList(roomData, 'todoItems', 'TodoItem', 'todo_items', 'todos', 'todo', 'tasks', 'task', 'tbl_todo_items');
    const rawPreventiveList = findEntityList(roomData, 'preventiveEvents', 'PreventiveEvent', 'preventive_events', 'preventive', 'maintenance', 'tbl_preventive_events');
    const rawTemplatesList = findEntityList(roomData, 'formTemplates', 'FormTemplate', 'form_templates', 'forms', 'form', 'templates', 'template');
    const rawFilledFormsList = findEntityList(roomData, 'filledForms', 'FilledForm', 'filled_forms', 'inspections', 'protocols');
    const rawProjectsList = findEntityList(roomData, 'projects', 'Project', 'project', 'subProjects', 'sub_projects', 'subprojects');

    // Collect all unreferenced files from filesMap so no uploaded document or attachment is lost!
    const unreferencedFiles: any[] = [];
    const addedFileUrls = new Set<string>();
    for (const [path, dataUrl] of filesMap.entries()) {
        if (!dataUrl || boundUrls.has(dataUrl) || addedFileUrls.has(dataUrl)) continue;
        if (!path.includes('/') && !path.includes('.')) continue; // skip bare IDs

        const baseName = path.split('/').pop() || path;
        const lower = baseName.toLowerCase();
        if (
            lower.endsWith('.db') || 
            lower.endsWith('.sqlite') || 
            lower.endsWith('.json') || 
            lower.endsWith('.xml') || 
            lower.startsWith('.')
        ) {
            continue;
        }

        addedFileUrls.add(dataUrl);
        unreferencedFiles.push({
            id: generateId(),
            name: baseName,
            mimeType: getMimeTypeFromFilename(baseName),
            url: dataUrl,
            group: 'קבצים מצורפים',
            createdAt: new Date().toISOString(),
        });
    }

    // Merge settings from roomData and shared_prefs
    const rawSettingsObj = findEntityList(roomData, 'appSettings', 'AppSettings', 'app_settings', 'settings', 'preferences', 'config')[0] || roomData.appSettings || roomData.AppSettings || {};
    const mergedAppSettings = {
        ...rawSettingsObj,
        companyName: parsedPrefs.company_name || parsedPrefs.companyName || getRowVal(rawSettingsObj, 'companyName', 'company_name', 'name') || DEFAULT_SETTINGS.companyInfo.name,
        taxId: parsedPrefs.tax_id || parsedPrefs.taxId || getRowVal(rawSettingsObj, 'taxId', 'tax_id') || '',
        phone: parsedPrefs.company_phone || parsedPrefs.phone || getRowVal(rawSettingsObj, 'phone', 'companyPhone', 'company_phone') || '',
        email: parsedPrefs.company_email || parsedPrefs.email || getRowVal(rawSettingsObj, 'email', 'companyEmail', 'company_email') || '',
        address: parsedPrefs.company_address || parsedPrefs.address || getRowVal(rawSettingsObj, 'address', 'companyAddress') || '',
        currencySymbol: parsedPrefs.currency_symbol || parsedPrefs.currencySymbol || getRowVal(rawSettingsObj, 'currencySymbol', 'currency_symbol') || '₪',
        language: parsedPrefs.selected_language || parsedPrefs.language || getRowVal(rawSettingsObj, 'language', 'selected_language') || 'he',
        theme: parsedPrefs.app_theme || parsedPrefs.theme || getRowVal(rawSettingsObj, 'theme', 'app_theme') || 'system',
        authorName: parsedPrefs.author_name || parsedPrefs.authorName || getRowVal(rawSettingsObj, 'authorName', 'author_name') || DEFAULT_SETTINGS.authorName,
        colorPalette: parsedPrefs.color_palette || parsedPrefs.colorPalette || getRowVal(rawSettingsObj, 'colorPalette', 'color_palette') || 'default',
        headerColor: parsedPrefs.header_color || getRowVal(rawSettingsObj, 'headerColor', 'header_color'),
        accentColor: parsedPrefs.accent_color || getRowVal(rawSettingsObj, 'accentColor', 'accent_color'),
        logoPath: resolveFileUrl(parsedPrefs.logo_path || parsedPrefs.logo || getRowVal(rawSettingsObj, 'logoPath', 'logo_path', 'logo')),
    };

    const enrichedRoomBackup = {
        ...roomData,
        buildings,
        tenants,
        issues,
        inventoryItems,
        documentFiles,
        invoices,
        workers,
        suppliers,
        todoItems: rawTodoList,
        preventiveEvents: rawPreventiveList,
        formTemplates: rawTemplatesList,
        filledForms: rawFilledFormsList,
        buildingSystemLogs,
        projects: rawProjectsList,
        appSettings: mergedAppSettings,
        unreferencedFiles,
    };

    // 5. Convert to normalized Web application database structure
    const normalized = parseMobileBackup(enrichedRoomBackup);

    onProgress?.({ 
        stage: 'saving', 
        percent: 88, 
        message: 'שומר את כל הנתונים המסונכרנים במסד הנתונים המקומי...' 
    });
    await yieldTick(40);

    // 6. Import directly into IndexedDB database
    await dbService.importAllData(normalized, (saveProg) => {
        const scaled = 88 + Math.round((saveProg.percent / 100) * 10);
        onProgress?.({
            stage: 'saving',
            percent: Math.min(scaled, 98),
            message: saveProg.message,
            details: saveProg.details,
        });
    });

    // Notify settings context of updated preferences
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-settings-updated', { detail: normalized.settings }));
    }

    onProgress?.({ 
        stage: 'complete', 
        percent: 100, 
        message: 'הסנכרון והשחזור הושלמו בהצלחה מלאה!' 
    });
    await yieldTick(40);

    const totalFilesCount = normalized.projects.reduce((acc, p) => acc + (p.files?.length || 0), 0) + filesMap.size;

    return {
        buildings: normalized.projects.length,
        tenants: normalized.projects.reduce((acc, p) => acc + (p.tenants?.length || 0), 0),
        issues: normalized.problems.length,
        projects: normalized.projects.reduce((acc, p) => acc + (p.subProjects?.length || 0), 0),
        todoItems: normalized.projects.reduce((acc, p) => acc + (p.todos?.length || 0), 0),
        suppliers: normalized.suppliers.length,
        invoices: normalized.invoices?.length || 0,
        files: totalFilesCount,
    };
};
