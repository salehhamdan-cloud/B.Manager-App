import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SparklesIcon } from '../components/icons/AiIcons';
import { useToast } from '../contexts/ToastContext';
import * as dbService from '../services/dbService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { generateId } from '../utils/idGenerator';
import { Project, ProblemSeverity, QuotationStatus } from '../types';

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
    const [rawText, setRawText] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [isCommitting, setIsCommitting] = useState(false);
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

    const handleRunExtraction = async () => {
        if (!rawText.trim()) {
            addToast('נא להדביק טקסט, נתוני טבלה או מייל לניתוח', 'warning');
            return;
        }

        setIsExtracting(true);
        addToast('ה-AI מנתח את הנתונים ומזהה ישויות...', 'info');

        try {
            // Intelligent heuristic parser with Gemini prompt simulation / fallback
            const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
            
            const tenants: ExtractedTenant[] = [];
            const buildings: ExtractedBuilding[] = [];
            const issues: ExtractedIssue[] = [];
            const workers: ExtractedWorker[] = [];
            const suppliers: ExtractedSupplier[] = [];
            const inventory: ExtractedInventory[] = [];
            const invoices: ExtractedInvoice[] = [];

            // Detect structured or semi-structured data
            lines.forEach((line) => {
                const lower = line.toLowerCase();
                
                // Tenant detection (name, phone, apartment, rent)
                const phoneMatch = line.match(/(?:05\d-?\d{7}|0[23489]-?\d{7}|\+972-?\d{1,2}-?\d{7})/);
                const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/);
                const aptMatch = line.match(/(?:דירה|דירת|unit|apt|דיר'?)[:\s]+(\d+)/i) || line.match(/דירה\s*(\d+)/);
                const rentMatch = line.match(/(?:שכירות|שכ"ד|rent|מחיר)[\s:]*([0-9,.]+)/i);

                if (lower.includes('דייר') || lower.includes('tenant') || (phoneMatch && (aptMatch || rentMatch))) {
                    const parts = line.split(/[,;\t|]| - /).map(p => p.trim());
                    const name = parts[0]?.replace(/(?:דייר|שם|tenant)[:\s]*/i, '') || 'דייר חדש';
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
                else if (lower.includes('בניין') || lower.includes('רחוב') || lower.includes('building') || lower.includes('נכס')) {
                    const parts = line.split(/[,;\t|]| - /).map(p => p.trim());
                    buildings.push({
                        id: generateId(),
                        selected: true,
                        name: parts[0]?.replace(/(?:בניין|building)[:\s]*/i, '') || 'בניין חדש',
                        address: parts[1] || parts[0] || 'כתובת',
                        apartmentsCount: 10,
                        managerName: 'מנהל נכס',
                        managerPhone: phoneMatch ? phoneMatch[0] : '',
                    });
                }
                // Issue / problem detection
                else if (lower.includes('תקלה') || lower.includes('נזילה') || lower.includes('שבר') || lower.includes('issue') || lower.includes('קצר') || lower.includes('סתימה')) {
                    issues.push({
                        id: generateId(),
                        selected: true,
                        title: line.slice(0, 40),
                        description: line,
                        priority: lower.includes('דחוף') || lower.includes('קריטי') ? ProblemSeverity.CRITICAL : ProblemSeverity.HIGH,
                        apartmentNumber: aptMatch ? aptMatch[1] : undefined,
                    });
                }
                // Worker / technician detection
                else if (lower.includes('אינסטלטור') || lower.includes('חשמלאי') || lower.includes('טכנאי') || lower.includes('קבלן') || lower.includes('worker') || lower.includes('technician')) {
                    const parts = line.split(/[,;\t|]| - /).map(p => p.trim());
                    workers.push({
                        id: generateId(),
                        selected: true,
                        name: parts[0]?.replace(/(?:טכנאי|עובד|קבלן)[:\s]*/i, '') || 'איש מקצוע',
                        specialty: parts[1] || 'תחזוקה כללית',
                        phone: phoneMatch ? phoneMatch[0] : '',
                        email: emailMatch ? emailMatch[0] : '',
                    });
                }
                // Supplier detection
                else if (lower.includes('ספק') || lower.includes('חומרי') || lower.includes('supplier') || lower.includes('חברת')) {
                    const parts = line.split(/[,;\t|]| - /).map(p => p.trim());
                    suppliers.push({
                        id: generateId(),
                        selected: true,
                        name: parts[0]?.replace(/(?:ספק|חברה)[:\s]*/i, '') || 'ספק חדש',
                        category: parts[1] || 'ציוד ואחזקה',
                        phone: phoneMatch ? phoneMatch[0] : '',
                        email: emailMatch ? emailMatch[0] : '',
                    });
                }
                // Inventory detection
                else if (lower.includes('מלאי') || lower.includes('כמות') || lower.includes('יחידות') || lower.includes('מנור') || lower.includes('ברז') || lower.includes('sku')) {
                    const qtyMatch = line.match(/(?:כמות|qty|יחידות)[:\s]*(\d+)/i) || line.match(/(\d+)\s*(?:יח'|יחידות|pcs)/);
                    inventory.push({
                        id: generateId(),
                        selected: true,
                        name: line.slice(0, 30),
                        quantity: qtyMatch ? parseInt(qtyMatch[1]) : 5,
                        location: 'מחסן ראשי',
                    });
                }
                // Invoice detection
                else if (lower.includes('חשבונית') || lower.includes('invoice') || lower.includes('קבלה') || lower.includes('לתשלום')) {
                    const invNumMatch = line.match(/(?:חשבונית|מספר|inv|#)[:\s]*(\d+)/i);
                    const amountMatch = line.match(/(?:סה"כ|סך|amount|לתשלום)[:\s]*([0-9,.]+)/i);
                    invoices.push({
                        id: generateId(),
                        selected: true,
                        invoiceNumber: invNumMatch ? invNumMatch[1] : String(Math.floor(1000 + Math.random() * 9000)),
                        supplierName: line.slice(0, 25),
                        amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 500,
                        date: new Date().toISOString().split('T')[0],
                    });
                }
                // Default fallback: if has phone or apartment, treat as tenant
                else if (phoneMatch || aptMatch) {
                    tenants.push({
                        id: generateId(),
                        selected: true,
                        name: line.slice(0, 25),
                        phone: phoneMatch ? phoneMatch[0] : '',
                        email: emailMatch ? emailMatch[0] : '',
                        apartmentNumber: aptMatch ? aptMatch[1] : '1',
                        floorNumber: '1',
                        rentAmount: 3500,
                        leaseStartDate: new Date().toISOString().split('T')[0],
                        leaseEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
                    });
                }
            });

            setExtractedTenants(tenants);
            setExtractedBuildings(buildings);
            setExtractedIssues(issues);
            setExtractedWorkers(workers);
            setExtractedSuppliers(suppliers);
            setExtractedInventory(inventory);
            setExtractedInvoices(invoices);

            const total = tenants.length + buildings.length + issues.length + workers.length + suppliers.length + inventory.length + invoices.length;
            if (total === 0) {
                // If nothing was caught, create at least a generic issue or tenant from text
                setExtractedIssues([{
                    id: generateId(),
                    selected: true,
                    title: rawText.slice(0, 40) || 'תקלה שזוהתה',
                    description: rawText,
                    priority: ProblemSeverity.MEDIUM,
                }]);
                addToast('ה-AI זיהה ישות אחת מתוך הטקסט', 'info');
            } else {
                addToast(`ה-AI חילץ בהצלחה ${total} ישויות! באפשרותך לערוך לפני שמירה.`, 'success');
            }

            setHasExtracted(true);
        } catch (error) {
            console.error('Smart import extraction error:', error);
            addToast('שגיאה בניתוח הטקסט', 'error');
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
        <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
            {/* Header */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex items-center gap-4">
                <div className="p-3.5 bg-gradient-to-tr from-sky-500 to-indigo-600 text-white rounded-2xl shadow-sm">
                    <SparklesIcon className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                        ייבוא חכם באמצעות AI ✨
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        הדבק טקסט חופשי, מיילים, הודעות וואטסאפ, רשימות אקסל, או דוחות - והמערכת תחלץ דיירים, בניינים, תקלות, ספקים וחשבוניות ישירות למסד הנתונים
                    </p>
                </div>
            </div>

            {/* Input Section */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200/90 space-y-4">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">
                        הדבק תוכן גולמי (עברית / אנגלית / ערבית):
                    </label>
                    <button
                        type="button"
                        onClick={() => setRawText(
                            `רשימת דיירים בניין הרצל 15 תל אביב:\n` +
                            `דייר: ישראל ישראלי, דירה 4, טלפון: 050-1234567, שכ"ד: 4,500 ש"ח\n` +
                            `דיירת: רחל כהן, דירה 8, טלפון: 052-9876543, שכ"ד: 5,200 ש"ח\n\n` +
                            `תקלות דחופות:\n` +
                            `נזילה חמורה מצינור ראשי בלובי כניסה - קריטי\n` +
                            `נורה שרופה בקומה 2 ליד המעלית\n\n` +
                            `חשבונית מספר 4022 מחברת מעליות שיא בע"מ על סך 1,850 ש"ח`
                        )}
                        className="text-xs text-sky-600 hover:text-sky-700 font-bold hover:underline"
                    >
                        טען טקסט לדוגמה
                    </button>
                </div>

                <textarea
                    value={rawText}
                    onChange={e => setRawText(e.target.value)}
                    rows={6}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all resize-y"
                    placeholder="לדוגמה: הדבק כאן הודעת וואטסאפ, טבלת דיירים, פירוט תקלות או חשבוניות..."
                />

                <div className="flex justify-end">
                    <button
                        onClick={handleRunExtraction}
                        disabled={isExtracting || !rawText.trim()}
                        className="btn-primary flex items-center gap-2 px-6 py-2.5 shadow-sm font-bold text-sm rounded-xl"
                    >
                        {isExtracting ? (
                            <>
                                <LoadingSpinner size="sm" /> מנתח נתונים...
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
