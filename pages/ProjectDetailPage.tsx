
import React, { useState, useEffect, useCallback, ChangeEvent, useMemo, ReactNode, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Project, Report, ProjectImage, AnnotatedImage, ProjectFile, ProjectBackup, Problem, ProjectForm, DocumentPage, ProjectTodo, ProblemSeverity, Tenant, Supplier, BuildingSystemLog } from '../types';
import * as dbService from '../services/dbService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import { generateId } from '../utils/idGenerator';
import { useToast } from '../contexts/ToastContext';
import { formatDate, formatDateTime } from '../utils/dateFormatter';
import { PlusIcon, PencilIcon, ArrowUpTrayIcon, ClipboardCheckIcon } from '../components/icons/ActionIcons';
import { DocumentScannerIcon } from '../components/icons/ScannerIcons';
import { DocumentChartBarIcon, FolderIcon, QueueListIcon, ClipboardDocumentListIcon, ChatBubbleBottomCenterTextIcon, WrenchScrewdriverIcon, RectangleGroupIcon } from '../components/icons/NavigationIcons';
import ImageUploader from '../components/common/ImageUploader';
import { convertPdfToImages, convertPdfToText } from '../utils/pdfUtils';
import BuildingDashboard from '../components/ProjectDashboard';
import NavigationCard from '../components/common/NavigationCard';
import AddFileModal from '../components/common/AddFileModal';
import AddTodoModal from '../components/common/AddTodoModal';
import { SparklesIcon } from '../components/icons/AiIcons';
import * as aiService from '../services/aiService.ts';
import { UserGroupIcon, IdentificationIcon } from '../components/icons/UserIcons';
import { useSettings } from '../contexts/SettingsContext';
import * as emailService from '../services/emailService';
import { ArchiveBoxIcon } from '../components/icons/GeneralIcons';
import { BuildingSystemsSection } from '../components/BuildingSystemsSection';

const getInitials = (name: string): string => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const BuildingDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [forms, setForms] = useState<ProjectForm[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [systemLogs, setSystemLogs] = useState<BuildingSystemLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState<boolean>(false);
  const [currentProjectData, setCurrentProjectData] = useState<Partial<Project>>({});
  const [newReport, setNewReport] = useState<Partial<Report>>({ title: '', description: '', group: '', date: new Date().toISOString().split('T')[0], workerIds: [], supplierIds: [], tenantIds: [] });
  const [isAddFileModalOpen, setIsAddFileModalOpen] = useState(false);
  const [isAddTodoModalOpen, setIsAddTodoModalOpen] = useState(false);
  const { addToast } = useToast();
  const { settings } = useSettings();
  
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const reportPdfInputRef = useRef<HTMLInputElement>(null);
  const tenantFileInputRef = useRef<HTMLInputElement>(null);

  const fetchProjectDetails = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const projectData = await dbService.getProject(projectId);
      if (projectData) {
        setProject(projectData);
        const [reportData, projectFormsData, suppliersData, logsData] = await Promise.all([
            dbService.getReportsByProjectId(projectId),
            dbService.getProjectFormsByProjectId(projectId),
            dbService.getAllSuppliers(),
            dbService.getSystemLogsByBuildingId(projectId),
        ]);
        
        setReports(reportData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setForms(projectFormsData);
        setAllSuppliers(suppliersData);
        setSystemLogs(logsData);
        
        const problemsPromises = reportData.map(report => dbService.getProblemsByReportId(report.id));
        const problemsByReport = await Promise.all(problemsPromises);
        setAllProblems(problemsByReport.flat());

      } else {
        addToast('בניין לא נמצא', 'error');
      }
    } catch (error) {
      console.error("Error fetching project details:", error);
      addToast('שגיאה בטעינת פרטי הבניין', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, addToast]);

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);
  
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, target: 'newReport' | 'editProject') => {
    const { name, value, type } = e.target;
    const setState = target === 'newReport' ? setNewReport : setCurrentProjectData;

    if ((e.target as HTMLSelectElement).multiple) {
        const selectedIds = Array.from((e.target as HTMLSelectElement).selectedOptions, option => option.value);
        setState((prev: any) => ({ ...prev, [name]: selectedIds }));
    } else if (type === 'number') {
        setState((prev: any) => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
    } else {
        setState((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleProjectImagesChange = (annotatedImages: AnnotatedImage[]) => {
    const projectImages: ProjectImage[] = annotatedImages.map(ai => ({
      id: ai.id,
      dataUrl: ai.dataUrl,
      url: ai.url, // FIX: Preserve existing URL
      storagePath: ai.storagePath, // FIX: Preserve existing storage path
      name: ai.name,
      mimeType: ai.mimeType,
      uploadedAt: ai.createdAt,
    }));
    setCurrentProjectData(prev => ({ ...prev, images: projectImages }));
  };

  const handleSubmitNewReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReport.title || !projectId) { addToast('כותרת הדוח היא שדה חובה', 'warning'); return; }
    const reportToAdd: Report = {
      id: generateId(), projectId: projectId, title: newReport.title!,
      date: newReport.date ? new Date(newReport.date).toISOString() : new Date().toISOString(),
      description: newReport.description || '',
      group: newReport.group?.trim() || undefined,
      workerIds: newReport.workerIds || [],
      supplierIds: newReport.supplierIds || [],
      tenantIds: newReport.tenantIds || [],
      files: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    try {
      await dbService.addReport(reportToAdd);
      addToast('דוח חדש נוסף בהצלחה', 'success');
      if (project) {
        emailService.triggerNewReportEmail(reportToAdd, project, settings);
      }
      setIsReportModalOpen(false);
      setNewReport({ title: '', description: '', group: '', date: new Date().toISOString().split('T')[0], workerIds: [], supplierIds: [], tenantIds: [] });
      fetchProjectDetails();
    } catch (error) {
      console.error("Error adding report:", error);
      addToast('שגיאה בהוספת הדוח', 'error');
    }
  };

  const handleSubmitEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProjectData.name || !project) { addToast('שם הבניין הוא שדה חובה', 'warning'); return; }
    
    const projectToUpdate: Project = {
        ...project, ...currentProjectData, name: currentProjectData.name,
        images: currentProjectData.images || project.images,
        updatedAt: new Date().toISOString(),
    } as Project;

    try {
        await dbService.updateProject(projectToUpdate);
        addToast('פרטי הבניין עודכנו', 'success');
        setIsEditProjectModalOpen(false);
        fetchProjectDetails();
    } catch (error) {
        console.error("Error updating project:", error);
        addToast('שגיאה בעדכון הבניין', 'error');
    }
  };

  const handleExportProject = async () => {
    if (!project || !projectId) return;
    addToast('מכין קובץ גיבוי...', 'info');
    try {
        const reportsForExport = await dbService.getReportsByProjectId(projectId);
        const problemsForExport: Problem[] = [];
        const formsForExport: ProjectForm[] = [];
        for (const report of reportsForExport) {
            const reportProblems = await dbService.getProblemsByReportId(report.id);
            problemsForExport.push(...reportProblems);
            const reportForms = await dbService.getProjectFormsByReportId(report.id);
            formsForExport.push(...reportForms);
        }
        const backupData: ProjectBackup = { project, reports: reportsForExport, problems: problemsForExport, forms: formsForExport };
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().split('T')[0];
        a.download = `${project.name.replace(/[^a-z0-9\u0590-\u05FF]/gi, '_')}_backup_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast('הבניין יוצא בהצלחה', 'success');
    } catch (error) {
        console.error("Error exporting project:", error);
        addToast('שגיאה בייצוא הבניין', 'error');
    }
  };
  
  const handleAddFiles = async (newFiles: ProjectFile[]) => {
    if (!project) return;
    const projectToUpdate: Project = {
        ...project,
        files: [...(project.files || []), ...newFiles],
        updatedAt: new Date().toISOString(),
    };
    try {
        await dbService.updateProject(projectToUpdate);
        addToast(`${newFiles.length} ${newFiles.length > 1 ? 'קבצים נוספו' : 'קובץ נוסף'} בהצלחה`, 'success');
        fetchProjectDetails();
    } catch (error) {
        addToast('שגיאה בהוספת קבצים', 'error');
    }
  };

  const handleAddTodoSubmit = async (newTodo: ProjectTodo) => {
    if (!project) return;
    const projectToUpdate: Project = {
        ...project,
        todos: [...(project.todos || []), { ...newTodo, projectId: undefined }], // remove temp projectId
        updatedAt: new Date().toISOString(),
    };
    try {
        await dbService.updateProject(projectToUpdate);
        addToast('המשימה נוספה בהצלחה', 'success');
        fetchProjectDetails();
    } catch (error) {
        addToast('שגיאה בהוספת משימה', 'error');
    }
  };

  const handleAiReportCreation = () => {
    reportPdfInputRef.current?.click();
  };

  const handleReportPdfFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

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

      if (pageImages.length === 0) {
          addToast('לא נמצאו תמונות ב-PDF. ממשיך עם טקסט בלבד.', 'warning');
      }

      addToast('שלב 2/3: שולח לניתוח AI...', 'info');
      const aiData = await aiService.generateReportFromPdf(text, pageImages);

      addToast('שלב 3/3: יוצר דוח ובעיות...', 'info');
      const newReport: Report = {
        id: generateId(),
        projectId: projectId,
        title: aiData.title,
        date: aiData.date ? new Date(aiData.date).toISOString() : new Date().toISOString(),
        description: aiData.description,
        files: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // FIX: Changed initial annotationData from an empty object string ('{}') to an empty array string ('[]') for AI-generated images to prevent type errors in the annotation canvas.
      const newProblems: Problem[] = aiData.problems.map((p, index) => {
        // FIX: Cast 'p' to 'unknown' first to allow re-casting to a different, more specific shape.
        const p_casted = p as unknown as Omit<Partial<Problem>, 'images'> & { images?: { imageIndex: number; caption?: string }[] };
        const problemImages: AnnotatedImage[] = (p_casted.images || []).map(imgInfo => {
            const pageImageBase64 = pageImages[imgInfo.imageIndex];
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
            reportId: newReport.id,
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

      await dbService.addReport(newReport);
      await Promise.all(newProblems.map(p => dbService.addProblem(p)));

      addToast('דוח נוצר בהצלחה מ-PDF!', 'success');
      fetchProjectDetails();

    } catch (error) {
      console.error("Error creating report from PDF:", error);
      addToast(error instanceof Error ? error.message : 'שגיאה ביצירת הדוח', 'error');
    } finally {
      setIsAiProcessing(false);
      if (e.target) e.target.value = ''; // Reset file input
    }
  };
  
  const handleAiTenantCreation = () => {
    tenantFileInputRef.current?.click();
  };

  const handleTenantFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;

    setIsAiProcessing(true);
    addToast('מעבד קובץ דיירים...', 'info');

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
        } else if (file.type === 'text/csv') {
            text = await file.text();
        } else {
            throw new Error('סוג קובץ לא נתמך. יש להעלות PDF או CSV.');
        }

        const aiTenants = await aiService.generateTenantsFromText(text);

        const newTenants: Tenant[] = aiTenants.map(t => ({
            id: generateId(),
            name: t.name || 'N/A',
            phone: t.phone || '',
            email: t.email || '',
            building: t.building || '',
            floor: t.floor || '',
            officeNumber: t.officeNumber || '',
            officeSpace: t.officeSpace || '',
            companyId: t.companyId || '',
        }));

        const projectToUpdate: Project = {
            ...project,
            tenants: [...(project.tenants || []), ...newTenants],
            updatedAt: new Date().toISOString(),
        };

        await dbService.updateProject(projectToUpdate);
        addToast(`${newTenants.length} דיירים נוספו בהצלחה!`, 'success');
        fetchProjectDetails();

    } catch (error) {
        console.error("Error creating tenants from file:", error);
        addToast(error instanceof Error ? error.message : 'שגיאה ביצירת רשימת הדיירים', 'error');
    } finally {
        setIsAiProcessing(false);
        if (e.target) e.target.value = '';
    }
  };
  
  const projectTodoGroupSuggestions = useMemo(() => {
    if (!project) return [];
    const groups = project.todos?.map(t => t.group).filter(Boolean) as string[];
    return [...new Set(groups)];
  }, [project]);

  const hasElectricalTools = useMemo(() => {
    return project?.inventory?.some(l => l.itemGroups.some(g => g.name === 'כלי עבודה חשמליים'));
  }, [project]);

  if (isLoading) return <LoadingSpinner text="טוען פרטי בניין..." />;
  if (!project) return <div className="text-center py-10 text-slate-500 text-lg">בניין לא נמצא.</div>;
  
  const hasMainImage = project.images.length > 0;
  const projectMainImage = hasMainImage ? (project.images[0].url || project.images[0].dataUrl) : '';
  const imagesForUploaderEditModal: AnnotatedImage[] = (currentProjectData.images || []).map(pImg => ({
    id: pImg.id,
    url: pImg.url,
    storagePath: pImg.storagePath,
    dataUrl: pImg.dataUrl,
    originalDataUrl: pImg.dataUrl,
    annotationData: '[]',
    name: pImg.name,
    mimeType: pImg.mimeType || 'image/jpeg',
    createdAt: pImg.uploadedAt || new Date().toISOString(),
  }));
  
  return (
    <div className="space-y-8">
      {isAiProcessing && (
          <div className="fixed inset-0 bg-slate-900 bg-opacity-60 backdrop-blur-sm flex flex-col items-center justify-center z-[1001]">
              <LoadingSpinner text="מנתח קובץ בעזרת AI..."/>
              <p className="text-white/80 text-sm mt-2">תהליך זה עשוי לקחת כדקה.</p>
          </div>
      )}
      <section className="bg-white shadow-xs border border-slate-200/90 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {hasMainImage && projectMainImage ? (
            <img src={projectMainImage} alt={`תמונת בניין ${project.name}`} className="w-full md:w-1/3 h-56 sm:h-64 object-cover rounded-2xl shadow-xs border border-slate-100"/>
          ) : (
            <div className="w-full md:w-1/3 h-56 sm:h-64 bg-gradient-to-tr from-sky-900 via-slate-800 to-indigo-950 rounded-2xl shadow-xs border border-slate-200/50 flex flex-col items-center justify-center p-4 text-center">
                <span className="text-5xl font-black text-white/90 tracking-wider mb-2">{getInitials(project.name)}</span>
                <span className="text-xs text-sky-200/80 font-medium">B.Manager נכס</span>
            </div>
          )}
          <div className="flex-grow">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{project.name}</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">{project.address || 'כתובת טרם הוגדרה'}</p>
              </div>
              <button onClick={() => { setCurrentProjectData({...project}); setIsEditProjectModalOpen(true); }} className="p-2.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 transition-colors rounded-2xl border border-slate-200/80 shadow-2xs" title="ערוך פרטי בניין">
                <PencilIcon className="w-5 h-5" />
              </button>
            </div>

            {project.clientInfo && (
                <p className="text-xs sm:text-sm text-slate-600 mb-2"><strong className="text-slate-700 font-bold">לקוח:</strong> {project.clientInfo}</p>
            )}

            {project.managerName && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600">
                    <div><span className="text-slate-400 font-medium">מנהל בניין:</span> <strong className="text-slate-800">{project.managerName}</strong></div>
                    {project.managerPhone && <div><span className="text-slate-400 font-medium">טלפון:</span> <a href={`tel:${project.managerPhone}`} className="text-sky-600 font-bold hover:underline">{project.managerPhone}</a></div>}
                    {project.managerEmail && <div><span className="text-slate-400 font-medium">אימייל:</span> <a href={`mailto:${project.managerEmail}`} className="text-sky-600 font-bold hover:underline">{project.managerEmail}</a></div>}
                </div>
            )}

            <div className="mt-4 grid grid-cols-3 gap-3 text-center bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                <div>
                    <p className="text-[11px] font-bold text-slate-500">קומות</p>
                    <p className="text-slate-800 text-lg font-black font-mono-numbers">{project.numberOfFloors ?? '-'}</p>
                </div>
                <div>
                    <p className="text-[11px] font-bold text-slate-500">שטח (מ"ר)</p>
                    <p className="text-slate-800 text-lg font-black font-mono-numbers">{project.buildingArea ?? '-'}</p>
                </div>
                <div>
                    <p className="text-[11px] font-bold text-slate-500">חניות</p>
                    <p className="text-slate-800 text-lg font-black font-mono-numbers">{project.parkingSpots ?? '-'}</p>
                </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-3">נוצר ב: {formatDateTime(project.createdAt)} | עודכן לאחרונה: {formatDateTime(project.updatedAt)}</p>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
                <Link to={`/project/${project.id}/checklist`} className="btn-primary text-xs font-bold py-2.5 px-4 shadow-sm flex items-center">
                    <ClipboardCheckIcon className="w-4 h-4 me-1.5 rtl:ml-1.5" />
                    רשימת תקלות לטיפול
                </Link>
                <button onClick={handleExportProject} className="btn-secondary text-xs font-semibold py-2.5 px-3.5 flex items-center">
                    <ArrowUpTrayIcon className="w-4 h-4 me-1.5 rtl:ml-1.5" />
                    ייצא גיבוי
                </button>
            </div>
          </div>
        </div>
      </section>

      <BuildingDashboard project={project} problems={allProblems} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <NavigationCard
              to={`/project/${project.id}/reports`}
              icon={<DocumentChartBarIcon className="w-6 h-6" />}
              title="דוחות"
              count={reports.length}
              actionText="הוסף דוח"
              onActionClick={() => setIsReportModalOpen(true)}
              secondaryActionText="הוסף מ-PDF (AI)"
              onSecondaryActionClick={handleAiReportCreation}
              secondaryActionIcon={<SparklesIcon className="w-5 h-5" />}
          />
           <NavigationCard
              to={`/project/${project.id}/forms`}
              icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
              title="טפסים"
              count={forms.length}
          />
           <NavigationCard
              to={`/project/${project.id}/tenants`}
              icon={<UserGroupIcon className="w-6 h-6" />}
              title="דיירים"
              count={project.tenants?.length || 0}
              secondaryActionText="הוסף מ-PDF/CSV (AI)"
              onSecondaryActionClick={handleAiTenantCreation}
              secondaryActionIcon={<SparklesIcon className="w-5 h-5" />}
          />
          <NavigationCard
              to={`/project/${project.id}/workers`}
              icon={<IdentificationIcon className="w-6 h-6" />}
              title="עובדי תחזוקה"
              count={project.workers?.length || 0}
          />
          <NavigationCard
              to={`/project/${project.id}/notes`}
              icon={<ChatBubbleBottomCenterTextIcon className="w-6 h-6" />}
              title="הערות ומידע"
              count={project.notes?.length || 0}
          />
           <NavigationCard
              to={`/project/${project.id}/sub-projects`}
              icon={<RectangleGroupIcon className="w-6 h-6" />}
              title="פרויקטים"
              count={project.subProjects?.length || 0}
          />
          <NavigationCard
              to={`/project/${project.id}/files`}
              icon={<FolderIcon className="w-6 h-6" />}
              title="קבצים"
              count={project.files?.length || 0}
              actionText="הוסף קובץ"
              onActionClick={() => setIsAddFileModalOpen(true)}
          />
          <NavigationCard
              to={`/project/${project.id}/todos`}
              icon={<QueueListIcon className="w-6 h-6" />}
              title="משימות"
              count={project.todos?.length || 0}
              actionText="הוסף משימה"
              onActionClick={() => setIsAddTodoModalOpen(true)}
          />
          <NavigationCard
              to={`/project/${project.id}/inventory`}
              icon={<ArchiveBoxIcon className="w-6 h-6" />}
              title="מלאי"
              count={project.inventory?.flatMap(l => l.itemGroups).flatMap(g => g.items).length || 0}
          />
          {hasElectricalTools && (
            <NavigationCard
                to={`/project/${project.id}/electrical-tools`}
                icon={<WrenchScrewdriverIcon className="w-6 h-6" />}
                title="בדיקת כלי עבודה חשמליים"
                count={project.inventory?.flatMap(l => l.itemGroups).find(g => g.name === 'כלי עבודה חשמליים')?.items.length || 0}
            />
          )}
      </div>

      {/* Building Systems & Infrastructure Equipment Logs (MD Section 3.2) */}
      <section className="bg-white shadow-xs border border-slate-200/90 rounded-3xl p-6 sm:p-8">
        <BuildingSystemsSection
          buildingId={project.id}
          systemLogs={systemLogs}
          onRefresh={fetchProjectDetails}
        />
      </section>
      
      <input type="file" ref={reportPdfInputRef} onChange={handleReportPdfFileChange} accept="application/pdf" className="hidden" />
      <input type="file" ref={tenantFileInputRef} onChange={handleTenantFileChange} accept="application/pdf,text/csv" className="hidden" />

      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="הוספת דוח חדש" size="lg">
        <form onSubmit={handleSubmitNewReport} className="space-y-4">
            <div>
                <label htmlFor="report-title" className="block text-sm font-medium text-slate-700">כותרת הדוח</label>
                <input type="text" name="title" id="report-title" value={newReport.title || ''} onChange={(e) => handleInputChange(e, 'newReport')} required className="mt-1 block w-full input-class"/>
            </div>
            <div>
                <label htmlFor="report-date" className="block text-sm font-medium text-slate-700">תאריך הדוח</label>
                <input type="date" name="date" id="report-date" value={newReport.date || ''} onChange={(e) => handleInputChange(e, 'newReport')} required className="mt-1 block w-full input-class"/>
            </div>
            <div>
                <label htmlFor="report-group" className="block text-sm font-medium text-slate-700">קבוצה (אופציונלי)</label>
                <input type="text" name="group" id="report-group" value={newReport.group || ''} onChange={(e) => handleInputChange(e, 'newReport')} className="mt-1 block w-full input-class" placeholder="לדוגמה: בדיקות איטום"/>
            </div>
            <div>
                <label htmlFor="report-description" className="block text-sm font-medium text-slate-700">תיאור (אופציונלי)</label>
                <textarea name="description" id="report-description" value={newReport.description || ''} onChange={(e) => handleInputChange(e, 'newReport')} rows={4} className="mt-1 block w-full input-class"/>
            </div>
            <div>
                <label htmlFor="report-workers" className="block text-sm font-medium text-slate-700">עובדים משויכים (אופציונלי)</label>
                <select multiple name="workerIds" id="report-workers" value={newReport.workerIds || []} onChange={(e) => handleInputChange(e, 'newReport')} className="mt-1 block w-full input-class h-24">
                    {(project?.workers || []).map(worker => ( <option key={worker.id} value={worker.id}>{worker.name}</option>))}
                </select>
            </div>
             <div>
                <label htmlFor="report-suppliers" className="block text-sm font-medium text-slate-700">ספקים משויכים (אופציונלי)</label>
                <select multiple name="supplierIds" id="report-suppliers" value={newReport.supplierIds || []} onChange={(e) => handleInputChange(e, 'newReport')} className="mt-1 block w-full input-class h-24">
                    {allSuppliers.map(supplier => ( <option key={supplier.id} value={supplier.id}>{supplier.name} ({supplier.group})</option>))}
                </select>
            </div>
            <div>
                <label htmlFor="report-tenants" className="block text-sm font-medium text-slate-700">דיירים משויכים (אופציונלי)</label>
                <select multiple name="tenantIds" id="report-tenants" value={newReport.tenantIds || []} onChange={(e) => handleInputChange(e, 'newReport')} className="mt-1 block w-full input-class h-24">
                    {(project?.tenants || []).map(tenant => ( <option key={tenant.id} value={tenant.id}>{tenant.name}</option>))}
                </select>
            </div>
            <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-2">
                <button type="button" onClick={() => setIsReportModalOpen(false)} className="btn-secondary">ביטול</button>
                <button type="submit" className="btn-primary">צור דוח</button>
            </div>
        </form>
      </Modal>

      <Modal isOpen={isEditProjectModalOpen} onClose={() => { setIsEditProjectModalOpen(false); }} title="עריכת פרטי בניין" size="lg">
        <form onSubmit={handleSubmitEditProject} className="space-y-6">
            <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-slate-700">שם הבניין</label>
                <input type="text" name="name" id="edit-name" value={currentProjectData.name || ''} onChange={(e) => handleInputChange(e, 'editProject')} required className="mt-1 block w-full input-class" />
            </div>
             <div>
                <label htmlFor="edit-address" className="block text-sm font-medium text-slate-700">כתובת</label>
                <input type="text" name="address" id="edit-address" value={currentProjectData.address || ''} onChange={(e) => handleInputChange(e, 'editProject')} className="mt-1 block w-full input-class" />
            </div>
             <div>
                <label htmlFor="edit-clientInfo" className="block text-sm font-medium text-slate-700">פרטי לקוח</label>
                <textarea name="clientInfo" id="edit-clientInfo" value={currentProjectData.clientInfo || ''} onChange={(e) => handleInputChange(e, 'editProject')} rows={3} className="mt-1 block w-full input-class" />
            </div>
             <div className="pt-4 border-t">
                <h3 className="text-md font-medium text-slate-800 mb-2">פרטי מנהל בניין</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="managerName" className="block text-sm font-medium text-slate-700">שם מנהל</label>
                        <input type="text" name="managerName" id="managerName" value={currentProjectData.managerName || ''} onChange={(e) => handleInputChange(e, 'editProject')} className="mt-1 block w-full input-class" />
                    </div>
                    <div>
                        <label htmlFor="managerPhone" className="block text-sm font-medium text-slate-700">טלפון</label>
                        <input type="tel" name="managerPhone" id="managerPhone" value={currentProjectData.managerPhone || ''} onChange={(e) => handleInputChange(e, 'editProject')} className="mt-1 block w-full input-class" />
                    </div>
                    <div className="sm:col-span-2">
                        <label htmlFor="managerEmail" className="block text-sm font-medium text-slate-700">אימייל</label>
                        <input type="email" name="managerEmail" id="managerEmail" value={currentProjectData.managerEmail || ''} onChange={(e) => handleInputChange(e, 'editProject')} className="mt-1 block w-full input-class" />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label htmlFor="edit-numberOfFloors" className="block text-sm font-medium text-slate-700">כמות קומות</label>
                    <input type="number" name="numberOfFloors" id="edit-numberOfFloors" value={currentProjectData.numberOfFloors || ''} onChange={(e) => handleInputChange(e, 'editProject')} className="mt-1 block w-full input-class" />
                </div>
                <div>
                    <label htmlFor="edit-buildingArea" className="block text-sm font-medium text-slate-700">שטח (מ"ר)</label>
                    <input type="number" name="buildingArea" id="edit-buildingArea" value={currentProjectData.buildingArea || ''} onChange={(e) => handleInputChange(e, 'editProject')} className="mt-1 block w-full input-class" />
                </div>
                <div>
                    <label htmlFor="edit-parkingSpots" className="block text-sm font-medium text-slate-700">חניות</label>
                    <input type="number" name="parkingSpots" id="edit-parkingSpots" value={currentProjectData.parkingSpots || ''} onChange={(e) => handleInputChange(e, 'editProject')} className="mt-1 block w-full input-class" />
                </div>
            </div>
            <div className="pt-4 border-t">
                 <ImageUploader images={imagesForUploaderEditModal} onImagesChange={handleProjectImagesChange} maxImages={5} allowNotes={false} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsEditProjectModalOpen(false)} className="btn-secondary">ביטול</button>
                <button type="submit" className="btn-primary">שמור שינויים</button>
            </div>
        </form>
      </Modal>

      <AddFileModal isOpen={isAddFileModalOpen} onClose={() => setIsAddFileModalOpen(false)} onSave={handleAddFiles} />
      <AddTodoModal isOpen={isAddTodoModalOpen} onClose={() => setIsAddTodoModalOpen(false)} onSave={handleAddTodoSubmit} groupSuggestions={projectTodoGroupSuggestions} projects={project ? [project] : []} />
    </div>
  );
};

export default BuildingDetailPage;
