import React, { useState, useEffect, useCallback, ChangeEvent, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Project, SubProject, Contractor, Checker, AnnotatedImage, StoredFile } from '../types';
import * as dbService from '../services/dbService';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/icons/ActionIcons';
import Modal from '../components/common/Modal';
import { generateId } from '../utils/idGenerator';
import ImageUploader from '../components/common/ImageUploader';
import { formatDate } from '../utils/dateFormatter';

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
    .map(word => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const SortButton: React.FC<{ label: string; value: string; currentSort: string; setSort: (value: string) => void }> = ({ label, value, currentSort, setSort }) => (
    <button
        onClick={() => setSort(value)}
        className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
            currentSort === value 
            ? 'bg-sky-600 text-white shadow-xs' 
            : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-800'
        }`}
    >
        {label}
    </button>
);


const ProjectSubProjectsPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubProject, setEditingSubProject] = useState<Partial<SubProject> & { photoFolder?: string } | null>(null);
    const [sortOrder, setSortOrder] = useState('name-asc');

    const fetchData = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        try {
            const data = await dbService.getProject(projectId);
            if (data) {
                setProject(data);
            } else {
                addToast('Bניין לא נמצא', 'error');
                navigate('/');
            }
        } catch (error) {
            addToast('שגיאה בטעינת פרויקטים', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, addToast, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const subProjects = project?.subProjects || [];

    const sortedSubProjects = useMemo(() => {
        return [...subProjects].sort((a, b) => {
            const [key, direction] = sortOrder.split('-');
            let valA: string | number, valB: string | number;

            switch (key) {
                case 'status':
                    valA = a.status;
                    valB = b.status;
                    break;
                case 'startDate':
                    valA = a.workStartDate ? new Date(a.workStartDate).getTime() : 0;
                    valB = b.workStartDate ? new Date(b.workStartDate).getTime() : 0;
                    break;
                case 'name':
                default:
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
                    break;
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [subProjects, sortOrder]);

    const openModal = (subProject: Partial<SubProject> | null = null) => {
        setEditingSubProject(subProject ? { ...subProject } : {
            name: '', description: '', status: 'פעיל', photos: [], files: [], rejects: [], contractors: [], checker: { name: '', phone: '', email: '' }, workStartDate: undefined, workEndDate: undefined, budget: undefined, coverPhoto: undefined
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!editingSubProject || !editingSubProject.name?.trim() || !project) {
            addToast('שם הפרויקט הוא שדה חובה', 'warning');
            return;
        }

        const subProjectToSave = {
            ...editingSubProject,
            workStartDate: editingSubProject.workStartDate ? new Date(editingSubProject.workStartDate).toISOString() : undefined,
            workEndDate: editingSubProject.workEndDate ? new Date(editingSubProject.workEndDate).toISOString() : undefined
        };

        let updatedSubProjects: SubProject[];
        if (editingSubProject.id) { // Update
            updatedSubProjects = (project.subProjects || []).map(sp => sp.id === editingSubProject!.id ? (subProjectToSave as SubProject) : sp);
        } else { // Create
            const newSubProject: SubProject = {
                id: generateId(),
                ...subProjectToSave,
                name: editingSubProject.name.trim(),
                budget: editingSubProject.budget || 0,
            } as SubProject;
            updatedSubProjects = [...(project.subProjects || []), newSubProject];
        }

        const updatedProject = { ...project, subProjects: updatedSubProjects, updatedAt: new Date().toISOString() };

        try {
            await dbService.updateProject(updatedProject);
            addToast('הפרויקט נשמר', 'success');
            setIsModalOpen(false);
            setEditingSubProject(null);
            fetchData();
        } catch (error) {
            addToast('שגיאה בשמירת הפרויקט', 'error');
        }
    };

    const handleDelete = async (subProjectId: string) => {
        if (!project || !window.confirm("האם למחוק פרויקט זה וכל תכולתו?")) return;

        const updatedProject = {
            ...project,
            subProjects: (project.subProjects || []).filter(sp => sp.id !== subProjectId),
            updatedAt: new Date().toISOString()
        };

        try {
            await dbService.updateProject(updatedProject);
            addToast('הפרויקט נמחק', 'success');
            fetchData();
        } catch (error) {
            addToast('שגיאה במחיקת הפרויקט', 'error');
        }
    };
    
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'number') {
            setEditingSubProject(prev => ({ ...prev, [name]: value === '' ? undefined : parseFloat(value) }));
        } else {
            setEditingSubProject(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleContractorChange = (index: number, field: keyof Contractor, value: string) => {
        if (!editingSubProject) return;
        const updatedContractors = [...(editingSubProject.contractors || [])];
        updatedContractors[index] = { ...updatedContractors[index], [field]: value };
        setEditingSubProject(prev => ({ ...prev, contractors: updatedContractors }));
    };

    const addContractor = () => {
        const newContractor: Contractor = { id: generateId(), name: '', phone: '', email: '' };
        setEditingSubProject(prev => ({ ...prev, contractors: [...(prev?.contractors || []), newContractor] }));
    };

    const removeContractor = (index: number) => {
        setEditingSubProject(prev => ({ ...prev, contractors: prev?.contractors?.filter((_, i) => i !== index) }));
    };

    const handleCheckerChange = (field: keyof Checker, value: string) => {
        setEditingSubProject(prev => ({ ...prev, checker: { ...(prev?.checker || {}), [field]: value } as Checker }));
    };

    const handlePhotosChange = (images: AnnotatedImage[]) => {
        const folder = editingSubProject?.photoFolder || '';
        const imagesWithFolder = images.map(img => ({ ...img, folder }));
        setEditingSubProject(prev => ({ ...prev, photos: imagesWithFolder }));
    };
    
    if (isLoading) return <LoadingSpinner text="טוען פרויקטים..." />;

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
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">פרויקטים: {project?.name} ({subProjects.length})</h1>
                    <p className="text-sm text-slate-500 mt-1">פרויקטי משנה, שיפוצים, שדרוגים ועבודות מיוחדות</p>
                </div>
                <button onClick={() => openModal()} className="px-4 py-2 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition flex items-center gap-1.5">
                    <PlusIcon className="w-4 h-4"/> <span>הוסף פרויקט</span>
                </button>
            </div>

            {/* Sort Bar */}
            <div className="bg-white border border-slate-200/90 p-3 rounded-2xl shadow-xs flex items-center justify-start sm:justify-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-2">מיין לפי:</span>
                <SortButton label="שם (א-ת)" value="name-asc" currentSort={sortOrder} setSort={setSortOrder} />
                <SortButton label="תאריך התחלה" value="startDate-asc" currentSort={sortOrder} setSort={setSortOrder} />
                <SortButton label="סטטוס" value="status-asc" currentSort={sortOrder} setSort={setSortOrder} />
            </div>

            {subProjects.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl shadow-xs border border-slate-200/90">
                    <p className="text-slate-500 text-sm">לא נמצאו פרויקטים בבניין זה.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedSubProjects.map(sp => {
                        const statusStyles = getStatusStyles(sp.status);
                        const coverPhotoUrl = sp.coverPhoto?.url || sp.coverPhoto?.dataUrl;
                        return (
                            <div key={sp.id} className="bg-white rounded-3xl shadow-xs border border-slate-200/90 overflow-hidden flex flex-col transition-all duration-200 hover:shadow-md hover:border-sky-300">
                                <Link to={`/project/${projectId}/sub-project/${sp.id}`} className="block">
                                    <div className="h-44 bg-slate-100 flex items-center justify-center relative group">
                                        {coverPhotoUrl ? (
                                            <img src={coverPhotoUrl} alt={sp.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-4xl font-extrabold text-slate-300">{getInitials(sp.name)}</span>
                                        )}
                                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-2xs">
                                            <span className="text-white font-semibold text-sm px-3.5 py-1.5 bg-black/40 rounded-xl">צפה בפרטים</span>
                                        </div>
                                    </div>
                                </Link>
                                <div className="p-5 flex-grow flex flex-col">
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                            <h2 className="text-lg font-bold text-slate-900 truncate hover:text-sky-600 transition">{sp.name}</h2>
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${statusStyles.bg} ${statusStyles.text}`}>
                                                {sp.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 line-clamp-2 h-10">{sp.description}</p>
                                        {(sp.workStartDate || sp.workEndDate) && (
                                            <div className="text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5">
                                                <span className="font-semibold text-slate-600">תאריכים:</span>
                                                <span>{sp.workStartDate ? formatDate(sp.workStartDate) : 'N/A'}</span>
                                                <span>-</span>
                                                <span>{sp.workEndDate ? formatDate(sp.workEndDate) : 'N/A'}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-end items-center mt-auto pt-3 border-t border-slate-100">
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => openModal(sp)} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition" title="ערוך"><PencilIcon className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(sp.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition" title="מחק"><TrashIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSubProject?.id ? "עריכת פרויקט" : "הוספת פרויקט חדש"} size="lg">
                {editingSubProject && (
                    <div className="space-y-4">
                        <input type="text" placeholder="שם הפרויקט" name="name" value={editingSubProject.name || ''} onChange={handleInputChange} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" />
                        <textarea placeholder="תיאור הפרויקט" name="description" value={editingSubProject.description || ''} onChange={handleInputChange} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" rows={3}></textarea>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">סטטוס</label>
                                <select name="status" value={editingSubProject.status || 'פעיל'} onChange={handleInputChange} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition">
                                    <option value="פעיל">פעיל</option>
                                    <option value="בהמתנה">בהמתנה</option>
                                    <option value="הושלם">הושלם</option>
                                    <option value="בוטל">בוטל</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">תקציב (₪)</label>
                                <input type="number" name="budget" placeholder="0" value={editingSubProject.budget || ''} onChange={handleInputChange} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">תאריך התחלה</label>
                                <input type="date" name="workStartDate" value={editingSubProject.workStartDate?.split('T')[0] || ''} onChange={handleInputChange} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">תאריך סיום</label>
                                <input type="date" name="workEndDate" value={editingSubProject.workEndDate?.split('T')[0] || ''} onChange={handleInputChange} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <h3 className="text-sm font-bold text-slate-700 mb-2">תמונת נושא</h3>
                            <ImageUploader
                                images={editingSubProject.coverPhoto ? [editingSubProject.coverPhoto] : []}
                                onImagesChange={(images) => setEditingSubProject(prev => ({ ...prev, coverPhoto: images[0] || undefined }))}
                                maxImages={1}
                                allowNotes={false}
                            />
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <h3 className="text-sm font-bold text-slate-700 mb-2">תמונות גלריה</h3>
                             <input type="text" placeholder="שם תיקיית תמונות (אופציונלי)" name="photoFolder" value={editingSubProject.photoFolder || ''} onChange={handleInputChange} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition mb-2" />
                            <ImageUploader images={editingSubProject.photos || []} onImagesChange={handlePhotosChange} maxImages={20} />
                        </div>
                        
                        <div className="pt-4 border-t border-slate-100">
                            <h3 className="text-sm font-bold text-slate-700 mb-2">קבלנים</h3>
                            {editingSubProject.contractors?.map((c, i) => (
                                <div key={c.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center mb-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                                    <input type="text" placeholder="שם" value={c.name} onChange={e => handleContractorChange(i, 'name', e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm" />
                                    <input type="text" placeholder="טלפון" value={c.phone} onChange={e => handleContractorChange(i, 'phone', e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm" />
                                    <input type="email" placeholder="מייל" value={c.email} onChange={e => handleContractorChange(i, 'email', e.target.value)} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm" />
                                    <button onClick={() => removeContractor(i)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg justify-self-end"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            ))}
                            <button onClick={addContractor} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1"><PlusIcon className="w-3.5 h-3.5"/>הוסף קבלן</button>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-100">
                             <h3 className="text-sm font-bold text-slate-700 mb-2">מפקח</h3>
                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input type="text" placeholder="שם" value={editingSubProject.checker?.name || ''} onChange={e => handleCheckerChange('name', e.target.value)} className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"/>
                                <input type="text" placeholder="טלפון" value={editingSubProject.checker?.phone || ''} onChange={e => handleCheckerChange('phone', e.target.value)} className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"/>
                                <input type="email" placeholder="מייל" value={editingSubProject.checker?.email || ''} onChange={e => handleCheckerChange('email', e.target.value)} className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"/>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition">ביטול</button>
                            <button onClick={handleSave} className="px-5 py-2 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white transition shadow-xs">שמור</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ProjectSubProjectsPage;