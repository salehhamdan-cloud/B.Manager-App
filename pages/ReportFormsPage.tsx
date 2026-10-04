import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as dbService from '../services/dbService';
import { Report, FormTemplate, ProjectForm, ProjectFormWithTemplate, Project } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ProjectFormItem from '../components/ProjectFormItem';
import { useToast } from '../contexts/ToastContext';
import { PlusIcon, ArrowDownTrayIcon } from '../components/icons/ActionIcons';
import Modal from '../components/common/Modal';
import { generateId } from '../utils/idGenerator';
import { generateSingleFormPdf, generateFormsListPdf } from '../services/pdfService';
import { useSettings } from '../contexts/SettingsContext';
import { exportToCsv } from '../utils/exportUtils';
import { formatDateTime, formatDate } from '../utils/dateFormatter';

const ReportFormsPage: React.FC = () => {
    const { projectId, reportId } = useParams<{ projectId: string; reportId: string }>();
    const navigate = useNavigate();
    const [report, setReport] = useState<Report | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [forms, setForms] = useState<ProjectFormWithTemplate[]>([]);
    const [templates, setTemplates] = useState<FormTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();
    const { settings } = useSettings();

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    const fetchData = useCallback(async () => {
        if (!reportId || !projectId) return;
        setIsLoading(true);
        try {
            const reportData = await dbService.getReport(reportId);
            const projectData = await dbService.getProject(projectId);
            const templatesData = await dbService.getAllFormTemplates();
            const filledForms = await dbService.getProjectFormsByReportId(reportId);

            const formsWithTemplates = filledForms
                .map(form => ({ form, template: templatesData.find(t => t.id === form.formTemplateId) }))
                .filter(item => item.template) as ProjectFormWithTemplate[];
            
            setReport(reportData);
            setProject(projectData);
            setTemplates(templatesData);
            setForms(formsWithTemplates);
        } catch (error) {
            addToast('שגיאה בטעינת טפסים', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [reportId, projectId, addToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDeleteForm = async (formId: string) => {
        if(window.confirm("האם אתה בטוח שברצונך למחוק טופס זה?")) {
            try {
                await dbService.deleteProjectForm(formId);
                addToast('הטופס נמחק בהצלחה', 'success');
                fetchData();
            } catch(e) {
                addToast('שגיאה במחיקת הטופס', 'error');
            }
        }
    };
    
    const handleAddForm = async () => {
        if (!selectedTemplateId || !report) return;
        const template = templates.find(t => t.id === selectedTemplateId);
        if (!template) { addToast('תבנית לא נמצאה', 'error'); return; }
        const newForm: ProjectForm = {
            id: generateId(), projectId: report.projectId, reportId: report.id, formTemplateId: selectedTemplateId,
            formTemplateName: template.name, answers: [], createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(), formDate: new Date().toISOString()
        };
        try {
            await dbService.addProjectForm(newForm);
            addToast(`טופס "${template.name}" נוסף בהצלחה`, 'success');
            setIsFormModalOpen(false);
            setSelectedTemplateId('');
            fetchData();
        } catch (e) { addToast('שגיאה בהוספת הטופס', 'error'); }
      };

    const handleGenerateFormPdf = async (formWithTemplate: ProjectFormWithTemplate) => {
        if (!project || !settings) return;
        addToast(`מכין PDF עבור טופס: ${formWithTemplate.template.name}...`, 'info');
        try {
            await generateSingleFormPdf({ settings, project, formWithTemplate });
            addToast('PDF של הטופס נוצר והורד בהצלחה', 'success');
        } catch (error) {
            addToast('שגיאה ביצירת PDF לטופס', 'error');
        }
    };
    
    const handleExportFormCsv = (formWithTemplate: ProjectFormWithTemplate) => {
        const { form, template } = formWithTemplate;
        if (!form || !template) return;
    
        const dataToExport: { 'קבוצה': string, 'שאלה': string, 'תשובה': string, 'הערות': string }[] = [];
        
        template.groups.forEach(group => {
            group.items.forEach(item => {
                const answer = form.answers.find(a => a.formItemId === item.id);
                const value = answer?.value;
                let displayValue = '-';
                if (typeof value === 'boolean') displayValue = value ? 'כן' : 'לא';
                else if (value === 'ok') displayValue = 'תקין';
                else if (value === 'not-ok') displayValue = 'לא תקין';
                else if (value === 'na') displayValue = 'לא רלוונטי';
                else if (value) displayValue = String(value);
    
                dataToExport.push({
                    'קבוצה': group.name,
                    'שאלה': item.label,
                    'תשובה': displayValue,
                    'הערות': answer?.description || ''
                });
            });
        });
    
        if (form.reporterComments) {
            dataToExport.push({ 'קבוצה': 'סיכום', 'שאלה': 'הערות מדווח', 'תשובה': form.reporterComments, 'הערות': '' });
        }
        if (form.managerComments) {
            dataToExport.push({ 'קבוצה': 'סיכום', 'שאלה': 'הערות מנהל', 'תשובה': form.managerComments, 'הערות': '' });
        }
    
        exportToCsv(dataToExport, `form_${template.name}_${formatDate(form.formDate)}`);
        addToast('הטופס יוצא לקובץ Excel...', 'success');
    };

    const handleExportListPdf = () => {
        if (forms.length === 0) return;
        const formsForPdf = forms.map(fwt => ({
            ...fwt.form,
            projectName: project?.name || '',
            reportGroup: report?.group
        }));
        generateFormsListPdf({ settings, forms: formsForPdf });
    };

    const handleExportListCsv = () => {
        if (forms.length === 0) return;
        const dataToExport = forms.map(fwt => ({
            'שם הטופס': fwt.form.formTemplateName,
            'תאריך יצירה': formatDateTime(fwt.form.createdAt),
        }));
        exportToCsv(dataToExport, `forms_${report?.title}`);
    };


    if (isLoading) return <LoadingSpinner text="טוען טפסים..." />;

    return (
        <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
            {/* Header & Controls */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                    <nav className="text-xs font-medium text-slate-400 mb-1">
                        <Link to={`/project/${projectId}/report/${reportId}`} className="text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1">
                            <span>←</span> חזרה לדוח {report?.title}
                        </Link>
                    </nav>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">טפסים בדוח: {report?.title}</h2>
                    <p className="text-sm text-slate-500 mt-1">טפסים, רשימות תיוג ודוחות בדיקה מקושרים</p>
                </div>
                 <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handleExportListPdf} className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-2 border border-slate-200/80 shadow-2xs">
                        <ArrowDownTrayIcon className="w-4 h-4"/>יצא PDF
                    </button>
                    <button onClick={handleExportListCsv} className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-2 border border-slate-200/80 shadow-2xs">
                        <ArrowDownTrayIcon className="w-4 h-4"/>יצא Excel
                    </button>
                    <button onClick={() => setIsFormModalOpen(true)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition flex items-center gap-1.5">
                        <PlusIcon className="w-4 h-4" /> <span>הוסף טופס</span>
                    </button>
                 </div>
            </div>

            {forms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {forms.map(({ form, template }) => (
                        <ProjectFormItem 
                            key={form.id} 
                            form={form} 
                            template={template} 
                            onDelete={handleDeleteForm}
                            onExportPdf={() => handleGenerateFormPdf({ form, template })}
                            onExportCsv={() => handleExportFormCsv({ form, template })}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-3xl shadow-xs border border-slate-200/90">
                    <div className="w-16 h-16 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <PlusIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">אין טפסים מצורפים לדוח זה</h3>
                    <p className="text-slate-500 text-sm mt-1">השתמש בכפתור 'הוסף טופס' כדי להוסיף טופס חדש לדוח.</p>
                </div>
            )}

            <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title="הוסף טופס לדוח">
                <div className="space-y-4">
                    <label className="block text-sm font-semibold text-slate-700">בחר תבנית טופס</label>
                    {templates.length > 0 ? (
                        <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition">
                            <option value="" disabled>בחר תבנית...</option>
                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    ) : <p className="text-slate-500 text-sm">אין תבניות זמינות. <Link to="/form-templates" className="text-sky-600 hover:underline">צור תבנית חדשה</Link>.</p>}
                    <div className="flex justify-end pt-4">
                        <button onClick={handleAddForm} disabled={!selectedTemplateId} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 transition shadow-xs">הוסף טופס</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ReportFormsPage;
