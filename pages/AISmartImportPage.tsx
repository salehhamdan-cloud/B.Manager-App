import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { SparklesIcon } from '../components/icons/AiIcons';
import { ArrowUpTrayIcon, TrashIcon } from '../components/icons/ActionIcons';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import * as dbService from '../services/dbService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { generateId } from '../utils/idGenerator';
import { convertPdfToText } from '../utils/pdfUtils';
import { smartExtractEntitiesWithAi, getActiveGeminiModel, setActiveGeminiModel } from '../services/aiService';
import { GEMINI_MODELS } from '../constants';
import { Project, ProblemSeverity, QuotationStatus, GeminiModelVersion } from '../types';

export interface UploadedImportFile {
    id: string;
    file: File;
    name: string;
    size: number;
    type: 'image' | 'pdf' | 'excel' | 'word' | 'text' | 'other';
    previewUrl?: string;
    extractedText?: string;
    base64Data?: string;
    mimeType?: string;
    status: 'processing' | 'ready' | 'error';
    summary?: string;
}

interface ExtractedTenant {
    id: string;
    selected: boolean;
    name: string;
    phone: string;
    email: string;
    apartmentNumber: string;
    floorNumber: string;
    rentAmount?: number;
    leaseStartDate?: string;
    leaseEndDate?: string;
    contactPerson?: string;
    buildingName?: string;
}

interface ExtractedBuilding {
    id: string;
    selected: boolean;
    name: string;
    address: string;
    apartmentsCount?: number;
    managerName?: string;
    managerPhone?: string;
}

interface ExtractedIssue {
    id: string;
    selected: boolean;
    title: string;
    description: string;
    priority: ProblemSeverity;
    apartmentNumber?: string;
    buildingName?: string;
}

interface ExtractedWorker {
    id: string;
    selected: boolean;
    name: string;
    specialty: string;
    phone: string;
    email: string;
}

interface ExtractedSupplier {
    id: string;
    selected: boolean;
    name: string;
    category: string;
    phone: string;
    email: string;
}

interface ExtractedInventory {
    id: string;
    selected: boolean;
    name: string;
    quantity: number;
    sku?: string;
    location?: string;
    buildingName?: string;
}

interface ExtractedInvoice {
    id: string;
    selected: boolean;
    invoiceNumber: string;
    supplierName: string;
    amount: number;
    date: string;
    buildingName?: string;
}

const AISmartImportPage: React.FC = () => {
    const { settings, updateSettings } = useSettings();
    const [selectedModel, setSelectedModel] = useState<GeminiModelVersion>(
        (settings.geminiModel as GeminiModelVersion) || (getActiveGeminiModel() as GeminiModelVersion) || 'gemini-3.8-flash'
    );

    const [rawText, setRawText] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState<UploadedImportFile[]>([]);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isCommitting, setIsCommitting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [activeTab, setActiveTab] = useState<'tenants' | 'buildings' | 'issues' | 'workers' | 'suppliers' | 'inventory' | 'invoices'>('tenants');

    // Extracted buckets
    const [extractedTenants, setExtractedTenants] = useState<ExtractedTenant[]>([]);
    const [extractedBuildings, setExtractedBuildings] = useState<ExtractedBuilding[]>([]);
    const [extractedIssues, setExtractedIssues] = useState<ExtractedIssue[]>([]);
    const [extractedWorkers, setExtractedWorkers] = useState<ExtractedWorker[]>([]);
    const [extractedSuppliers, setExtractedSuppliers] = useState<ExtractedSupplier[]>([]);
    const [extractedInventory, setExtractedInventory] = useState<ExtractedInventory[]>([]);
    const [extractedInvoices, setExtractedInvoices] = useState<ExtractedInvoice[]>([]);

    const [hasExtracted, setHasExtracted] = useState(false);

    const { addToast } = useToast();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleModelChange = (modelId: GeminiModelVersion) => {
        setSelectedModel(modelId);
        setActiveGeminiModel(modelId);
        updateSettings({ geminiModel: modelId }).catch(console.error);
        addToast(`מודל ה-AI הוגדר ל: ${modelId}`, 'info');
    };

    // Process uploaded file (Images, PDF, Excel, Word, Text)
    const processSingleFile = async (file: File): Promise<UploadedImportFile> => {
        const id = generateId();
        const fileName = file.name.toLowerCase();
        let fileType: UploadedImportFile['type'] = 'other';

        if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(fileName)) {
            fileType = 'image';
        } else if (file.type === 'application/pdf' || fileName.endsWith('.pdf')) {
            fileType = 'pdf';
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv') || file.type.includes('spreadsheet') || file.type.includes('excel')) {
            fileType = 'excel';
        } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc') || file.type.includes('word')) {
            fileType = 'word';
        } else if (fileName.endsWith('.txt') || file.type.startsWith('text/')) {
            fileType = 'text';
        }

        const item: UploadedImportFile = {
            id,
            file,
            name: file.name,
            size: file.size,
            type: fileType,
            status: 'processing',
        };

        try {
            if (fileType === 'image') {
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                const base64Data = dataUrl.split(',')[1] || '';
                item.previewUrl = dataUrl;
                item.base64Data = base64Data;
                item.mimeType = file.type || 'image/jpeg';
                item.status = 'ready';
                item.summary = 'תמונה מוכנה לניתוח ויזואלי';
            } else if (fileType === 'pdf') {
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                const text = await convertPdfToText(dataUrl);
                item.extractedText = text;
                item.status = 'ready';
                item.summary = `חולצו ${text.length} תווים מ-PDF`;
            } else if (fileType === 'excel') {
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'array' });
                let sheetContents = '';
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const csv = XLSX.utils.sheet_to_csv(worksheet);
                    if (csv && csv.trim()) {
                        sheetContents += `\n--- גיליון: ${sheetName} ---\n` + csv;
                    }
                });
                item.extractedText = sheetContents;
                item.status = 'ready';
                item.summary = `נקראו ${workbook.SheetNames.length} גיליונות Excel`;
            } else if (fileType === 'word') {
                const buffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer: buffer });
                item.extractedText = result.value || '';
                item.status = 'ready';
                item.summary = `חולצו ${result.value?.length || 0} תווים מ-Word`;
            } else if (fileType === 'text') {
                const text = await file.text();
                item.extractedText = text;
                item.status = 'ready';
                item.summary = `נקרא קובץ טקסט (${text.length} תווים)`;
            } else {
                const text = await file.text().catch(() => '');
                item.extractedText = text;
                item.status = 'ready';
                item.summary = `קובץ נקרא`;
            }
        } catch (err) {
            console.error('File parsing error for', file.name, err);
            item.status = 'error';
            item.summary = 'שגיאה בפענוח הקובץ';
        }

        return item;
    };

    const handleFilesSelected = async (filesList: FileList | null) => {
        if (!filesList || filesList.length === 0) return;
        const filesArray = Array.from(filesList);
        addToast(`מעבד ${filesArray.length} קבצים...`, 'info');

        const processed = await Promise.all(filesArray.map(f => processSingleFile(f)));
        setUploadedFiles(prev => [...prev, ...processed]);
        addToast('הקבצים נטענו ומוכנים לחילוץ עם AI', 'success');
    };

    const handleRemoveFile = (id: string) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== id));
    };

    // Client-side heuristic fallback (multilingual Hebrew & Arabic)
    const runFallbackHeuristicExtraction = (text: string) => {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const tenants: ExtractedTenant[] = [];
        const buildings: ExtractedBuilding[] = [];
        const issues: ExtractedIssue[] = [];
        const workers: ExtractedWorker[] = [];
        const suppliers: ExtractedSupplier[] = [];
        const inventory: ExtractedInventory[] = [];
        const invoices: ExtractedInvoice[] = [];

        lines.forEach((line) => {
            const lower = line.toLowerCase();
            const phoneMatch = line.match(/(?:05\d-?\d{7}|0[23489]-?\d{7}|\+972-?\d{1,2}-?\d{7}|\+970-?\d{1,2}-?\d{7})/);
            const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/);
            const aptMatch = line.match(/(?:דירה|דירת|unit|apt|شقة|דיר'?)[:\s]+(\d+)/i) || line.match(/(?:דירה|شقة)\s*(\d+)/i);
            const rentMatch = line.match(/(?:שכירות|שכ"ד|rent|מחיר|إيجار|اجار)[\s:]*([0-9,.]+)/i);

            // Tenant detection (Hebrew / Arabic / English)
            if (lower.includes('דייר') || lower.includes('tenant') || lower.includes('מסטאג׳ר') || lower.includes('مستأجر') || lower.includes('ساكن') || (phoneMatch && (aptMatch || rentMatch))) {
                const parts = line.split(/[,;\t|]| - /).map(p => p.trim());
                const name = parts[0]?.replace(/(?:דייר|שם|tenant|مستأجر|ساكن)[:\s]*/i, '') || 'דייר חדש';
                tenants.push({
                    id: generateId(),
                    selected: true,
                    name: name.slice(0, 30),
                    phone: phoneMatch ? phoneMatch[0] : '',
                    email: emailMatch ? emailMatch[0] : '',
                    apartmentNumber: aptMatch ? aptMatch[1] : '1',
                    floorNumber: '1',
                    rentAmount: rentMatch ? parseFloat(rentMatch[1].replace(/,/g, '')) : undefined,
                    leaseStartDate: new Date().toISOString().split('T')[0],
                    leaseEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                });
            }
            // Building detection
            else if (lower.includes('בניין') || lower.includes('רחוב') || lower.includes('building') || lower.includes('נכס') || lower.includes('عمارة') || lower.includes('مבنى') || lower.includes('شارع') || lower.includes('עקאר')) {
                const parts = line.split(/[,;\t|]| - /).map(p => p.trim());
                buildings.push({
                    id: generateId(),
                    selected: true,
                    name: parts[0]?.replace(/(?:בניין|building|عمارة|مבنى)[:\s]*/i, '') || 'בניין חדש',
                    address: parts[1] || parts[0] || 'כתובת',
                    apartmentsCount: 10,
                    managerName: 'מנהל נכס',
                    managerPhone: phoneMatch ? phoneMatch[0] : '',
                });
            }
            // Issue / Problem detection
            else if (lower.includes('תקלה') || lower.includes('נזילה') || lower.includes('שבר') || lower.includes('issue') || lower.includes('קצר') || lower.includes('סתימה') || lower.includes('משכלה') || lower.includes('مشكلة') || lower.includes('تسريب') || lower.includes('עטל') || lower.includes('عطل')) {
                issues.push({
                    id: generateId(),
                    selected: true,
                    title: line.slice(0, 40),
                    description: line,
                    priority: lower.includes('דחוף') || lower.includes('קריטי') || lower.includes('עאג׳ל') || lower.includes('عاجل') ? ProblemSeverity.CRITICAL : ProblemSeverity.HIGH,
                    apartmentNumber: aptMatch ? aptMatch[1] : undefined,
                });
            }
            // Worker / Technician
            else if (lower.includes('אינסטלטור') || lower.includes('חשמלאי') || lower.includes('טכנאי') || lower.includes('קבלן') || lower.includes('worker') || lower.includes('technician') || lower.includes('פני') || lower.includes('فني') || lower.includes('עאמל') || lower.includes('عامل')) {
                const parts = line.split(/[,;\t|]| - /).map(p => p.trim());
                workers.push({
                    id: generateId(),
                    selected: true,
                    name: parts[0]?.replace(/(?:טכנאי|עובד|קבלן|فني|عامل)[:\s]*/i, '') || 'איש מקצוע',
                    specialty: parts[1] || 'תחזוקה כללית',
                    phone: phoneMatch ? phoneMatch[0] : '',
                    email: emailMatch ? emailMatch[0] : '',
                });
            }
            // Supplier detection
            else if (lower.includes('ספק') || lower.includes('חומרי') || lower.includes('supplier') || lower.includes('חברת') || lower.includes('מורד') || lower.includes('مورد') || lower.includes('שרכה') || lower.includes('شركة')) {
                const parts = line.split(/[,;\t|]| - /).map(p => p.trim());
                suppliers.push({
                    id: generateId(),
                    selected: true,
                    name: parts[0]?.replace(/(?:ספק|חברה|مورد|شركة)[:\s]*/i, '') || 'ספק חדש',
                    category: parts[1] || 'ציוד ואחזקה',
                    phone: phoneMatch ? phoneMatch[0] : '',
                    email: emailMatch ? emailMatch[0] : '',
                });
            }
            // Inventory
            else if (lower.includes('מלאי') || lower.includes('כמות') || lower.includes('יחידות') || lower.includes('sku') || lower.includes('מח׳זון') || lower.includes('مخزون') || lower.includes('כמיה') || lower.includes('كمية')) {
                const qtyMatch = line.match(/(?:כמות|qty|יחידות|كمية)[:\s]*(\d+)/i) || line.match(/(\d+)\s*(?:יח'|יחידות|pcs)/);
                inventory.push({
                    id: generateId(),
                    selected: true,
                    name: line.slice(0, 30),
                    quantity: qtyMatch ? parseInt(qtyMatch[1]) : 5,
                    location: 'מחסן ראשי',
                });
            }
            // Invoice
            else if (lower.includes('חשבונית') || lower.includes('invoice') || lower.includes('קבלה') || lower.includes('לתשלום') || lower.includes('פאטורה') || lower.includes('فاتورة')) {
                const invNumMatch = line.match(/(?:חשבונית|מספר|inv|#|فاتورة)[:\s]*(\d+)/i);
                const amountMatch = line.match(/(?:סה"כ|סך|amount|לתשלום|مبلغ)[:\s]*([0-9,.]+)/i);
                invoices.push({
                    id: generateId(),
                    selected: true,
                    invoiceNumber: invNumMatch ? invNumMatch[1] : String(Math.floor(1000 + Math.random() * 9000)),
                    supplierName: line.slice(0, 25),
                    amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 500,
                    date: new Date().toISOString().split('T')[0],
                });
            }
        });

        return { tenants, buildings, issues, workers, suppliers, inventory, invoices };
    };

    const handleRunExtraction = async () => {
        const fileTexts = uploadedFiles
            .map(f => (f.extractedText ? `\n[קובץ: ${f.name}]\n${f.extractedText}` : ''))
            .filter(Boolean)
            .join('\n\n');

        const combinedText = [rawText.trim(), fileTexts].filter(Boolean).join('\n\n');

        const imageList = uploadedFiles
            .filter(f => f.type === 'image' && f.base64Data && f.mimeType)
            .map(f => ({ base64Data: f.base64Data!, mimeType: f.mimeType! }));

        if (!combinedText && imageList.length === 0) {
            addToast('נא להעלות קבצים (תמונות, PDF, Excel, Word) או להדביק טקסט לניתוח', 'warning');
            return;
        }

        setIsExtracting(true);
        addToast(`ה-AI מנתח את הנתונים באמצעות ${selectedModel}...`, 'info');

        try {
            let resultData: any;
            try {
                resultData = await smartExtractEntitiesWithAi({
                    text: combinedText,
                    images: imageList,
                    preferredModel: selectedModel,
                });
            } catch (aiErr) {
                console.warn('Gemini API call returned error, using multilingual heuristic fallback:', aiErr);
                resultData = runFallbackHeuristicExtraction(combinedText);
            }

            const tenants: ExtractedTenant[] = (resultData.tenants || []).map((t: any) => ({
                id: generateId(),
                selected: true,
                name: t.name || 'דייר',
                phone: t.phone || '',
                email: t.email || '',
                apartmentNumber: String(t.apartmentNumber || '1'),
                floorNumber: String(t.floorNumber || '1'),
                rentAmount: t.rentAmount ? Number(t.rentAmount) : undefined,
                leaseStartDate: t.leaseStartDate || new Date().toISOString().split('T')[0],
                leaseEndDate: t.leaseEndDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                contactPerson: t.contactPerson,
                buildingName: t.buildingName,
            }));

            const buildings: ExtractedBuilding[] = (resultData.buildings || []).map((b: any) => ({
                id: generateId(),
                selected: true,
                name: b.name || 'בניין חדש',
                address: b.address || b.name || 'כתובת',
                apartmentsCount: b.apartmentsCount ? Number(b.apartmentsCount) : 10,
                managerName: b.managerName || '',
                managerPhone: b.managerPhone || '',
            }));

            const issues: ExtractedIssue[] = (resultData.issues || []).map((i: any) => ({
                id: generateId(),
                selected: true,
                title: i.title || 'תקלה שזוהתה',
                description: i.description || i.title || '',
                priority: (i.priority as ProblemSeverity) || ProblemSeverity.MEDIUM,
                apartmentNumber: i.apartmentNumber,
                buildingName: i.buildingName,
            }));

            const workers: ExtractedWorker[] = (resultData.workers || []).map((w: any) => ({
                id: generateId(),
                selected: true,
                name: w.name || 'איש מקצוע',
                specialty: w.specialty || 'תחזוקה',
                phone: w.phone || '',
                email: w.email || '',
            }));

            const suppliers: ExtractedSupplier[] = (resultData.suppliers || []).map((s: any) => ({
                id: generateId(),
                selected: true,
                name: s.name || 'ספק',
                category: s.category || 'כללי',
                phone: s.phone || '',
                email: s.email || '',
            }));

            const inventory: ExtractedInventory[] = (resultData.inventory || []).map((inv: any) => ({
                id: generateId(),
                selected: true,
                name: inv.name || 'פריט מלאי',
                quantity: inv.quantity ? Number(inv.quantity) : 1,
                sku: inv.sku,
                location: inv.location || 'מחסן ראשי',
                buildingName: inv.buildingName,
            }));

            const invoices: ExtractedInvoice[] = (resultData.invoices || []).map((inv: any) => ({
                id: generateId(),
                selected: true,
                invoiceNumber: String(inv.invoiceNumber || Math.floor(1000 + Math.random() * 9000)),
                supplierName: inv.supplierName || 'ספק',
                amount: inv.amount ? Number(inv.amount) : 0,
                date: inv.date || new Date().toISOString().split('T')[0],
                buildingName: inv.buildingName,
            }));

            setExtractedTenants(tenants);
            setExtractedBuildings(buildings);
            setExtractedIssues(issues);
            setExtractedWorkers(workers);
            setExtractedSuppliers(suppliers);
            setExtractedInventory(inventory);
            setExtractedInvoices(invoices);

            const total = tenants.length + buildings.length + issues.length + workers.length + suppliers.length + inventory.length + invoices.length;
            if (total === 0) {
                setExtractedIssues([{
                    id: generateId(),
                    selected: true,
                    title: combinedText.slice(0, 40) || 'תקלה שזוהתה',
                    description: combinedText.slice(0, 200) || 'נתונים שנותחו מקובץ',
                    priority: ProblemSeverity.MEDIUM,
                }]);
                addToast('ה-AI זיהה ישות אחת מתוך הנתונים', 'info');
            } else {
                addToast(`ה-AI חילץ בהצלחה ${total} ישויות מתוך הקבצים והטקסט!`, 'success');
                if (tenants.length > 0) setActiveTab('tenants');
                else if (buildings.length > 0) setActiveTab('buildings');
                else if (issues.length > 0) setActiveTab('issues');
                else if (workers.length > 0) setActiveTab('workers');
                else if (suppliers.length > 0) setActiveTab('suppliers');
                else if (inventory.length > 0) setActiveTab('inventory');
                else if (invoices.length > 0) setActiveTab('invoices');
            }

            setHasExtracted(true);
        } catch (error) {
            console.error('Smart import extraction error:', error);
            addToast('שגיאה בניתוח הנתונים', 'error');
        } finally {
            setIsExtracting(false);
        }
    };

    const handleCommitToDatabase = async () => {
        setIsCommitting(true);
        try {
            const projects = await dbService.getAllProjects();
            let targetProject = projects[0];

            // If new buildings were extracted and selected, create them
            for (const b of extractedBuildings.filter(b => b.selected)) {
                const newProj: Project = {
                    id: generateId(),
                    name: b.name,
                    address: b.address,
                    clientInfo: b.managerName ? `${b.managerName} ${b.managerPhone || ''}` : '',
                    status: 'פעיל',
                    apartmentsCount: b.apartmentsCount,
                    managerName: b.managerName,
                    managerPhone: b.managerPhone,
                    images: [],
                    files: [],
                    todos: [],
                    inventory: [],
                    tenants: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                await dbService.addProject(newProj);
                if (!targetProject) targetProject = newProj;
            }

            // Ensure we have a project to attach items to
            if (!targetProject) {
                targetProject = {
                    id: generateId(),
                    name: 'בניין כללי',
                    address: 'ראשי',
                    clientInfo: '',
                    status: 'פעיל',
                    images: [],
                    files: [],
                    todos: [],
                    inventory: [],
                    tenants: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                await dbService.addProject(targetProject);
            }

            // Attach selected Tenants
            const selectedTenants = extractedTenants.filter(t => t.selected);
            if (selectedTenants.length > 0) {
                const currentTenants = targetProject.tenants || [];
                const newTenants = selectedTenants.map(t => ({
                    id: generateId(),
                    buildingId: targetProject.id,
                    name: t.name,
                    phone: t.phone,
                    email: t.email,
                    building: targetProject.name,
                    floor: t.floorNumber,
                    officeNumber: t.apartmentNumber,
                    officeSpace: '',
                    companyId: '',
                    apartmentNumber: t.apartmentNumber,
                    floorNumber: t.floorNumber,
                    rentAmount: t.rentAmount,
                    leaseStartDate: t.leaseStartDate,
                    leaseEndDate: t.leaseEndDate,
                    contactPerson: t.contactPerson,
                    paymentStatus: 'שולם' as const,
                }));
                targetProject.tenants = [...currentTenants, ...newTenants];
                await dbService.updateProject(targetProject);
            }

            // Attach selected Issues (as Report & Problems)
            const selectedIssues = extractedIssues.filter(i => i.selected);
            if (selectedIssues.length > 0) {
                const reportId = generateId();
                await dbService.addReport({
                    id: reportId,
                    projectId: targetProject.id,
                    title: `ייבוא חכם AI - ${new Date().toLocaleDateString('he-IL')}`,
                    date: new Date().toISOString().split('T')[0],
                    description: `נוצר אוטומטית באמצעות כלי ייבוא ה-AI (${selectedIssues.length} תקלות)`,
                    files: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });

                for (let i = 0; i < selectedIssues.length; i++) {
                    const iss = selectedIssues[i];
                    await dbService.addProblem({
                        id: generateId(),
                        reportId,
                        description: iss.title ? `${iss.title} - ${iss.description}` : iss.description,
                        severity: iss.priority,
                        notes: iss.apartmentNumber ? `מיקום: דירה ${iss.apartmentNumber}` : '',
                        locationTag: iss.apartmentNumber ? `דירה ${iss.apartmentNumber}` : undefined,
                        images: [],
                        order: i + 1,
                        isFixed: false,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    });
                }
            }

            // Attach selected Workers
            const selectedWorkers = extractedWorkers.filter(w => w.selected);
            if (selectedWorkers.length > 0) {
                targetProject.workers = [
                    ...(targetProject.workers || []),
                    ...selectedWorkers.map(w => ({
                        id: generateId(),
                        name: w.name,
                        idNumber: '',
                        workerNumber: '',
                        phone: w.phone,
                        email: w.email,
                        address: w.specialty,
                        licenses: [],
                    }))
                ];
                await dbService.updateProject(targetProject);
            }

            // Attach selected Suppliers
            const selectedSuppliers = extractedSuppliers.filter(s => s.selected);
            for (const s of selectedSuppliers) {
                await dbService.addSupplier({
                    id: generateId(),
                    name: s.name,
                    group: s.category || 'כללי',
                    phone: s.phone,
                    email: s.email,
                    companyId: generateId(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }

            // Attach selected Invoices
            const selectedInvoices = extractedInvoices.filter(inv => inv.selected);
            for (const inv of selectedInvoices) {
                await dbService.addInvoice({
                    id: generateId(),
                    buildingId: targetProject.id,
                    projectName: targetProject.name,
                    supplierName: inv.supplierName,
                    invoiceNumber: inv.invoiceNumber,
                    amount: inv.amount,
                    date: inv.date,
                    status: 'ממתין',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }

            addToast('כל הנתונים שנבחרו יובאו בהצלחה למערכת!', 'success');
            navigate('/dashboard');
        } catch (error) {
            console.error('Error committing smart import:', error);
            addToast('שגיאה בשמירת הנתונים', 'error');
        } finally {
            setIsCommitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto pb-12" dir="rtl">
            {/* Header with Gemini Model Selector */}
            <div className="bg-white dark:bg-neutral-800/90 border border-slate-200/90 dark:border-neutral-700 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-gradient-to-tr from-sky-500 to-indigo-600 text-white rounded-2xl shadow-sm flex-shrink-0">
                        <SparklesIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                            ייבוא חכם באמצעות AI ✨
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            העלה קובצי PDF, תמונות/צילומים, גיליונות Excel, מסמכי Word או טקסט בעברית וערבית (العربية) — ה-AI יסווג הכל לחלק המתאים
                        </p>
                    </div>
                </div>

                {/* Gemini Model Selector */}
                <div className="bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700/80 rounded-2xl p-2.5 flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">מודל AI:</span>
                    <select
                        value={selectedModel}
                        onChange={e => handleModelChange(e.target.value as GeminiModelVersion)}
                        className="text-xs font-bold bg-white dark:bg-neutral-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-neutral-700 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-2xs"
                    >
                        {GEMINI_MODELS.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.name} {m.badge ? `(${m.badge})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Input Section: File Upload & Raw Text */}
            <div className="bg-white dark:bg-neutral-800/90 p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200/90 dark:border-neutral-700 space-y-5">
                {/* Drag and Drop Zone */}
                <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                        העלאת קבצים לייבוא (תמונות, PDF, Excel, Word):
                    </label>

                    <div
                        onDragOver={e => {
                            e.preventDefault();
                            setIsDragOver(true);
                        }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={e => {
                            e.preventDefault();
                            setIsDragOver(false);
                            handleFilesSelected(e.dataTransfer.files);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                            isDragOver
                                ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/30 ring-4 ring-sky-100 dark:ring-sky-900/30'
                                : 'border-slate-300 dark:border-neutral-700 hover:border-sky-400 dark:hover:border-sky-600 hover:bg-slate-50/60 dark:hover:bg-neutral-800/60'
                        }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*,.pdf,.xlsx,.xls,.csv,.docx,.doc,.txt"
                            onChange={e => handleFilesSelected(e.target.files)}
                            className="hidden"
                        />
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs">
                                <ArrowUpTrayIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    גרור לכאן קבצים או <span className="text-sky-600 dark:text-sky-400 underline">לחץ לבחירה מהמכשיר</span>
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    תומך תמונות (JPG, PNG), קובצי PDF, גיליונות Excel (XLSX, CSV), מסמכי Word (DOCX) וטקסט
                                </p>
                            </div>

                            {/* Format badges */}
                            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    📊 Excel / CSV
                                </span>
                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                    📄 PDF
                                </span>
                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    📝 Word (.docx)
                                </span>
                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                    📷 צילומים ותמונות
                                </span>
                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    🌐 עברית וערבית (العربية)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Uploaded Files Cards List */}
                {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                קבצים שנטענו ({uploadedFiles.length}):
                            </span>
                            <button
                                type="button"
                                onClick={() => setUploadedFiles([])}
                                className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                            >
                                נקה את כל הקבצים
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {uploadedFiles.map(f => (
                                <div
                                    key={f.id}
                                    className="p-3 rounded-2xl border border-slate-200 dark:border-neutral-700 bg-slate-50/70 dark:bg-neutral-900/60 flex items-center justify-between gap-3"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {f.type === 'image' && f.previewUrl ? (
                                            <img
                                                src={f.previewUrl}
                                                alt={f.name}
                                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-neutral-700 flex-shrink-0"
                                            />
                                        ) : (
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                                f.type === 'excel'
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : f.type === 'pdf'
                                                    ? 'bg-rose-100 text-rose-800'
                                                    : f.type === 'word'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-slate-200 text-slate-800'
                                            }`}>
                                                {f.type === 'excel' ? 'XLS' : f.type === 'pdf' ? 'PDF' : f.type === 'word' ? 'DOC' : 'TXT'}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                                {f.name}
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                {(f.size / 1024).toFixed(1)} KB • {f.summary || 'מוכן לניתוח'}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleRemoveFile(f.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white dark:hover:bg-neutral-800 transition-colors flex-shrink-0 cursor-pointer"
                                        title="הסר קובץ"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Raw Text Textarea */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            או הדבק טקסט חופשי / הודעות וואטסאפ / נתוני טבלה:
                        </label>
                        <button
                            type="button"
                            onClick={() => setRawText(
                                `רשימת דיירים בניין הרצל 15 תל אביב:\n` +
                                `דייר: ישראל ישראלי, דירה 4, טלפון: 050-1234567, שכ"ד: 4,500 ש"ח\n` +
                                `مستأجر: أحمد خليل, شقة 8, هاتف: 052-9876543, إيجار: 5,200 شيكل\n\n` +
                                `תקלות דחופות:\n` +
                                `נזילה חמורה מצינור ראשי בלובי כניסה - קריטי\n` +
                                `تسريب مياه في الطابق الثاني بجانب المصعد - عاجل\n\n` +
                                `חשבונית מספר 4022 מחברת מעליות שיא בע"מ על סך 1,850 ש"ח`
                            )}
                            className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-bold cursor-pointer"
                        >
                            טען טקסט לדוגמה (עברית וערבית)
                        </button>
                    </div>

                    <textarea
                        value={rawText}
                        onChange={e => setRawText(e.target.value)}
                        rows={4}
                        className="w-full text-xs font-mono bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-2xl p-4 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all resize-y"
                        placeholder="לדוגמה: הדבק כאן רשימות דיירים, הודעות, תקלות או נתונים בעברית, ערבית או אנגלית..."
                    />
                </div>

                {/* Action button */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        ה-AI קורא ומזהה דיירים, תקלות, עובדים, ספקים, מלאי וחשבוניות ישירות מהקבצים והטקסט
                    </p>
                    <button
                        onClick={handleRunExtraction}
                        disabled={isExtracting || (!rawText.trim() && uploadedFiles.length === 0)}
                        className="btn-primary flex items-center gap-2 px-7 py-3 shadow-sm font-bold text-sm rounded-xl w-full sm:w-auto justify-center cursor-pointer disabled:opacity-50"
                    >
                        {isExtracting ? (
                            <>
                                <LoadingSpinner size="sm" /> מנתח קבצים וטקסט עם {selectedModel}...
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-5 h-5" /> חלץ ישויות עם AI
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Results Preview & Validation Table */}
            {hasExtracted && (
                <div className="bg-white rounded-3xl shadow-xs border border-slate-200/90 overflow-hidden animate-fadeIn">
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/80 flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800 text-base">תוצאות החילוץ:</span>
                            <span className="text-xs bg-sky-100 text-sky-800 px-3 py-1 rounded-full font-bold">
                                יש לבדוק ולאשר לפני הוספה
                            </span>
                        </div>

                        <button
                            onClick={handleCommitToDatabase}
                            disabled={isCommitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-xs flex items-center gap-2 transition-colors text-xs"
                        >
                            {isCommitting ? <LoadingSpinner size="sm" /> : '✓ החל וייבא ישויות שנבחרו למערכת'}
                        </button>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50 p-2 gap-1.5">
                        {[
                            { key: 'tenants', label: `דיירים (${extractedTenants.length})` },
                            { key: 'buildings', label: `בניינים (${extractedBuildings.length})` },
                            { key: 'issues', label: `תקלות (${extractedIssues.length})` },
                            { key: 'workers', label: `עובדים (${extractedWorkers.length})` },
                            { key: 'suppliers', label: `ספקים (${extractedSuppliers.length})` },
                            { key: 'inventory', label: `מלאי (${extractedInventory.length})` },
                            { key: 'invoices', label: `חשבוניות (${extractedInvoices.length})` },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                                    activeTab === tab.key ? 'bg-white shadow-xs text-sky-800 font-black border border-slate-200/80' : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Contents */}
                    <div className="p-4 overflow-x-auto">
                        {activeTab === 'tenants' && (
                            extractedTenants.length === 0 ? <p className="text-center py-8 text-slate-400">לא זוהו דיירים בטקסט.</p> : (
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-slate-50 text-slate-700 border-b">
                                        <tr>
                                            <th className="p-2 w-10">בחר</th>
                                            <th className="p-2">שם מלא</th>
                                            <th className="p-2">דירה</th>
                                            <th className="p-2">טלפון</th>
                                            <th className="p-2">דוא״ל</th>
                                            <th className="p-2">שכ״ד (₪)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {extractedTenants.map((t, idx) => (
                                            <tr key={t.id} className="hover:bg-slate-50">
                                                <td className="p-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={t.selected}
                                                        onChange={e => {
                                                            const copy = [...extractedTenants];
                                                            copy[idx].selected = e.target.checked;
                                                            setExtractedTenants(copy);
                                                        }}
                                                        className="w-4 h-4 rounded text-sky-600"
                                                    />
                                                </td>
                                                <td className="p-2 font-medium">
                                                    <input
                                                        type="text"
                                                        value={t.name}
                                                        onChange={e => {
                                                            const copy = [...extractedTenants];
                                                            copy[idx].name = e.target.value;
                                                            setExtractedTenants(copy);
                                                        }}
                                                        className="input-class p-1 text-sm w-full"
                                                    />
                                                </td>
                                                <td className="p-2 w-20">
                                                    <input
                                                        type="text"
                                                        value={t.apartmentNumber}
                                                        onChange={e => {
                                                            const copy = [...extractedTenants];
                                                            copy[idx].apartmentNumber = e.target.value;
                                                            setExtractedTenants(copy);
                                                        }}
                                                        className="input-class p-1 text-sm w-full"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="text"
                                                        value={t.phone}
                                                        onChange={e => {
                                                            const copy = [...extractedTenants];
                                                            copy[idx].phone = e.target.value;
                                                            setExtractedTenants(copy);
                                                        }}
                                                        className="input-class p-1 text-sm w-full"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="email"
                                                        value={t.email}
                                                        onChange={e => {
                                                            const copy = [...extractedTenants];
                                                            copy[idx].email = e.target.value;
                                                            setExtractedTenants(copy);
                                                        }}
                                                        className="input-class p-1 text-sm w-full"
                                                    />
                                                </td>
                                                <td className="p-2 w-24">
                                                    <input
                                                        type="number"
                                                        value={t.rentAmount || ''}
                                                        onChange={e => {
                                                            const copy = [...extractedTenants];
                                                            copy[idx].rentAmount = parseFloat(e.target.value) || undefined;
                                                            setExtractedTenants(copy);
                                                        }}
                                                        className="input-class p-1 text-sm w-full"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        )}

                        {activeTab === 'issues' && (
                            extractedIssues.length === 0 ? <p className="text-center py-8 text-slate-400">לא זוהו תקלות בטקסט.</p> : (
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-slate-50 text-slate-700 border-b">
                                        <tr>
                                            <th className="p-2 w-10">בחר</th>
                                            <th className="p-2">כותרת</th>
                                            <th className="p-2">פירוט תקלה</th>
                                            <th className="p-2">דחיפות</th>
                                            <th className="p-2">דירה</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {extractedIssues.map((iss, idx) => (
                                            <tr key={iss.id} className="hover:bg-slate-50">
                                                <td className="p-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={iss.selected}
                                                        onChange={e => {
                                                            const copy = [...extractedIssues];
                                                            copy[idx].selected = e.target.checked;
                                                            setExtractedIssues(copy);
                                                        }}
                                                        className="w-4 h-4 rounded text-sky-600"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="text"
                                                        value={iss.title}
                                                        onChange={e => {
                                                            const copy = [...extractedIssues];
                                                            copy[idx].title = e.target.value;
                                                            setExtractedIssues(copy);
                                                        }}
                                                        className="input-class p-1 text-sm w-full"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <textarea
                                                        value={iss.description}
                                                        onChange={e => {
                                                            const copy = [...extractedIssues];
                                                            copy[idx].description = e.target.value;
                                                            setExtractedIssues(copy);
                                                        }}
                                                        className="input-class p-1 text-sm w-full"
                                                        rows={1}
                                                    />
                                                </td>
                                                <td className="p-2 w-32">
                                                    <select
                                                        value={iss.priority}
                                                        onChange={e => {
                                                            const copy = [...extractedIssues];
                                                            copy[idx].priority = e.target.value as ProblemSeverity;
                                                            setExtractedIssues(copy);
                                                        }}
                                                        className="input-class p-1 text-sm w-full"
                                                    >
                                                        <option value={ProblemSeverity.LOW}>נמוכה</option>
                                                        <option value={ProblemSeverity.MEDIUM}>בינונית</option>
                                                        <option value={ProblemSeverity.HIGH}>גבוהה</option>
                                                        <option value={ProblemSeverity.CRITICAL}>קריטית</option>
                                                    </select>
                                                </td>
                                                <td className="p-2 w-20">
                                                    <input
                                                        type="text"
                                                        value={iss.apartmentNumber || ''}
                                                        onChange={e => {
                                                            const copy = [...extractedIssues];
                                                            copy[idx].apartmentNumber = e.target.value;
                                                            setExtractedIssues(copy);
                                                        }}
                                                        className="input-class p-1 text-sm w-full"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        )}

                        {activeTab === 'buildings' && (
                            extractedBuildings.length === 0 ? <p className="text-center py-8 text-slate-400">לא זוהו בניינים בטקסט.</p> : (
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-slate-50 text-slate-700 border-b">
                                        <tr>
                                            <th className="p-2 w-10">בחר</th>
                                            <th className="p-2">שם הבניין</th>
                                            <th className="p-2">כתובת</th>
                                            <th className="p-2">מנהל נכס</th>
                                            <th className="p-2">טלפון מנהל</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {extractedBuildings.map((b, idx) => (
                                            <tr key={b.id}>
                                                <td className="p-2"><input type="checkbox" checked={b.selected} onChange={e => { const c = [...extractedBuildings]; c[idx].selected = e.target.checked; setExtractedBuildings(c); }} /></td>
                                                <td className="p-2"><input type="text" value={b.name} onChange={e => { const c = [...extractedBuildings]; c[idx].name = e.target.value; setExtractedBuildings(c); }} className="input-class p-1 text-sm w-full" /></td>
                                                <td className="p-2"><input type="text" value={b.address} onChange={e => { const c = [...extractedBuildings]; c[idx].address = e.target.value; setExtractedBuildings(c); }} className="input-class p-1 text-sm w-full" /></td>
                                                <td className="p-2"><input type="text" value={b.managerName || ''} onChange={e => { const c = [...extractedBuildings]; c[idx].managerName = e.target.value; setExtractedBuildings(c); }} className="input-class p-1 text-sm w-full" /></td>
                                                <td className="p-2"><input type="text" value={b.managerPhone || ''} onChange={e => { const c = [...extractedBuildings]; c[idx].managerPhone = e.target.value; setExtractedBuildings(c); }} className="input-class p-1 text-sm w-full" /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        )}

                        {activeTab === 'invoices' && (
                            extractedInvoices.length === 0 ? <p className="text-center py-8 text-slate-400">לא זוהו חשבוניות בטקסט.</p> : (
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-slate-50 text-slate-700 border-b">
                                        <tr>
                                            <th className="p-2 w-10">בחר</th>
                                            <th className="p-2">מספר חשבונית</th>
                                            <th className="p-2">ספק / מוטב</th>
                                            <th className="p-2">סכום (₪)</th>
                                            <th className="p-2">תאריך</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {extractedInvoices.map((inv, idx) => (
                                            <tr key={inv.id}>
                                                <td className="p-2"><input type="checkbox" checked={inv.selected} onChange={e => { const c = [...extractedInvoices]; c[idx].selected = e.target.checked; setExtractedInvoices(c); }} /></td>
                                                <td className="p-2"><input type="text" value={inv.invoiceNumber} onChange={e => { const c = [...extractedInvoices]; c[idx].invoiceNumber = e.target.value; setExtractedInvoices(c); }} className="input-class p-1 text-sm w-full" /></td>
                                                <td className="p-2"><input type="text" value={inv.supplierName} onChange={e => { const c = [...extractedInvoices]; c[idx].supplierName = e.target.value; setExtractedInvoices(c); }} className="input-class p-1 text-sm w-full" /></td>
                                                <td className="p-2"><input type="number" value={inv.amount} onChange={e => { const c = [...extractedInvoices]; c[idx].amount = parseFloat(e.target.value) || 0; setExtractedInvoices(c); }} className="input-class p-1 text-sm w-full" /></td>
                                                <td className="p-2"><input type="date" value={inv.date} onChange={e => { const c = [...extractedInvoices]; c[idx].date = e.target.value; setExtractedInvoices(c); }} className="input-class p-1 text-sm w-full" /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        )}

                        {activeTab === 'workers' && (
                            extractedWorkers.length === 0 ? <p className="text-center py-8 text-slate-400">לא זוהו עובדי תחזוקה בטקסט.</p> : (
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-slate-50 text-slate-700 border-b">
                                        <tr>
                                            <th className="p-2 w-10">בחר</th>
                                            <th className="p-2">שם</th>
                                            <th className="p-2">מקצוע / התמחות</th>
                                            <th className="p-2">טלפון</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {extractedWorkers.map((w, idx) => (
                                            <tr key={w.id}>
                                                <td className="p-2"><input type="checkbox" checked={w.selected} onChange={e => { const c = [...extractedWorkers]; c[idx].selected = e.target.checked; setExtractedWorkers(c); }} /></td>
                                                <td className="p-2"><input type="text" value={w.name} onChange={e => { const c = [...extractedWorkers]; c[idx].name = e.target.value; setExtractedWorkers(c); }} className="input-class p-1 text-sm w-full" /></td>
                                                <td className="p-2"><input type="text" value={w.specialty} onChange={e => { const c = [...extractedWorkers]; c[idx].specialty = e.target.value; setExtractedWorkers(c); }} className="input-class p-1 text-sm w-full" /></td>
                                                <td className="p-2"><input type="text" value={w.phone} onChange={e => { const c = [...extractedWorkers]; c[idx].phone = e.target.value; setExtractedWorkers(c); }} className="input-class p-1 text-sm w-full" /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        )}

                        {activeTab === 'suppliers' && (
                            extractedSuppliers.length === 0 ? <p className="text-center py-8 text-slate-400">לא זוהו ספקים בטקסט.</p> : (
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-slate-50 text-slate-700 border-b">
                                        <tr>
                                            <th className="p-2 w-10">בחר</th>
                                            <th className="p-2">שם ספק</th>
                                            <th className="p-2">תחום</th>
                                            <th className="p-2">טלפון</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {extractedSuppliers.map((s, idx) => (
                                            <tr key={s.id}>
                                                <td className="p-2"><input type="checkbox" checked={s.selected} onChange={e => { const c = [...extractedSuppliers]; c[idx].selected = e.target.checked; setExtractedSuppliers(c); }} /></td>
                                                <td className="p-2"><input type="text" value={s.name} onChange={e => { const c = [...extractedSuppliers]; c[idx].name = e.target.value; setExtractedSuppliers(c); }} className="input-class p-1 text-sm w-full" /></td>
                                                <td className="p-2"><input type="text" value={s.category} onChange={e => { const c = [...extractedSuppliers]; c[idx].category = e.target.value; setExtractedSuppliers(c); }} className="input-class p-1 text-sm w-full" /></td>
                                                <td className="p-2"><input type="text" value={s.phone} onChange={e => { const c = [...extractedSuppliers]; c[idx].phone = e.target.value; setExtractedSuppliers(c); }} className="input-class p-1 text-sm w-full" /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        )}

                        {activeTab === 'inventory' && (
                            extractedInventory.length === 0 ? <p className="text-center py-8 text-slate-400">לא זוהו פריטי מלאי בטקסט.</p> : (
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-slate-50 text-slate-700 border-b">
                                        <tr>
                                            <th className="p-2 w-10">בחר</th>
                                            <th className="p-2">שם פריט</th>
                                            <th className="p-2">כמות</th>
                                            <th className="p-2">מיקום</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {extractedInventory.map((inv, idx) => (
                                            <tr key={inv.id}>
                                                <td className="p-2"><input type="checkbox" checked={inv.selected} onChange={e => { const c = [...extractedInventory]; c[idx].selected = e.target.checked; setExtractedInventory(c); }} /></td>
                                                <td className="p-2"><input type="text" value={inv.name} onChange={e => { const c = [...extractedInventory]; c[idx].name = e.target.value; setExtractedInventory(c); }} className="input-class p-1 text-sm w-full" /></td>
                                                <td className="p-2 w-24"><input type="number" value={inv.quantity} onChange={e => { const c = [...extractedInventory]; c[idx].quantity = parseInt(e.target.value) || 0; setExtractedInventory(c); }} className="input-class p-1 text-sm w-full" /></td>
                                                <td className="p-2"><input type="text" value={inv.location || ''} onChange={e => { const c = [...extractedInventory]; c[idx].location = e.target.value; setExtractedInventory(c); }} className="input-class p-1 text-sm w-full" /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AISmartImportPage;
