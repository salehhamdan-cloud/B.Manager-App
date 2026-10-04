import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Project, InventoryLocation } from '../types';
import * as dbService from '../services/dbService';
import { useToast } from '../contexts/ToastContext';
import { generateId } from '../utils/idGenerator';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import { PlusIcon, PencilIcon, TrashIcon, ArrowDownTrayIcon, Squares2X2Icon } from '../components/icons/ActionIcons';
import { useSettings } from '../contexts/SettingsContext';
import { generateInventoryPdf } from '../services/pdfService';

const InventoryBuildingsPage: React.FC = () => {
    const [buildings, setBuildings] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();
    const { settings } = useSettings();

    const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
    const [editingBuilding, setEditingBuilding] = useState<Partial<Project> | null>(null);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfSelection, setPdfSelection] = useState<Record<string, boolean>>({});

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await dbService.getAllProjects();
            // We only care about projects that have inventory defined.
            setBuildings(data.filter(p => p.inventory && p.inventory.length > 0));
        } catch (error) {
            addToast('שגיאה בטעינת המלאי', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const openBuildingModal = (building: Partial<Project> | null = null) => {
        setEditingBuilding(building ? { ...building } : { name: '' });
        setIsBuildingModalOpen(true);
    };

    const handleSaveBuilding = async () => {
        if (!editingBuilding || !editingBuilding.name?.trim()) {
            addToast('שם המבנה הוא שדה חובה', 'warning');
            return;
        }

        try {
            if (editingBuilding.id) {
                await dbService.updateProject(editingBuilding as Project);
                addToast('המבנה עודכן', 'success');
            } else {
                const newBuilding: Project = {
                    id: generateId(),
                    name: editingBuilding.name.trim(),
                    address: '',
                    clientInfo: '',
                    status: 'פעיל',
                    images: [],
                    files: [],
                    todos: [],
                    inventory: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                await dbService.addProject(newBuilding);
                addToast('מבנה חדש נוסף', 'success');
            }
            setIsBuildingModalOpen(false);
            setEditingBuilding(null);
            fetchData();
        } catch (error) {
            addToast('שגיאה בשמירת המבנה', 'error');
        }
    };

    const handleDeleteBuilding = async (buildingId: string) => {
        if (window.confirm("פעולה זו תמחק את כל הפרויקט וכל הנתונים המשויכים אליו (דוחות, תקלות וכו'). האם אתה בטוח?")) {
            try {
                await dbService.deleteProject(buildingId);
                addToast('המבנה נמחק', 'success');
                fetchData();
            } catch (error) {
                addToast('שגיאה במחיקת המבנה', 'error');
            }
        }
    };
    
    const openPdfModal = () => {
        const initialSelection: Record<string, boolean> = {};
        buildings.forEach(b => {
            initialSelection[b.id] = true;
            (b.inventory || []).forEach(l => {
                initialSelection[l.id] = true;
                l.itemGroups.forEach(g => { initialSelection[g.id] = true; });
            });
        });
        setPdfSelection(initialSelection);
        setIsPdfModalOpen(true);
    };

    const handlePdfSelectionChange = (id: string, isChecked: boolean, type: 'building' | 'location' | 'group', building?: Project, location?: InventoryLocation) => {
        const newSelection = { ...pdfSelection, [id]: isChecked };
        if (type === 'building' && building) {
            (building.inventory || []).forEach(loc => {
                newSelection[loc.id] = isChecked;
                loc.itemGroups.forEach(group => { newSelection[group.id] = isChecked; });
            });
        }
        if (type === 'location' && location) {
            location.itemGroups.forEach(group => { newSelection[group.id] = isChecked; });
        }
        setPdfSelection(newSelection);
    };

    const handleGeneratePdf = async () => {
        const selectedProjects = buildings.map(building => {
            if (!pdfSelection[building.id]) return null;
            const selectedLocations = (building.inventory || []).map(location => {
                if (!pdfSelection[location.id]) return null;
                const selectedGroups = location.itemGroups.filter(group => pdfSelection[group.id]);
                if (selectedGroups.length === 0) return null;
                return { ...location, itemGroups: selectedGroups };
            }).filter(Boolean) as InventoryLocation[];
            if (selectedLocations.length === 0) return null;
            return { ...building, inventory: selectedLocations };
        }).filter(Boolean) as Project[];

        if (selectedProjects.length === 0) {
            addToast('יש לבחור לפחות קבוצת פריטים אחת', 'warning');
            return;
        }
        
        addToast('מכין PDF...', 'info');
        try {
            await generateInventoryPdf({ settings, projects: selectedProjects });
        } catch (e) {
            addToast('שגיאה ביצירת ה-PDF', 'error');
        }
        setIsPdfModalOpen(false);
    };


    if (isLoading) return <LoadingSpinner text="טוען מלאי..." />;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">מבנים במלאי</h1>
                <div className="flex gap-2">
                    <button onClick={openPdfModal} className="btn-secondary flex items-center gap-2"><ArrowDownTrayIcon className="w-5 h-5"/>יצא PDF</button>
                    <button onClick={() => openBuildingModal()} className="btn-primary flex items-center gap-2"><PlusIcon className="w-5 h-5"/>הוסף מבנה</button>
                </div>
            </div>

            {buildings.length === 0 ? (
                <div className="text-center p-10 bg-white rounded-lg shadow border">
                    <p className="text-slate-500">לא נמצאו מבנים. התחל על ידי הוספת מבנה (מחסן).</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {buildings.map(building => (
                        <div key={building.id} className="bg-white p-4 rounded-lg shadow-md border flex flex-col justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-sky-700 truncate">{building.name}</h2>
                                <p className="text-sm text-slate-500">{(building.inventory || []).length} מיקומים</p>
                            </div>
                            <div className="flex justify-between items-center mt-4 pt-3 border-t">
                                <div className="flex items-center gap-4">
                                    <Link to={`/project/${building.id}/inventory`} className="text-sm font-medium text-sky-600 hover:underline">
                                        צפה במיקומים
                                    </Link>
                                    <Link to={`/inventory/building/${building.id}/all-items`} className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                                        <Squares2X2Icon className="w-4 h-4" />
                                        כל הפריטים
                                    </Link>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => openBuildingModal(building)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-full"><PencilIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteBuilding(building.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <Modal isOpen={isBuildingModalOpen} onClose={() => setIsBuildingModalOpen(false)} title={editingBuilding?.id ? "עריכת מבנה" : "הוספת מבנה חדש"}>
                <div className="space-y-4">
                    <input type="text" placeholder="שם המבנה (לדוגמה: מחסן ראשי)" value={editingBuilding?.name || ''} onChange={e => setEditingBuilding(prev => ({ ...prev, name: e.target.value }))} className="input-class w-full" />
                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setIsBuildingModalOpen(false)} className="btn-secondary">ביטול</button>
                        <button onClick={handleSaveBuilding} className="btn-primary">שמור</button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} title="יצירת דוח מלאי PDF" size="lg">
                <div className="space-y-4">
                    <p>בחר אילו פריטים לכלול בדוח:</p>
                    <div className="max-h-[60vh] overflow-y-auto space-y-2 border rounded-lg p-3 bg-slate-50">
                        {buildings.map(b => (
                            <div key={b.id}>
                                <label className="font-semibold flex items-center gap-2 p-1">
                                    <input type="checkbox" checked={!!pdfSelection[b.id]} onChange={e => handlePdfSelectionChange(b.id, e.target.checked, 'building', b)} className="w-4 h-4 text-sky-600"/>
                                    {b.name}
                                </label>
                                <div className="pl-6 rtl:pr-6 space-y-1">
                                    {(b.inventory || []).map(l => (
                                        <div key={l.id}>
                                            <label className="font-medium flex items-center gap-2 p-1">
                                                <input type="checkbox" checked={!!pdfSelection[l.id]} onChange={e => handlePdfSelectionChange(l.id, e.target.checked, 'location', b, l)} className="w-4 h-4 text-sky-600"/>
                                                {l.name}
                                            </label>
                                            <div className="pl-6 rtl:pr-6">
                                                {l.itemGroups.map(g => (
                                                    <label key={g.id} className="flex items-center gap-2 p-1 text-sm">
                                                        <input type="checkbox" checked={!!pdfSelection[g.id]} onChange={e => handlePdfSelectionChange(g.id, e.target.checked, 'group')} className="w-4 h-4 text-sky-600"/>
                                                        {g.name}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setIsPdfModalOpen(false)} className="btn-secondary">ביטול</button>
                        <button onClick={handleGeneratePdf} className="btn-primary">צור PDF</button>
                    </div>
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

export default InventoryBuildingsPage;