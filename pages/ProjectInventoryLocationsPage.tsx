import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Project, InventoryLocation } from '../types';
import * as dbService from '../services/dbService';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/icons/ActionIcons';
import Modal from '../components/common/Modal';
import { generateId } from '../utils/idGenerator';

const ProjectInventoryLocationsPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();

    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Partial<InventoryLocation> | null>(null);

    const fetchData = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        try {
            const data = await dbService.getProject(projectId);
            if (data) {
                setProject(data);
            } else {
                addToast('בניין לא נמצא', 'error');
                navigate('/inventory');
            }
        } catch (error) {
            addToast('שגיאה בטעינת המיקומים', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, addToast, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const openLocationModal = (location: Partial<InventoryLocation> | null = null) => {
        setEditingLocation(location ? { ...location } : { name: '' });
        setIsLocationModalOpen(true);
    };

    const handleSaveLocation = async () => {
        if (!editingLocation || !editingLocation.name?.trim() || !project) {
            addToast('שם המיקום הוא שדה חובה', 'warning');
            return;
        }

        let updatedProject: Project;
        if (editingLocation.id) { // Update
            updatedProject = {
                ...project,
                inventory: (project.inventory || []).map(l => l.id === editingLocation!.id ? (editingLocation as InventoryLocation) : l),
            };
        } else { // Create
            const newLocation: InventoryLocation = {
                id: generateId(),
                name: editingLocation.name.trim(),
                itemGroups: [],
            };
            updatedProject = { ...project, inventory: [...(project.inventory || []), newLocation] };
        }
        updatedProject.updatedAt = new Date().toISOString();

        try {
            await dbService.updateProject(updatedProject);
            addToast('המיקום נשמר', 'success');
            setIsLocationModalOpen(false);
            setEditingLocation(null);
            fetchData();
        } catch (error) {
            addToast('שגיאה בשמירת המיקום', 'error');
        }
    };

    const handleDeleteLocation = async (locationId: string) => {
        if (!project || !window.confirm("האם למחוק מיקום זה וכל תכולתו?")) return;

        const updatedProject = {
            ...project,
            inventory: (project.inventory || []).filter(l => l.id !== locationId),
            updatedAt: new Date().toISOString()
        };

        try {
            await dbService.updateProject(updatedProject);
            addToast('המיקום נמחק', 'success');
            fetchData();
        } catch (error) {
            addToast('שגיאה במחיקת המיקום', 'error');
        }
    };

    if (isLoading) return <LoadingSpinner text="טוען מיקומים..." />;

    return (
        <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
            {/* Header & Controls */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <nav className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                        <Link to={`/project/${projectId}`} className="text-sky-600 hover:text-sky-700 transition-colors">בניין: {project?.name}</Link>
                        <span>/</span>
                        <span>ניהול מלאי</span>
                    </nav>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">מיקומי מלאי וציוד: {project?.name}</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">ניהול מחסנים, לוחות וחדרי תשתיות של הבניין</p>
                </div>
                <button onClick={() => openLocationModal()} className="btn-primary flex items-center gap-2">
                    <PlusIcon className="w-4 h-4"/>
                    <span>הוסף מיקום חדש</span>
                </button>
            </div>

            {(project?.inventory?.length || 0) === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-8">
                    <p className="text-slate-500 text-base font-medium">לא הוגדרו עדיין מיקומים במבנה זה.</p>
                    <p className="text-xs text-slate-400 mt-1">התחל על ידי הוספת מיקום חדש (למשל: מחסן ראשי, קומה 2, חדר מערכות).</p>
                    <button onClick={() => openLocationModal()} className="btn-primary mt-4 inline-flex items-center gap-2">
                        <PlusIcon className="w-4 h-4" />
                        <span>הוסף מיקום ראשון</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {project?.inventory?.map(location => (
                        <div key={location.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:shadow-xs hover:border-slate-300 transition-all">
                            <div>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-base flex-shrink-0">
                                        📍
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => openLocationModal(location)} className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-xl transition-colors" title="ערוך מיקום">
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDeleteLocation(location.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="מחק מיקום">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <h2 className="text-base font-bold text-slate-900 truncate mt-3 tracking-tight">{location.name}</h2>
                                <p className="text-xs text-slate-500 mt-1 font-mono-numbers">{location.itemGroups.length} קבוצות פריטים</p>
                            </div>
                            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                                <Link to={`/project/${projectId}/inventory/location/${location.id}`} className="text-xs font-bold text-sky-700 hover:text-sky-800 transition-colors flex items-center gap-1">
                                    <span>צפה בקבוצות פריטים</span>
                                    <span aria-hidden="true">&larr;</span>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <Modal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} title={editingLocation?.id ? "עריכת מיקום" : "הוספת מיקום חדש"}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">שם המיקום</label>
                        <input 
                            type="text" 
                            placeholder="לדוגמה: מחסן ראשי, קומה 2, חדר חשמל" 
                            value={editingLocation?.name || ''} 
                            onChange={e => setEditingLocation({ ...editingLocation, name: e.target.value })} 
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" 
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setIsLocationModalOpen(false)} className="btn-secondary">ביטול</button>
                        <button onClick={handleSaveLocation} className="btn-primary">שמור</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ProjectInventoryLocationsPage;
