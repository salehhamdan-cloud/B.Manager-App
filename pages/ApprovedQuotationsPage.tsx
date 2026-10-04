import React, { useState, useEffect, useCallback, ChangeEvent, useMemo, useRef } from 'react';
import { Quotation, Supplier, Project, QuotationDashboardStats, QuotationStatus } from '../types';
import * as dbService from '../services/dbService';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, ArrowDownTrayIcon } from '../components/icons/ActionIcons';
import { DocumentTextIcon } from '../components/icons/BusinessIcons';
import Modal from '../components/common/Modal';
import { generateId } from '../utils/idGenerator';
import { formatDate } from '../utils/dateFormatter';
import CollapsibleSection from '../components/common/CollapsibleSection';
import { generateQuotationsPdf } from '../services/pdfService';
import { useSettings } from '../contexts/SettingsContext';
import { exportToCsv } from '../utils/exportUtils';
import * as emailService from '../services/emailService';
import { SparklesIcon } from '../components/icons/AiIcons';
import * as aiService from '../services/aiService.ts';
import { convertPdfToText } from '../utils/pdfUtils';
import { Chart, registerables } from 'chart.js';
import { QUOTATION_STATUS_OPTIONS, QUOTATION_STATUS_COLORS } from '../constants';

Chart.register(...registerables);

const ControlButton: React.FC<{ label: string; value: string; currentValue: string; onClick: (value: string) => void }> = ({ label, value, currentValue, onClick }) => (
    <button
        onClick={() => onClick(value)}
        className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-150 ${
            currentValue === value 
            ? 'bg-slate-900 text-white shadow-xs' 
            : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
        }`}
    >
        {label}
    </button>
);

const FilterGroup: React.FC<{
  title: string;
  options: string[];
  selected: Set<string>;
  onToggle: (option: string) => void;
  onToggleAll: () => void;
}> = ({ title, options, selected, onToggle, onToggleAll }) => (
    <div>
        <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-slate-600">{title}:</label>
            <button onClick={onToggleAll} className="text-xs text-sky-600 hover:underline">
                {selected.size === options.length ? 'בטל הכל' : 'בחר הכל'}
            </button>
        </div>
        <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1 bg-white">
            {options.map(option => (
                <label key={option} className="flex items-center gap-2 p-1 hover:bg-slate-100 rounded">
                    <input type="checkbox" className="form-checkbox" checked={selected.has(option)} onChange={() => onToggle(option)} />
                    {option}
                </label>
            ))}
        </div>
    </div>
);


const ApprovedQuotationsPage: React.FC = () => {
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();
    const { settings } = useSettings();

    // Modals and editing state
    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [editingQuotation, setEditingQuotation] = useState<Partial<Quotation> | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);
    const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
    const [viewingPdf, setViewingPdf] = useState<{name: string, dataUrl: string} | null>(null);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfExportFilters, setPdfExportFilters] = useState({
      buildings: new Set<string>(),
      years: new Set<string>(),
      groups: new Set<string>(),
      status: 'all' as 'all' | 'approved' | 'paid',
    });


    // File handling for modals
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [invoicePdfFile, setInvoicePdfFile] = useState<File | null>(null);

    // AI import state
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const aiFileInputRef = useRef<HTMLInputElement>(null);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);


    // Filtering and Sorting state
    const [buildingFilter, setBuildingFilter] = useState('all');
    const [yearFilter, setYearFilter] = useState('all');
    const [groupFilter, setGroupFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('date-desc');
    
    // Multi-select state
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedQuotations, setSelectedQuotations] = useState<Record<string, boolean>>({});
    const selectedCount = Object.keys(selectedQuotations).length;

    // Dashboard state
    const [dashboardStats, setDashboardStats] = useState<QuotationDashboardStats | null>(null);
    const yearChartRef = useRef<HTMLCanvasElement>(null);
    const groupChartRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!isEditMode) {
            setSelectedQuotations({});
        }
    }, [isEditMode]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [qData, sData, pData]: [Quotation[], Supplier[], Project[]] = await Promise.all([
                dbService.getAllQuotations(),
                dbService.getAllSuppliers(),
                dbService.getAllProjects(),
            ]);
            
            const generalQuotations = qData.filter(q => !q.subProjectId);

            const sanitizedQuotations: Quotation[] = [];
            for (const q of generalQuotations) {
                let quotation: Quotation = { ...q };

                quotation.projectName = String(quotation.projectName || "לא שויך");
                if (typeof quotation.price !== 'number' || isNaN(quotation.price)) {
                    const originalPrice = (quotation as any).price;
                    const parsedPrice = parseFloat(String(originalPrice).replace(/[^\d.-]/g, ''));
                    quotation.price = isNaN(parsedPrice) ? 0 : parsedPrice;
                }

                sanitizedQuotations.push(quotation);
            }

            setQuotations(sanitizedQuotations);
            setSuppliers(sData);
            setProjects(pData);
        } catch (error) {
            addToast('שגיאה בטעינת נתונים', 'error');
            console.error("Data loading/sanitization failed:", error);
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredQuotations = useMemo(() => {
        return quotations.filter(q => {
            const year = new Date(q.date).getFullYear().toString();
            return (buildingFilter === 'all' || q.projectName === buildingFilter) &&
                   (yearFilter === 'all' || year === yearFilter) &&
                   (groupFilter === 'all' || q.group === groupFilter);
        });
    }, [quotations, buildingFilter, yearFilter, groupFilter]);
    
    const sortedQuotations = useMemo(() => {
        return [...filteredQuotations].sort((a: Quotation, b: Quotation) => {
            switch (sortOrder) {
                case 'date-asc': return new Date(a.date).getTime() - new Date(b.date).getTime();
                case 'price-desc': return b.price - a.price;
                case 'price-asc': return a.price - b.price;
                case 'supplier-asc': return a.supplierName.localeCompare(b.supplierName);
                case 'date-desc':
                default:
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
            }
        });
    }, [filteredQuotations, sortOrder]);


    const quotationsByBuilding = useMemo(() => {
        const grouped: Record<string, Quotation[]> = {};
        sortedQuotations.forEach(q => {
            const buildingName = String(q.projectName || 'לא שויך');
            if (!grouped[buildingName]) grouped[buildingName] = [];
            grouped[buildingName].push(q);
        });
        return grouped;
    }, [sortedQuotations]);

    const sortedBuildingKeys = useMemo(() => (Object.keys(quotationsByBuilding) as string[]).sort((a: string, b: string) => a.localeCompare(b, 'he')), [quotationsByBuilding]);
    
    const filteredStats = useMemo(() => {
        const stats: QuotationDashboardStats = { totalCostAll: 0, costByYear: {}, costByGroup: {}, costByBuilding: {} };
        
        const approvedStatuses: QuotationStatus[] = [
            QuotationStatus.APPROVED,
            QuotationStatus.WORK_COMPLETED,
            QuotationStatus.INVOICE_PAID,
        ];

        sortedQuotations
            .filter(q => approvedStatuses.includes(q.status))
            .forEach(q => {
                const price = Number(q.price) || 0;
                const year = new Date(q.date).getFullYear().toString();
                const groupKey = q.group || 'ללא תחום';
                stats.totalCostAll += price;
                stats.costByYear[year] = (stats.costByYear[year] || 0) + price;
                stats.costByGroup[groupKey] = (stats.costByGroup[groupKey] || 0) + price;
                stats.costByBuilding[q.projectName] = (stats.costByBuilding[q.projectName] || 0) + price;
            });
        return stats;
    }, [sortedQuotations]);

    useEffect(() => {
        setDashboardStats(filteredStats);
    }, [filteredStats]);

    const createChart = (ref: React.RefObject<HTMLCanvasElement>, data: Record<string, number>, label: string, type: 'bar' | 'pie' = 'bar') => {
        if (!ref.current || !data) return null;

        const existingChart = Chart.getChart(ref.current);
        if (existingChart) {
            existingChart.destroy();
        }

        const ctx = ref.current.getContext('2d');
        if (!ctx) return null;

        const chartLabels = Object.keys(data) as string[];
        const chartData = Object.values(data);
        
        return new Chart(ctx, {
            type,
            data: {
                labels: chartLabels,
                datasets: [{
                    label,
                    data: chartData,
                    backgroundColor: type === 'bar' ? 'rgba(59, 130, 246, 0.5)' : chartLabels.map((_, i) => `hsl(${i * (360 / chartLabels.length)}, 70%, 80%)`),
                    borderColor: type === 'bar' ? 'rgba(59, 130, 246, 1)' : chartLabels.map((_, i) => `hsl(${i * (360 / chartLabels.length)}, 70%, 60%)`),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: type === 'pie' } }
            }
        });
    };

    useEffect(() => {
        const yearChart = createChart(yearChartRef, dashboardStats?.costByYear || {}, 'סה"כ הוצאות לפי שנה');
        const groupChart = createChart(groupChartRef, dashboardStats?.costByGroup || {}, 'סה"כ הוצאות לפי תחום', 'pie');
        return () => {
            yearChart?.destroy();
            groupChart?.destroy();
        };
    }, [dashboardStats]);


    const openAddEditModal = (quotation: Partial<Quotation> | null = null) => {
        setEditingQuotation(quotation ? { ...quotation } : {
            date: new Date().toISOString().split('T')[0],
            status: QuotationStatus.PENDING,
            projectId: projects.length === 1 ? projects[0].id : '',
            projectName: projects.length === 1 ? projects[0].name ?? '' : '',
            subProjectId: '',
            subProjectName: ''
        });
        setPdfFile(null);
        setInvoicePdfFile(null);
        setIsAddEditModalOpen(true);
    };

    const handleDelete = async (quotationId: string) => {
        if (window.confirm("האם למחוק הצעת מחיר זו?")) {
            try {
                await dbService.deleteQuotation(quotationId);
                addToast('הצעת המחיר נמחקה', 'success');
                fetchData();
            } catch (error) {
                addToast('שגיאה במחיקת הצעת המחיר', 'error');
            }
        }
    };
    
    const handleQuotationFileSelect = (e: ChangeEvent<HTMLInputElement>, type: 'quotation' | 'invoice') => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                addToast('יש לבחור קובץ PDF בלבד', 'warning');
                e.target.value = '';
                return;
            }
            if (type === 'quotation') setPdfFile(file);
            else setInvoicePdfFile(file);
        }
    };

    const handleSave = async () => {
        if (!editingQuotation || !editingQuotation.supplierName || !editingQuotation.quotationName || !editingQuotation.projectName || !editingQuotation.group || editingQuotation.price === undefined) {
            addToast('נא למלא את כל שדות החובה (*)', 'warning');
            return;
        }
        if (!editingQuotation.id && !pdfFile) {
            addToast('יש לצרף קובץ PDF של הצעת המחיר', 'warning');
            return;
        }

        setIsLoading(true);
        try {
            const processFile = async (file: File | null) => {
                if (!file) return null;
                return new Promise<{name: string, dataUrl: string, mimeType: string}>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (event) => resolve({ name: file.name, dataUrl: event.target?.result as string, mimeType: file.type });
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            };

            const [pdfFileData, invoicePdfFileData] = await Promise.all([ processFile(pdfFile), processFile(invoicePdfFile) ]);

            let quotationToSave = { ...editingQuotation } as Quotation;
            if (pdfFileData) quotationToSave.pdfFile = pdfFileData;
            if (invoicePdfFileData) quotationToSave.invoicePdfFile = invoicePdfFileData;
            
            if (editingQuotation.id) {
                quotationToSave.updatedAt = new Date().toISOString();
                await dbService.updateQuotation(quotationToSave);
                addToast('הצעת המחיר עודכנה', 'success');
            } else {
                quotationToSave.id = generateId();
                quotationToSave.createdAt = new Date().toISOString();
                quotationToSave.updatedAt = new Date().toISOString();
                await dbService.addQuotation(quotationToSave);
                addToast('הצעת מחיר חדשה נוספה', 'success');
            }
            setIsAddEditModalOpen(false);
            setEditingQuotation(null);
            fetchData();
        } catch (error) {
            addToast('שגיאה בשמירת הצעת המחיר', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAiImportClick = () => {
        setIsAiModalOpen(true);
    };

    const handleAiFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
    
        setIsAiModalOpen(false);
        setIsAiProcessing(true);
    
        try {
            let text = '';
            if (file.type === 'application/pdf') {
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (event) => resolve(event.target?.result as string);
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(file);
                });
                text = await convertPdfToText(dataUrl);
            } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
                text = await file.text();
            } else {
                throw new Error('סוג קובץ לא נתמך. יש להעלות PDF או CSV.');
            }
            
            const aiData: Partial<Quotation>[] = await aiService.generateQuotationsFromText(text);

            if (aiData.length === 0) {
                addToast('לא זוהו הצעות מחיר תקינות בקובץ.', 'warning');
                return;
            }
    
            const projectMap = new Map(projects.map(p => [p.name, p.id]));
            const quotationsToAdd: Quotation[] = [];
            const quotationsToUpdate: Quotation[] = [];
            let skippedCount = 0;
    
            for (const q of aiData) {
                const existingQuotation = quotations.find(
                    (eq) => eq.quotationNumber && q.quotationNumber && eq.quotationNumber !== '-' && eq.quotationNumber === q.quotationNumber
                );
    
                const price = parseFloat(String(q.price ?? '0').replace(/[^\d.-]/g, ''));
                const projectName = String(q.projectName || "לא שויך");
                const projectId = projectMap.get(projectName) || 'unassigned';
    
                const quotationData = {
                    date: q.date && typeof q.date === 'string' && q.date ? new Date(q.date).toISOString() : new Date().toISOString(),
                    supplierName: q.supplierName ?? 'לא צוין',
                    quotationNumber: q.quotationNumber ?? '-',
                    quotationName: q.quotationName ?? 'לא צוין',
                    group: q.group ?? 'כללי',
                    price: isNaN(price) ? 0 : price,
                    projectId: projectId,
                    projectName: projectName,
                    status: q.status || QuotationStatus.PENDING,
                    updatedAt: new Date().toISOString(),
                };
    
                if (existingQuotation) {
                    if (window.confirm(`הצעת מחיר עם מספר "${String(q.quotationNumber)}" עבור "${String(q.quotationName)}" כבר קיימת. האם להחליף אותה בפרטים החדשים?`)) {
                        quotationsToUpdate.push({
                            ...existingQuotation,
                            ...quotationData,
                        });
                    } else {
                        skippedCount++;
                    }
                } else {
                    if (!q.quotationName) continue;
                    quotationsToAdd.push({
                        ...quotationData,
                        id: generateId(),
                        createdAt: new Date().toISOString(),
                        pdfFile: { name: 'נדרשת העלאה.pdf', mimeType: 'application/pdf' },
                    } as Quotation);
                }
            }
    
            if (quotationsToAdd.length === 0 && quotationsToUpdate.length === 0) {
                addToast(`היבוא בוטל. ${skippedCount > 0 ? `${skippedCount} הצעות מחיר קיימות לא עודכנו.` : ''}`, 'info');
                return;
            }
    
            const addPromises = quotationsToAdd.map(q => dbService.addQuotation(q));
            const updatePromises = quotationsToUpdate.map(q => dbService.updateQuotation(q));
    
            await Promise.all([...addPromises, ...updatePromises]);
    
            let summary = '';
            if (quotationsToAdd.length > 0) summary += `${quotationsToAdd.length} הצעות חדשות נוספו. `;
            if (quotationsToUpdate.length > 0) summary += `${quotationsToUpdate.length} הצעות קיימות עודכנו. `;
            if (skippedCount > 0) summary += `${skippedCount} הצעות מחיר לא שונו.`;
    
            addToast(summary.trim(), 'success');
            fetchData();
    
        } catch (error) {
            addToast(error instanceof Error ? error.message : 'שגיאה ביבוא', 'error');
        } finally {
            setIsAiProcessing(false);
            if (e.target) e.target.value = '';
        }
    };
    
    const handleSelectQuotation = (quotationId: string) => {
        setSelectedQuotations(prev => {
            const newSelection = { ...prev };
            if (newSelection[quotationId]) {
                delete newSelection[quotationId];
            } else {
                newSelection[quotationId] = true;
            }
            return newSelection;
        });
    };

    const handleDeleteSelected = async () => {
        if (selectedCount === 0) return;
        if (window.confirm(`האם למחוק ${selectedCount} הצעות מחיר נבחרות?`)) {
            const idsToDelete = Object.keys(selectedQuotations);
            try {
                await dbService.deleteQuotations(idsToDelete);
                addToast(`${selectedCount} הצעות מחיר נמחקו`, 'success');
                setSelectedQuotations({});
                fetchData();
            } catch (error) {
                addToast('שגיאה במחיקת הצעות מחיר', 'error');
            }
        }
    };
    
    const handleExportCsv = () => {
        const quotationsToExport = isEditMode && selectedCount > 0 ? quotations.filter(q => selectedQuotations[q.id]) : sortedQuotations;
        if (quotationsToExport.length === 0) {
            addToast('לא נבחרו הצעות מחיר לייצוא', 'warning');
            return;
        }

        const dataToExport = quotationsToExport.map(q => ({
            'בניין': q.projectName,
            'פרויקט משנה': q.subProjectName || '',
            'תחום': q.group,
            'שם הצעה': q.quotationName,
            'ספק': q.supplierName,
            'תאריך אישור': formatDate(q.date),
            "מס' הצעה": q.quotationNumber,
            "מס' חשבונית": q.invoiceNumber || '',
            'מחיר': q.price,
            'סטטוס': q.status,
            'שולם': q.status === QuotationStatus.INVOICE_PAID ? 'כן' : 'לא',
        }));
        exportToCsv(dataToExport, 'quotations_list');
    };
    
    const yearOptions = useMemo(() => Array.from(new Set(quotations.map(q => new Date(q.date).getFullYear().toString()))).sort((a: string, b: string) => parseInt(b) - parseInt(a)), [quotations]);
    const buildingOptions = useMemo(() => {
        const allBuildingNames = new Set(quotations.map(q => q.projectName));
        return Array.from(allBuildingNames).filter((name): name is string => !!name).sort((a: string, b: string) => a.localeCompare(b, 'he'));
    }, [quotations]);

    const groupOptions: string[] = useMemo(() => Array.from(new Set(quotations.map(q => q.group).filter((g): g is string => !!g))).sort((a: string, b: string) => a.localeCompare(b, 'he')), [quotations]);

    const supplierGroups = Array.from(new Set(suppliers.map(s => s.group)));

    
    // PDF Export Modal Logic
    const uniqueYearsForModal = useMemo((): string[] => {
        const yearSet = new Set(quotations.map(q => new Date(q.date).getFullYear().toString()));
        return Array.from(yearSet).sort((a: string, b: string) => parseInt(b) - parseInt(a));
    }, [quotations]);
    const uniqueGroupsForModal = useMemo((): string[] => {
        const groupSet = new Set(quotations.map(q => q.group).filter((g): g is string => !!g));
        return Array.from(groupSet).sort((a: string, b: string) => a.localeCompare(b,'he'));
    }, [quotations]);
    const uniqueBuildingsForModal = useMemo((): string[] => {
        const buildingSet = new Set(quotations.map(q => q.projectName).filter((name): name is string => !!name));
        return Array.from(buildingSet).sort((a: string, b: string) => a.localeCompare(b, 'he'));
    }, [quotations]);

    const filteredForPdf = useMemo(() => {
        const approvedStatuses: QuotationStatus[] = [ QuotationStatus.APPROVED, QuotationStatus.WORK_COMPLETED, QuotationStatus.INVOICE_PAID ];
        return quotations.filter(q => {
            const year = new Date(q.date).getFullYear().toString();
            const buildingMatch = pdfExportFilters.buildings.size === 0 || pdfExportFilters.buildings.has(q.projectName);
            const yearMatch = pdfExportFilters.years.size === 0 || pdfExportFilters.years.has(year);
            const groupMatch = pdfExportFilters.groups.size === 0 || pdfExportFilters.groups.has(q.group);
            const statusMatch = (() => {
                switch (pdfExportFilters.status) {
                    case 'approved': return approvedStatuses.includes(q.status);
                    case 'paid': return q.status === QuotationStatus.INVOICE_PAID;
                    default: return true;
                }
            })();
            return buildingMatch && yearMatch && groupMatch && statusMatch;
        });
    }, [quotations, pdfExportFilters]);

    const handleExportPdf = () => {
        if (quotations.length === 0) {
            addToast('אין הצעות מחיר לייצוא', 'warning');
            return;
        }
        setPdfExportFilters({
            buildings: new Set(uniqueBuildingsForModal),
            years: new Set(uniqueYearsForModal),
            groups: new Set(uniqueGroupsForModal),
            status: 'all',
        });
        setIsPdfModalOpen(true);
    };

    const handleGenerateFilteredPdf = () => {
        const filtered = filteredForPdf;

        if (filtered.length === 0) {
            addToast('לא נמצאו הצעות מחיר התואמות לסינון לייצוא', 'warning');
            return;
        }
        
        const quotationsByBuildingForPdf = filtered.reduce((acc, q) => {
            const buildingName = q.projectName || 'לא שויך';
            if (!acc[buildingName]) acc[buildingName] = { groups: {}, total: 0 };
            if (!acc[buildingName].groups[q.group]) acc[buildingName].groups[q.group] = [];
            acc[buildingName].groups[q.group].push(q);
            acc[buildingName].total += (Number(q.price) || 0);
            return acc;
        }, {} as Record<string, { groups: Record<string, Quotation[]>; total: number }>);
        
        addToast('מכין PDF...', 'info');
        try {
            generateQuotationsPdf({ settings, quotationsByBuilding: quotationsByBuildingForPdf });
        } catch (e) {
            addToast('שגיאה ביצירת PDF', 'error');
            console.error("PDF generation failed:", e);
        }
        setIsPdfModalOpen(false);
    };
    
    const handlePdfFilterChange = (type: 'buildings' | 'years' | 'groups', value: string) => {
        setPdfExportFilters(prev => {
            const newSet = new Set(prev[type]);
            if (newSet.has(value)) newSet.delete(value);
            else newSet.add(value);
            return { ...prev, [type]: newSet };
        });
    };

    const handlePdfFilterToggleAll = (type: 'buildings' | 'years' | 'groups', allOptions: string[]) => {
        setPdfExportFilters(prev => {
            const currentSet = prev[type];
            if (currentSet.size === allOptions.length) return { ...prev, [type]: new Set<string>() };
            else return { ...prev, [type]: new Set(allOptions) };
        });
    };
    
    if (isLoading) return <LoadingSpinner text="טוען הצעות מחיר..." />;

    return (
        <div className="space-y-6">
             {isAiProcessing && (
                <div className="fixed inset-0 bg-slate-900 bg-opacity-60 backdrop-blur-sm z-[1001] flex items-center justify-center">
                    <LoadingSpinner text="מעבד קובץ בעזרת AI..."/>
                </div>
            )}
            <input type="file" ref={aiFileInputRef} onChange={handleAiFileChange} accept="application/pdf,text/csv,.csv" className="hidden" />

            <CollapsibleSection title="לוח בקרה (Dashboard)">
                <div className="text-center mb-4">
                    <p className="text-lg text-slate-600">סה"כ הוצאות (לפי סינון)</p>
                    <p className="text-4xl font-bold text-sky-700">₪{(dashboardStats?.totalCostAll ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[16rem]">
                    <div className="bg-slate-50 p-2 rounded-lg"><canvas ref={yearChartRef}></canvas></div>
                    <div className="bg-slate-50 p-2 rounded-lg"><canvas ref={groupChartRef}></canvas></div>
                </div>
            </CollapsibleSection>

            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200/90 space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">רשימת הצעות מחיר</h2>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">מעקב הצעות מספקים, אישורים, ביצוע וחשבוניות</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                         <button onClick={handleExportPdf} className="btn-secondary flex items-center gap-1.5 text-xs sm:text-sm"><ArrowDownTrayIcon className="w-4 h-4"/><span>PDF</span></button>
                         <button onClick={handleExportCsv} className="btn-secondary flex items-center gap-1.5 text-xs sm:text-sm"><ArrowDownTrayIcon className="w-4 h-4"/><span>Excel</span></button>
                         <button onClick={handleAiImportClick} className="btn-secondary flex items-center gap-1.5 text-xs sm:text-sm text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200"><SparklesIcon className="w-4 h-4 text-purple-600"/><span>יבא (AI)</span></button>
                         <button onClick={() => setIsEditMode(!isEditMode)} className={`text-xs sm:text-sm px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${isEditMode ? 'bg-sky-600 text-white shadow-xs' : 'btn-secondary'}`}>
                            <PencilIcon className="w-4 h-4"/> <span>{isEditMode ? 'סיום' : 'ערוך'}</span>
                        </button>
                         <button onClick={() => openAddEditModal()} className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm"><PlusIcon className="w-4 h-4"/><span>הוסף הצעה</span></button>
                    </div>
                </div>
                 <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">סנן לפי בניין:</label>
                    <div className="flex flex-wrap gap-1.5">
                        <ControlButton label="כל הבניינים" value="all" currentValue={buildingFilter} onClick={setBuildingFilter} />
                        {buildingOptions.map(b => <ControlButton key={b} label={b} value={b} currentValue={buildingFilter} onClick={setBuildingFilter} />)}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">סנן לפי שנה:</label>
                    <div className="flex flex-wrap gap-1.5">
                         <ControlButton label="כל השנים" value="all" currentValue={yearFilter} onClick={setYearFilter} />
                        {yearOptions.map(y => <ControlButton key={y} label={y} value={y} currentValue={yearFilter} onClick={setYearFilter} />)}
                    </div>
                </div>
                 <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">סנן לפי תחום:</label>
                    <div className="flex flex-wrap gap-1.5">
                        <ControlButton label="כל התחומים" value="all" currentValue={groupFilter} onClick={setGroupFilter} />
                        {groupOptions.map(g => <ControlButton key={g} label={g} value={g} currentValue={groupFilter} onClick={setGroupFilter} />)}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">מיין לפי:</label>
                     <div className="flex flex-wrap gap-1.5">
                        <ControlButton label="תאריך (חדש לישן)" value="date-desc" currentValue={sortOrder} onClick={setSortOrder} />
                        <ControlButton label="תאריך (ישן לחדש)" value="date-asc" currentValue={sortOrder} onClick={setSortOrder} />
                        <ControlButton label="מחיר (גבוה לנמוך)" value="price-desc" currentValue={sortOrder} onClick={setSortOrder} />
                        <ControlButton label="מחיר (נמוך לגבוה)" value="price-asc" currentValue={sortOrder} onClick={setSortOrder} />
                        <ControlButton label="ספק (א-ת)" value="supplier-asc" currentValue={sortOrder} onClick={setSortOrder} />
                    </div>
                </div>
            </div>
            
            <div className="space-y-4">
                 {sortedBuildingKeys.length === 0 ? (
                    <div className="text-center p-12 bg-white rounded-3xl shadow-xs border border-slate-200/90"><p className="text-slate-500 font-medium">לא נמצאו הצעות מחיר התואמות לסינון.</p></div>
                 ) : (
                    sortedBuildingKeys.map(buildingName => {
                        const quotationsInBuilding = quotationsByBuilding[buildingName];
                        
                        return (
                            <CollapsibleSection 
                                key={buildingName} 
                                title={<h3 className="text-base sm:text-lg font-bold text-slate-900">{buildingName}</h3>} 
                                count={quotationsInBuilding.length}
                                variant="primary"
                            >
                                <div className="space-y-4">
                                    {Object.entries(quotationsInBuilding.reduce((acc, q) => {
                                        const groupName = q.group || 'ללא תחום';
                                        if (!acc[groupName]) acc[groupName] = [];
                                        acc[groupName].push(q);
                                        return acc;
                                    }, {} as Record<string, Quotation[]>)).sort(([groupA], [groupB]) => groupA.localeCompare(groupB, 'he')).map(([groupName, groupQuotations]) => (
                                        <CollapsibleSection
                                            key={groupName}
                                            title={<h4 className="font-semibold text-slate-800">{groupName}</h4>}
                                            count={groupQuotations.length}
                                            variant="secondary"
                                        >
                                            <div className="space-y-2.5">
                                                {groupQuotations.map(q => (
                                                    <div 
                                                        key={q.id} 
                                                        className={`bg-white p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 ${isEditMode ? 'cursor-pointer' : ''} ${selectedQuotations[q.id] ? 'bg-sky-50/60 border-sky-300 ring-2 ring-sky-200' : 'border-slate-200/80 hover:border-slate-300 hover:shadow-xs'}`}
                                                        onClick={isEditMode ? () => handleSelectQuotation(q.id) : undefined}
                                                    >
                                                        <div className="flex items-start gap-3 min-w-0">
                                                            {isEditMode && <input type="checkbox" className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 flex-shrink-0 mt-1" checked={!!selectedQuotations[q.id]} onChange={() => handleSelectQuotation(q.id)} onClick={(e) => e.stopPropagation()}/>}
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">{q.quotationName}</p>
                                                                <p className="text-xs text-slate-500 mt-0.5">{q.supplierName} • {q.subProjectName ? `${q.subProjectName} • ` : ''} <span className="font-mono-numbers">{formatDate(q.date)}</span></p>
                                                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                                    <p className="text-base sm:text-lg font-bold text-sky-700 font-mono-numbers">₪{q.price.toLocaleString()}</p>
                                                                    <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-md border ${QUOTATION_STATUS_COLORS[q.status].bg} ${QUOTATION_STATUS_COLORS[q.status].text} border-current/20`}>{q.status}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex-shrink-0 flex items-center gap-1 self-end sm:self-center">
                                                            <button onClick={() => { setViewingQuotation(q); setIsDetailsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors" title="הצג פרטים"><EyeIcon className="w-4 h-4"/></button>
                                                            <button onClick={() => openAddEditModal(q)} className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors" title="ערוך"><PencilIcon className="w-4 h-4"/></button>
                                                            <button onClick={() => handleDelete(q.id)} className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors" title="מחק"><TrashIcon className="w-4 h-4"/></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CollapsibleSection>
                                    ))}
                                </div>
                            </CollapsibleSection>
                        );
                    })
                 )}
            </div>
            
             {isEditMode && selectedCount > 0 && (
                <div className="fixed bottom-24 inset-x-4 z-40 bg-slate-800 text-white rounded-lg shadow-lg p-4 flex justify-between items-center animate-fadeInUp">
                    <span>{selectedCount} הצעות מחיר נבחרו</span>
                    <button onClick={handleDeleteSelected} className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-md text-sm font-medium">
                        <TrashIcon className="w-5 h-5" /> מחק נבחרים
                    </button>
                </div>
            )}
            
            <Modal isOpen={isAddEditModalOpen} onClose={() => setIsAddEditModalOpen(false)} title={editingQuotation?.id ? "עריכת הצעת מחיר" : "הוספת הצעת מחיר"} size="lg">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="label-class">בניין*</label>
                            <select
                                value={editingQuotation?.projectId || ''}
                                onChange={e => {
                                    const proj = projects.find(p => p.id === e.target.value);
                                    setEditingQuotation(p => ({ ...p, projectId: proj?.id, projectName: proj?.name, subProjectId: '', subProjectName: '' }));
                                }}
                                className="input-class w-full"
                            >
                                <option value="" disabled>בחר בניין...</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="label-class">תאריך*</label>
                            <input type="date" value={editingQuotation?.date?.split('T')[0] || ''} onChange={e => setEditingQuotation(p => ({ ...p, date: e.target.value }))} className="input-class w-full" />
                        </div>
                        <div>
                            <label className="label-class">שם הספק*</label>
                            <input type="text" list="suppliers-list" value={editingQuotation?.supplierName || ''} onChange={e => setEditingQuotation(p => ({ ...p, supplierName: e.target.value }))} className="input-class w-full" />
                            <datalist id="suppliers-list">{Array.from(new Set(suppliers.map(s => s.name))).map(name => <option key={name} value={name} />)}</datalist>
                        </div>
                    </div>
                    <input type="text" placeholder="שם/תיאור הצעת המחיר*" value={editingQuotation?.quotationName || ''} onChange={e => setEditingQuotation(p => ({ ...p, quotationName: e.target.value }))} className="input-class w-full" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="text" placeholder="מספר הצעה" value={editingQuotation?.quotationNumber || ''} onChange={e => setEditingQuotation(p => ({ ...p, quotationNumber: e.target.value }))} className="input-class" />
                        <div>
                            <label className="label-class">תחום*</label>
                            <input type="text" list="groups-list" value={editingQuotation?.group || ''} onChange={e => setEditingQuotation(p => ({ ...p, group: e.target.value }))} className="input-class w-full" />
                            <datalist id="groups-list">{supplierGroups.map(g => <option key={g} value={g} />)}</datalist>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="label-class">מחיר (₪)*</label>
                            <input type="number" step="0.01" value={editingQuotation?.price ?? ''} onChange={e => setEditingQuotation(p => ({ ...p, price: parseFloat(e.target.value) }))} className="input-class" />
                        </div>
                        <div>
                            <label className="label-class">סטטוס</label>
                            <select value={editingQuotation?.status || ''} onChange={e => setEditingQuotation(p => ({ ...p, status: e.target.value as QuotationStatus }))} className="input-class w-full">
                                {QUOTATION_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="label-class">קובץ הצעת מחיר (PDF)*</label>
                        <input type="file" accept="application/pdf" onChange={(e) => handleQuotationFileSelect(e, 'quotation')} className="file-input-class"/>
                        {editingQuotation?.pdfFile && !pdfFile && <p className="text-xs mt-1">קובץ נוכחי: {editingQuotation.pdfFile.name}</p>}
                    </div>
                    <div className="pt-4 border-t">
                        <h3 className="text-md font-medium text-slate-800 mb-2">פרטי חשבונית (אופציונלי)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <input type="text" placeholder="מספר חשבונית" value={editingQuotation?.invoiceNumber || ''} onChange={e => setEditingQuotation(p => ({ ...p, invoiceNumber: e.target.value }))} className="input-class" />
                            <div>
                                <label className="label-class">קובץ חשבונית (PDF)</label>
                                <input type="file" accept="application/pdf" onChange={(e) => handleQuotationFileSelect(e, 'invoice')} className="file-input-class"/>
                                {editingQuotation?.invoicePdfFile && !invoicePdfFile && <p className="text-xs mt-1">קובץ נוכחי: {editingQuotation.invoicePdfFile.name}</p>}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setIsAddEditModalOpen(false)} className="btn-secondary">ביטול</button>
                        <button onClick={handleSave} className="btn-primary">שמור</button>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title="פרטי הצעת מחיר">{viewingQuotation && (<div className="space-y-3"><p><strong>בניין:</strong> {viewingQuotation.projectName}</p>{viewingQuotation.subProjectName && <p><strong>פרויקט משנה:</strong> {viewingQuotation.subProjectName}</p>}<p><strong>שם הצעה:</strong> {viewingQuotation.quotationName}</p><p><strong>ספק:</strong> {viewingQuotation.supplierName}</p><p><strong>תאריך:</strong> {formatDate(viewingQuotation.date)}</p><p><strong>מחיר:</strong> ₪{viewingQuotation.price.toLocaleString()}</p><p><strong>מספר הצעה:</strong> {viewingQuotation.quotationNumber}</p><p><strong>תחום:</strong> {viewingQuotation.group}</p><p><strong>סטטוס:</strong> <span className={`px-2 py-1 text-xs rounded-full ${QUOTATION_STATUS_COLORS[viewingQuotation.status].bg} ${QUOTATION_STATUS_COLORS[viewingQuotation.status].text}`}>{viewingQuotation.status}</span></p><div className="pt-2 border-t"><button onClick={() => { const src = viewingQuotation.pdfFile.url || viewingQuotation.pdfFile.dataUrl; if(src) {setViewingPdf({name: viewingQuotation.pdfFile.name, dataUrl: src}); setIsPdfViewerOpen(true);}}} className="text-sky-600 hover:underline flex items-center gap-1"><DocumentTextIcon className="w-4 h-4"/>הצג קובץ הצעת מחיר</button></div>{viewingQuotation.invoicePdfFile && (<div><p><strong>מספר חשבונית:</strong> {viewingQuotation.invoiceNumber || '-'}</p><button onClick={() => { const src = viewingQuotation.invoicePdfFile?.url || viewingQuotation.invoicePdfFile?.dataUrl; if(src) {setViewingPdf({name: viewingQuotation.invoicePdfFile!.name, dataUrl: src}); setIsPdfViewerOpen(true);}}} className="text-sky-600 hover:underline flex items-center gap-1"><DocumentTextIcon className="w-4 h-4"/>הצג קובץ חשבונית</button></div>)}</div>)}</Modal>
            <Modal isOpen={isPdfViewerOpen} onClose={() => setIsPdfViewerOpen(false)} title={viewingPdf?.name || ''} size="xl">{viewingPdf?.dataUrl && <iframe src={viewingPdf.dataUrl} className="w-full h-[75vh]" title={viewingPdf.name} />}</Modal>
            <Modal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} title="ייבוא הצעות מחיר (AI)">
                <div className="space-y-4">
                    <p>בחר קובץ PDF או CSV המכיל טבלה של הצעות מחיר. המערכת תנסה לנתח את הנתונים ולהוסיף אותם אוטומטית.</p>
                    <button onClick={() => aiFileInputRef.current?.click()} className="w-full btn-primary">בחר קובץ</button>
                </div>
            </Modal>
             <style>{`
                .label-class { display: block; margin-bottom: 0.25rem; font-size: 0.8rem; font-weight: 500; color: #475569; }
                .input-class { display: block; width: 100%; border: 1px solid #cbd5e1; border-radius: 0.375rem; padding: 0.5rem 0.75rem; }
                .file-input-class { display: block; width: 100%; text-sm text-slate-500 file:mr-4 file:rtl:ml-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 border border-slate-300 rounded-lg}
                .btn-primary { padding: 0.5rem 1rem; background-color: #0284c7; color: white; border-radius: 0.375rem; font-weight: 500; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 0.375rem; font-weight: 500; }
                .form-checkbox { border-radius: 0.25rem; border-color: #94a3b8; color: #0284c7; } .form-checkbox:focus { ring-color: #38bdf8; }
            `}</style>
        </div>
    );
};

export default ApprovedQuotationsPage;
