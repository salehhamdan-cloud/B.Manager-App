import React, { useState, useEffect, useCallback, useMemo, ChangeEvent, useRef } from 'react';
import { Supplier } from '../types';
import * as dbService from '../services/dbService';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PlusIcon, PencilIcon, TrashIcon, ArrowDownTrayIcon, MagnifyingGlassIcon } from '../components/icons/ActionIcons';
import Modal from '../components/common/Modal';
import { generateId } from '../utils/idGenerator';
import CollapsibleSection from '../components/common/CollapsibleSection';
import { SparklesIcon } from '../components/icons/AiIcons';
import * as aiService from '../services/aiService.ts';
import { convertPdfToText } from '../utils/pdfUtils';
import { exportToCsv } from '../utils/exportUtils';
import { generateSuppliersPdf } from '../services/pdfService';
import { useSettings } from '../contexts/SettingsContext';
import { PhoneIcon, EnvelopeIcon, MapPinIcon } from '../components/icons/ContactIcons';

const SuppliersPage: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();
    const { settings } = useSettings();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedSuppliers, setSelectedSuppliers] = useState<Record<string, boolean>>({});
    const selectedCount = Object.keys(selectedSuppliers).length;

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await dbService.getAllSuppliers();
            setSuppliers(data);
        } catch (error) {
            addToast('שגיאה בטעינת ספקים', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!isEditMode) {
            setSelectedSuppliers({});
        }
    }, [isEditMode]);

    const openModal = (supplier: Partial<Supplier> | null = null) => {
        setEditingSupplier(supplier ? { ...supplier } : {
            group: '', name: '', phone: '', email: '', companyId: '', address: ''
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!editingSupplier || !editingSupplier.name?.trim() || !editingSupplier.group?.trim()) {
            addToast('שם, וקבוצה הם שדות חובה', 'warning');
            return;
        }

        try {
            if (editingSupplier.id) {
                const supplierToUpdate = { ...editingSupplier, updatedAt: new Date().toISOString() } as Supplier;
                await dbService.updateSupplier(supplierToUpdate);
                addToast('הספק עודכן', 'success');
            } else {
                const newSupplier: Supplier = {
                    id: generateId(),
                    ...editingSupplier,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                } as Supplier;
                await dbService.addSupplier(newSupplier);
                addToast('ספק חדש נוסף', 'success');
            }
            setIsModalOpen(false);
            setEditingSupplier(null);
            fetchData();
        } catch (error) {
            addToast('שגיאה בשמירת הספק', 'error');
        }
    };

    const handleDelete = async (supplierId: string) => {
        if (window.confirm("האם למחוק ספק זה?")) {
            try {
                await dbService.deleteSupplier(supplierId);
                addToast('הספק נמחק', 'success');
                fetchData();
            } catch (error) {
                addToast('שגיאה במחיקת הספק', 'error');
            }
        }
    };
    
    const handleAiImport = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAiProcessing(true);
        addToast('מעבד קובץ ספקים...', 'info');

        try {
            let text = '';
            if (file.type === 'application/pdf') {
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (event) => resolve(event.target?.result as string);
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(file);
                });
                text = await convertPdfToText(dataUrl);
            } else if (file.type === 'text/csv') {
                text = await file.text();
            } else {
                throw new Error('סוג קובץ לא נתמך. יש להעלות PDF או CSV.');
            }

            const aiSuppliers = await aiService.generateSuppliersFromText(text);

            const newSuppliers: Supplier[] = aiSuppliers.map(s => ({
                id: generateId(),
                group: s.group || 'כללי',
                name: s.name || 'N/A',
                phone: s.phone || '',
                email: s.email || '',
                address: s.address || '',
                companyId: s.companyId || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }));
            
            await Promise.all(newSuppliers.map(s => dbService.addSupplier(s)));

            addToast(`${newSuppliers.length} ספקים נוספו בהצלחה!`, 'success');
            fetchData();

        } catch (error) {
            addToast(error instanceof Error ? error.message : 'שגיאה ביבוא הספקים', 'error');
        } finally {
            setIsAiProcessing(false);
            if (e.target) e.target.value = '';
        }
    };
    
    const handleExportCsv = () => {
        const suppliersToExport = selectedCount > 0 ? suppliers.filter(s => selectedSuppliers[s.id]) : suppliers;
        if (suppliersToExport.length === 0) {
            addToast('לא נבחרו ספקים לייצוא', 'warning');
            return;
        }

        const dataToExport = suppliersToExport.map(s => ({
            'תחום': s.group,
            'שם': s.name,
            'טלפון': s.phone,
            'מייל': s.email,
            'כתובת': s.address || '',
            'ח.פ': s.companyId,
        }));
        exportToCsv(dataToExport, selectedCount > 0 ? 'selected_suppliers' : 'suppliers_list');
    };

    const handleExportPdf = () => {
        const suppliersToExport = selectedCount > 0 ? suppliers.filter(s => selectedSuppliers[s.id]) : suppliers;
         if (suppliersToExport.length === 0) {
            addToast('לא נבחרו ספקים לייצוא', 'warning');
            return;
        }
        generateSuppliersPdf({ settings, suppliers: suppliersToExport });
    };

    const filteredSuppliers = useMemo(() => {
        if (!searchTerm) return suppliers;
        const lowercasedTerm = searchTerm.toLowerCase();
        return suppliers.filter(s =>
            s.name.toLowerCase().includes(lowercasedTerm) ||
            s.group.toLowerCase().includes(lowercasedTerm) ||
            s.phone.toLowerCase().includes(lowercasedTerm) ||
            s.email.toLowerCase().includes(lowercasedTerm) ||
            s.companyId.toLowerCase().includes(lowercasedTerm)
        );
    }, [suppliers, searchTerm]);

    const groupedSuppliers = useMemo(() => {
        return filteredSuppliers.reduce((acc, supplier) => {
            const groupName = supplier.group || 'ללא קבוצה';
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(supplier);
            return acc;
        }, {} as Record<string, Supplier[]>);
    }, [filteredSuppliers]);

    const sortedGroupKeys = useMemo(() => Object.keys(groupedSuppliers).sort((a,b) => a.localeCompare(b, 'he')), [groupedSuppliers]);
    
    const handleSelectGroup = (groupName: string, isChecked: boolean) => {
        const groupSupplierIds = groupedSuppliers[groupName].map(s => s.id);
        setSelectedSuppliers(prev => {
            const newSelection = { ...prev };
            if (isChecked) {
                groupSupplierIds.forEach(id => newSelection[id] = true);
            } else {
                groupSupplierIds.forEach(id => delete newSelection[id]);
            }
            return newSelection;
        });
    };

    const handleSelectSupplier = (supplierId: string) => {
        setSelectedSuppliers(prev => {
            const newSelection = { ...prev };
            if (newSelection[supplierId]) {
                delete newSelection[supplierId];
            } else {
                newSelection[supplierId] = true;
            }
            return newSelection;
        });
    };

    const handleDeleteSelected = async () => {
        if (selectedCount === 0) return;
        if (window.confirm(`האם למחוק ${selectedCount} ספקים נבחרים?`)) {
            const idsToDelete = Object.keys(selectedSuppliers);
            try {
                await dbService.deleteSuppliers(idsToDelete);
                addToast(`${selectedCount} ספקים נמחקו`, 'success');
                setSelectedSuppliers({});
                fetchData();
            } catch (error) {
                addToast('שגיאה במחיקת ספקים', 'error');
            }
        }
    };

    if (isLoading) return <LoadingSpinner text="טוען ספקים..." />;

    return (
        <div className="space-y-6">
             {isAiProcessing && (
                <div className="fixed inset-0 bg-slate-900 bg-opacity-60 backdrop-blur-sm z-[1001] flex items-center justify-center">
                    <LoadingSpinner text="מייבא ספקים בעזרת AI..."/>
                </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf,text/csv" className="hidden" />

            {/* Header & Controls */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">ניהול ספקים ונותני שירות</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">מאגר ספקים, אנשי מקצוע, מספרי ח.פ ופרטי התקשרות</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <button onClick={handleExportPdf} className="btn-secondary text-xs sm:text-sm flex items-center gap-1.5">
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        <span>PDF {isEditMode && selectedCount > 0 && `(${selectedCount})`}</span>
                    </button>
                    <button onClick={handleExportCsv} className="btn-secondary text-xs sm:text-sm flex items-center gap-1.5">
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        <span>Excel</span>
                    </button>
                    <button onClick={handleAiImport} className="btn-secondary text-xs sm:text-sm flex items-center gap-1.5 text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200">
                        <SparklesIcon className="w-4 h-4 text-purple-600" />
                        <span>ייבוא AI</span>
                    </button>
                    <button 
                        onClick={() => setIsEditMode(!isEditMode)} 
                        className={`text-xs sm:text-sm px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                            isEditMode ? 'bg-sky-600 text-white shadow-xs' : 'btn-secondary'
                        }`}
                    >
                        <PencilIcon className="w-4 h-4"/>
                        <span>{isEditMode ? 'סיום עריכה' : 'ניהול קבוצתי'}</span>
                    </button>
                    <button onClick={() => openModal()} className="btn-primary text-xs sm:text-sm flex items-center gap-1.5">
                        <PlusIcon className="w-4 h-4"/>
                        <span>הוסף ספק</span>
                    </button>
                </div>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
                <span className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-400">
                    <MagnifyingGlassIcon className="w-5 h-5" />
                </span>
                <input
                    type="search"
                    placeholder="חיפוש לפי שם ספק, תחום, טלפון, עיר או ח.פ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-11 pl-4 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-2xs transition-all"
                />
            </div>

            {suppliers.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-8">
                    <p className="text-slate-500 text-base font-medium">לא נמצאו ספקים במערכת.</p>
                    <p className="text-xs text-slate-400 mt-1">לחץ על 'הוסף ספק' או 'ייבוא AI' כדי להזין ספקים.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedGroupKeys.map(groupName => {
                        const suppliersInGroup = groupedSuppliers[groupName];
                        const areAllInGroupSelected = suppliersInGroup.length > 0 && suppliersInGroup.every(s => selectedSuppliers[s.id]);
                        
                        return (
                            <CollapsibleSection
                                key={groupName}
                                count={suppliersInGroup.length}
                                title={
                                    <div className="flex items-center gap-3">
                                        {isEditMode && (
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                                                checked={areAllInGroupSelected}
                                                onChange={(e) => handleSelectGroup(groupName, e.target.checked)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        )}
                                        <span className="font-bold text-slate-900">{groupName}</span>
                                    </div>
                                }
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {suppliersInGroup.map(supplier => (
                                        <div
                                            key={supplier.id}
                                            className={`bg-white p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between group ${
                                                isEditMode ? 'cursor-pointer' : ''
                                            } ${
                                                selectedSuppliers[supplier.id] 
                                                ? 'bg-sky-50/60 border-sky-300 ring-2 ring-sky-200' 
                                                : 'border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
                                            }`}
                                            onClick={isEditMode ? () => handleSelectSupplier(supplier.id) : undefined}
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {isEditMode && (
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 flex-shrink-0"
                                                            checked={!!selectedSuppliers[supplier.id]}
                                                            onChange={() => handleSelectSupplier(supplier.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    )}
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center flex-shrink-0 border border-slate-200/70 text-sm">
                                                        {supplier.name.slice(0, 2)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-slate-900 text-base truncate tracking-tight">
                                                            {supplier.name}
                                                        </h4>
                                                        {supplier.companyId && (
                                                            <p className="text-xs text-slate-400 font-mono-numbers">
                                                                ח.פ: {supplier.companyId}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {isEditMode && (
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); openModal(supplier); }} 
                                                            className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                                                            title="עריכת פרטי ספק"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(supplier.id); }} 
                                                            className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="מחק ספק"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <div className="flex items-center gap-2">
                                                        <PhoneIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>
                                                        <a href={`tel:${supplier.phone}`} className="text-sky-700 hover:underline font-mono-numbers font-medium">
                                                            {supplier.phone}
                                                        </a>
                                                    </div>
                                                    {supplier.email && (
                                                        <div className="flex items-center gap-1.5 truncate">
                                                            <EnvelopeIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>
                                                            <a href={`mailto:${supplier.email}`} className="text-slate-600 hover:underline truncate">
                                                                {supplier.email}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                                {supplier.address && (
                                                    <p className="flex items-center gap-1.5 text-slate-500 pt-0.5 truncate">
                                                        <MapPinIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>
                                                        <span className="truncate">{supplier.address}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CollapsibleSection>
                        );
                    })}
                </div>
            )}
            
            {isEditMode && selectedCount > 0 && (
                <div className="fixed bottom-24 inset-x-4 max-w-xl mx-auto z-40 bg-slate-900 text-white rounded-2xl shadow-xl p-4 flex justify-between items-center animate-fadeInUp border border-slate-800">
                    <span className="text-sm font-semibold">{selectedCount} ספקים נבחרו</span>
                    <button onClick={handleDeleteSelected} className="flex items-center gap-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 rounded-xl text-xs font-bold transition-colors">
                        <TrashIcon className="w-4 h-4" /> מחק נבחרים
                    </button>
                </div>
            )}
            
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSupplier?.id ? "עריכת ספק" : "הוספת ספק חדש"} size="md">
                {editingSupplier && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">שם הספק *</label>
                                <input type="text" placeholder="שם החברה או איש המקצוע" value={editingSupplier.name || ''} onChange={e => setEditingSupplier(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">תחום / קבוצה *</label>
                                <input type="text" placeholder="מעליות, אינסטלציה, חשמל..." value={editingSupplier.group || ''} onChange={e => setEditingSupplier(prev => ({ ...prev, group: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">טלפון</label>
                                <input type="tel" placeholder="050-0000000" value={editingSupplier.phone || ''} onChange={e => setEditingSupplier(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">דואר אלקטרוני</label>
                                <input type="email" placeholder="supplier@example.com" value={editingSupplier.email || ''} onChange={e => setEditingSupplier(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">כתובת / עיר</label>
                            <input type="text" placeholder="רחוב, מספר ועיר" value={editingSupplier.address || ''} onChange={e => setEditingSupplier(prev => ({ ...prev, address: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">מספר ח.פ / עוסק מורשה</label>
                            <input type="text" placeholder="515000000" value={editingSupplier.companyId || ''} onChange={e => setEditingSupplier(prev => ({ ...prev, companyId: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-mono-numbers" />
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                            <button onClick={() => setIsModalOpen(false)} className="btn-secondary text-sm">ביטול</button>
                            <button onClick={handleSave} className="btn-primary text-sm">שמור ספק</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default SuppliersPage;