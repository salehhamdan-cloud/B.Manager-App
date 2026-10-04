import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Project, Worker } from '../types';
import * as dbService from '../services/dbService';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PlusIcon, ArrowDownTrayIcon } from '../components/icons/ActionIcons';
import { useSettings } from '../contexts/SettingsContext';
import AddEditWorkerModal from '../components/common/AddEditWorkerModal';
import { generateId } from '../utils/idGenerator';
import WorkerCard from '../components/WorkerCard';
import WorkerDetailsModal from '../components/common/WorkerDetailsModal';
import { generateProjectWorkersPdf } from '../services/pdfService';

const ProjectWorkersPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();
    const { settings } = useSettings();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWorker, setEditingWorker] = useState<Partial<Worker> | null>(null);
    const [viewingWorker, setViewingWorker] = useState<Worker | null>(null);

    const fetchData = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        try {
            const data = await dbService.getProject(projectId);
            if (data) {
                setProject(data);
            } else {
                addToast('בניין לא נמצא', 'error');
                navigate('/');
            }
        } catch (error) {
            addToast('שגיאה בטעינת עובדים', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, addToast, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const openModal = (worker: Partial<Worker> | null = null) => {
        setEditingWorker(worker ? { ...worker } : {});
        setIsModalOpen(true);
    };

    const handleSave = async (workerToSave: Partial<Worker> & { projectId?: string }) => {
        if (!workerToSave.name?.trim() || !project) {
            addToast('שם העובד הוא שדה חובה', 'warning');
            return;
        }

        const { projectId: workerProjectId, ...workerData } = workerToSave;

        let updatedWorkers: Worker[];
        if (workerData.id) { // Update
            updatedWorkers = (project.workers || []).map(w => w.id === workerData.id ? { ...w, ...workerData } : w);
        } else { // Create
            const newWorker: Worker = { id: generateId(), ...workerData } as Worker;
            updatedWorkers = [...(project.workers || []), newWorker];
        }
        
        const updatedProject = { ...project, workers: updatedWorkers, updatedAt: new Date().toISOString() };

        try {
            await dbService.updateProject(updatedProject);
            addToast('העובד נשמר', 'success');
            setIsModalOpen(false);
            setEditingWorker(null);
            fetchData();
        } catch (error) {
            addToast('שגיאה בשמירת העובד', 'error');
        }
    };

    const handleDelete = async (workerId: string) => {
        if (!project || !window.confirm("האם למחוק עובד זה?")) return;
        try {
            await dbService.deleteWorker(project.id, workerId);
            addToast('העובד נמחק', 'success');
            fetchData();
        } catch (error) {
            addToast('שגיאה במחיקת העובד', 'error');
        }
    };
    
    const handleExportPdf = () => {
        if (!project || !project.workers || project.workers.length === 0) {
            addToast('אין עובדים לייצוא', 'warning');
            return;
        }
        addToast('מכין PDF...', 'info');
        generateProjectWorkersPdf({ settings, project, workers: project.workers });
    };


    if (isLoading) return <LoadingSpinner text="טוען עובדים..." />;

    const workers = project?.workers || [];

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
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">עובדי תחזוקה: {project?.name} ({workers.length})</h2>
                    <p className="text-sm text-slate-500 mt-1">צוות אחזקה, אנשי שירות ומנהלי עבודה בבניין</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handleExportPdf} className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-2 border border-slate-200/80 shadow-2xs">
                        <ArrowDownTrayIcon className="w-4 h-4"/>יצא PDF
                    </button>
                    <button onClick={() => openModal()} className="px-4 py-2 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition flex items-center gap-1.5">
                        <PlusIcon className="w-4 h-4"/>הוסף עובד
                    </button>
                </div>
            </div>

            {workers.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl shadow-xs border border-slate-200/90">
                    <p className="text-slate-500 text-sm">לא נמצאו עובדים בבניין זה.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workers.map(worker => (
                        <WorkerCard
                            key={worker.id}
                            worker={{...worker, projectId: project!.id, projectName: project!.name}}
                            onSelect={() => setViewingWorker(worker)}
                            onEdit={() => openModal(worker)}
                            onDelete={() => handleDelete(worker.id)}
                        />
                    ))}
                </div>
            )}
            
            <WorkerDetailsModal 
                isOpen={!!viewingWorker} 
                onClose={() => setViewingWorker(null)} 
                worker={viewingWorker ? {...viewingWorker, projectId: project!.id, projectName: project!.name} : null}
            />

            <AddEditWorkerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                worker={editingWorker}
                projects={project ? [project] : []}
            />
        </div>
    );
};

export default ProjectWorkersPage;