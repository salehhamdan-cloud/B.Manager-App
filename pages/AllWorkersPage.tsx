import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { WorkerWithContext, Project, Worker } from '../types';
import * as dbService from '../services/dbService';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PlusIcon, PencilIcon, TrashIcon, ArrowDownTrayIcon, MagnifyingGlassIcon } from '../components/icons/ActionIcons';
import CollapsibleSection from '../components/common/CollapsibleSection';
import { useSettings } from '../contexts/SettingsContext';
import AddEditWorkerModal from '../components/common/AddEditWorkerModal';
import { generateId } from '../utils/idGenerator';
import WorkerCard from '../components/WorkerCard';
import WorkerDetailsModal from '../components/common/WorkerDetailsModal';
import { generateAllWorkersPdf } from '../services/pdfService';
import { exportToCsv } from '../utils/exportUtils';

const AllWorkersPage: React.FC = () => {
    const [workers, setWorkers] = useState<WorkerWithContext[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();
    const { settings } = useSettings();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWorker, setEditingWorker] = useState<Partial<WorkerWithContext> | null>(null);
    const [viewingWorker, setViewingWorker] = useState<WorkerWithContext | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedWorkers, setSelectedWorkers] = useState<Record<string, boolean>>({});
    const selectedCount = Object.keys(selectedWorkers).length;

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [workersData, projectsData] = await Promise.all([
                dbService.getAllWorkersWithContext(),
                dbService.getAllProjects()
            ]);
            setWorkers(workersData);
            setProjects(projectsData);
        } catch (error) {
            addToast('שגיאה בטעינת עובדים', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!isEditMode) {
            setSelectedWorkers({});
        }
    }, [isEditMode]);

    const openModal = (worker: Partial<WorkerWithContext> | null = null) => {
        if (worker) {
            setEditingWorker({ ...worker });
        } else {
            setEditingWorker({ projectId: projects.length === 1 ? projects[0].id : '' });
        }
        setIsModalOpen(true);
    };
    
    const handleDeleteWorker = async (workerToDelete: WorkerWithContext) => {
        if (!window.confirm(`האם למחוק את העובד "${workerToDelete.name}"?`)) return;
        try {
            await dbService.deleteWorkers([workerToDelete]);
            addToast('העובד נמחק', 'success');
            fetchData();
        } catch (error) {
            addToast('שגיאה במחיקת העובד', 'error');
        }
    };

    const handleSaveWorker = async (workerToSave: Partial<Worker> & { projectId?: string }) => {
        if (!workerToSave.projectId || !workerToSave.name?.trim()) {
            addToast('יש לבחור בניין ולהזין שם עובד', 'warning');
            return;
        }

        const projectToUpdate = await dbService.getProject(workerToSave.projectId);
        if (!projectToUpdate) {
            addToast('הבניין הנבחר לא נמצא', 'error');
            return;
        }
        
        const { projectId: _workerProjectId, ...workerData } = workerToSave;

        let updatedWorkers: Worker[];
        
        if (workerData.id) { // Editing existing
            updatedWorkers = (projectToUpdate.workers || []).map(w =>
                w.id === workerData.id ? { ...w, ...workerData } : w
            );
        } else { // Adding new
            const newWorker = { ...workerData, id: workerData.id || generateId() } as Worker;
            updatedWorkers = [...(projectToUpdate.workers || []), newWorker];
        }

        try {
            await dbService.updateProject({ ...projectToUpdate, workers: updatedWorkers });
            addToast(workerData.id ? 'העובד עודכן' : 'העובד נוסף', 'success');
            setIsModalOpen(false);
            setEditingWorker(null);
            fetchData();
        } catch (error) {
            addToast('שגיאה בשמירת העובד', 'error');
        }
    };
    
    const filteredWorkers = useMemo(() => {
        if (!searchTerm) return workers;
        const lowercasedTerm = searchTerm.toLowerCase();
        return workers.filter(w => 
            w.name.toLowerCase().includes(lowercasedTerm) ||
            w.phone.toLowerCase().includes(lowercasedTerm) ||
            w.email.toLowerCase().includes(lowercasedTerm) ||
            (w.idNumber || '').toLowerCase().includes(lowercasedTerm) ||
            (w.workerNumber || '').toLowerCase().includes(lowercasedTerm) ||
            w.projectName.toLowerCase().includes(lowercasedTerm)
        );
    }, [workers, searchTerm]);

    const groupedWorkers = useMemo(() => {
        return filteredWorkers.reduce((acc, worker) => {
            const key = worker.projectName;
            if (!acc[key]) acc[key] = { projectId: worker.projectId, workers: [] };
            acc[key].workers.push(worker);
            return acc;
        }, {} as Record<string, { projectId: string; workers: WorkerWithContext[] }>);
    }, [filteredWorkers]);

    const sortedProjectKeys = useMemo(() => Object.keys(groupedWorkers).sort((a,b) => a.localeCompare(b, 'he')), [groupedWorkers]);
    
    const handleDeleteSelected = async () => {
        if (selectedCount === 0) return;
        if (window.confirm(`האם למחוק ${selectedCount} עובדים נבחרים?`)) {
            const workersToDelete = workers.filter(w => selectedWorkers[w.id]);
            try {
                await dbService.deleteWorkers(workersToDelete);
                addToast(`${selectedCount} עובדים נמחקו`, 'success');
                setSelectedWorkers({});
                fetchData();
            } catch (error) {
                addToast('שגיאה במחיקת עובדים', 'error');
            }
        }
    };
    
    const handleExportPdf = () => {
        const workersToExport = isEditMode && selectedCount > 0 ? workers.filter(w => selectedWorkers[w.id]) : workers;
        if (workersToExport.length === 0) {
            addToast('לא נבחרו עובדים לייצוא.', 'warning');
            return;
        }
        addToast('מכין PDF...', 'info');
        generateAllWorkersPdf({ settings, workers: workersToExport });
    };

    const handleExportCsv = () => {
         const workersToExport = isEditMode && selectedCount > 0 ? workers.filter(w => selectedWorkers[w.id]) : workers;
        if (workersToExport.length === 0) {
            addToast('לא נבחרו עובדים לייצוא.', 'warning');
            return;
        }
        const dataToExport = workersToExport.map(w => ({
            'בניין': w.projectName,
            'שם': w.name,
            'ת.ז': w.idNumber,
            'מספר עובד': w.workerNumber,
            'טלפון': w.phone,
            'מייל': w.email,
            'כתובת': w.address
        }));
        exportToCsv(dataToExport, 'all_workers_list');
        addToast('קובץ Excel יוצא...', 'success');
    };

    if (isLoading) return <LoadingSpinner text="טוען עובדים..." />;

    return (
        <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
            {/* Header & Controls */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        כל עובדי התחזוקה
                        <span className="text-xs bg-sky-50 text-sky-800 border border-sky-100 px-2.5 py-0.5 rounded-full font-bold">
                            {workers.length} עובדים
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">ספר אנשי מקצוע, עובדי שטח וצוותי תחזוקה שוטפת</p>
                </div>
                 <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
                    <div className="flex items-center gap-2">
                        <button onClick={handleExportPdf} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"><ArrowDownTrayIcon className="w-4 h-4"/>PDF {isEditMode && selectedCount > 0 && `(${selectedCount})`}</button>
                        <button onClick={handleExportCsv} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"><ArrowDownTrayIcon className="w-4 h-4"/>Excel {isEditMode && selectedCount > 0 && `(${selectedCount})`}</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsEditMode(!isEditMode)} className={`btn-secondary text-xs py-2.5 px-3 flex items-center gap-1.5 font-bold ${isEditMode ? 'bg-sky-50 text-sky-800 border-sky-300 ring-2 ring-sky-200' : ''}`}>
                            <PencilIcon className="w-4 h-4"/> {isEditMode ? 'סיום עריכה' : 'מצב בחירה'}
                        </button>
                        <button onClick={() => openModal()} className="btn-primary text-xs font-bold py-2.5 px-4 shadow-sm flex items-center gap-1.5"><PlusIcon className="w-4 h-4" /> הוסף עובד</button>
                    </div>
                 </div>
            </div>
            
            <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/90">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 rtl:right-0 rtl:pl-0 rtl:pr-3.5 pointer-events-none">
                        <MagnifyingGlassIcon className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                        type="search"
                        placeholder="חיפוש עובדים לפי שם, טלפון, התמחות או בניין..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rtl:pr-10 rtl:pl-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                    />
                </div>
            </div>

            {workers.length === 0 ? (
                 <div className="text-center py-16 bg-white rounded-3xl shadow-xs border border-slate-200/90 p-8">
                    <h3 className="text-base font-bold text-slate-800">לא נמצאו עובדים</h3>
                    <p className="text-slate-500 text-xs mt-1">הוסף עובדי תחזוקה כדי לשייך אותם למשימות ודוחות.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedProjectKeys.map(projectName => {
                        const group = groupedWorkers[projectName];
                        return (
                            <CollapsibleSection
                                key={projectName}
                                count={group.workers.length}
                                title={<h3 className="text-lg font-bold text-slate-800">{projectName}</h3>}
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {group.workers.map(worker => (
                                         <WorkerCard 
                                            key={worker.id}
                                            worker={worker}
                                            onSelect={() => setViewingWorker(worker)}
                                            onEdit={() => openModal(worker)}
                                            onDelete={() => handleDeleteWorker(worker)}
                                         />
                                    ))}
                                </div>
                            </CollapsibleSection>
                        )
                    })}
                </div>
            )}
            
            {isEditMode && selectedCount > 0 && (
                 <div className="fixed bottom-24 inset-x-4 max-w-lg mx-auto z-40 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-xl p-4 flex justify-between items-center animate-fadeInUp border border-white/10">
                    <span className="text-xs font-bold">{selectedCount} עובדים נבחרו</span>
                    <button onClick={handleDeleteSelected} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 rounded-xl text-xs font-bold transition-colors">
                        <TrashIcon className="w-4 h-4" /> מחק נבחרים
                    </button>
                </div>
            )}

            <WorkerDetailsModal 
                isOpen={!!viewingWorker} 
                onClose={() => setViewingWorker(null)} 
                worker={viewingWorker}
            />
            
            <AddEditWorkerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveWorker}
                worker={editingWorker}
                projects={projects}
            />

             <style>{`
                .btn-primary { padding: 0.5rem 1rem; background-color: #0284c7; color: white; border-radius: 0.375rem; font-weight: 500; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 0.375rem; font-weight: 500; }
            `}</style>
        </div>
    );
};

export default AllWorkersPage;
