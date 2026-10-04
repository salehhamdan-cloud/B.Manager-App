import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as dbService from '../services/dbService';
import { ReportWithContext, Project, Report, Problem, AnnotatedImage, ProblemSeverity, Supplier } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';
import { PlusIcon, MagnifyingGlassIcon } from '../components/icons/ActionIcons';
import Modal from '../components/common/Modal';
import { generateId } from '../utils/idGenerator';
import CollapsibleSection from '../components/common/CollapsibleSection';
import { SparklesIcon } from '../components/icons/AiIcons';
import { convertPdfToImages, convertPdfToText } from '../utils/pdfUtils';
import * as aiService from '../services/aiService.ts';
import { useSettings } from '../contexts/SettingsContext';
import * as emailService from '../services/emailService';
import ReportItem from '../components/ReportItem';

const ControlButton: React.FC<{ label: string; value: string; currentValue: string; onClick: (value: string) => void }> = ({ label, value, currentValue, onClick }) => (
    <button
        onClick={() => onClick(value)}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            currentValue === value 
            ? 'bg-sky-600 text-white shadow' 
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
    >
        {label}
    </button>
);

const AllReportsPage: React.FC = () => {
    const [reports, setReports] = useState<ReportWithContext[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState('date-desc');
    const [groupFilter, setGroupFilter] = useState('');
    const [reportTypeFilter, setReportTypeFilter] = useState<'all' | 'survey' | 'inspection' | 'standard'>('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newReport, setNewReport] = useState<{
        projectId: string;
        title: string;
        date: string;
        group?: string;
        description: string;
        reportType?: 'standard' | 'survey' | 'inspection' | 'handover' | 'fire_safety';
        surveyorName?: string;
        score?: number;
        findings?: string;
        workerIds?: string[];
        supplierIds?: string[];
        tenantIds?: string[];
    }>({
        projectId: '',
        title: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        reportType: 'standard',
        surveyorName: '',
        score: undefined,
        findings: '',
        workerIds: [],
        supplierIds: [],
        tenantIds: [],
    });
    const { addToast } = useToast();
    const { settings } = useSettings();
    const [searchTerm, setSearchTerm] = useState('');

    // AI Import State
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [parsedAiData, setParsedAiData] = useState<{
        report: Awaited<ReturnType<typeof aiService.generateReportFromPdf>>;
        pageImages: string[];
    } | null>(null);
    const [selectedProjectIdForAi, setSelectedProjectIdForAi] = useState('');
    const aiPdfInputRef = useRef<HTMLInputElement>(null);


    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // FIX: Call existing dbService functions and manually create the context.
            const [reportsData, projectsData, suppliersData] = await Promise.all([
                dbService.getAllReports(),
                dbService.getAllProjects(),
                dbService.getAllSuppliers()
            ]);
            
            const reportsWithContext: ReportWithContext[] = reportsData.map(report => {
                const project = projectsData.find(p => p.id === report.projectId);
                return { ...report, projectName: project?.name || 'Unknown Project' };
            });

            setReports(reportsWithContext);
            setProjects(projectsData);
            setSuppliers(suppliersData);
        } catch (error) {
            console.error("Error fetching all reports:", error);
            addToast('שגיאה בטעינת הדוחות', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleDeleteReport = async (reportId: string) => {
        if (window.confirm('האם אתה בטוח שברצונך למחוק דוח זה וכל התקלות והטפסים הקשורים אליו?')) {
            try {
                await dbService.deleteReport(reportId);
                addToast('הדוח נמחק בהצלחה', 'success');
                fetchData();
            } catch (error) {
                console.error('Error deleting report:', error);
                addToast('שגיאה במחיקת הדוח', 'error');
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        if ((e.target as HTMLSelectElement).multiple) {
            const selectedIds = Array.from((e.target as HTMLSelectElement).selectedOptions, (option: HTMLOptionElement) => option.value);
            setNewReport(prev => ({ ...prev, [name]: selectedIds }));
        } else {
            setNewReport(prev => ({ ...prev, [name]: value }));
            if (name === 'projectId') {
                setNewReport(prev => ({...prev, workerIds: [], tenantIds: []}));
            }
        }
    };

    const handleAddNewReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReport.projectId || !newReport.title) {
            addToast('יש לבחור בניין ולהזין כותרת לדוח', 'warning');
            return;
        }
        const reportToAdd: Report = {
            id: generateId(),
            projectId: newReport.projectId,
            title: newReport.title,
            date: new Date(newReport.date).toISOString(),
            group: newReport.group?.trim() || undefined,
            description: newReport.description,
            reportType: newReport.reportType || 'standard',
            surveyorName: newReport.surveyorName?.trim() || undefined,
            score: newReport.score !== undefined ? Number(newReport.score) : undefined,
            findings: newReport.findings?.trim() || undefined,
            workerIds: newReport.workerIds || [],
            supplierIds: newReport.supplierIds || [],
            tenantIds: newReport.tenantIds || [],
            files: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        try {
            await dbService.addReport(reportToAdd);
            const project = projects.find(p => p.id === newReport.projectId);
            if (project) {
                emailService.triggerNewReportEmail(reportToAdd, project, settings);
            }
            addToast('דוח חדש נוסף בהצלחה', 'success');
            setIsAddModalOpen(false);
            setNewReport({ projectId: '', title: '', date: new Date().toISOString().split('T')[0], description: '', workerIds: [], supplierIds: [], tenantIds: [] });
            fetchData();
        } catch (error) {
            addToast('שגיאה בהוספת הדוח', 'error');
        }
    };

    const handleAiImportClick = () => {
        aiPdfInputRef.current?.click();
    };

    const handleAiFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAiProcessing(true);
        addToast('מעבד PDF (זה עשוי לקחת מספר דקות)...', 'info');

        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target?.result as string);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });

            addToast('שלב 1/3: מחלץ טקסט ותמונות מה-PDF...', 'info');
            const [text, pageImages] = await Promise.all([
                convertPdfToText(dataUrl),
                convertPdfToImages(dataUrl)
            ]);

            addToast('שלב 2/3: שולח לניתוח AI...', 'info');
            const aiData = await aiService.generateReportFromPdf(text, pageImages);

            setParsedAiData({ report: aiData, pageImages });
            setSelectedProjectIdForAi(projects.length === 1 ? projects[0].id : '');
            setIsAiModalOpen(true);

        } catch (error) {
            console.error("Error creating report from PDF:", error);
            addToast(error instanceof Error ? error.message : 'שגיאה ביצירת הדוח', 'error');
        } finally {
            setIsAiProcessing(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleConfirmAiImport = async () => {
        if (!parsedAiData || !selectedProjectIdForAi) {
            addToast('יש לבחור בניין ליצירת הדוח', 'warning');
            return;
        }

        setIsAiProcessing(true);
        addToast('יוצר דוח ובעיות...', 'info');

        try {
            const newReportData: Report = {
                id: generateId(),
                projectId: selectedProjectIdForAi,
                title: parsedAiData.report.title,
                date: parsedAiData.report.date ? new Date(parsedAiData.report.date).toISOString() : new Date().toISOString(),
                description: parsedAiData.report.description,
                files: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
    
            const newProblems: Problem[] = parsedAiData.report.problems.map((p, index) => {
                const p_casted = p as Omit<Partial<Problem>, 'images'> & { images?: { imageIndex: number; caption?: string }[] };
                const problemImages: AnnotatedImage[] = (p_casted.images || []).map(imgInfo => {
                    const pageImageBase64 = parsedAiData.pageImages[imgInfo.imageIndex];
                    if (!pageImageBase64) return null;
    
                    const newImage: AnnotatedImage = {
                        id: generateId(),
                        name: `Image from page ${imgInfo.imageIndex + 1}.jpg`,
                        mimeType: 'image/jpeg',
                        dataUrl: pageImageBase64,
                        originalDataUrl: pageImageBase64,
                        annotationData: '[]',
                        createdAt: new Date().toISOString(),
                        caption: imgInfo.caption || `From page ${imgInfo.imageIndex + 1}`,
                    };
                    return newImage;
                }).filter((img): img is AnnotatedImage => img !== null);
                  
                return {
                    id: generateId(),
                    reportId: newReportData.id,
                    description: p.description || 'No description from AI',
                    severity: p.severity || ProblemSeverity.LOW,
                    notes: '',
                    images: problemImages,
                    locationTag: p.locationTag,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    order: index,
                    isFixed: false,
                };
            });
    
            await dbService.addReport(newReportData);
            await Promise.all(newProblems.map(p => dbService.addProblem(p)));
    
            addToast('דוח נוצר בהצלחה מ-PDF!', 'success');
            setIsAiModalOpen(false);
            setParsedAiData(null);
            fetchData();
    
        } catch (error) {
            console.error("Error confirming AI import:", error);
            addToast('שגיאה בשמירת הדוח', 'error');
        } finally {
            setIsAiProcessing(false);
        }
    };

    const uniqueGroups = useMemo(() => {
        const groups = new Set(reports.map(r => r.group).filter(Boolean) as string[]);
        return Array.from(groups).sort((a, b) => a.localeCompare(b, 'he'));
    }, [reports]);

    const filteredAndSortedReports = useMemo(() => {
        let tempReports = [...reports];
        
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            tempReports = tempReports.filter(report => 
                report.title.toLowerCase().includes(lowercasedTerm) ||
                report.projectName.toLowerCase().includes(lowercasedTerm) ||
                (report.group && report.group.toLowerCase().includes(lowercasedTerm)) ||
                (report.surveyorName && report.surveyorName.toLowerCase().includes(lowercasedTerm)) ||
                (report.description && report.description.toLowerCase().includes(lowercasedTerm))
            );
        }

        const filtered = tempReports.filter(report => {
            if (reportTypeFilter !== 'all') {
                const isSurvey = report.reportType === 'survey' || report.title?.includes('סקר') || report.group?.includes('סקר');
                if (reportTypeFilter === 'survey' && !isSurvey) return false;
                if (reportTypeFilter === 'inspection' && report.reportType !== 'inspection' && !report.title?.includes('ביקורת') && !report.title?.includes('תקלה')) return false;
                if (reportTypeFilter === 'standard' && (isSurvey || report.reportType === 'inspection')) return false;
            }
            if (!groupFilter) return true;
            if (groupFilter === '__none__') return !report.group;
            return report.group === groupFilter;
        });

        const sorted = [...filtered];
        const [key, direction] = sortOrder.split('-');

        sorted.sort((a, b) => {
            let valA: string | number, valB: string | number;

            switch (key) {
                case 'projectName':
                    valA = a.projectName.toLowerCase();
                    valB = b.projectName.toLowerCase();
                    break;
                case 'title':
                    valA = a.title.toLowerCase();
                    valB = b.title.toLowerCase();
                    break;
                case 'date':
                default:
                    valA = new Date(a.date).getTime();
                    valB = new Date(b.date).getTime();
                    break;
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [reports, sortOrder, groupFilter, searchTerm]);

    const groupedReports = useMemo(() => {
        return filteredAndSortedReports.reduce((acc, report) => {
            const key = report.projectName;
            if (!acc[key]) {
                acc[key] = { projectId: report.projectId, reports: [] };
            }
            acc[key].reports.push(report);
            return acc;
        }, {} as Record<string, { projectId: string; reports: ReportWithContext[] }>);
    }, [filteredAndSortedReports]);

    const sortedGroupKeys = useMemo(() => {
        return Object.keys(groupedReports).sort((a, b) => a.localeCompare(b, 'he'));
    }, [groupedReports]);


    if (isLoading) return <LoadingSpinner text="טוען דוחות..." />;

    const selectedProjectForModal = projects.find(p => p.id === newReport.projectId);

    return (
        <div className="animate-fadeIn">
            {isAiProcessing && (
                <div className="fixed inset-0 bg-slate-900 bg-opacity-60 backdrop-blur-sm z-[1001] flex items-center justify-center">
                    <LoadingSpinner text="מעבד קובץ בעזרת AI..."/>
                </div>
            )}
            <input type="file" ref={aiPdfInputRef} onChange={handleAiFileChange} accept="application/pdf" className="hidden" />

            {/* Header & Controls */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                 <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        כל הדוחות
                        <span className="text-xs bg-sky-50 text-sky-800 border border-sky-100 px-2.5 py-0.5 rounded-full font-bold">
                            {filteredAndSortedReports.length} דוחות
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">דוחות תחזוקה, פרוטוקולי מסירה ובדיקות תקופתיות</p>
                 </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={handleAiImportClick}
                        className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80 font-bold py-2.5 px-4 rounded-xl shadow-2xs flex items-center transition-colors text-xs"
                    >
                        <SparklesIcon className="w-4 h-4 me-1.5 rtl:ml-1.5 text-purple-600"/> הוסף דוח (AI)
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn-primary text-xs font-bold py-2.5 px-4 shadow-sm flex items-center"
                    >
                        <PlusIcon className="w-4 h-4 me-1.5 rtl:ml-1.5" />
                        הוסף דוח
                    </button>
                </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/90 mb-6 space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">סוג מסמך / סקר:</label>
                    <div className="flex flex-wrap gap-1.5">
                        <ControlButton label="הכל" value="all" currentValue={reportTypeFilter} onClick={setReportTypeFilter as any} />
                        <ControlButton label="📋 סקרי מבנה ובדק בית" value="survey" currentValue={reportTypeFilter} onClick={setReportTypeFilter as any} />
                        <ControlButton label="🔍 דוחות תקלות וביקורת" value="inspection" currentValue={reportTypeFilter} onClick={setReportTypeFilter as any} />
                        <ControlButton label="📝 דוחות תחזוקה שוטפים" value="standard" currentValue={reportTypeFilter} onClick={setReportTypeFilter as any} />
                    </div>
                </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">סנן לפי קבוצה:</label>
                    <div className="flex flex-wrap gap-1.5">
                        <ControlButton label="הכל" value="" currentValue={groupFilter} onClick={setGroupFilter} />
                        <ControlButton label="ללא קבוצה" value="__none__" currentValue={groupFilter} onClick={setGroupFilter} />
                        {uniqueGroups.map(group => <ControlButton key={group} label={group} value={group} currentValue={groupFilter} onClick={setGroupFilter} />)}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">מיין לפי:</label>
                    <div className="flex flex-wrap gap-1.5">
                        <ControlButton label="תאריך (החדש ביותר)" value="date-desc" currentValue={sortOrder} onClick={setSortOrder} />
                        <ControlButton label="תאריך (הישן ביותר)" value="date-asc" currentValue={sortOrder} onClick={setSortOrder} />
                        <ControlButton label="בניין (א-ת)" value="projectName-asc" currentValue={sortOrder} onClick={setSortOrder} />
                        <ControlButton label="כותרת (א-ת)" value="title-asc" currentValue={sortOrder} onClick={setSortOrder} />
                    </div>
                </div>
                 <div className="relative pt-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pt-1 rtl:right-0 rtl:pl-0 rtl:pr-3.5 pointer-events-none">
                        <MagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                        type="search"
                        placeholder="חיפוש דוחות לפי כותרת, תיאור או שם בניין..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rtl:pr-10 rtl:pl-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                    />
                </div>
            </div>

            {reports.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl shadow-xs border border-slate-200/90 p-8">
                    <h3 className="text-base font-bold text-slate-800">לא נמצאו דוחות</h3>
                    <p className="text-slate-500 text-xs mt-1">{groupFilter ? "אין דוחות התואמים לסינון שנבחר." : "עדיין לא נוצרו דוחות באף בניין."}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedGroupKeys.map(projectName => {
                        const group = groupedReports[projectName];
                        return (
                             <CollapsibleSection
                                key={projectName}
                                count={group.reports.length}
                                title={
                                    <h3 className="text-xl font-semibold">
                                        {projectName}
                                    </h3>
                                }
                             >
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {group.reports.map(report => (
                                        <ReportItem 
                                            key={report.id}
                                            report={report}
                                            onDelete={handleDeleteReport}
                                        />
                                    ))}
                                </div>
                            </CollapsibleSection>
                        )
                    })}
                </div>
            )}
             <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="הוספת דוח חדש" size="lg">
                <form onSubmit={handleAddNewReport} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="projectId" className="block text-sm font-medium text-slate-700">בניין*</label>
                            <select
                                id="projectId"
                                name="projectId"
                                value={newReport.projectId}
                                onChange={handleInputChange}
                                required
                                className="mt-1 block w-full input-class"
                            >
                                <option value="" disabled>בחר בניין...</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="reportType" className="block text-sm font-medium text-slate-700">סוג המסמך / סקר</label>
                            <select
                                id="reportType"
                                name="reportType"
                                value={newReport.reportType || 'standard'}
                                onChange={handleInputChange}
                                className="mt-1 block w-full input-class"
                            >
                                <option value="standard">דוח תחזוקה שוטף</option>
                                <option value="survey">📋 סקר מבנה / בדק בית</option>
                                <option value="inspection">🔍 ביקורת ליקויים</option>
                                <option value="handover">🤝 פרוטוקול מסירה</option>
                                <option value="fire_safety">🧯 ביקורת בטיחות ואש</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-slate-700">כותרת הדוח / הסקר*</label>
                        <input type="text" name="title" value={newReport.title} onChange={handleInputChange} required className="mt-1 block w-full input-class" placeholder={newReport.reportType === 'survey' ? 'סקר ליקויי מבנה שנתי' : 'דוח תקלות וקריאות שירות'} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="date" className="block text-sm font-medium text-slate-700">תאריך*</label>
                            <input type="date" name="date" value={newReport.date} onChange={handleInputChange} required className="mt-1 block w-full input-class" />
                        </div>
                        <div>
                            <label htmlFor="surveyorName" className="block text-sm font-medium text-slate-700">שם הסוקר / בודק</label>
                            <input type="text" name="surveyorName" value={newReport.surveyorName || ''} onChange={handleInputChange} className="mt-1 block w-full input-class" placeholder="מהנדס / מנהל אחזקה" />
                        </div>
                        <div>
                            <label htmlFor="score" className="block text-sm font-medium text-slate-700">ציון מצב מבנה (1-100)</label>
                            <input type="number" min="0" max="100" name="score" value={newReport.score ?? ''} onChange={handleInputChange} className="mt-1 block w-full input-class" placeholder="85" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="group" className="block text-sm font-medium text-slate-700">קבוצה (אופציונלי)</label>
                        <input type="text" name="group" value={newReport.group || ''} onChange={handleInputChange} className="mt-1 block w-full input-class" placeholder="לדוגמה: בדיקות איטום, סקר גגות" />
                    </div>
                    <div>
                        <label htmlFor="findings" className="block text-sm font-medium text-slate-700">סיכום ממצאים עיקריים ומסקנות (לסקרי מבנה)</label>
                        <textarea name="findings" value={newReport.findings || ''} onChange={handleInputChange} rows={2} className="mt-1 block w-full input-class" placeholder="סיכום מצב התשתיות, ליקויים קריטיים, המלצות לטיפול דחוף..." />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-slate-700">תיאור והערות (אופציונלי)</label>
                        <textarea name="description" value={newReport.description} onChange={handleInputChange} rows={2} className="mt-1 block w-full input-class" />
                    </div>
                    <div>
                        <label htmlFor="report-workers" className="block text-sm font-medium text-slate-700">עובדים משויכים</label>
                        <select multiple name="workerIds" id="report-workers" disabled={!newReport.projectId} value={newReport.workerIds || []} onChange={handleInputChange} className="mt-1 block w-full input-class h-24">
                            {(selectedProjectForModal?.workers || []).map(worker => ( <option key={worker.id} value={worker.id}>{worker.name}</option> ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="report-suppliers" className="block text-sm font-medium text-slate-700">ספקים משויכים</label>
                        <select multiple name="supplierIds" id="report-suppliers" value={newReport.supplierIds || []} onChange={handleInputChange} className="mt-1 block w-full input-class h-24">
                            {suppliers.map(supplier => ( <option key={supplier.id} value={supplier.id}>{supplier.name} ({supplier.group})</option>))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="report-tenants" className="block text-sm font-medium text-slate-700">דיירים משויכים</label>
                        <select multiple name="tenantIds" id="report-tenants" disabled={!newReport.projectId} value={newReport.tenantIds || []} onChange={handleInputChange} className="mt-1 block w-full input-class h-24">
                            {(selectedProjectForModal?.tenants || []).map(tenant => ( <option key={tenant.id} value={tenant.id}>{tenant.name}</option>))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md">ביטול</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md">הוסף דוח</button>
                    </div>
                </form>
            </Modal>
            <Modal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} title="אישור דוח מ-AI">
                {parsedAiData && (
                    <div className="space-y-4">
                        <p><strong>כותרת דוח:</strong> {parsedAiData.report.title}</p>
                        <p><strong>נמצאו:</strong> {parsedAiData.report.problems.length} תקלות</p>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">שייך לבניין:</label>
                            <select value={selectedProjectIdForAi} onChange={e => setSelectedProjectIdForAi(e.target.value)} className="input-class w-full mt-1">
                                <option value="" disabled>בחר בניין...</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <button type="button" onClick={() => setIsAiModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md">ביטול</button>
                            <button type="button" onClick={handleConfirmAiImport} disabled={!selectedProjectIdForAi} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md">צור דוח</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AllReportsPage;
