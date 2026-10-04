import React, { useState, ChangeEvent } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { generateId } from '../utils/idGenerator';
import { StoredFile } from '../types';
import { PlusIcon, PencilIcon } from '../components/icons/ActionIcons';
import { CheckCircleIcon } from '../components/icons/FeedbackIcons';
import { optimizeImage } from '../services/imageService';
import LoadingSpinner from '../components/common/LoadingSpinner';

const OrderListPage: React.FC = () => {
    const { settings, updateSettings, isLoading: isSettingsLoading } = useSettings();
    const { addToast } = useToast();

    const [newItemName, setNewItemName] = useState('');
    const [newItemQuantity, setNewItemQuantity] = useState(1);
    const [newItemPhoto, setNewItemPhoto] = useState<StoredFile | null>(null);

    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingItemName, setEditingItemName] = useState('');
    const [editingItemQuantity, setEditingItemQuantity] = useState(1);
    const [editingItemPhoto, setEditingItemPhoto] = useState<StoredFile | null>(null);

    const orderList = settings.inventoryOrderList || [];

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'new' | 'edit') => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const optimized = await optimizeImage(file, 200, 200);
            const photo: StoredFile = {
                name: optimized.name,
                mimeType: optimized.mimeType,
                dataUrl: optimized.dataUrl
            };
            if (type === 'new') {
                setNewItemPhoto(photo);
            } else {
                setEditingItemPhoto(photo);
            }
        } catch (error) {
            addToast('שגיאה בעיבוד התמונה', 'error');
        } finally {
            e.target.value = ''; // Reset file input
        }
    };

    const handleAddItem = async () => {
        if (!newItemName.trim()) {
            addToast('יש להזין שם פריט', 'warning');
            return;
        }
        const newItem = {
            id: generateId(),
            name: newItemName.trim(),
            quantity: newItemQuantity,
            photo: newItemPhoto || undefined
        };
        try {
            await updateSettings({ inventoryOrderList: [...orderList, newItem] });
            setNewItemName('');
            setNewItemQuantity(1);
            setNewItemPhoto(null);
            addToast('הפריט נוסף לרשימה', 'success');
        } catch (e) {
            addToast('שגיאה בהוספת פריט', 'error');
        }
    };
    
    const handleMarkAsOrdered = async (id: string) => {
        const itemToMark = orderList.find(item => item.id === id);
        if (!itemToMark) return;

        if (window.confirm(`האם לסמן את '${itemToMark.name}' כמוזמן? הפריט יוסר מהרשימה.`)) {
            const updatedList = orderList.filter(item => item.id !== id);
            try {
                await updateSettings({ inventoryOrderList: updatedList });
                addToast('הפריט סומן כמוזמן והוסר', 'success');
            } catch (e) {
                addToast('שגיאה בסימון הפריט', 'error');
            }
        }
    };

    const startEditing = (item: typeof orderList[0]) => {
        setEditingItemId(item.id);
        setEditingItemName(item.name);
        setEditingItemQuantity(item.quantity);
        setEditingItemPhoto(item.photo || null);
    };

    const handleUpdateItem = async () => {
        if (!editingItemId || !editingItemName.trim()) return;

        const updatedList = orderList.map(item =>
            item.id === editingItemId
                ? { ...item, name: editingItemName.trim(), quantity: editingItemQuantity, photo: editingItemPhoto || undefined }
                : item
        );

        try {
            await updateSettings({ inventoryOrderList: updatedList });
            setEditingItemId(null);
            addToast('הפריט עודכן', 'success');
        } catch (e) {
            addToast('שגיאה בעדכון הפריט', 'error');
        }
    };

    if (isSettingsLoading) {
        return <LoadingSpinner text="טוען רשימת הזמנות..." />;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
            {/* Header */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">פריטים להזמנה ורכש</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">רשימת ציוד וחלפים חסרים הדורשים הזמנה מספקים</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-mono-numbers px-3 py-1 bg-sky-50 text-sky-800 text-xs font-bold rounded-xl border border-sky-100">
                        {orderList.length} פריטים ברשימה
                    </span>
                </div>
            </div>

            {/* Add New Item Card */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200/90 space-y-4">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">הוסף פריט חדש לרכש</h2>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input 
                        type="text" 
                        value={newItemName} 
                        onChange={e => setNewItemName(e.target.value)} 
                        placeholder="שם הפריט או מק״ט..." 
                        className="sm:col-span-3 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" 
                    />
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">כמות:</span>
                        <input 
                            type="number" 
                            min="1" 
                            value={newItemQuantity} 
                            onChange={e => setNewItemQuantity(parseInt(e.target.value, 10) || 1)} 
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono-numbers font-bold text-center focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" 
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap pt-1">
                    <label className="cursor-pointer text-xs font-semibold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-2">
                        <span>📷 צרף תמונה</span>
                        <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'new')} className="hidden" />
                    </label>
                    {newItemPhoto && (
                        <div className="relative group">
                            <img src={newItemPhoto.dataUrl} alt="Preview" className="w-12 h-12 object-cover rounded-xl border border-slate-200 shadow-2xs" />
                            <button onClick={() => setNewItemPhoto(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs shadow-xs" title="הסר תמונה">
                                &times;
                            </button>
                        </div>
                    )}
                    <div className="mr-auto rtl:ml-auto rtl:mr-0">
                        <button onClick={handleAddItem} className="btn-primary text-xs sm:text-sm flex items-center gap-2">
                            <PlusIcon className="w-4 h-4"/>
                            <span>הוסף לרשימה</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Items List */}
            {orderList.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-8">
                    <p className="text-slate-500 text-base font-medium">רשימת ההזמנות ריקה כרגע.</p>
                    <p className="text-xs text-slate-400 mt-1">כל הציוד במלאי תקין, או שההזמנות סופקו.</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {orderList.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-4 hover:shadow-xs hover:border-slate-300 transition-all">
                            {editingItemId === item.id ? (
                                <div className="flex-grow flex flex-col sm:flex-row items-center gap-3">
                                    <div className="w-12 h-12 flex-shrink-0 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                                        {(editingItemPhoto?.url || editingItemPhoto?.dataUrl) && (
                                            <img src={editingItemPhoto.url || editingItemPhoto.dataUrl} alt={editingItemName} className="w-full h-full object-cover"/>
                                        )}
                                    </div>
                                    <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                                        <input type="text" value={editingItemName} onChange={e => setEditingItemName(e.target.value)} className="sm:col-span-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                                        <input type="number" min="1" value={editingItemQuantity} onChange={e => setEditingItemQuantity(parseInt(e.target.value, 10) || 1)} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono-numbers text-center" />
                                    </div>
                                    <div className="flex-shrink-0 flex items-center gap-2">
                                        <button onClick={handleUpdateItem} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="שמור שינויים">
                                            <CheckCircleIcon className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => setEditingItemId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors">
                                            &times;
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="w-12 h-12 flex-shrink-0 bg-slate-100 rounded-xl overflow-hidden border border-slate-200/80 flex items-center justify-center text-slate-400">
                                        {(item.photo?.url || item.photo?.dataUrl) ? (
                                            <img src={item.photo.url || item.photo.dataUrl} alt={item.name} className="w-full h-full object-cover"/>
                                        ) : (
                                            <span className="text-xs font-bold text-slate-400">📦</span>
                                        )}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <p className="font-bold text-slate-900 text-sm sm:text-base truncate tracking-tight">{item.name}</p>
                                    </div>
                                    <span className="font-mono-numbers font-bold text-xs sm:text-sm text-sky-800 bg-sky-50 border border-sky-100/80 rounded-xl px-3 py-1">
                                        x{item.quantity}
                                    </span>
                                    <div className="flex-shrink-0 flex items-center gap-1">
                                        <button onClick={() => startEditing(item)} className="p-2 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-xl transition-colors" title="ערוך פריט">
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleMarkAsOrdered(item.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="סמן כמוזמן וסגור">
                                            <CheckCircleIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OrderListPage;