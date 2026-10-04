import React, { useState, useEffect, useCallback, ChangeEvent, ReactNode, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Report, Problem, Project, FormTemplate, ProjectForm, ProjectFormWithTemplate, ProjectFile, DocumentPage, ProblemSeverity, GlobalDashboardStats, ReportPdfGenerationOptions, Supplier, Tenant } from '../types';
import * as dbService from '../services/dbService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import { useToast } from '../contexts/ToastContext';
import { formatDate, formatDateTime } from '../utils/dateFormatter';
import { PlusIcon, ArrowDownTrayIcon, PencilIcon, TrashIcon } from '../components/icons/ActionIcons';
import { ClipboardDocumentCheckIcon, ClipboardDocumentListIcon } from '../components/icons/NavigationIcons';
import { DocumentScannerIcon } from '../components/icons/ScannerIcons';
import { generateReportPdf, generatePdfFromImages } from '../services/pdfService';
import { useSettings } from '../contexts/SettingsContext';
import { generateId } from '../utils/idGenerator';
import DocumentScanner from '../components/common/DocumentScanner';
import { DocumentEditor } from '../components/common/DocumentEditor';
import { convertPdfToImages, convertPdfToText } from '../utils/pdfUtils';
import { SparklesIcon } from '../components/icons/AiIcons';
import * as aiService from '../services/aiService.ts';
import ReportDashboard from '../components/ReportDashboard';
import CollapsibleSection from '../components/common/CollapsibleSection';
import NavigationCard from '../components/common/NavigationCard';
import Dashboard from '../components/Dashboard';
import { exportToCsv } from '../utils/exportUtils';

const ReportDetailPage: React.FC = () => {
  const { projectId, reportId } = useParams<{ projectId: string; reportId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { settings } = useSettings();

  const [report, setReport] = useState<Report | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [forms, setForms] = useState<ProjectFormWithTemplate[]>([]);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorPages, setEditorPages] = useState<DocumentPage[]>([]);
  const [isConvertingPdf, setIsConvertingPdf] = useState(false);
  const [isAiSummaryLoading, setIsAiSummaryLoading] = useState(false);
  const [reportSummary, setReportSummary] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentReportData, setCurrentReportData] = useState<Partial<Report>>({});
  
  const dashboardChartRef = useRef<HTMLCanvasElement>(null);

  // For Global Dashboard PDF
  const [globalStats, setGlobalStats] = useState<GlobalDashboardStats | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const globalStatusChartRef = useRef<HTMLCanvasElement>(null);
  const globalIssuesChartRef = useRef<HTMLCanvasElement>(null);


  const fetchReportDetails = useCallback(async () => {
    if (!reportId || !projectId) return;
    setIsLoading(true);
    try {
      const [reportData, projectData, problemData, formTemplatesData, globalStatsData, allProjectsData, allSuppliersData] = await Promise.all([
        dbService.getReport(reportId),
        dbService.getProject(projectId),
        dbService.getProblemsByReportId(reportId),
        dbService.getAllFormTemplates(),
        dbService.getGlobalDashboardStats(),
        dbService.getAllProjects(),
        dbService.getAllSuppliers()
      ]);
      
      if (reportData && projectData) {
        setReport(reportData);
        setProject(projectData);
        setProblems(problemData.sort((a, b) => a.order - b.order));
        setFormTemplates(formTemplatesData);
        setGlobalStats(globalStatsData);
        setAllProjects(allProjectsData);
        setAllSuppliers(allSuppliersData);

        const filledFormsData = await dbService.getProjectFormsByReportId(reportId);
        const formsWithTemplates = filledFormsData
            .map(form => {
                const template = formTemplatesData.find(t => t.id === form.formTemplateId);
                return template ? { form, template } : null;
            })
            .filter((item): item is ProjectFormWithTemplate => item !== null);
        setForms(formsWithTemplates);

      } else {
        addToast('דוח או בניין לא נמצאו', 'error');
        navigate(`/project/${projectId}`);
      }
    } catch (error) {
      console.error("Error fetching report details:", error);
      addToast('שגיאה בטעינת פרטי הדוח', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [reportId, projectId, addToast, navigate]);

  useEffect(() => {
    fetchReportDetails();
  }, [fetchReportDetails]);

  const associatedWorkers = useMemo(() => {
    if (!report?.workerIds || !project?.workers) return [];
    return project.workers.filter(w => report.workerIds!.includes(w.id));
  }, [report, project]);

  const associatedSuppliers = useMemo(() => {
    if (!report?.supplierIds || !allSuppliers) return [];
    return allSuppliers.filter(s => report.supplierIds!.includes(s.id));
  }, [report, allSuppliers]);
  
  const associatedTenants = useMemo(() => {
    if (!report?.tenantIds || !project?.tenants) return [];
    return project.tenants.filter(t => report.tenantIds!.includes(t.id));
  }, [report, project]);
  
  const handleGenerateReportPdf = async () => {
    if (!project || !report || !settings) return;
    addToast('מכין PDF לדוח...', 'info');
    
    let reportDashboardImageUrl: string | undefined;
    if (dashboardChartRef.current) {
        reportDashboardImageUrl = dashboardChartRef.current.toDataURL('image/png');
    }

    let globalDashboardData;
    if (globalStats && globalStatusChartRef.current && globalIssuesChartRef.current) {
        globalDashboardData = {
            stats: globalStats,
            statusChartImage: globalStatusChartRef.current.toDataURL('image/png'),
            issuesChartImage: globalIssuesChartRef.current.toDataURL('image/png'),
        }
    }

    try {
        const options: ReportPdfGenerationOptions = { 
            settings, 
            project, 
            report, 
            problems,
            allSuppliers, 
            reportDashboardImageUrl, 
            globalDashboard: globalDashboardData 
        };
        const { failedImages } = await generateReportPdf(options);
        
        if (failedImages.length > 0) {
            const warningMessage = `PDF נוצר, אך ${failedImages.length} תמונות לא נטענו.`;
            addToast(warningMessage, 'warning');
            dbService.logSystemError(
                `אזהרת טעינת תמונות ב-PDF לדוח: ${report.title}`,
                warningMessage
            );
        } else {
            addToast('PDF של הדוח נוצר והורד בהצלחה', 'success');
        }
    } catch (error) {
        console.error('Error generating PDF:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        addToast('שגיאה ביצירת PDF. בדוק ביומן הפעילות לפרטים.', 'error');
        dbService.logSystemError(
            `שגיאה קריטית ביצירת PDF לדוח: ${report.title}`,
            errorMessage
        );
    }
  };

  const handleExportExcel = () => {
    if (problems.length === 0) {
        addToast('אין תקלות לייצוא', 'warning');
        return;
    }
    const dataToExport = problems.map(p => ({
        'תיאור': p.description,
        'חומרה': p.severity,
        'מיקום': p.locationTag || '',
        'הערות': p.notes,
    }));
    exportToCsv(dataToExport, `report_${report?.title}_problems`);
    addToast('קובץ Excel יוצא...', 'success');
};
  
  const handleAddForm = async () => {
    if (!selectedTemplateId || !project || !report) return;
    const template = formTemplates.find(t => t.id === selectedTemplateId);
    if (!template) { addToast('Template not found', 'error'); return; }
    const newForm: ProjectForm = {
        id: generateId(), projectId: project.id, reportId: report.id, formTemplateId: selectedTemplateId,
        formTemplateName: template.name, answers: [], createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(), formDate: new Date().toISOString()
    };
    try {
        await dbService.addProjectForm(newForm);
        addToast(`Form "${template.name}" added successfully.`, 'success');
        setIsFormModalOpen(false);
        setSelectedTemplateId('');
        fetchReportDetails();
    } catch (e) { addToast('Error adding form', 'error'); }
  };
  
  const handleAiGenerateSummary = async () => {
    if (problems.length === 0) { addToast('יש להוסיף תקלות לדוח לפני יצירת סיכום.', 'warning'); return; }
    setIsAiSummaryLoading(true);
    setReportSummary('');
    try {
        const summary = await aiService.generateReportSummary(problems);
        setReportSummary(summary);
    } catch (error) {
        addToast(error instanceof Error ? error.message : 'שגיאה ביצירת סיכום AI', 'error');
    } finally {
        setIsAiSummaryLoading(false);
    }
  };
  
  const handleApplySummary = () => {
    if (!report) return;
    setCurrentReportData({ ...report, description: reportSummary });
    setIsEditModalOpen(true);
  };
  
  const handleScannerSave = async (pages: DocumentPage[], fileName: string) => {
    addToast('יוצר קובץ PDF...', 'info');
    try {
        const imageB64s = pages.map(p => p.editedDataUrl);
        const pdfDataUrl = await generatePdfFromImages(imageB64s, fileName, settings);
        const newFile: ProjectFile = {
            id: generateId(), name: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`, mimeType: 'application/pdf',
            dataUrl: pdfDataUrl, uploadedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
        };
        setCurrentReportData(prev => ({...prev, files: [...(prev.files || []), newFile]}));
        setIsScannerOpen(false);
        addToast('המסמך הסרוק נוסף בהצלחה', 'success');
    } catch (error) {
        console.error("Scanner save error:", error);
        addToast('שגיאה בשמירת המסמך', 'error');
    }
  };

  if (isLoading || !report || !project) {
    return <LoadingSpinner text="טוען פרטי דוח..." />;
  }

  return (
    <div className="space-y-6">
      <div style={{ display: 'none' }}>
        {globalStats && allProjects && (
          <Dashboard 
            stats={globalStats} 
            projects={allProjects} 
            statusChartRef={globalStatusChartRef} 
            issuesChartRef={globalIssuesChartRef} 
          />
        )}
      </div>

      <section className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200/90">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">{report.title}</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              בניין: <Link to={`/project/${project.id}`} className="text-sky-600 hover:text-sky-700 font-bold hover:underline">{project.name}</Link>
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-2 flex-wrap">
              <span className="font-mono-numbers">{formatDate(report.date)}</span>
              {report.group && <span className="text-xs bg-sky-50 text-sky-800 border border-sky-100 px-2.5 py-0.5 rounded-full font-bold">{report.group}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setCurrentReportData(report); setIsEditModalOpen(true); }} className="p-2 text-slate-500 hover:text-sky-600 rounded-xl hover:bg-slate-100 transition-colors" title="ערוך פרטי דוח"><PencilIcon className="w-5 h-5" /></button>
            <button onClick={handleGenerateReportPdf} className="p-2 text-slate-500 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors" title="יצא PDF"><ArrowDownTrayIcon className="w-5 h-5" /></button>
            <button onClick={handleExportExcel} className="p-2 text-slate-500 hover:text-emerald-600 rounded-xl hover:bg-emerald-50 transition-colors" title="יצא Excel"><ArrowDownTrayIcon className="w-5 h-5" /></button>
          </div>
        </div>
        {report.description && <p className="mt-4 text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50/70 p-4 rounded-2xl border border-slate-100">{report.description}</p>}
      </section>

      <ReportDashboard problems={problems} chartRef={dashboardChartRef} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NavigationCard
          to={`/project/${projectId}/report/${reportId}/problems`}
          icon={<ClipboardDocumentCheckIcon className="w-6 h-6" />}
          title="תקלות בדוח"
          count={problems.length}
          actionText="הוסף תקלה"
          onActionClick={() => navigate(`/project/${projectId}/report/${reportId}/problem/new`)}
        />
        <NavigationCard
          to={`/project/${projectId}/report/${reportId}/forms`}
          icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
          title="טפסים מצורפים"
          count={forms.length}
          actionText="הוסף טופס"
          onActionClick={() => setIsFormModalOpen(true)}
        />
      </div>

       <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title="הוסף טופס לדוח">
        <div className="space-y-4">
            <h4 className="text-lg font-medium">בחר תבנית טופס</h4>
            {formTemplates.length > 0 ? (
                <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm">
                    <option value="" disabled>בחר תבנית...</option>
                    {formTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            ) : <p className="text-slate-500">אין תבניות זמינות. <Link to="/form-templates" className="text-sky-600">צור תבנית חדשה</Link>.</p>}
            <div className="flex justify-end pt-4">
                <button onClick={handleAddForm} disabled={!selectedTemplateId} className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:opacity-50">הוסף טופס</button>
            </div>
        </div>
      </Modal>

      <CollapsibleSection title={<h3 className="text-lg font-semibold text-slate-800">סיכום AI</h3>} defaultOpen={!!reportSummary}>
        <div className="space-y-4">
            {isAiSummaryLoading ? (
                <LoadingSpinner text="מייצר סיכום..." />
            ) : reportSummary ? (
                <div className="prose max-w-none text-slate-700 whitespace-pre-wrap">{reportSummary}</div>
            ) : (
                <p className="text-slate-500">לחץ על הכפתור כדי ליצור סיכום מנהלים אוטומטי של התקלות בדוח.</p>
            )}
            <div className="flex items-center gap-4">
                <button onClick={handleAiGenerateSummary} disabled={isAiSummaryLoading} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 disabled:opacity-50">
                    <SparklesIcon className="w-5 h-5"/>
                    {isAiSummaryLoading ? 'מעבד...' : (reportSummary ? 'צור סיכום חדש' : 'צור סיכום')}
                </button>
                {reportSummary && !isAiSummaryLoading && (
                    <button onClick={handleApplySummary} className="text-sm font-medium text-sky-600 hover:underline">
                        החל סיכום זה על הדוח
                    </button>
                )}
            </div>
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default ReportDetailPage;