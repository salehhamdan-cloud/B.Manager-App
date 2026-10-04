import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Project, InventoryLocation, InventoryItemGroup } from '../types';
import * as dbService from '../services/dbService';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/icons/ActionIcons';
import Modal from '../components/common/Modal';
import { generateId } from '../utils/idGenerator';

const TabButton = ({ label, active, onClick }: {label: string, active: boolean, onClick: () => void}) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium rounded-md ${active ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
    >
        {label}
    </button>
);

const ProjectInventoryGroupsPage: React.FC = () => {
    const { projectId, locationId } = useParams<{ projectId: string; locationId: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [location, setLocation] = useState<InventoryLocation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();

    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Partial<InventoryItemGroup> | null>(null);
    
    // State for the new "add from list" feature
    const [modalMode, setModalMode] = useState<'edit' | 'add'>('add');
    const [addModeTab, setAddModeTab] = useState<'list' | 'new'>('list');
    const [predefinedGroups, setPredefinedGroups] = useState<string[]>([]);
    const [selectedPredefinedGroups, setSelectedPredefinedGroups] = useState<Set<string>>(new Set());
    const [groupSearch, setGroupSearch] = useState('');


    const fetchData = useCallback(async () => {
        if (!projectId || !locationId) return;
        setIsLoading(true);
        try {
            const data = await dbService.getProject(projectId);
            if (data) {
                setProject(data);
                const loc = data.inventory?.find(l => l.id === locationId);
                if (loc) {
                    setLocation(loc);
                } else {
                    addToast('מיקום לא נמצא', 'error');
                    navigate(`/project/${projectId}/inventory`);
                }
            } else {
                addToast('בניין לא נמצא', 'error');
                navigate('/inventory');
            }
        } catch (error) {
            addToast('שגיאה בטעינת קבוצות הפריטים', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, locationId, addToast, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const fetchPredefinedGroups = async () => {
        try {
            const allGroupNames = await dbService.getAllUniqueInventoryGroupNames();
            const existingNames = new Set(location?.itemGroups.map(g => g.name) || []);
            setPredefinedGroups(allGroupNames.filter(name => !existingNames.has(name)));
        } catch (error) {
            addToast('שגיאה בטעינת קבוצות מוכנות', 'error');
        }
    };

    const openGroupModal = (group: Partial<InventoryItemGroup> | null = null) => {
        if (group) {
            setEditingGroup({ ...group });
            setModalMode('edit');
        } else {
            setEditingGroup({ name: '' });
            setSelectedPredefinedGroups(new Set());
            setGroupSearch('');
            setModalMode('add');
            setAddModeTab('list');
            fetchPredefinedGroups();
        }
        setIsGroupModalOpen(true);
    };

    const handleSaveGroup = async () => {
        if (!project || !location) return;

        let updatedLocation: InventoryLocation | null = null;
        let successMessage = '';
        
        if (modalMode === 'edit') {
            if (!editingGroup || !editingGroup.name?.trim() || !editingGroup.id) {
                addToast('שם הקבוצה הוא שדה חובה', 'warning'); return;
            }
            updatedLocation = { ...location, itemGroups: location.itemGroups.map(g => g.id === editingGroup!.id ? (editingGroup as InventoryItemGroup) : g) };
            successMessage = 'הקבוצה עודכנה';
        } else {
            if (addModeTab === 'new') {
                if (!editingGroup || !editingGroup.name?.trim()) {
                    addToast('שם הקבוצה הוא שדה חובה', 'warning'); return;
                }
                const newGroup: InventoryItemGroup = { id: generateId(), name: editingGroup.name.trim(), items: [] };
                updatedLocation = { ...location, itemGroups: [...location.itemGroups, newGroup] };
                successMessage = 'קבוצה חדשה נוספה';
            } else { // 'list' mode
                if (selectedPredefinedGroups.size === 0) {
                    addToast('יש לבחור לפחות קבוצה אחת להוספה', 'warning'); return;
                }
                // FIX: Explicitly type 'name' as a string to resolve the 'unknown' type error by using Array.from.
                const newGroups: InventoryItemGroup[] = Array.from(selectedPredefinedGroups).map((name: string) => ({ id: generateId(), name: name, items: [] }));
                updatedLocation = { ...location, itemGroups: [...location.itemGroups, ...newGroups] };
                successMessage = `${newGroups.length} קבוצות נוספו`;
            }
        }
        
        if (!updatedLocation) return;

        const updatedProject = { ...project, inventory: (project.inventory || []).map(l => l.id === locationId ? updatedLocation! : l), updatedAt: new Date().toISOString() };

        try {
            await dbService.updateProject(updatedProject);
            addToast(successMessage, 'success');
            setIsGroupModalOpen(false);
            setEditingGroup(null);
            fetchData();
        } catch (error) {
            addToast('שגיאה בשמירת הקבוצה', 'error');
        }
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (!project || !location || !window.confirm("האם למחוק קבוצה זו וכל הפריטים שבתוכה?")) return;

        const updatedLocation = {
            ...location,
            itemGroups: location.itemGroups.filter(g => g.id !== groupId),
        };

        const updatedProject = { ...project, inventory: (project.inventory || []).map(l => l.id === locationId ? updatedLocation : l), updatedAt: new Date().toISOString() };

        try {
            await dbService.updateProject(updatedProject);
            addToast('הקבוצה נמחקה', 'success');
            fetchData();
        } catch (error) {
            addToast('שגיאה במחיקת הקבוצה', 'error');
        }
    };
    
    const handlePredefinedGroupToggle = (groupName: string) => {
        setSelectedPredefinedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupName)) {
                newSet.delete(groupName);
            } else {
                newSet.add(groupName);
            }
            return newSet;
        });
    };

    const filteredPredefinedGroups = useMemo(() => {
        if (!groupSearch) return predefinedGroups;
        return predefinedGroups.filter(name => name.toLowerCase().includes(groupSearch.toLowerCase()));
    }, [predefinedGroups, groupSearch]);

    const handleSelectAll = () => {
        if (selectedPredefinedGroups.size === filteredPredefinedGroups.length && filteredPredefinedGroups.length > 0) {
            setSelectedPredefinedGroups(new Set());
        } else {
            setSelectedPredefinedGroups(new Set(filteredPredefinedGroups));
        }
    };


    if (isLoading) return <LoadingSpinner text="טוען קבוצות פריטים..." />;
    
    const TabButton = ({ label, active, onClick }: {label: string, active: boolean, onClick: () => void}) => (
        <button
            onClick={onClick}
            className={`px-4 py-2 text-sm font-medium rounded-md ${active ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <nav className="text-sm mb-1">
                        <Link to={`/project/${projectId}`} className="text-sky-600 hover:underline">{project?.name}</Link>
                        <span className="text-slate-500 mx-2">/</span>
                        <Link to={`/project/${projectId}/inventory`} className="text-sky-600 hover:underline">מלאי</Link>
                    </nav>
                    <h1 className="text-2xl font-bold text-slate-800">{location?.name}</h1>
                </div>
                <button onClick={() => openGroupModal()} className="btn-primary flex items-center gap-2"><PlusIcon className="w-5 h-5"/>הוסף קבוצה</button>
            </div>

            {(location?.itemGroups.length || 0) === 0 ? (
                <div className="text-center p-10 bg-white rounded-lg shadow border">
                    <p className="text-slate-500">לא נמצאו קבוצות פריטים. התחל על ידי הוספת קבוצה חדשה.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {location?.itemGroups.map(group => (
                        <div key={group.id} className="bg-white p-4 rounded-lg shadow-md border flex flex-col justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-sky-700 truncate">{group.name}</h2>
                                <p className="text-sm text-slate-500">{group.items.length} פריטים</p>
                            </div>
                            <div className="flex justify-between items-center mt-4 pt-3 border-t">
                                <Link to={`/project/${projectId}/inventory/location/${locationId}/group/${group.id}`} className="text-sm font-medium text-sky-600 hover:underline">
                                    צפה בפריטים
                                </Link>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => openGroupModal(group)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-full"><PencilIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteGroup(group.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} title={modalMode === 'edit' ? "עריכת קבוצה" : "הוספת קבוצות חדשות"}>
                {modalMode === 'edit' ? (
                    <div className="space-y-4">
                        <input type="text" placeholder="שם הקבוצה" value={editingGroup?.name || ''} onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })} className="input-class w-full" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-center gap-2 p-1 bg-slate-100 rounded-lg">
                           <TabButton label="הוספה מרשימה" active={addModeTab === 'list'} onClick={() => setAddModeTab('list')} />
                           <TabButton label="יצירה חדשה" active={addModeTab === 'new'} onClick={() => setAddModeTab('new')} />
                        </div>
                        {addModeTab === 'new' ? (
                             <input type="text" placeholder="שם הקבוצה החדשה" value={editingGroup?.name || ''} onChange={e => setEditingGroup({ ...editingGroup, name: e.target.value })} className="input-class w-full" />
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <input type="search" placeholder="חפש קבוצה..." value={groupSearch} onChange={e => setGroupSearch(e.target.value)} className="input-class w-full" />
                                    {filteredPredefinedGroups.length > 0 &&
                                        <button onClick={handleSelectAll} className="btn-secondary text-sm whitespace-nowrap">
                                            {selectedPredefinedGroups.size === filteredPredefinedGroups.length ? 'בטל בחירה' : 'בחר הכל'}
                                        </button>
                                    }
                                </div>
                                <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-1">
                                    {filteredPredefinedGroups.length > 0 ? filteredPredefinedGroups.map(name => (
                                        <label key={name} className="flex items-center gap-3 p-2 hover:bg-sky-50 rounded-md cursor-pointer">
                                            <input type="checkbox" checked={selectedPredefinedGroups.has(name)} onChange={() => handlePredefinedGroupToggle(name)} className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"/>
                                            <span>{name}</span>
                                        </label>
                                    )) : <p className="text-slate-500 text-center p-4">אין קבוצות מוכנות להוספה.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <div className="flex justify-end gap-2 pt-4">
                    <button onClick={() => setIsGroupModalOpen(false)} className="btn-secondary">ביטול</button>
                    <button onClick={handleSaveGroup} className="btn-primary">שמור</button>
                </div>
            </Modal>
             <style>{`
                .input-class { display: block; width: 100%; border: 1px solid #cbd5e1; border-radius: 0.375rem; padding: 0.5rem 0.75rem; }
                .btn-primary { padding: 0.5rem 1rem; background-color: #0284c7; color: white; border-radius: 0.375rem; font-weight: 500; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 0.375rem; font-weight: 500; }
            `}</style>
        </div>
    );
};

export default ProjectInventoryGroupsPage;