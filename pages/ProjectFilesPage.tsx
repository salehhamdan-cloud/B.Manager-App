
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as dbService from '../services/dbService';
import { Project, ProjectFile, HistoricalFile } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import FileItem from '../components/FileItem';
import { useToast } from '../contexts/ToastContext';
import { PlusIcon, ArrowDownTrayIcon, PencilIcon, TrashIcon } from '../components/icons/ActionIcons';
import Modal from '../components/common/Modal';
import { isMimeTypeViewable } from '../utils/fileUtils';
import AddFileModal from '../components/common/AddFileModal';
import EditFileModal from '../components/common/EditFileModal';
import { AnnotationEditor } from '../components/common/AnnotationEditor';
import { exportToCsv } from '../utils/exportUtils';
import { generateProjectFilesPdf } from '../services/pdfService';
import { useSettings } from '../contexts/SettingsContext';
import { formatDate } from '../utils/dateFormatter';
import CollapsibleSection from '../components/common/CollapsibleSection';
import RenewFileModal from '../components/common/RenewFileModal';
import { generateId } from '../utils/idGenerator';

const FileViewerModal: React.FC<{ file: ProjectFile | null; onClose: () => void }> = ({ file, onClose }) => {
    if (!file) return null;
    const fileSrc = file.url || file.dataUrl;
    return (
        <Modal isOpen={!!file} onClose={onClose} title={`תצוגה מקדימה: ${file.name}`} size="xl">
            <div className="w-full h-[75vh] bg-slate-200 rounded-md">
                {fileSrc && file.mimeType.startsWith('image/') ? ( <img src={fileSrc} alt={file.name} className="w-full h-full object-contain" /> ) : 
                 fileSrc && file.mimeType === 'application/pdf' ? ( <iframe src={fileSrc} title={file.name} className="w-full h-full border-0" /> ) : 
                 ( <div className="flex items-center justify-center h-full text-slate-600"><p>לא ניתן להציג תצוגה מקדימה עבור קובץ מסוג זה.</p></div> )}
            </div>
        </Modal>
    );
};

const ProjectFilesPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();
    const { settings } = useSettings();

    const [viewingFile, setViewingFile] = useState<ProjectFile | null>(null);
    const [isAddFileModalOpen, setIsAddFileModalOpen] = useState(false);
    const [editingFile, setEditingFile] = useState<ProjectFile | null>(null);
    const [groupFilter, setGroupFilter] = useState('all');
    const [yearFilter, setYearFilter] = useState('all');
    const [validityFilter, setValidityFilter] = useState('all');
    const [annotatingFile, setAnnotatingFile] = useState<ProjectFile | null>(null);
    const [annotationImageSrc, setAnnotationImageSrc] = useState('');
    const [renewingFile, setRenewingFile] = useState<ProjectFile | null>(null);

    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [selectedPdfFiles, setSelectedPdfFiles] = useState<string[]>([]);
    const [pdfModalSelectedGroups, setPdfModalSelectedGroups] = useState<string[]>([]);
    const [pdfModalSelectedYears, setPdfModalSelectedYears] = useState<string[]>([]);
    
    // Multi-select state
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>({});
    const selectedCount = Object.keys(selectedFiles).length;

    const fetchData = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        try {
            const projData = await dbService.getProject(projectId);
            setProject(projData);
        } catch (error) {
            addToast('Error fetching project files', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, addToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (!isEditMode) {
            setSelectedFiles({});
        }
    }, [isEditMode]);

    const handleDeleteFile = async (fileId: string) => {
        if (window.confirm('האם אתה בטוח שברצונך למחוק קובץ זה?')) {
            try {
                await dbService.deleteProjectFile(projectId!, fileId);
                addToast('הקובץ נמחק בהצלחה', 'success');
                fetchData();
            } catch (error) {
                addToast('שגיאה במחיקת הקובץ', 'error');
            }
        }
    };
    
    const handleDeleteSelected = async () => {
        if (!project || selectedCount === 0) return;
        if (window.confirm(`האם אתה בטוח שברצונך למחוק ${selectedCount} קבצים?`)) {
            const idsToDelete = Object.keys(selectedFiles);
            const updatedProject = {
                ...project,
                files: project.files.filter(f => !idsToDelete.includes(f.id)),
                updatedAt: new Date().toISOString()
            };

            try {
                await dbService.updateProject(updatedProject);
                addToast(`${selectedCount} קבצים נמחקו`, 'success');
                fetchData();
                setIsEditMode(false);
            } catch (error) {
                addToast('שגיאה במחיקת קבצים', 'error');
            }
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
            fetchData();
        } catch (error) {
            addToast('שגיאה בהוספת קבצים', 'error');
        }
    };
    
    const handleSaveFileEdit = async (updatedFile: ProjectFile) => {
        if (!project) return;
        const projectToUpdate: Project = {
            ...project,
            files: project.files.map(f => f.id === updatedFile.id ? updatedFile : f),
            updatedAt: new Date().toISOString(),
        };
        try {
            await dbService.updateProject(projectToUpdate);
            addToast('הקובץ עודכן בהצלחה', 'success');
            fetchData();
        } catch (error) {
            addToast('שגיאה בעדכון הקובץ', 'error');
        }
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
        if (!annotatingFile || !project) return;
    
        const fileToUpdate = project.files.find(f => f.id === annotatingFile.id);
        if (!fileToUpdate) {
            addToast('File not found', 'error');
            setAnnotatingFile(null);
            return;
        }
        
        const updatedFile: ProjectFile = {
            ...fileToUpdate,
            dataUrl: data.annotatedDataUrl,
            annotationData: data.annotationData,
            originalDataUrl: fileToUpdate.originalDataUrl || fileToUpdate.dataUrl,
            originalUrl: fileToUpdate.originalUrl || fileToUpdate.url,
            originalStoragePath: fileToUpdate.originalStoragePath || fileToUpdate.storagePath,
            url: undefined, // Clear URL to trigger re-upload
            storagePath: undefined,
        };
        
        const updatedProject = {
            ...project,
            files: project.files.map(f => (f.id === updatedFile.id ? updatedFile : f)),
            updatedAt: new Date().toISOString(),
        };
        
        try {
            await dbService.updateProject(updatedProject);
            addToast('הערות תמונה נשמרו בהצלחה!', 'success');
            fetchData();
        } catch(e) {
            addToast('שגיאה בשמירת הערות.', 'error');
        } finally {
            setAnnotatingFile(null);
            setAnnotationImageSrc('');
        }
    };

    const handleRenewFile = (file: ProjectFile) => {
        setRenewingFile(file);
    };

    const handleSaveRenewal = async (originalFile: ProjectFile, newFile: File, newDueDate?: string) => {
        if (!project) return;
        setIsLoading(true);
        try {
            const newFileId = generateId();
            const { url: newUrl, storagePath: newStoragePath } = await dbService.uploadRawFile(newFile, `projects/${project.id}/files`, newFileId);
            
            const historicalRecord: HistoricalFile = {
                id: generateId(),
                name: originalFile.name,
                mimeType: originalFile.mimeType,
                uploadedAt: originalFile.uploadedAt || originalFile.createdAt,
                dueDate: originalFile.dueDate,
                url: originalFile.url,
                storagePath: originalFile.storagePath,
            };

            const updatedFile: ProjectFile = {
                ...originalFile,
                name: originalFile.name, // Keep original name
                mimeType: newFile.type,
                uploadedAt: new Date().toISOString(),
                dueDate: newDueDate,
                url: newUrl,
                storagePath: newStoragePath,
                history: [historicalRecord, ...(originalFile.history || [])],
                dataUrl: undefined,
                originalDataUrl: undefined,
            };

            const updatedProject: Project = {
                ...project,
                files: project.files.map(f => f.id === originalFile.id ? updatedFile : f),
                updatedAt: new Date().toISOString(),
            };

            await dbService.updateProject(updatedProject);
            
            addToast('הקובץ חודש בהצלחה', 'success');
            fetchData();
            setRenewingFile(null);

        } catch (error) {
            addToast('שגיאה בחידוש הקובץ', 'error');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDeleteHistoryFile = async (fileId: string, historyId: string) => {
        if (!project || !window.confirm('האם אתה בטוח שברצונך למחוק גרסה היסטורית זו? לא ניתן לבטל פעולה זו.')) return;
    
        const fileToUpdate = project.files.find(f => f.id === fileId);
        if (!fileToUpdate || !fileToUpdate.history) return;
    
        const historyItemToDelete = fileToUpdate.history.find(h => h.id === historyId);
        if (!historyItemToDelete) return;
    
        setIsLoading(true);
        try {
            // FIX: This function does not exist in the new dbService and was for cloud storage.
            // Removing this line as the local data is handled by updating the project object.
    
            const updatedHistory = fileToUpdate.history.filter(h => h.id !== historyId);
            const updatedFile = { ...fileToUpdate, history: updatedHistory };
    
            const updatedProject: Project = {
                ...project,
                files: project.files.map(f => f.id === fileId ? updatedFile : f),
                updatedAt: new Date().toISOString(),
            };
    
            await dbService.updateProject(updatedProject);
            addToast('גרסה היסטורית נמחקה', 'success');
            fetchData();
        } catch (error) {
            addToast('שגיאה במחיקת הגרסה', 'error');
            console.error('Error deleting history file:', error);
        } finally {
            setIsLoading(false);
        }
    };


    const { uniqueGroups, uniqueYears } = useMemo(() => {
        if (!project?.files) return { uniqueGroups: [], uniqueYears: [] };
        const groups = new Set(project.files.map(f => f.group).filter(Boolean) as string[]);
        const years = new Set(project.files.map(f => new Date(f.startDate || f.uploadedAt || f.createdAt).getFullYear().toString()));
        return {
            uniqueGroups: Array.from(groups).sort((a: string, b: string) => a.localeCompare(b,'he')),
            uniqueYears: Array.from(years).sort((a: string, b: string) => b.localeCompare(a))
        };
    }, [project?.files]);
    
    const uniqueGroupsForModal = useMemo(() => {
        if (!project?.files) return [];
        const groups = new Set<string>();
        project.files.forEach(f => {
            groups.add(f.group || '__none__');
        });
        const groupArray = Array.from(groups);
        return groupArray.sort((a, b) => {
            if (a === '__none__') return 1;
            if (b === '__none__') return -1;
            return a.localeCompare(b, 'he');
        });
    }, [project?.files]);
    
    const filteredFiles = useMemo(() => {
        if (!project?.files) return [];
        return project.files.filter(file => {
            const fileYear = new Date(file.startDate || file.uploadedAt || file.createdAt).getFullYear().toString();
            const yearMatch = yearFilter === 'all' || fileYear === yearFilter;
            const groupMatch = (groupFilter === 'all' || groupFilter === '')
                ? true
                : (groupFilter === '__none__' ? !file.group : file.group === groupFilter);
            
            const validityMatch = () => {
                if (validityFilter === 'all' || !file.dueDate) return true;
                const today = new Date();
                const dueDate = new Date(file.dueDate);
                const diffDays = (dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
                
                switch(validityFilter) {
                    case 'expired': return diffDays < 0;
                    case 'week': return diffDays >= 0 && diffDays <= 7;
                    case 'month': return diffDays > 7 && diffDays <= 30;
                    case 'year': return diffDays > 30 && diffDays <= 365;
                    default: return true;
                }
            };

            return yearMatch && groupMatch && validityMatch();
        });
    }, [project?.files, groupFilter, yearFilter, validityFilter]);

    const groupedFiles = useMemo(() => {
        if (!filteredFiles) return {};
        return filteredFiles.reduce((acc, file) => {
            const groupName = file.group || 'ללא קבוצה';
            if (!acc[groupName]) {
                acc[groupName] = [];
            }
            acc[groupName].push(file);
            return acc;
        }, {} as Record<string, ProjectFile[]>);
    }, [filteredFiles]);
    
    const sortedGroupKeys = useMemo(() => {
        return Object.keys(groupedFiles).sort((a, b) => {
            if (a === 'ללא קבוצה') return 1;
            if (b === 'ללא קבוצה') return -1;
            return a.localeCompare(b, 'he');
        });
    }, [groupedFiles]);
    
    const filesForPdfModal = useMemo(() => {
        return filteredFiles.filter(file => {
            const fileYear = new Date(file.startDate || file.uploadedAt || file.createdAt).getFullYear().toString();
            const yearMatch = pdfModalSelectedYears.length === 0 || pdfModalSelectedYears.includes(fileYear);
            const groupName = file.group || '__none__';
            const groupMatch = pdfModalSelectedGroups.length === 0 || pdfModalSelectedGroups.includes(groupName);
            return yearMatch && groupMatch;
        });
    }, [filteredFiles, pdfModalSelectedGroups, pdfModalSelectedYears]);

    useEffect(() => {
        if(isPdfModalOpen) {
            setSelectedPdfFiles(filesForPdfModal.map(f => f.id));
        }
    }, [filesForPdfModal, isPdfModalOpen]);

    const handleOpenPdfModal = () => {
        if (filteredFiles.length === 0) {
            addToast('אין קבצים לייצוא', 'warning');
            return;
        }
        setPdfModalSelectedGroups(uniqueGroupsForModal);
        setPdfModalSelectedYears(uniqueYears);
        setIsPdfModalOpen(true);
    };

    const handleGeneratePdf = () => {
        if (!project || selectedPdfFiles.length === 0) {
            addToast('יש לבחור לפחות קובץ אחד לייצוא', 'warning');
            return;
        }
        const filesToExport = project.files.filter(file => selectedPdfFiles.includes(file.id));
        addToast('מכין PDF...', 'info');
        generateProjectFilesPdf({ settings, project, files: filesToExport });
        setIsPdfModalOpen(false);
    };

    const handleExportCsv = () => {
        if (!project || !project.files || project.files.length === 0) {
            addToast('אין קבצים לייצוא', 'warning');
            return;
        }
        const dataToExport = (project.files || []).map(f => ({
            'שם הקובץ': f.name,
            'קבוצה': f.group || '-',
            'תאריך התחלה': f.startDate ? formatDate(f.startDate) : '-',
            'תאריך תפוגה': f.dueDate ? formatDate(f.dueDate) : '-',
            'חוזר': f.recurrenceType === 'recurring' ? 'כן' : 'לא',
        }));
        exportToCsv(dataToExport, `files_${project.name}`);
    };
    
    const handleSelectFile = (fileId: string) => {
        setSelectedFiles(prev => {
            const newSelection = { ...prev };
            if (newSelection[fileId]) {
                delete newSelection[fileId];
            } else {
                newSelection[fileId] = true;
            }
            return newSelection;
        });
    };

    const handleSelectGroup = (filesInGroup: ProjectFile[], isChecked: boolean) => {
        const groupFileIds = filesInGroup.map(f => f.id);
        setSelectedFiles(prev => {
            const newSelection = { ...prev };
            if (isChecked) {
                groupFileIds.forEach(id => newSelection[id] = true);
            } else {
                groupFileIds.forEach(id => delete newSelection[id]);
            }
            return newSelection;
        });
    };

    const handleSelectAllVisible = () => {
        const visibleIds = filesForPdfModal.map(f => f.id);
        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedPdfFiles.includes(id));

        if (allVisibleSelected) {
            setSelectedPdfFiles(prev => prev.filter(id => !visibleIds.includes(id)));
        } else {
            setSelectedPdfFiles(prev => [...new Set([...prev, ...visibleIds])]);
        }
    };

    const handlePdfGroupSelectionChange = (group: string) => {
        setPdfModalSelectedGroups(prev => 
            prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
        );
    };

    const handlePdfYearSelectionChange = (year: string) => {
        setPdfModalSelectedYears(prev =>
            prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
        );
    };

    const toggleAllGroups = () => {
        if (pdfModalSelectedGroups.length === uniqueGroupsForModal.length) {
            setPdfModalSelectedGroups([]);
        } else {
            setPdfModalSelectedGroups(uniqueGroupsForModal);
        }
    };

    const toggleAllYears = () => {
        if (pdfModalSelectedYears.length === uniqueYears.length) {
            setPdfModalSelectedYears([]);
        } else {
            setPdfModalSelectedYears(uniqueYears);
        }
    };


    if (isLoading) return <LoadingSpinner text="טוען קבצים..." />;

    return (
        <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
            {/* Header & Controls */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                    <nav className="text-xs font-medium text-slate-400 mb-1">
                        <Link to={`/project/${projectId}`} className="text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1">
                            <span>←</span> חזרה לבניין {project?.name}
                        </Link>
                    </nav>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">קבצים עבור: {project?.name}</h2>
                    <p className="text-sm text-slate-500 mt-1">ניהול מסמכים, תוכניות, אישורים ורישיונות</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setIsEditMode(!isEditMode)} className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 border shadow-2xs ${isEditMode ? 'bg-sky-50 text-sky-700 border-sky-300 ring-2 ring-sky-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80'}`}>
                        <PencilIcon className="w-4 h-4"/> {isEditMode ? 'סיום עריכה' : 'בחירה מרובה'}
                    </button>
                    <button onClick={handleOpenPdfModal} className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-2 border border-slate-200/80 shadow-2xs">
                        <ArrowDownTrayIcon className="w-4 h-4"/>יצא PDF
                    </button>
                    <button onClick={handleExportCsv} className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-2 border border-slate-200/80 shadow-2xs">
                        <ArrowDownTrayIcon className="w-4 h-4"/>יצא Excel
                    </button>
                    <button onClick={() => setIsAddFileModalOpen(true)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition flex items-center gap-1.5">
                        <PlusIcon className="w-4 h-4" /> <span>הוסף קובץ</span>
                     </button>
                 </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[160px]">
                    <label htmlFor="groupFilter" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">סנן לפי קבוצה:</label>
                    <select id="groupFilter" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition">
                        <option value="all">כל הקבוצות</option>
                        <option value="__none__">ללא קבוצה</option>
                        {uniqueGroups.map(group => <option key={group} value={group}>{group}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[160px]">
                    <label htmlFor="yearFilter" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">סנן לפי שנה:</label>
                    <select id="yearFilter" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition">
                        <option value="all">כל השנים</option>
                        {uniqueYears.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[160px]">
                    <label htmlFor="validityFilter" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">סנן לפי תוקף:</label>
                    <select id="validityFilter" value={validityFilter} onChange={(e) => setValidityFilter(e.target.value)} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition">
                        <option value="all">הכל</option>
                        <option value="expired">פג תוקף</option>
                        <option value="week">יפוג השבוע</option>
                        <option value="month">יפוג החודש</option>
                        <option value="year">יפוג השנה</option>
                    </select>
                </div>
            </div>

            {Object.keys(groupedFiles).length > 0 ? (
                <div className="space-y-6">
                    {sortedGroupKeys.map(groupName => {
                        const filesInGroup = groupedFiles[groupName];
                        const allInGroupSelected = filesInGroup.length > 0 && filesInGroup.every(f => selectedFiles[f.id]);
                        return (
                            <CollapsibleSection
                                key={groupName}
                                title={
                                    <div className="flex items-center gap-3">
                                        {isEditMode && (
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                                                checked={allInGroupSelected}
                                                onChange={(e) => handleSelectGroup(filesInGroup, e.target.checked)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                        )}
                                        <h3 className="text-base font-bold text-slate-800">{groupName}</h3>
                                    </div>
                                }
                                count={filesInGroup.length}
                                defaultOpen={true}
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {filesInGroup.map(file => (
                                        <div 
                                            key={file.id} 
                                            className={`relative transition-all duration-200 ${isEditMode ? 'cursor-pointer' : ''} ${selectedFiles[file.id] ? 'bg-sky-50/60 rounded-2xl ring-2 ring-sky-300' : ''}`}
                                            onClick={isEditMode ? () => handleSelectFile(file.id) : undefined}
                                        >
                                            {isEditMode && <input type="checkbox" className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 absolute top-3 left-3 rtl:right-3 rtl:left-auto z-10" checked={!!selectedFiles[file.id]} onChange={() => handleSelectFile(file.id)} onClick={e => e.stopPropagation()} />}
                                            <FileItem 
                                                key={file.id} 
                                                file={file} 
                                                onView={isMimeTypeViewable(file.mimeType) ? () => setViewingFile(file) : undefined} 
                                                onDelete={() => handleDeleteFile(file.id)}
                                                onEdit={() => setEditingFile(file)}
                                                onAnnotate={file.mimeType.startsWith('image/') ? () => handleAnnotateFile(file) : undefined}
                                                onRenew={() => handleRenewFile(file)}
                                                onDeleteHistory={handleDeleteHistoryFile}
                                                className={isEditMode ? 'pl-10 rtl:pr-10' : ''}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </CollapsibleSection>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-3xl shadow-xs border border-slate-200/90">
                    <p className="text-slate-500 text-sm">לא נמצאו קבצים התואמים לסינון.</p>
                </div>
            )}
             {isEditMode && selectedCount > 0 && (
                <div className="fixed bottom-24 inset-x-4 z-40 bg-slate-900/90 backdrop-blur-md text-white rounded-2xl shadow-xl p-4 flex justify-between items-center animate-fadeInUp max-w-lg mx-auto border border-slate-700">
                    <span className="text-sm font-semibold">{selectedCount} קבצים נבחרו</span>
                    <button onClick={handleDeleteSelected} className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 rounded-xl text-sm font-semibold transition shadow-xs">
                        <TrashIcon className="w-4 h-4" /> מחק נבחרים
                    </button>
                </div>
            )}
            <FileViewerModal file={viewingFile} onClose={() => setViewingFile(null)} />
            <AddFileModal 
                isOpen={isAddFileModalOpen}
                onClose={() => setIsAddFileModalOpen(false)}
                onSave={handleAddFiles}
            />
            <EditFileModal 
                isOpen={!!editingFile}
                onClose={() => setEditingFile(null)}
                onSave={handleSaveFileEdit}
                file={editingFile}
            />
            {annotatingFile && (
                <AnnotationEditor
                    isOpen={!!annotatingFile}
                    onClose={() => {
                        setAnnotatingFile(null);
                        setAnnotationImageSrc('');
                    }}
                    onSave={handleSaveAnnotation}
                    imageSrc={annotationImageSrc}
                    initialAnnotationData={annotatingFile?.annotationData || '[]'}
                />
            )}
             <RenewFileModal
                isOpen={!!renewingFile}
                onClose={() => setRenewingFile(null)}
                file={renewingFile}
                onSave={handleSaveRenewal}
            />
            <Modal isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} title="בחירת קבצים להפקת PDF" size="lg">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">סנן לפי שנה:</label>
                                <button onClick={toggleAllYears} className="text-xs text-sky-600 hover:underline">
                                    {pdfModalSelectedYears.length === uniqueYears.length ? 'בטל הכל' : 'בחר הכל'}
                                </button>
                            </div>
                            <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-white">
                                {uniqueYears.map(year => (
                                    <label key={year} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded text-sm text-slate-700">
                                        <input type="checkbox" className="w-4 h-4 text-sky-600 rounded" checked={pdfModalSelectedYears.includes(year)} onChange={() => handlePdfYearSelectionChange(year)} />
                                        {year}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">סנן לפי קבוצה:</label>
                                <button onClick={toggleAllGroups} className="text-xs text-sky-600 hover:underline">
                                    {pdfModalSelectedGroups.length === uniqueGroupsForModal.length ? 'בטל הכל' : 'בחר הכל'}
                                </button>
                            </div>
                            <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-white">
                                {uniqueGroupsForModal.map(group => (
                                    <label key={group} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded text-sm text-slate-700">
                                        <input type="checkbox" className="w-4 h-4 text-sky-600 rounded" checked={pdfModalSelectedGroups.includes(group)} onChange={() => handlePdfGroupSelectionChange(group)} />
                                        {group === '__none__' ? 'ללא קבוצה' : group}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <button onClick={handleSelectAllVisible} className="text-sm font-semibold text-sky-600 hover:underline">
                        {filesForPdfModal.length > 0 && filesForPdfModal.every(f => selectedPdfFiles.includes(f.id)) ? 'בטל בחירת הכל' : 'בחר הכל'}
                    </button>
                    <div className="max-h-[40vh] overflow-y-auto space-y-2 p-1 border border-slate-200 rounded-xl">
                        {filesForPdfModal.map(file => (
                            <label key={file.id} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                                    checked={selectedPdfFiles.includes(file.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedPdfFiles(prev => [...prev, file.id]);
                                        } else {
                                            setSelectedPdfFiles(prev => prev.filter(id => id !== file.id));
                                        }
                                    }}
                                />
                                <div className="flex-grow">
                                    <span className="text-sm font-semibold text-slate-800">{file.name}</span>
                                    <span className="text-xs text-slate-500 block">{file.group || 'ללא קבוצה'} / {new Date(file.startDate || file.uploadedAt || file.createdAt).getFullYear()}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-slate-100">
                        <button onClick={() => setIsPdfModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition">ביטול</button>
                        <button onClick={handleGeneratePdf} disabled={selectedPdfFiles.length === 0} className="px-5 py-2 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 transition shadow-xs">הפק PDF ({selectedPdfFiles.length})</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ProjectFilesPage;
