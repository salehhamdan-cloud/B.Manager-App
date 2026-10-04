import React, { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Project, SubProject, ProjectFile, ProjectTodo, AnnotatedImage, Quotation, QuotationStatus, Supplier } from '../types';
import * as dbService from '../services/dbService';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import CollapsibleSection from '../components/common/CollapsibleSection';
import AddFileModal from '../components/common/AddFileModal';
import AddTodoModal from '../components/common/AddTodoModal';
import FileItem from '../components/FileItem';
import TodoItem from '../components/TodoItem';
import { isMimeTypeViewable } from '../utils/fileUtils';
import Modal from '../components/common/Modal';
import ImageUploader from '../components/common/ImageUploader';
import { ArrowDownTrayIcon, TrashIcon, EyeIcon, PlusIcon, PencilIcon } from '../components/icons/ActionIcons';
import EditFileModal from '../components/common/EditFileModal';
import { AnnotationEditor } from '../components/common/AnnotationEditor';
import { ArrowsUpDownIcon } from '../components/icons/MenuIcons';
import { formatDate } from '../utils/dateFormatter';
import { QUOTATION_STATUS_OPTIONS, QUOTATION_STATUS_COLORS } from '../constants';
import { generateId } from '../utils/idGenerator';
import { DocumentTextIcon } from '../components/icons/BusinessIcons';
import { useSettings } from '../contexts/SettingsContext';
import { generateSubProjectDetailPdf } from '../services/pdfService';

const getStatusStyles = (status: string) => {
    switch (status) {
        case 'פעיל': return { bg: 'bg-green-100', text: 'text-green-800' };
        case 'הושלם': return { bg: 'bg-blue-100', text: 'text-blue-800' };
        case 'בהמתנה': return { bg: 'bg-amber-100', text: 'text-amber-800' };
        case 'בוטל': return { bg: 'bg-slate-100', text: 'text-slate-600' };
        default: return { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
};

const getInitials = (name: string): string => {
    if (!name) return '';
    return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
};

const StatCard: React.FC<{ title: string; value: React.ReactNode; colorClass: string }> = ({ title, value, colorClass }) => (
    <div className="bg-white p-3 rounded-lg shadow-sm text-center border">
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
        <p className="text-xs font-medium text-slate-500">{title}</p>
    </div>
);


const SubProjectDetailPage: React.FC = () => {
    const { projectId, subProjectId } = useParams<{ projectId: string; subProjectId: string }>();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const { settings } = useSettings();

    const [project, setProject] = useState<Project | null>(null);
    const [subProject, setSubProject] = useState<SubProject | null>(null);
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isAddFileModalOpen, setIsAddFileModalOpen] = useState(false);
    const [isAddTodoModalOpen, setIsAddTodoModalOpen] = useState(false);
    const [viewingFile, setViewingFile] = useState<ProjectFile | null>(null);
    const [editingFile, setEditingFile] = useState<ProjectFile | null>(null);
    const [annotatingFile, setAnnotatingFile] = useState<ProjectFile | null>(null);
    const [annotationImageSrc, setAnnotationImageSrc] = useState('');
    const [viewingImage, setViewingImage] = useState<AnnotatedImage | null>(null);

    const [isAddPhotosModalOpen, setIsAddPhotosModalOpen] = useState(false);
    const [newPhotos, setNewPhotos] = useState<AnnotatedImage[]>([]);
    const [newPhotoFolder, setNewPhotoFolder] = useState('');
    
    const [movingPhoto, setMovingPhoto] = useState<AnnotatedImage | null>(null);
    const [newFolderName, setNewFolderName] = useState('');

    // Quotation Management State
    const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
    const [editingQuotation, setEditingQuotation] = useState<Partial<Quotation> | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [invoicePdfFile, setInvoicePdfFile] = useState<File | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);
    const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
    const [viewingPdf, setViewingPdf] = useState<{name: string, dataUrl: string} | null>(null);

    const fetchData = useCallback(async () => {
        if (!projectId || !subProjectId) return;
        setIsLoading(true);
        try {
            const [data, allQuotations, allSuppliers] = await Promise.all([
                dbService.getProject(projectId),
                dbService.getAllQuotations(),
                dbService.getAllSuppliers()
            ]);

            if (data) {
                setProject(data);
                setQuotations(allQuotations.filter(q => q.subProjectId === subProjectId));
                setSuppliers(allSuppliers);
                const sp = data.subProjects?.find(s => s.id === subProjectId);
                if (sp) {
                    setSubProject(sp);
                } else {
                    addToast('פרויקט לא נמצא', 'error');
                    navigate(`/project/${projectId}/sub-projects`);
                }
            } else {
                addToast('בניין לא נמצא', 'error');
                navigate('/');
            }
        } catch (error) {
            addToast('שגיאה בטעינת פרטי הפרויקט', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, subProjectId, addToast, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const allSubProjectQuotations = useMemo(() => {
        return quotations.filter(q => q.subProjectId === subProjectId);
    }, [quotations, subProjectId]);
    
    const handleExportPdf = async () => {
        if (!project || !subProject) return;
        addToast('מכין PDF...', 'info');
        try {
            await generateSubProjectDetailPdf({
                settings,
                project,
                subProject,
                quotations: allSubProjectQuotations,
            });
        } catch (error) {
            addToast('שגיאה ביצירת PDF', 'error');
            console.error("PDF generation failed:", error);
        }
    };

    const spentAmount = useMemo(() => {
        if (!quotations || !subProjectId) return 0;
    
        const approvedStatuses: QuotationStatus[] = [
            QuotationStatus.APPROVED,
            QuotationStatus.WORK_COMPLETED,
            QuotationStatus.INVOICE_PAID,
        ];

        return quotations
            .filter(q => q.subProjectId === subProjectId && approvedStatuses.includes(q.status))
            .reduce((sum, q) => sum + (q.price || 0), 0);
    }, [quotations, subProjectId]);


    const updateSubProject = async (updatedSubProject: SubProject) => {
        if (!project) return;
        const updatedProject = {
            ...project,
            subProjects: (project.subProjects || []).map(sp => sp.id === updatedSubProject.id ? updatedSubProject : sp),
            updatedAt: new Date().toISOString(),
        };
        try {
            await dbService.updateProject(updatedProject);
            fetchData(); // Refresh state from DB
        } catch (error) {
            addToast('שגיאה בעדכון הפרויקט', 'error');
        }
    };
    
    // #region File and Todo Handlers
    const handleAddFiles = async (newFiles: ProjectFile[]) => {
        if (!subProject) return;
        const updatedSubProject = { ...subProject, files: [...(subProject.files || []), ...newFiles] };
        await updateSubProject(updatedSubProject);
        addToast(`${newFiles.length} ${newFiles.length > 1 ? 'קבצים נוספו' : 'קובץ נוסף'}`, 'success');
    };

    const handleDeleteFile = async (fileId: string) => {
        if (!subProject || !window.confirm('האם למחוק קובץ זה?')) return;
        const updatedSubProject = { ...subProject, files: subProject.files.filter(f => f.id !== fileId) };
        await updateSubProject(updatedSubProject);
        addToast('הקובץ נמחק', 'success');
    };
    
    const handleEditFile = (file: ProjectFile) => {
        setEditingFile(file);
    };

    const handleSaveFileEdit = async (updatedFile: ProjectFile) => {
        if (!subProject) return;
        const updatedSubProject = {
            ...subProject,
            files: subProject.files.map(f => f.id === updatedFile.id ? updatedFile : f),
        };
        await updateSubProject(updatedSubProject);
        addToast('פרטי הקובץ עודכנו', 'success');
        setEditingFile(null);
    };
    
    const handleAnnotateFile = (file: ProjectFile) => {
        setAnnotatingFile(file);
        const src = file.originalUrl || file.originalDataUrl || file.url || file.dataUrl;
        if (!src) {
            addToast('שגיאה בטעינת הקובץ לעריכה.', 'error');
            return;
        }
        setAnnotationImageSrc(src);
    };
    
    const handleSaveAnnotation = async (data: { annotatedDataUrl: string; annotationData: string; }) => {
        if (!annotatingFile || !subProject) return;
    
        const fileToUpdate = subProject.files.find(f => f.id === annotatingFile.id);
        if (!fileToUpdate) return;
        
        const updatedFile: ProjectFile = {
            ...fileToUpdate,
            dataUrl: data.annotatedDataUrl,
            annotationData: data.annotationData,
            originalDataUrl: fileToUpdate.originalDataUrl || fileToUpdate.dataUrl,
            originalUrl: fileToUpdate.originalUrl || fileToUpdate.url,
            originalStoragePath: fileToUpdate.originalStoragePath || fileToUpdate.storagePath,
            url: undefined,
            storagePath: undefined,
        };
        
        const updatedSubProject = {
            ...subProject,
            files: subProject.files.map(f => (f.id === updatedFile.id ? updatedFile : f)),
        };
    
        await updateSubProject(updatedSubProject);
        addToast('הערות תמונה נשמרו בהצלחה!', 'success');
        setAnnotatingFile(null);
        setAnnotationImageSrc('');
    };

    const handleAddTodo = async (newTodo: ProjectTodo) => {
        if (!subProject) return;
        const updatedSubProject = { ...subProject, rejects: [...(subProject.rejects || []), newTodo] };
        await updateSubProject(updatedSubProject);
        addToast('משימה נוספה', 'success');
    };

    const handleToggleTodo = async (todoId: string) => {
        if (!subProject) return;
        const updatedSubProject = {
            ...subProject,
            rejects: (subProject.rejects || []).map(t => t.id === todoId ? { ...t, isCompleted: !t.isCompleted } : t)
        };
        await updateSubProject(updatedSubProject);
    };

    const handleDeleteTodo = async (todoId: string) => {
        if (!subProject || !window.confirm('האם למחוק משימה זו?')) return;
        const updatedSubProject = { ...subProject, rejects: (subProject.rejects || []).filter(t => t.id !== todoId) };
        await updateSubProject(updatedSubProject);
        addToast('המשימה נמחקה', 'success');
    };
    // #endregion

    // #region Photo Handlers
    const handleDeletePhoto = async (photoId: string) => {
        if (!subProject || !window.confirm('האם אתה בטוח שברצונך למחוק תמונה זו?')) return;
        const updatedSubProject = {
            ...subProject,
            photos: subProject.photos.filter(p => p.id !== photoId),
        };
        await updateSubProject(updatedSubProject);
        addToast('התמונה נמחקה', 'success');
    };
    
    const handleSaveNewPhotos = async () => {
        if (!subProject || newPhotos.length === 0) {
            addToast('יש להוסיף לפחות תמונה אחת', 'warning');
            return;
        }
        const photosWithFolder = newPhotos.map(p => ({ ...p, folder: newPhotoFolder.trim() || undefined }));
        const updatedSubProject = {
            ...subProject,
            photos: [...(subProject.photos || []), ...photosWithFolder]
        };
    
        await updateSubProject(updatedSubProject);
        addToast(`${newPhotos.length} תמונות נוספו בהצלחה`, 'success');
        setIsAddPhotosModalOpen(false);
        setNewPhotos([]);
        setNewPhotoFolder('');
    };

    const handleMovePhotoClick = (photo: AnnotatedImage) => {
        setMovingPhoto(photo);
        setNewFolderName(photo.folder || '');
    };

    const handleConfirmMovePhoto = async () => {
        if (!movingPhoto || !subProject) return;
        
        const updatedPhotos = subProject.photos.map(p => 
            p.id === movingPhoto.id 
            ? { ...p, folder: newFolderName.trim() || undefined } 
            : p
        );
    
        const updatedSubProject = { ...subProject, photos: updatedPhotos };
    
        await updateSubProject(updatedSubProject);
        addToast('התמונה הועברה', 'success');
        setMovingPhoto(null);
        setNewFolderName('');
    };

    const photosByFolder = useMemo(() => {
        const photos = Array.isArray(subProject?.photos) ? subProject.photos : [];
        return photos.reduce((acc, photo) => {
            const folderName = photo.folder || 'ללא תיקייה';
            if (!acc[folderName]) acc[folderName] = [];
            acc[folderName].push(photo);
            return acc;
        }, {} as Record<string, AnnotatedImage[]>);
    }, [subProject?.photos]);

    const filesByFolder = useMemo(() => {
        const files = Array.isArray(subProject?.files) ? subProject.files : [];
        return files.reduce((acc, file) => {
            const folderName = file.group || 'כללי';
            if (!acc[folderName]) acc[folderName] = [];
            acc[folderName].push(file);
            return acc;
        }, {} as Record<string, ProjectFile[]>);
    }, [subProject?.files]);
    // #endregion

    // #region Quotation Handlers
    const openQuotationModal = (quotation: Partial<Quotation> | null = null) => {
        if (quotation) {
            setEditingQuotation({ ...quotation });
        } else {
            setEditingQuotation({
                date: new Date().toISOString().split('T')[0],
                status: QuotationStatus.PENDING,
                projectId: project?.id,
                projectName: project?.name,
                subProjectId: subProject?.id,
                subProjectName: subProject?.name
            });
        }
        setPdfFile(null);
        setInvoicePdfFile(null);
        setIsQuotationModalOpen(true);
    };

    const handleDeleteQuotation = async (quotationId: string) => {
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

    const handleQuotationFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'quotation' | 'invoice') => {
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

    const handleSaveQuotation = async () => {
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
                return new Promise<{ name: string, dataUrl: string, mimeType: string }>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (event) => resolve({ name: file.name, dataUrl: event.target?.result as string, mimeType: file.type });
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            };

            const [pdfFileData, invoicePdfFileData] = await Promise.all([processFile(pdfFile), processFile(invoicePdfFile)]);

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
            setIsQuotationModalOpen(false);
            setEditingQuotation(null);
            fetchData();
        } catch (error) {
            addToast('שגיאה בשמירת הצעת המחיר', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const supplierGroups = [...new Set(suppliers.map(s => s.group))];
    // #endregion

    if (isLoading || !project || !subProject) return <LoadingSpinner text="טוען פרטי פרויקט..." />;
    
    const statusStyles = getStatusStyles(subProject.status);
    const rejects = subProject.rejects || [];
    const budget = subProject.budget || 0;
    const remaining = budget - spentAmount;
    const spentPercentage = budget > 0 ? (spentAmount / budget) * 100 : 0;
    const coverPhotoUrl = subProject.coverPhoto?.url || subProject.coverPhoto?.dataUrl;


    return (
        <div className="space-y-6">
            <nav className="text-sm">
                <Link to={`/project/${projectId}`} className="text-sky-600 hover:underline">{project.name}</Link>
                <span className="text-slate-500 mx-2">/</span>
                <Link to={`/project/${projectId}/sub-projects`} className="text-sky-600 hover:underline">פרויקטים</Link>
            </nav>

            {/* Main Details Card */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-200/90">
                <div className="flex flex-col md:flex-row gap-6">
                    {coverPhotoUrl ? (
                        <img src={coverPhotoUrl} alt={subProject.name} className="w-full md:w-1/3 h-56 sm:h-64 object-cover rounded-2xl shadow-xs border border-slate-100"/>
                    ) : (
                         <div className="w-full md:w-1/3 h-56 sm:h-64 bg-gradient-to-tr from-sky-900 to-slate-800 rounded-2xl flex items-center justify-center text-white font-black text-4xl shadow-xs">
                             {getInitials(subProject.name)}
                         </div>
                    )}
                    <div className="flex-grow space-y-4">
                        <div className="flex justify-between items-start">
                             <div>
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">{subProject.name}</h1>
                                <p className="text-xs text-slate-500 mt-1">{subProject.description || 'ללא תיאור'}</p>
                             </div>
                             <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-3 py-1 rounded-xl whitespace-nowrap ${statusStyles.bg} ${statusStyles.text}`}>
                                    {subProject.status}
                                </span>
                                <button onClick={handleExportPdf} className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3">
                                    <ArrowDownTrayIcon className="w-4 h-4"/> יצא PDF
                                </button>
                             </div>
                        </div>
                        <div className="text-xs text-slate-600 grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                             <span><strong className="text-slate-700">תחילת עבודה:</strong> {subProject.workStartDate ? formatDate(subProject.workStartDate) : 'לא צוין'}</span>
                            <span><strong className="text-slate-700">סיום עבודה:</strong> {subProject.workEndDate ? formatDate(subProject.workEndDate) : 'לא צוין'}</span>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                            <div>
                                <h4 className="text-xs font-bold mb-2 text-slate-700">קבלנים</h4>
                                <ul className="space-y-1.5 text-xs">
                                    {(subProject.contractors || []).map(c => <li key={c.id} className="p-2 bg-slate-50 rounded-xl border border-slate-100 font-medium">{c.name} - {c.phone}</li>)}
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold mb-2 text-slate-700">מפקח</h4>
                                {subProject.checker && <div className="text-xs p-2 bg-slate-50 rounded-xl border border-slate-100 font-medium">{subProject.checker.name} - {subProject.checker.phone}</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <CollapsibleSection title="תקציב" defaultOpen={true}>
                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                    <StatCard title="תקציב" value={`₪${budget.toLocaleString()}`} colorClass="text-slate-800" />
                    <StatCard title="הוצאות (מאושר)" value={`₪${spentAmount.toLocaleString()}`} colorClass="text-blue-600" />
                    <StatCard title="יתרה" value={`₪${remaining.toLocaleString()}`} colorClass={remaining < 0 ? 'text-red-600' : 'text-green-600'} />
                </div>
                {budget > 0 && (
                     <div className="w-full bg-slate-200 rounded-full h-4 relative mb-4">
                        <div
                            className={`h-4 rounded-full transition-all duration-500 ${spentPercentage > 100 ? 'bg-red-500' : 'bg-blue-600'}`}
                            style={{ width: `${Math.min(spentPercentage, 100)}%` }}
                            title={`הוצאות: ${spentPercentage.toFixed(1)}%`}
                        ></div>
                        {spentPercentage > 100 && (
                            <div className="absolute -top-5 right-0 text-xs font-bold text-red-600">
                                חריגה של ₪{(spentAmount - budget).toLocaleString()}
                            </div>
                        )}
                    </div>
                )}
            </CollapsibleSection>

            <CollapsibleSection title="הצעות מחיר" count={allSubProjectQuotations.length} actionText="הוסף הצעה" onActionClick={() => openQuotationModal()}>
                 <div className="space-y-3">
                    {allSubProjectQuotations.length > 0 ? (
                        allSubProjectQuotations.map(q => (
                            <div key={q.id} className="bg-white p-3 rounded-lg shadow-sm border flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex-grow">
                                    <p className="font-bold text-slate-800">{q.quotationName}</p>
                                    <p className="text-sm text-slate-500">{q.supplierName} • {q.subProjectName ? `${q.subProjectName} • ` : ''} {formatDate(q.date)}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <p className="text-lg font-bold text-sky-700">₪{q.price.toLocaleString()}</p>
                                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${QUOTATION_STATUS_COLORS[q.status].bg} ${QUOTATION_STATUS_COLORS[q.status].text}`}>{q.status}</span>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-1">
                                    <button onClick={() => { setViewingQuotation(q); setIsDetailsModalOpen(true); }} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full" title="הצג פרטים"><EyeIcon className="w-5 h-5"/></button>
                                    <button onClick={() => openQuotationModal(q)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full" title="ערוך"><PencilIcon className="w-5 h-5"/></button>
                                    <button onClick={() => handleDeleteQuotation(q.id)} className="p-2 text-slate-500 hover:bg-red-100 rounded-full" title="מחק"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-slate-500 py-4">לא נוספו הצעות מחיר לפרויקט זה.</p>
                    )}
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="רשימת ליקויים" count={subProject.rejects?.length || 0} actionText="הוסף משימה" onActionClick={() => setIsAddTodoModalOpen(true)}>
                <div className="space-y-2">
                    {subProject.rejects?.map(todo => <TodoItem key={todo.id} todo={todo} onToggle={() => handleToggleTodo(todo.id)} onDelete={() => handleDeleteTodo(todo.id)} />)}
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="תמונות" count={subProject.photos.length} actionText="הוסף תמונות" onActionClick={() => setIsAddPhotosModalOpen(true)}>
                {Object.keys(photosByFolder).map(folder => (
                    <CollapsibleSection key={folder} title={<h4 className="text-md font-semibold">{folder}</h4>} count={photosByFolder[folder].length}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {photosByFolder[folder].map(photo => (
                                <div key={photo.id} className="relative group rounded-md overflow-hidden shadow-sm border">
                                    <img src={photo.url || photo.dataUrl} alt={photo.name} className="w-full h-32 object-cover cursor-pointer" onClick={() => setViewingImage(photo)} />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button onClick={() => setViewingImage(photo)} className="p-2 bg-white/20 text-white rounded-full hover:bg-white/40" title="הצג בגדול"><EyeIcon className="w-5 h-5" /></button>
                                        <a href={photo.url || photo.dataUrl} download={photo.name} className="p-2 bg-white/20 text-white rounded-full hover:bg-white/40" title="הורד"><ArrowDownTrayIcon className="w-5 h-5" /></a>
                                        <button onClick={() => handleMovePhotoClick(photo)} className="p-2 bg-white/20 text-white rounded-full hover:bg-white/40" title="העבר תיקייה"><ArrowsUpDownIcon className="w-5 h-5" /></button>
                                        <button onClick={() => handleDeletePhoto(photo.id)} className="p-2 bg-red-500/50 text-white rounded-full hover:bg-red-500/80" title="מחק"><TrashIcon className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CollapsibleSection>
                ))}
            </CollapsibleSection>
            
            <CollapsibleSection title="קבצים" count={subProject.files.length} actionText="הוסף קובץ" onActionClick={() => setIsAddFileModalOpen(true)}>
                {Object.keys(filesByFolder).map(folder => (
                    <CollapsibleSection key={folder} title={<h4 className="text-md font-semibold">{folder}</h4>} count={filesByFolder[folder].length}>
                         <div className="space-y-2">
                            {filesByFolder[folder].map(file => (
                                <FileItem key={file.id} file={file} onDelete={() => handleDeleteFile(file.id)} onView={isMimeTypeViewable(file.mimeType) ? () => setViewingFile(file) : undefined} onEdit={() => handleEditFile(file)} onAnnotate={file.mimeType.startsWith('image/') ? () => handleAnnotateFile(file) : undefined} />
                            ))}
                        </div>
                    </CollapsibleSection>
                ))}
            </CollapsibleSection>

            {/* Modals for Files, Todos, Photos, etc. */}
            <AddFileModal isOpen={isAddFileModalOpen} onClose={() => setIsAddFileModalOpen(false)} onSave={handleAddFiles} hideDateFields={true} />
            <AddTodoModal isOpen={isAddTodoModalOpen} onClose={() => setIsAddTodoModalOpen(false)} onSave={handleAddTodo} projects={[project]} />
            <Modal isOpen={!!viewingFile} onClose={() => setViewingFile(null)} title={`תצוגה מקדימה: ${viewingFile?.name}`} size="xl">
                {viewingFile && (viewingFile.url || viewingFile.dataUrl) && <iframe src={viewingFile.url || viewingFile.dataUrl} className="w-full h-[75vh] border-0"/>}
            </Modal>
            <Modal isOpen={isAddPhotosModalOpen} onClose={() => setIsAddPhotosModalOpen(false)} title="הוספת תמונות לפרויקט">
                <div className="space-y-4">
                    <input type="text" value={newPhotoFolder} onChange={e => setNewPhotoFolder(e.target.value)} placeholder="שם תיקיית תמונות (אופציונלי)" className="input-class w-full" />
                    <ImageUploader images={newPhotos} onImagesChange={setNewPhotos} maxImages={20} />
                    <div className="flex justify-end gap-2 pt-4"><button onClick={() => setIsAddPhotosModalOpen(false)} className="btn-secondary">ביטול</button><button onClick={handleSaveNewPhotos} className="btn-primary">שמור</button></div>
                </div>
            </Modal>
            <Modal isOpen={!!viewingImage} onClose={() => setViewingImage(null)} title={viewingImage?.name || 'תצוגת תמונה'} size="xl">
                {viewingImage && <img src={viewingImage.url || viewingImage.dataUrl} alt={viewingImage.name || ''} className="max-w-full max-h-[80vh] object-contain mx-auto" />}
            </Modal>
            <EditFileModal isOpen={!!editingFile} onClose={() => setEditingFile(null)} onSave={handleSaveFileEdit} file={editingFile} hideDateFields={true} />
            {annotatingFile && <AnnotationEditor isOpen={!!annotatingFile} onClose={() => { setAnnotatingFile(null); setAnnotationImageSrc(''); }} onSave={handleSaveAnnotation} imageSrc={annotationImageSrc} initialAnnotationData={annotatingFile?.annotationData || '[]'} />}
            <Modal isOpen={!!movingPhoto} onClose={() => setMovingPhoto(null)} title="העברת תמונה לתיקייה">
                <div className="space-y-4">
                    <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="שם תיקייה חדשה או קיימת" className="input-class w-full" list="folder-suggestions" />
                    <datalist id="folder-suggestions">{Object.keys(photosByFolder).map(folder => <option key={folder} value={folder} />)}</datalist>
                    <div className="flex justify-end gap-2 pt-4"><button onClick={() => setMovingPhoto(null)} className="btn-secondary">ביטול</button><button onClick={handleConfirmMovePhoto} className="btn-primary">העבר</button></div>
                </div>
            </Modal>
            
            {/* Quotation Modals */}
             <Modal isOpen={isQuotationModalOpen} onClose={() => setIsQuotationModalOpen(false)} title={editingQuotation?.id ? "עריכת הצעת מחיר" : "הוספת הצעת מחיר"} size="lg">
                <div className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="label-class">בניין*</label><input value={project.name} className="input-class w-full bg-slate-100" disabled /></div><div><label className="label-class">פרויקט משנה</label><input value={subProject.name} className="input-class w-full bg-slate-100" disabled /></div><div><label className="label-class">תאריך*</label><input type="date" value={editingQuotation?.date?.split('T')[0] || ''} onChange={e => setEditingQuotation(p => ({ ...p, date: e.target.value }))} className="input-class w-full" /></div><div><label className="label-class">שם הספק*</label><input type="text" list="suppliers-list" value={editingQuotation?.supplierName || ''} onChange={e => setEditingQuotation(p => ({ ...p, supplierName: e.target.value }))} className="input-class w-full" /><datalist id="suppliers-list">{[...new Set(suppliers.map(s => s.name))].map(name => <option key={name} value={name} />)}</datalist></div></div><input type="text" placeholder="שם/תיאור הצעת המחיר*" value={editingQuotation?.quotationName || ''} onChange={e => setEditingQuotation(p => ({ ...p, quotationName: e.target.value }))} className="input-class w-full" /><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><input type="text" placeholder="מספר הצעה" value={editingQuotation?.quotationNumber || ''} onChange={e => setEditingQuotation(p => ({ ...p, quotationNumber: e.target.value }))} className="input-class" /><div><label className="label-class">תחום*</label><input type="text" list="groups-list" value={editingQuotation?.group || ''} onChange={e => setEditingQuotation(p => ({ ...p, group: e.target.value }))} className="input-class w-full" /><datalist id="groups-list">{supplierGroups.map(g => <option key={g} value={g} />)}</datalist></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="label-class">מחיר (₪)*</label><input type="number" step="0.01" value={editingQuotation?.price ?? ''} onChange={e => setEditingQuotation(p => ({ ...p, price: parseFloat(e.target.value) }))} className="input-class" /></div><div><label className="label-class">סטטוס</label><select value={editingQuotation?.status || ''} onChange={e => setEditingQuotation(p => ({ ...p, status: e.target.value as QuotationStatus }))} className="input-class w-full">{QUOTATION_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div></div><div><label className="label-class">קובץ הצעת מחיר (PDF)*</label><input type="file" accept="application/pdf" onChange={(e) => handleQuotationFileSelect(e, 'quotation')} className="file-input-class"/>{editingQuotation?.pdfFile && !pdfFile && <p className="text-xs mt-1">קובץ נוכחי: {editingQuotation.pdfFile.name}</p>}</div><div className="pt-4 border-t"><h3 className="text-md font-medium text-slate-800 mb-2">פרטי חשבונית (אופציונלי)</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><input type="text" placeholder="מספר חשבונית" value={editingQuotation?.invoiceNumber || ''} onChange={e => setEditingQuotation(p => ({ ...p, invoiceNumber: e.target.value }))} className="input-class" /><div><label className="label-class">קובץ חשבונית (PDF)</label><input type="file" accept="application/pdf" onChange={(e) => handleQuotationFileSelect(e, 'invoice')} className="file-input-class"/>{editingQuotation?.invoicePdfFile && !invoicePdfFile && <p className="text-xs mt-1">קובץ נוכחי: {editingQuotation.invoicePdfFile.name}</p>}</div></div></div><div className="flex justify-end gap-2 pt-4"><button onClick={() => setIsQuotationModalOpen(false)} className="btn-secondary">ביטול</button><button onClick={handleSaveQuotation} className="btn-primary">שמור</button></div></div>
            </Modal>
            <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} title="פרטי הצעת מחיר">{viewingQuotation && (<div className="space-y-3"><p><strong>בניין:</strong> {viewingQuotation.projectName}</p>{viewingQuotation.subProjectName && <p><strong>פרויקט משנה:</strong> {viewingQuotation.subProjectName}</p>}<p><strong>שם הצעה:</strong> {viewingQuotation.quotationName}</p><p><strong>ספק:</strong> {viewingQuotation.supplierName}</p><p><strong>תאריך:</strong> {formatDate(viewingQuotation.date)}</p><p><strong>מחיר:</strong> ₪{viewingQuotation.price.toLocaleString()}</p><p><strong>מספר הצעה:</strong> {viewingQuotation.quotationNumber}</p><p><strong>תחום:</strong> {viewingQuotation.group}</p><p><strong>סטטוס:</strong> <span className={`px-2 py-1 text-xs rounded-full ${QUOTATION_STATUS_COLORS[viewingQuotation.status].bg} ${QUOTATION_STATUS_COLORS[viewingQuotation.status].text}`}>{viewingQuotation.status}</span></p><div className="pt-2 border-t"><button onClick={() => { const src = viewingQuotation.pdfFile.url || viewingQuotation.pdfFile.dataUrl; if(src) {setViewingPdf({name: viewingQuotation.pdfFile.name, dataUrl: src}); setIsPdfViewerOpen(true);}}} className="text-sky-600 hover:underline flex items-center gap-1"><DocumentTextIcon className="w-4 h-4"/>הצג קובץ הצעת מחיר</button></div>{viewingQuotation.invoicePdfFile && (<div><p><strong>מספר חשבונית:</strong> {viewingQuotation.invoiceNumber || '-'}</p><button onClick={() => { const src = viewingQuotation.invoicePdfFile?.url || viewingQuotation.invoicePdfFile?.dataUrl; if(src) {setViewingPdf({name: viewingQuotation.invoicePdfFile!.name, dataUrl: src}); setIsPdfViewerOpen(true);}}} className="text-sky-600 hover:underline flex items-center gap-1"><DocumentTextIcon className="w-4 h-4"/>הצג קובץ חשבונית</button></div>)}</div>)}</Modal>
            <Modal isOpen={isPdfViewerOpen} onClose={() => setIsPdfViewerOpen(false)} title={viewingPdf?.name || ''} size="xl">{viewingPdf?.dataUrl && <iframe src={viewingPdf.dataUrl} className="w-full h-[75vh]" title={viewingPdf.name} />}</Modal>
        </div>
    );
};

export default SubProjectDetailPage;
