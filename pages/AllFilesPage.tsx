
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as dbService from '../services/dbService';
import { FileWithContext, Project, ProjectFile, HistoricalFile } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate } from '../utils/dateFormatter';
import { ArrowDownTrayIcon, TrashIcon, PlusIcon, PencilIcon, MagnifyingGlassIcon } from '../components/icons/ActionIcons';
import { isMimeTypeViewable } from '../utils/fileUtils';
import Modal from '../components/common/Modal';
import { useToast } from '../contexts/ToastContext';
import CollapsibleSection from '../components/common/CollapsibleSection';
import EditFileModal from '../components/common/EditFileModal';
import AddFileModal from '../components/common/AddFileModal';
import FileItem from '../components/FileItem';
import { AnnotationEditor } from '../components/common/AnnotationEditor';
import { exportToCsv } from '../utils/exportUtils';
import { generateAllFilesPdf } from '../services/pdfService';
import { useSettings } from '../contexts/SettingsContext';
import RenewFileModal from '../components/common/RenewFileModal';
import { generateId } from '../utils/idGenerator';
import UniversalFileViewerModal from '../components/common/UniversalFileViewerModal';

const FileViewerModal: React.FC<{ file: FileWithContext | null; onClose: () => void }> = ({ file, onClose }) => {
    return <UniversalFileViewerModal isOpen={!!file} onClose={onClose} file={file} />;
};

const ControlButton: React.FC<{ label: string; value: string; currentValue: string; onClick: (value: string) => void }> = ({ label, value, currentValue, onClick }) => (
    <button
        onClick={() => onClick(value)}
        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
            currentValue === value 
            ? 'bg-sky-600 text-white shadow-xs' 
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
    >
        {label}
    </button>
);

// Generates a consistent, visually pleasing color from a string.
const getColorForGroup = (groupName: string): string => {
    if (!groupName) return '#d1d5db'; // slate-300
    let hash = 0;
    for (let i = 0; i < groupName.length; i++) {
        hash = groupName.charCodeAt(i) + ((hash << 5) - hash);
        hash |= 0; 
    }
    const hue = hash % 360;
    // Using HSL for better control over saturation and lightness
    return `hsl(${hue}, 60%, 80%)`; 
};

const AllFilesPage: React.FC = () => {
    const [files, setFiles] = useState<FileWithContext[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewingFile, setViewingFile] = useState<FileWithContext | null>(null);
    const [sortOrder, setSortOrder] = useState('uploadedAt-desc');
    const [groupFilter, setGroupFilter] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingFile, setEditingFile] = useState<FileWithContext | null>(null);
    const { addToast } = useToast();
    const { settings } = useSettings();
    const [addModalProjectId, setAddModalProjectId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [annotatingFile, setAnnotatingFile] = useState<FileWithContext | null>(null);
    const [annotationImageSrc, setAnnotationImageSrc] = useState('');
    const [renewingFile, setRenewingFile] = useState<FileWithContext | null>(null);
    
    // Multi-select state
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>({});
    const selectedCount = Object.keys(selectedFiles).length;

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [filesData, projectsData] = await Promise.all([
                dbService.getAllFiles(),
                dbService.getAllProjects()
            ]);
            setFiles(filesData);
            setProjects(projectsData);
        } catch (error) {
            console.error("Error fetching all files:", error);
            addToast('שגיאה בטעינת הקבצים', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!isEditMode) {
            setSelectedFiles({});
        }
    }, [isEditMode]);
    
    const handleDeleteFile = async (projectId: string, fileId: string) => {
        if (window.confirm('האם אתה בטוח שברצונך למחוק קובץ זה?')) {
            try {
                await dbService.deleteProjectFile(projectId, fileId);
                addToast('הקובץ נמחק בהצלחה', 'success');
                fetchData();
            } catch (error) {
                console.error('Error deleting file:', error);
                addToast('שגיאה במחיקת הקובץ', 'error');
            }
        }
    };
    
    const handleAddFiles = async (newFiles: ProjectFile[]) => {
        if (!addModalProjectId) return;
        const projectToUpdate = projects.find(p => p.id === addModalProjectId);
        if (!projectToUpdate) return;
        
        try {
            const updatedProject = {
                ...projectToUpdate,
                files: [...projectToUpdate.files, ...newFiles],
                updatedAt: new Date().toISOString(),
            };
            await dbService.updateProject(updatedProject);
            addToast(`${newFiles.length} ${newFiles.length > 1 ? 'קבצים הועלו' : 'קובץ הועלה'} בהצלחה`, 'success');
            fetchData();
        } catch (error) {
            addToast('שגיאה בהעלאת הקבצים', 'error');
        }
    };

    const handleSaveFileEdit = async (updatedFile: ProjectFile) => {
        if (!editingFile) return;
        try {
            const projectToUpdate = await dbService.getProject(editingFile.projectId);
            if (!projectToUpdate) {
                throw new Error("Project not found");
            }
            projectToUpdate.files = projectToUpdate.files.map(f => f.id === updatedFile.id ? updatedFile : f);
            projectToUpdate.updatedAt = new Date().toISOString();
            await dbService.updateProject(projectToUpdate);
            addToast('הקובץ עודכן בהצלחה', 'success');
            fetchData();
        } catch (error) {
            addToast('שגיאה בעדכון הקובץ', 'error');
        } finally {
            setEditingFile(null);
        }
    };

    const handleAnnotateFile = (file: FileWithContext) => {
        setAnnotatingFile(file);
        const src = file.originalUrl || file.originalDataUrl || file.url || file.dataUrl;
        if (!src) {
            addToast('שגיאה בטעינת הקובץ לעריכה.', 'error');
            return;
        }
        setAnnotationImageSrc(src);
    };

    const handleSaveAnnotation = async (data: { annotatedDataUrl: string; annotationData: string; }) => {
        if (!annotatingFile) return;
    
        const project = await dbService.getProject(annotatingFile.projectId);
        if (!project) {
            addToast('Project not found for this file', 'error');
            setAnnotatingFile(null);
            return;
        }
    
        const fileToUpdate = project.files.find(f => f.id === annotatingFile.id);
        if (!fileToUpdate) {
            addToast('File not found in project', 'error');
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
            files: project.files.map(f => f.id === updatedFile.id ? updatedFile : f),
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
    
    const openAddModal = (projectId: string) => {
        setAddModalProjectId(projectId);
        setIsAddModalOpen(true);
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

    const handleSelectGroup = (filesInGroup: FileWithContext[], isChecked: boolean) => {
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

    const handleDeleteSelected = async () => {
        if (selectedCount === 0) return;
        if (window.confirm(`האם אתה בטוח שברצונך למחוק ${selectedCount} קבצים נבחרים?`)) {
            const filesToDelete = files.filter(f => selectedFiles[f.id]);
            const fileIdentifiers = filesToDelete.map(f => ({ fileId: f.id, projectId: f.projectId }));
            try {
                await dbService.deleteFiles(fileIdentifiers);
                addToast(`${selectedCount} קבצים נמחקו בהצלחה`, 'success');
                setSelectedFiles({});
                setIsEditMode(false);
                fetchData();
            } catch (error) {
                addToast('שגיאה במחיקת הקבצים', 'error');
            }
        }
    };

    const handleRenewFile = (file: FileWithContext) => {
        setRenewingFile(file);
    };
    
    const handleSaveRenewal = async (originalFile: ProjectFile, newFile: File, newDueDate?: string) => {
        if (!('projectId' in originalFile)) {
            addToast('Project context missing for file renewal.', 'error');
            return;
        }
    
        const fileWithContext = originalFile as FileWithContext;
    
        const project = projects.find(p => p.id === fileWithContext.projectId);
        if (!project) {
            addToast('Project not found for this file', 'error');
            return;
        }
    
        setIsLoading(true);
        try {
            const newFileId = generateId();
            const { url: newUrl, storagePath: newStoragePath } = await dbService.uploadRawFile(newFile, `projects/${project.id}/files`, newFileId);
    
            const historicalRecord: HistoricalFile = {
                id: generateId(),
                name: fileWithContext.name,
                mimeType: fileWithContext.mimeType,
                uploadedAt: fileWithContext.uploadedAt || fileWithContext.createdAt,
                dueDate: fileWithContext.dueDate,
                url: fileWithContext.url,
                storagePath: fileWithContext.storagePath,
            };
            
            const updatedFile: ProjectFile = {
                id: fileWithContext.id,
                name: fileWithContext.name,
                group: fileWithContext.group,
                startDate: fileWithContext.startDate,
                recurrenceType: fileWithContext.recurrenceType,
                recurrence: fileWithContext.recurrence,
                duration: fileWithContext.duration,
                annotationData: fileWithContext.annotationData,
                caption: fileWithContext.caption,
                folder: fileWithContext.folder,
                originalDataUrl: undefined,
                originalStoragePath: fileWithContext.originalStoragePath,
                originalUrl: fileWithContext.originalUrl,
                mimeType: newFile.type,
                uploadedAt: new Date().toISOString(),
                createdAt: fileWithContext.createdAt,
                dueDate: newDueDate,
                url: newUrl,
                storagePath: newStoragePath,
                history: [historicalRecord, ...(fileWithContext.history || [])],
            };
    
            const updatedProject: Project = {
                ...project,
                files: project.files.map(f => (f.id === fileWithContext.id ? updatedFile : f)),
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

    const uniqueGroups = useMemo(() => {
        const groups = new Set(files.map(f => f.group).filter(Boolean) as string[]);
        return Array.from(groups).sort((a, b) => a.localeCompare(b, 'he'));
    }, [files]);

    const filteredAndSortedFiles = useMemo(() => {
        let tempFiles = [...files];

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            tempFiles = tempFiles.filter(file =>
                file.name.toLowerCase().includes(lowercasedTerm) ||
                file.projectName.toLowerCase().includes(lowercasedTerm) ||
                (file.group && file.group.toLowerCase().includes(lowercasedTerm))
            );
        }

        const filtered = tempFiles.filter(file => {
            if (!groupFilter) return true;
            if (groupFilter === '__none__') return !file.group;
            return file.group === groupFilter;
        });

        const sorted = [...filtered];
        const [key, direction] = sortOrder.split('-');

        sorted.sort((a, b) => {
            let valA, valB;

            switch (key) {
                case 'projectName':
                    valA = a.projectName.toLowerCase();
                    valB = b.projectName.toLowerCase();
                    break;
                case 'uploadedAt':
                default:
                    valA = new Date(a.uploadedAt || 0).getTime();
                    valB = new Date(b.uploadedAt || 0).getTime();
                    break;
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [files, sortOrder, groupFilter, searchTerm]);

    const groupedFiles = useMemo(() => {
        return filteredAndSortedFiles.reduce((acc, file) => {
            const key = file.projectName;
            if (!acc[key]) {
                acc[key] = { projectId: file.projectId, files: [] };
            }
            acc[key].files.push(file);
            return acc;
        }, {} as Record<string, { projectId: string; files: FileWithContext[] }>);
    }, [filteredAndSortedFiles]);

    const sortedGroupKeys = useMemo(() => {
        return Object.keys(groupedFiles).sort((a, b) => a.localeCompare(b, 'he'));
    }, [groupedFiles]);
    
    const handleExportPdf = () => {
        if (filteredAndSortedFiles.length === 0) {
            addToast('אין קבצים לייצוא', 'warning');
            return;
        }
        addToast('מכין PDF...', 'info');
        generateAllFilesPdf({ settings, files: filteredAndSortedFiles });
    };

    const handleExportCsv = () => {
        if (filteredAndSortedFiles.length === 0) {
            addToast('אין קבצים לייצוא', 'warning');
            return;
        }
        const dataToExport = filteredAndSortedFiles.map(f => ({
            'בניין': f.projectName,
            'שם הקובץ': f.name,
            'קבוצה': f.group || '-',
            'תאריך התחלה': f.startDate ? formatDate(f.startDate) : '-',
            'תאריך תפוגה': f.dueDate ? formatDate(f.dueDate) : '-',
            'חוזר': f.recurrenceType === 'recurring' ? 'כן' : 'לא',
        }));
        exportToCsv(dataToExport, 'all_files_list');
        addToast('קובץ Excel יוצא...', 'success');
    };

    if (isLoading) return <LoadingSpinner text="טוען קבצים..." />;

    return (
        <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
            {/* Header & Controls */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        כל הקבצים
                        <span className="text-xs bg-sky-50 text-sky-800 border border-sky-100 px-2.5 py-0.5 rounded-full font-bold">
                            {files.length} מסמכים
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">ארכיון מסמכים, תוכניות בניין, אישורים ותעודות ביטוח</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
                    <div className="flex items-center gap-2">
                        <button onClick={handleExportPdf} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"><ArrowDownTrayIcon className="w-4 h-4"/>PDF</button>
                        <button onClick={handleExportCsv} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"><ArrowDownTrayIcon className="w-4 h-4"/>Excel</button>
                    </div>
                    <button onClick={() => setIsEditMode(!isEditMode)} className={`btn-secondary text-xs py-2.5 px-3 flex items-center gap-1.5 font-bold ${isEditMode ? 'bg-sky-50 text-sky-800 border-sky-300 ring-2 ring-sky-200' : ''}`}>
                        <PencilIcon className="w-4 h-4"/> {isEditMode ? 'סיום עריכה' : 'מצב בחירה'}
                    </button>
                </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/90 space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">סנן לפי קבוצה:</label>
                    <div className="flex flex-wrap gap-1.5">
                        <ControlButton label="הכל" value="" currentValue={groupFilter} onClick={setGroupFilter} />
                        <ControlButton label="ללא קבוצה" value="__none__" currentValue={groupFilter} onClick={setGroupFilter} />
                        {uniqueGroups.map(group => <ControlButton key={group} label={group} value={group} currentValue={groupFilter} onClick={setGroupFilter} />)}
                    </div>
                </div>
                 <div className="relative pt-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pt-1 rtl:right-0 rtl:pl-0 rtl:pr-3.5 pointer-events-none">
                        <MagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                        type="search"
                        placeholder="חיפוש קבצים לפי שם, קבוצה או בניין..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rtl:pr-10 rtl:pl-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                    />
                </div>
            </div>

            {files.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg shadow-md border">
                    <h3 className="text-2xl font-semibold text-slate-700">לא נמצאו קבצים</h3>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedGroupKeys.map(projectName => {
                        const group = groupedFiles[projectName];
                        const allInGroupSelected = group.files.length > 0 && group.files.every(f => selectedFiles[f.id]);
                        return (
                            <CollapsibleSection
                                key={projectName}
                                count={group.files.length}
                                title={
                                    <div className="flex items-center gap-3">
                                        {isEditMode && (
                                            <input
                                                type="checkbox"
                                                className="form-checkbox h-5 w-5 rounded text-sky-600 focus:ring-sky-500"
                                                checked={allInGroupSelected}
                                                onChange={(e) => handleSelectGroup(group.files, e.target.checked)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                        )}
                                        <h3 className="text-xl font-semibold">{projectName}</h3>
                                    </div>
                                }
                            >
                                <div className="space-y-3">
                                    <div className="flex justify-end">
                                        <button onClick={() => openAddModal(group.projectId)} className="flex items-center gap-1 text-sm bg-sky-100 text-sky-700 px-3 py-1 rounded-md hover:bg-sky-200">
                                            <PlusIcon className="w-4 h-4" /> הוסף קובץ לבניין זה
                                        </button>
                                    </div>
                                    {group.files.map(file => (
                                        <div 
                                            key={file.id} 
                                            className={`relative transition-all duration-200 ${isEditMode ? 'cursor-pointer' : ''} ${selectedFiles[file.id] ? 'bg-sky-50 rounded-lg' : ''}`}
                                            onClick={isEditMode ? () => handleSelectFile(file.id) : undefined}
                                        >
                                            {isEditMode && <input type="checkbox" className="form-checkbox h-5 w-5 rounded text-sky-600 focus:ring-sky-500 absolute top-3 left-3 rtl:right-3 rtl:left-auto" checked={!!selectedFiles[file.id]} onChange={() => handleSelectFile(file.id)} onClick={e => e.stopPropagation()} />}
                                            <FileItem
                                                file={file}
                                                onView={isMimeTypeViewable(file.mimeType) ? () => setViewingFile(file) : undefined}
                                                onDelete={() => handleDeleteFile(file.projectId, file.id)}
                                                onEdit={() => setEditingFile(file)}
                                                onAnnotate={() => handleAnnotateFile(file)}
                                                onRenew={() => handleRenewFile(file)}
                                                className={`border-l-4 rtl:border-r-4 rtl:border-l-0 ${isEditMode ? 'pl-10 rtl:pr-10' : ''}`}
                                                style={{ borderColor: getColorForGroup(file.group || '') }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </CollapsibleSection>
                        );
                    })}
                </div>
            )}

            {isEditMode && selectedCount > 0 && (
                <div className="fixed bottom-24 inset-x-4 z-40 bg-slate-800 text-white rounded-lg shadow-lg p-4 flex justify-between items-center animate-fadeInUp">
                    <span>{selectedCount} קבצים נבחרו</span>
                    <button onClick={handleDeleteSelected} className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-md text-sm font-medium">
                        <TrashIcon className="w-5 h-5" /> מחק נבחרים
                    </button>
                </div>
            )}

            <FileViewerModal file={viewingFile} onClose={() => setViewingFile(null)} />
            <AddFileModal
                isOpen={isAddModalOpen}
                onClose={() => {setIsAddModalOpen(false); setAddModalProjectId('');}}
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
        </div>
    );
};

export default AllFilesPage;
