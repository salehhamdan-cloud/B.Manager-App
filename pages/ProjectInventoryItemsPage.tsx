
import React, { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Project, InventoryLocation, InventoryItemGroup, InventoryItem, AnnotatedImage, InventoryImage } from '../types';
import * as dbService from '../services/dbService';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/icons/ActionIcons';
import Modal from '../components/common/Modal';
import { generateId } from '../utils/idGenerator';
import ImageUploader from '../components/common/ImageUploader';
import { formatDate } from '../utils/dateFormatter';

export const ProjectInventoryItemsPage: React.FC = () => {
    const { projectId, locationId, groupId } = useParams<{ projectId: string; locationId: string; groupId: string }>();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [project, setProject] = useState<Project | null>(null);
    const [group, setGroup] = useState<InventoryItemGroup | null>(null);
    const [location, setLocation] = useState<InventoryLocation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState<'name-asc' | 'createdAt-desc'>('name-asc');
    
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<InventoryItem> | null>(null);

    // State for viewer modals
    const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
    const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
    const [viewingItemForGallery, setViewingItemForGallery] = useState<InventoryItem | null>(null);
    const [viewingPdf, setViewingPdf] = useState<{name: string, dataUrl: string} | null>(null);

    const fetchData = useCallback(async () => {
        if (!projectId || !locationId || !groupId) return;
        setIsLoading(true);
        try {
            const p = await dbService.getProject(projectId);
            if (!p) { navigate('/all-inventory'); throw new Error('Project not found'); }
            const l = p.inventory?.find(loc => loc.id === locationId);
            if (!l) { navigate(`/project/${projectId}/inventory`); throw new Error('Location not found'); }
            const g = l.itemGroups.find(grp => grp.id === groupId);
            if (!g) { navigate(`/project/${projectId}/inventory/location/${locationId}`); throw new Error('Group not found'); }
            
            setProject(p);
            setLocation(l);
            setGroup(g);
        } catch (error: any) {
            addToast(error.message || 'שגיאה בטעינת הפריטים', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, locationId, groupId, addToast, navigate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openItemModal = (item: Partial<InventoryItem> | null = null) => {
        setEditingItem(item ? JSON.parse(JSON.stringify(item)) : {
            name: '', description: '', model: '', company: '', quantity: 1, images: [],
            warrantyInfo: '', warrantyEndDate: ''
        });
        setIsItemModalOpen(true);
    };
    
    const handleSaveItem = async () => {
        if (!editingItem || !editingItem.name?.trim() || !project || !location || !group) {
            addToast('שם הפריט הוא שדה חובה', 'warning');
            return;
        }
    
        let updatedGroup: InventoryItemGroup;
        if (editingItem.id) { // Update
            updatedGroup = { ...group, items: group.items.map(i => i.id === editingItem.id ? (editingItem as InventoryItem) : i) };
        } else { // Create
            const newItem: InventoryItem = {
                id: generateId(),
                name: editingItem.name.trim(),
                description: editingItem.description || '',
                model: editingItem.model || '',
                company: editingItem.company || '',
                quantity: editingItem.quantity || 0,
                images: editingItem.images || [],
                createdAt: new Date().toISOString(),
                warrantyInfo: editingItem.warrantyInfo,
                warrantyEndDate: editingItem.warrantyEndDate,
                manualPdf: editingItem.manualPdf,
            };
            updatedGroup = { ...group, items: [...group.items, newItem] };
        }
    
        const updatedLocation = { ...location, itemGroups: location.itemGroups.map(g => g.id === groupId ? updatedGroup : g) };
        const updatedProject = { ...project, inventory: (project.inventory || []).map(l => l.id === locationId ? updatedLocation : l), updatedAt: new Date().toISOString() };
    
        try {
            await dbService.updateProject(updatedProject);
            addToast('הפריט נשמר', 'success');
            setIsItemModalOpen(false);
            setEditingItem(null);
            fetchData();
        } catch (error) { addToast('שגיאה בשמירת הפריט', 'error'); }
    };
    
    const handleDeleteItem = async (itemId: string) => {
        if (!project || !location || !group || !window.confirm("האם למחוק פריט זה?")) return;

        const updatedGroup = { ...group, items: group.items.filter(i => i.id !== itemId) };
        const updatedLocation = { ...location, itemGroups: location.itemGroups.map(g => g.id === groupId ? updatedGroup : g) };
        const updatedProject = { ...project, inventory: (project.inventory || []).map(l => l.id === locationId ? updatedLocation : l), updatedAt: new Date().toISOString() };

        try {
            await dbService.updateProject(updatedProject);
            addToast('הפריט נמחק', 'success');
            fetchData();
        } catch (error) { addToast('שגיאה במחיקת הפריט', 'error'); }
    };

    const handleQuantityChange = async (itemId: string, delta: number) => {
        if (!project || !location || !group) return;

        const itemToUpdate = group.items.find(i => i.id === itemId);
        if (!itemToUpdate) return;
        
        const newQuantity = Math.max(0, itemToUpdate.quantity + delta);
        if (newQuantity === itemToUpdate.quantity) return;

        const updatedItem = { ...itemToUpdate, quantity: newQuantity };

        const updatedGroup = { ...group, items: group.items.map(i => i.id === itemId ? updatedItem : i) };
        const updatedLocation = { ...location, itemGroups: location.itemGroups.map(g => g.id === groupId ? updatedGroup : g) };
        const updatedProject = { ...project, inventory: (project.inventory || []).map(l => l.id === locationId ? updatedLocation : l), updatedAt: new Date().toISOString() };
        
        setProject(updatedProject);
        setGroup(updatedGroup);
        setLocation(updatedLocation);

        try {
            await dbService.updateProject(updatedProject);
        } catch (error) {
            addToast('שגיאה בעדכון הכמות', 'error');
            fetchData(); // Revert on failure by fetching from DB
        }
    };
    
    const handleItemImageChange = (images: AnnotatedImage[]) => {
        if (!editingItem) return;
        setEditingItem(prev => ({ ...prev, images: images }));
    };

    const handleManualUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = (event) => {
                const manualPdf = {
                    name: file.name,
                    dataUrl: event.target?.result as string,
                    mimeType: file.type
                };
                setEditingItem(prev => ({ ...prev, manualPdf }));
            };
            reader.readAsDataURL(file);
        } else if (file) {
            addToast('יש להעלות קובץ PDF בלבד', 'warning');
        }
    };

    const sortedItems = useMemo(() => {
        if (!group) return [];
        return [...group.items].sort((a, b) => {
            if (sortOrder === 'name-asc') {
                return a.name.localeCompare(b.name, 'he');
            }
            if (sortOrder === 'createdAt-desc') {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            return 0;
        });
    }, [group, sortOrder]);

    const imagesForUploader: AnnotatedImage[] = useMemo(() => {
        if (!editingItem?.images) return [];
        // FIX: Ensure all properties for AnnotatedImage are correctly preserved or defaulted.
        // Specifically, annotationData should be a valid JSON array string '[]' and createdAt should be preserved.
        return editingItem.images.map(img => ({
            ...img,
            id: img.id,
            // Ensure all required fields for the uploader are present with fallbacks
            originalDataUrl: img.originalDataUrl || img.dataUrl,
            originalUrl: img.originalUrl || img.url,
            annotationData: img.annotationData || '[]', // Preserve existing, default to valid '[]'
            createdAt: img.createdAt || new Date().toISOString(),
        }));
    }, [editingItem]);


    if (isLoading) return <LoadingSpinner text="טוען פריטים..." />;
    if (!project || !location || !group) return <div className="text-center p-8">Data not found.</div>;

    return (
        <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
            {/* Header & Controls */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <nav className="text-xs mb-1.5 flex items-center gap-1.5 text-slate-400">
                        <Link to={`/project/${projectId}`} className="text-sky-600 hover:underline font-medium">{project.name}</Link>
                        <span>/</span>
                        <Link to={`/project/${projectId}/inventory`} className="text-sky-600 hover:underline font-medium">מלאי</Link>
                        <span>/</span>
                        <Link to={`/project/${projectId}/inventory/location/${locationId}`} className="text-sky-600 hover:underline font-medium">{location.name}</Link>
                    </nav>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        {group.name}
                        <span className="text-xs bg-sky-50 text-sky-800 border border-sky-100 px-2.5 py-0.5 rounded-full font-bold">
                            {sortedItems.length} פריטים
                        </span>
                    </h1>
                </div>
                <button onClick={() => openItemModal()} className="btn-primary text-xs font-bold py-2.5 px-4 shadow-sm flex items-center gap-1.5">
                    <PlusIcon className="w-4 h-4"/> הוסף פריט
                </button>
            </div>

            {sortedItems.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl shadow-xs border border-slate-200/90 p-8">
                    <h3 className="text-base font-bold text-slate-800">לא נמצאו פריטים בקבוצה זו</h3>
                    <p className="text-slate-500 text-xs mt-1">השתמש בכפתור ״הוסף פריט״ כדי להוסיף רכיבים וציוד למלאי.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedItems.map(item => (
                        <div key={item.id} className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 hover:shadow-lg hover:border-sky-300 transition-all flex flex-col justify-between group">
                            <div className="flex-grow">
                                <div className="flex justify-between items-start gap-2">
                                    <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-700 transition-colors">{item.name}</h3>
                                    <span className="text-sm font-black text-sky-800 bg-sky-50 border border-sky-100/80 rounded-xl px-2.5 py-1 font-mono-numbers">{item.quantity}</span>
                                </div>
                                {(item.company || item.model) && <p className="text-xs text-slate-500 font-medium mt-0.5">{item.company} {item.model}</p>}
                                {item.description && <p className="text-xs text-slate-600 mt-2 line-clamp-3">{item.description}</p>}
                                {item.warrantyEndDate && <p className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md inline-block mt-2">אחריות עד: {formatDate(item.warrantyEndDate)}</p>}
                            </div>
                            <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                    {item.images.length > 0 && <button onClick={() => { setViewingItemForGallery(item); setIsGalleryModalOpen(true); }} className="text-xs font-bold text-sky-600 hover:underline">תמונות ({item.images.length})</button>}
                                    {item.manualPdf && <button onClick={() => { const src = item.manualPdf?.url || item.manualPdf?.dataUrl; if (src) { setViewingPdf({name: item.manualPdf!.name, dataUrl: src}); setIsPdfViewerOpen(true); }}} className="text-xs font-bold text-sky-600 hover:underline">מדריך</button>}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => handleQuantityChange(item.id, -1)} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-lg text-base font-bold transition-colors" title="הפחת כמות">-</button>
                                    <button onClick={() => handleQuantityChange(item.id, 1)} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-lg text-base font-bold transition-colors" title="הוסף כמות">+</button>
                                    <button onClick={() => openItemModal(item)} className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors" title="ערוך"><PencilIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="מחק"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title={editingItem?.id ? "עריכת פריט" : "הוספת פריט חדש"} size="lg">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input type="text" placeholder="שם הפריט*" value={editingItem?.name || ''} onChange={e => setEditingItem(p => ({ ...p, name: e.target.value }))} className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all" />
                        <input type="number" placeholder="כמות" value={editingItem?.quantity ?? 1} min="0" onChange={e => setEditingItem(p => ({ ...p, quantity: parseInt(e.target.value) || 0 }))} className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all" />
                        <input type="text" placeholder="חברה" value={editingItem?.company || ''} onChange={e => setEditingItem(p => ({ ...p, company: e.target.value }))} className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all" />
                        <input type="text" placeholder="דגם" value={editingItem?.model || ''} onChange={e => setEditingItem(p => ({ ...p, model: e.target.value }))} className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all" />
                    </div>
                    <textarea placeholder="תיאור" value={editingItem?.description || ''} onChange={e => setEditingItem(p => ({ ...p, description: e.target.value }))} className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all" rows={3}></textarea>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input type="text" placeholder="פרטי אחריות" value={editingItem?.warrantyInfo || ''} onChange={e => setEditingItem(p => ({ ...p, warrantyInfo: e.target.value }))} className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all" />
                        <div><label className="text-xs text-slate-500 mb-1 block">תאריך סיום אחריות</label><input type="date" value={editingItem?.warrantyEndDate ? editingItem.warrantyEndDate.split('T')[0] : ''} onChange={e => setEditingItem(p => ({ ...p, warrantyEndDate: e.target.value }))} className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all" /></div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">מדריך למשתמש (PDF)</label>
                        <input type="file" accept="application/pdf" onChange={handleManualUpload} className="w-full text-xs text-slate-500 file:mr-4 file:rtl:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 border border-slate-200 rounded-xl"/>
                        {editingItem?.manualPdf && <p className="text-xs text-slate-500 mt-1">{editingItem.manualPdf.name}</p>}
                    </div>
                    <ImageUploader images={imagesForUploader} onImagesChange={handleItemImageChange} maxImages={5} allowNotes={true} />
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <button onClick={() => setIsItemModalOpen(false)} className="btn-secondary text-xs">ביטול</button>
                        <button onClick={handleSaveItem} className="btn-primary text-xs font-bold">שמור</button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={isGalleryModalOpen} onClose={() => setIsGalleryModalOpen(false)} title={`תמונות עבור: ${viewingItemForGallery?.name}`}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {viewingItemForGallery?.images.map(img => <img key={img.id} src={img.url || img.dataUrl} alt={img.name} className="w-full h-40 object-cover rounded-xl"/>)}
                </div>
            </Modal>
            
            <Modal isOpen={isPdfViewerOpen} onClose={() => setIsPdfViewerOpen(false)} title={`מדריך: ${viewingPdf?.name}`} size="xl">
                {viewingPdf?.dataUrl && <iframe src={viewingPdf.dataUrl} title={viewingPdf.name} className="w-full h-[75vh]" frameBorder="0"/>}
            </Modal>
        </div>
    );
};
