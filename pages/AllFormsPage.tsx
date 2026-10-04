import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as dbService from '../services/dbService';
import { FormWithContext, Project, Report, FormTemplate } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDateTime, formatDate } from '../utils/dateFormatter';
import { useToast } from '../contexts/ToastContext';
import { TrashIcon, PlusIcon, ArrowDownTrayIcon } from '../components/icons/ActionIcons';
import Modal from '../components/common/Modal';
import { generateId } from '../utils/idGenerator';
import CollapsibleSection from '../components/common/CollapsibleSection';
import { useSettings } from '../contexts/SettingsContext';
import { exportToCsv } from '../utils/exportUtils';
import { generateFormsListPdf } from '../services/pdfService';

const ControlButton: React.FC<{ label: string; value: string; currentValue: string; onClick: (value: string) => void }> = ({ label, value, currentValue, onClick }) => (
    <button
        onClick={() => onClick(value)}
        className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
            currentValue === value 
            ? 'bg-sky-600 text-white shadow-xs' 
            : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-800'
        }`}
    >
        {label}
    </button>
);


const AllFormsPage: React.FC = () => {
    const [forms, setForms] = useState<FormWithContext[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [templates, setTemplates] = useState<FormTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState('createdAt-desc');
    const [groupFilter, setGroupFilter] = useState('');
    const { addToast } = useToast();
    const { settings } = useSettings();
    
    // State for Add Modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedReportId, setSelectedReportId] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [newFormDate, setNewFormDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [formsData, projectsData, reportsData, templatesData] = await Promise.all([
                dbService.getAllProjectFormsWithContext(),
                dbService.getAllProjects(),
                dbService.getAllReports(),
                dbService.getAllFormTemplates()
            ]);
            setForms(formsData);
            setProjects(projectsData);
            setReports(reportsData);
            setTemplates(templatesData);
        } catch (error) {
            console.error("Error fetching all forms data:", error);
            addToast('שגיאה בטעינת הנתונים', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleDeleteForm = async (formId: string) => {
        if (window.confirm('האם אתה בטוח שברצונך למחוק טופס זה?')) {
            try {
                await dbService.deleteProjectForm(formId);
                addToast('הטופס נמחק בהצלחה', 'success');
                fetchData();
            } catch (error) {
                console.error('Error deleting form:', error);
                addToast('שגיאה במחיקת הטופס', 'error');
            }
        }
    };
    
    const resetAddModal = () => {
        setIsAddModalOpen(false);
        setStep(1);
        setSelectedProjectId('');
        setSelectedReportId('');
        setSelectedTemplateId('');
        setNewFormDate(new Date().toISOString().split('T')[0]);
    };

    const handleAddForm = async () => {
        const template = templates.find(t => t.id === selectedTemplateId);
        if (!template) return;
        try {
            await dbService.addProjectForm({
                id: generateId(),
                projectId: selectedProjectId,
                reportId: selectedReportId,
                formTemplateId: selectedTemplateId,
                formTemplateName: template.name,
                formDate: new Date(newFormDate).toISOString(),
                answers: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            addToast('הטופס נוסף בהצלחה', 'success');
            resetAddModal();
            fetchData();
        } catch (error) {
            addToast('שגיאה בהוספת הטופס', 'error');
        }
    };

    const uniqueGroups = useMemo(() => {
        const groups = new Set(forms.map(f => f.reportGroup).filter(Boolean) as string[]);
        return Array.from(groups).sort((a, b) => a.localeCompare(b, 'he'));
    }, [forms]);

    const filteredAndSortedForms = useMemo(() => {
        const filtered = forms.filter(form => {
            if (!groupFilter) return true;
            if (groupFilter === '__none__') return !form.reportGroup;
            return form.reportGroup === groupFilter;
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
                case 'formTemplateName':
                    valA = a.formTemplateName.toLowerCase();
                    valB = b.formTemplateName.toLowerCase();
                    break;
                case 'createdAt':
                default:
                    valA = new Date(a.createdAt).getTime();
                    valB = new Date(b.createdAt).getTime();
                    break;
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [forms, sortOrder, groupFilter]);
    
    const groupedForms = useMemo(() => {
        return filteredAndSortedForms.reduce((acc, form) => {
            const key = form.projectName;
            if (!acc[key]) {
                acc[key] = { projectId: form.projectId, forms: [] };
            }
            acc[key].forms.push(form);
            return acc;
        }, {} as Record<string, { projectId: string; forms: FormWithContext[] }>);
    }, [filteredAndSortedForms]);

    const sortedGroupKeys = useMemo(() => {
        return Object.keys(groupedForms).sort((a, b) => a.localeCompare(b, 'he'));
    }, [groupedForms]);

    const handleExportPdf = () => {
        if (filteredAndSortedForms.length === 0) {
            addToast('אין טפסים לייצוא', 'warning');
            return;
        }
        addToast('מכין PDF...', 'info');
        generateFormsListPdf({ settings, forms: filteredAndSortedForms });
    };

    const handleExportCsv = () => {
        if (filteredAndSortedForms.length === 0) {
            addToast('אין טפסים לייצוא', 'warning');
            return;
        }
        const dataToExport = filteredAndSortedForms.map(f => ({
            'שם הטופס': f.formTemplateName,
            'בניין': f.projectName,
            'קבוצת דוח': f.reportGroup || '-',
            'תאריך יצירה': formatDateTime(f.createdAt),
        }));
        exportToCsv(dataToExport, 'forms_list');
        addToast('קובץ Excel יוצא...', 'success');
    };


    if (isLoading) return <LoadingSpinner text="טוען טפסים..." />;

    return (
        <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
            {/* Header & Controls */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">כל הטפסים</h2>
                    <p className="text-sm text-slate-500 mt-1">צפייה, יצוא ומילוי טפסים לפי מבנים וקבוצות דוח</p>
                 </div>
                 <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handleExportPdf} className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-2 border border-slate-200/80 shadow-2xs">
                        <ArrowDownTrayIcon className="w-4 h-4"/>יצא PDF
                    </button>
                    <button onClick={handleExportCsv} className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-2 border border-slate-200/80 shadow-2xs">
                        <ArrowDownTrayIcon className="w-4 h-4"/>יצא Excel
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition flex items-center gap-1.5"
                    >
                        <PlusIcon className="w-4 h-4" />
                        <span>הוסף טופס</span>
                    </button>
                 </div>
            </div>

            {/* Filters & Sorting */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">סנן לפי קבוצת דוח:</label>
                    <div className="flex flex-wrap gap-2">
                        <ControlButton label="הכל" value="" currentValue={groupFilter} onClick={setGroupFilter} />
                        <ControlButton label="ללא קבוצה" value="__none__" currentValue={groupFilter} onClick={setGroupFilter} />
                        {uniqueGroups.map(group => <ControlButton key={group} label={group} value={group} currentValue={groupFilter} onClick={setGroupFilter} />)}
                    </div>
                </div>
                <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">מיין לפי:</label>
                    <div className="flex flex-wrap gap-2">
                        <ControlButton label="החדש ביותר" value="createdAt-desc" currentValue={sortOrder} onClick={setSortOrder} />
                        <ControlButton label="הישן ביותר" value="createdAt-asc" currentValue={sortOrder} onClick={setSortOrder} />
                        <ControlButton label="בניין (א-ת)" value="projectName-asc" currentValue={sortOrder} onClick={setSortOrder} />
                        <ControlButton label="שם טופס (א-ת)" value="formTemplateName-asc" currentValue={sortOrder} onClick={setSortOrder} />
                    </div>
                </div>
            </div>

            {forms.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl shadow-xs border border-slate-200/90">
                    <h3 className="text-xl font-bold text-slate-800">לא נמצאו טפסים</h3>
                    <p className="text-slate-500 mt-2 text-sm">{groupFilter ? "אין טפסים התואמים לסינון שנבחר." : "עדיין לא מולאו טפסים באף דוח."}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedGroupKeys.map(projectName => {
                        const group = groupedForms[projectName];
                        return (
                             <CollapsibleSection
                                key={projectName}
                                count={group.forms.length}
                                title={
                                    <h3 className="text-lg font-bold text-slate-800">
                                        {projectName}
                                    </h3>
                                }
                             >
                                <div className="space-y-3 pt-2">
                                    {group.forms.map(form => (
                                        <div key={form.id} className="bg-white border border-slate-200/80 rounded-2xl p-4 transition-all duration-200 hover:shadow-md hover:border-sky-300 flex justify-between items-center gap-4">
                                            <Link to={`/project/${form.projectId}/report/${form.reportId}/form/${form.id}`} className="flex-grow min-w-0">
                                                <h4 className="font-bold text-slate-800 truncate hover:text-sky-600 transition" title={form.formTemplateName}>{form.formTemplateName}</h4>
                                                <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 mt-1 flex-wrap">
                                                    <span>{formatDateTime(form.createdAt)}</span>
                                                    {form.reportGroup && <span className="text-xs bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-full font-medium">{form.reportGroup}</span>}
                                                </div>
                                            </Link>
                                            <button
                                                onClick={() => handleDeleteForm(form.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0"
                                                title="מחק טופס"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </CollapsibleSection>
                        )
                    })}
                </div>
            )}

            <Modal isOpen={isAddModalOpen} onClose={resetAddModal} title="הוספת טופס חדש">
                <div className="space-y-4">
                    {step === 1 && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">שלב 1: בחר בניין</label>
                            <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition">
                                <option value="" disabled>בחר בניין...</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <button onClick={() => setStep(2)} disabled={!selectedProjectId} className="w-full mt-4 py-2.5 px-4 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 transition shadow-xs">הבא</button>
                        </div>
                    )}
                    {step === 2 && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">שלב 2: בחר דוח</label>
                            <select value={selectedReportId} onChange={e => setSelectedReportId(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition">
                                <option value="" disabled>בחר דוח...</option>
                                {reports.filter(r => r.projectId === selectedProjectId).map(r => <option key={r.id} value={r.id}>{r.title} ({formatDate(r.date)})</option>)}
                            </select>
                            <div className="flex justify-between gap-3 mt-4">
                                <button onClick={() => setStep(1)} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition">הקודם</button>
                                <button onClick={() => setStep(3)} disabled={!selectedReportId} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 transition shadow-xs">הבא</button>
                            </div>
                        </div>
                    )}
                    {step === 3 && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">שלב 3: בחר תבנית טופס ותאריך</label>
                            <input type="date" value={newFormDate} onChange={e => setNewFormDate(e.target.value)} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition mb-4" />
                            <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition">
                                <option value="" disabled>בחר תבנית...</option>
                                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <div className="flex justify-between gap-3 mt-4">
                                <button onClick={() => setStep(2)} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition">הקודם</button>
                                <button onClick={handleAddForm} disabled={!selectedTemplateId} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 transition shadow-xs">הוסף טופס</button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default AllFormsPage;
