import React, { useState, useEffect, useCallback } from 'react';
import { FormTemplate, FormItem, FormItemType, FormGroup } from '../types';
import * as dbService from '../services/dbService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import { generateId } from '../utils/idGenerator';
import { useToast } from '../contexts/ToastContext';
import { PlusIcon, PencilIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from '../components/icons/ActionIcons';
import { formatDateTime } from '../utils/dateFormatter';
import CollapsibleSection from '../components/common/CollapsibleSection';
import { SparklesIcon } from '../components/icons/AiIcons';
import * as pdfUtils from '../utils/pdfUtils';
import * as aiService from '../services/aiService.ts';

const formItemTypeOptions: { value: FormItemType; label: string }[] = [
    { value: FormItemType.YES_NO, label: 'כן/לא' },
    { value: FormItemType.OK_NOT_OK, label: 'תקין/לא' },
    { value: FormItemType.OK_NOT_OK_NA, label: 'תקין/לא/לא רלוונטי' },
    { value: FormItemType.OPTIONS, label: 'אפשרויות' },
    { value: FormItemType.TEXT, label: 'טקסט' },
    { value: FormItemType.DATE, label: 'תאריך' },
];


const FormTemplatesListPage: React.FC = () => {
    const [templates, setTemplates] = useState<FormTemplate[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [editingTemplate, setEditingTemplate] = useState<Partial<FormTemplate> | null>(null);
    const { addToast } = useToast();
    
    // State for AI PDF Conversion
    const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [isConvertingPdf, setIsConvertingPdf] = useState<boolean>(false);


    const fetchTemplates = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await dbService.getAllFormTemplates();
            setTemplates(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (error) {
            addToast('שגיאה בטעינת תבניות', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const openModalForNew = () => {
        setEditingTemplate({ name: '', description: '', groups: [] });
        setIsModalOpen(true);
    };

    const openModalForEdit = (template: FormTemplate) => {
        setEditingTemplate(JSON.parse(JSON.stringify(template))); // Deep copy for safe editing
        setIsModalOpen(true);
    };

    const handleDeleteTemplate = async (id: string) => {
        if (window.confirm('האם למחוק תבנית זו? לא ניתן לשחזר פעולה זו.')) {
            try {
                await dbService.deleteFormTemplate(id);
                addToast('התבנית נמחקה', 'success');
                fetchTemplates();
            } catch (error) {
                addToast('שגיאה במחיקת התבנית', 'error');
            }
        }
    };
    
    const handleSaveTemplate = async () => {
        if (!editingTemplate || !editingTemplate.name) {
            addToast('שם התבנית הוא שדה חובה', 'warning');
            return;
        }

        const templateToSave: FormTemplate = {
            id: editingTemplate.id || generateId(),
            name: editingTemplate.name,
            description: editingTemplate.description || '',
            groups: editingTemplate.groups || [],
            createdAt: editingTemplate.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        try {
            if (editingTemplate.id) {
                await dbService.updateFormTemplate(templateToSave);
                addToast('התבנית עודכנה', 'success');
            } else {
                await dbService.addFormTemplate(templateToSave);
                addToast('תבנית חדשה נוצרה', 'success');
            }
            setIsModalOpen(false);
            setEditingTemplate(null);
            fetchTemplates();
        } catch (error) {
            addToast('שגיאה בשמירת התבנית', 'error');
        }
    };

    // --- Group Handlers ---
    const addNewGroup = () => {
        if (!editingTemplate) return;
        const newGroup: FormGroup = {
            id: generateId(),
            name: 'קבוצה חדשה',
            items: []
        };
        setEditingTemplate(prev => ({ ...prev, groups: [...(prev!.groups || []), newGroup] }));
    };

    const removeGroup = (groupId: string) => {
        if (!editingTemplate) return;
        setEditingTemplate(prev => ({ ...prev, groups: prev!.groups?.filter(g => g.id !== groupId) }));
    };

    const handleGroupChange = (groupId: string, field: 'name', value: string) => {
        if (!editingTemplate) return;
        setEditingTemplate(prev => ({
            ...prev,
            groups: prev!.groups?.map(g => g.id === groupId ? { ...g, [field]: value } : g)
        }));
    };
    
    const handleMoveGroup = (groupId: string, direction: 'up' | 'down') => {
        if (!editingTemplate || !editingTemplate.groups) return;
        const groups = [...editingTemplate.groups];
        const index = groups.findIndex(g => g.id === groupId);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= groups.length) return;

        [groups[index], groups[newIndex]] = [groups[newIndex], groups[index]]; // Swap

        setEditingTemplate(prev => ({ ...prev!, groups }));
    };

    // --- Item Handlers (now group-aware) ---
    const addNewItem = (groupId: string, type: FormItemType) => {
        if (!editingTemplate) return;
        const newItem: FormItem = {
            id: generateId(),
            label: `שאלה חדשה`,
            description: '',
            type: type,
            required: false,
            ...(type === 'options' && { options: ['אפשרות 1', 'אפשרות 2'] }),
        };
        setEditingTemplate(prev => ({
            ...prev,
            groups: prev!.groups?.map(g => 
                g.id === groupId ? { ...g, items: [...g.items, newItem] } : g
            )
        }));
    };

    const removeItem = (groupId: string, itemId: string) => {
        if (!editingTemplate) return;
        setEditingTemplate(prev => ({
            ...prev,
            groups: prev!.groups?.map(g =>
                g.id === groupId ? { ...g, items: g.items.filter(item => item.id !== itemId) } : g
            )
        }));
    };

    const handleItemChange = (groupId: string, itemId: string, field: keyof FormItem, value: any) => {
        if (!editingTemplate) return;
        setEditingTemplate(prev => ({
            ...prev,
            groups: prev!.groups?.map(g => {
                if (g.id !== groupId) return g;

                return {
                    ...g,
                    items: g.items.map(item => {
                        if (item.id !== itemId) return item;
                        
                        const updatedItem = { ...item, [field]: value };
                        
                        // If type is changed to 'options' and options array doesn't exist, initialize it.
                        if (field === 'type' && value === 'options' && !updatedItem.options) {
                            updatedItem.options = ['אפשרות 1', 'אפשרות 2'];
                        }

                        return updatedItem;
                    })
                };
            })
        }));
    };
    
    const handleMoveItem = (groupId: string, itemId: string, direction: 'up' | 'down') => {
        if (!editingTemplate || !editingTemplate.groups) return;
        const newGroups = editingTemplate.groups.map(group => {
            if (group.id === groupId) {
                const items = [...group.items];
                const index = items.findIndex(item => item.id === itemId);
                if (index === -1) return group;

                const newIndex = direction === 'up' ? index - 1 : index + 1;
                if (newIndex < 0 || newIndex >= items.length) return group;

                [items[index], items[newIndex]] = [items[newIndex], items[index]]; // Swap

                return { ...group, items };
            }
            return group;
        });

        setEditingTemplate(prev => ({ ...prev!, groups: newGroups }));
    };

    const handleConvertPdf = async () => {
        if (!pdfFile) {
            addToast('יש לבחור קובץ PDF', 'warning');
            return;
        }
        setIsConvertingPdf(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(pdfFile);
            reader.onload = async (event) => {
                try {
                    const pdfDataUrl = event.target?.result as string;
                    if (!pdfDataUrl) throw new Error("Could not read file.");

                    addToast('מעבד PDF... שלב 1/2: קריאת טקסט', 'info');
                    const text = await pdfUtils.convertPdfToText(pdfDataUrl);
                    if (!text.trim()) {
                        throw new Error("לא נמצא טקסט בקובץ ה-PDF.");
                    }

                    addToast('מעבד PDF... שלב 2/2: בניית טופס עם AI', 'info');
                    const aiTemplate = await aiService.generateFormTemplateFromPdfText(text);

                    const augmentedGroups = (aiTemplate.groups || []).map(group => ({
                        ...group,
                        id: group.id || generateId(),
                        items: (group.items || []).map(item => ({
                            ...item,
                            id: item.id || generateId(),
                            required: item.required ?? false,
                            description: item.description || '',
                        }))
                    }));

                    setEditingTemplate({
                        name: aiTemplate.name || pdfFile.name.replace(/\.pdf$/i, ''),
                        description: aiTemplate.description || '',
                        groups: augmentedGroups,
                    });
                    setIsPdfModalOpen(false);
                    setIsModalOpen(true);
                    addToast('הטופס נוצר! בדוק וערוך לפני השמירה.', 'success');
                } catch (error) {
                    console.error(error);
                    addToast(error instanceof Error ? error.message : 'שגיאה בהמרת ה-PDF', 'error');
                } finally {
                    setIsConvertingPdf(false);
                    setPdfFile(null);
                }
            };
            reader.onerror = () => {
                 addToast('שגיאה בקריאת הקובץ', 'error');
                 setIsConvertingPdf(false);
            };

        } catch (error) {
            addToast('שגיאה לא צפויה', 'error');
            setIsConvertingPdf(false);
        }
    };


    if (isLoading) return <LoadingSpinner text="טוען תבניות..." />;

    const renderTemplateEditor = () => (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTemplate?.id ? 'עריכת תבנית טופס' : 'יצירת תבנית חדשה'} size="xl">
            {editingTemplate && <div className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">שם התבנית *</label>
                    <input type="text" placeholder="למשל: פרוטוקול מסירת דירה, ביקורת מעליות..." value={editingTemplate.name} onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">תיאור (אופציונלי)</label>
                    <input type="text" placeholder="הסבר תמציתי על מטרת הטופס..." value={editingTemplate.description} onChange={e => setEditingTemplate({...editingTemplate, description: e.target.value})} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" />
                </div>
                
                <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">קבוצות שאלות ופרקים</h4>
                        <button onClick={addNewGroup} className="btn-secondary flex items-center gap-1 text-xs sm:text-sm">
                            <PlusIcon className="w-4 h-4"/>
                            <span>הוסף קבוצה</span>
                        </button>
                    </div>
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto p-2 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                        {editingTemplate.groups?.map((group, groupIndex) => (
                            <div key={group.id} className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-3">
                                <div className="flex items-center gap-2">
                                     <div className="flex flex-col">
                                        <button
                                            type="button"
                                            onClick={() => handleMoveGroup(group.id, 'up')}
                                            disabled={groupIndex === 0}
                                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                        >
                                            <ChevronUpIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMoveGroup(group.id, 'down')}
                                            disabled={groupIndex === (editingTemplate.groups?.length || 0) - 1}
                                            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                        >
                                            <ChevronDownIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <input type="text" placeholder="שם הקבוצה (למשל: סלון, אינסטלציה, מערכות גג)" value={group.name} onChange={e => handleGroupChange(group.id, 'name', e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 flex-grow" />
                                    <button onClick={() => removeGroup(group.id)} className="p-2 text-slate-400 hover:text-red-700 rounded-xl hover:bg-red-50 transition-colors"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                                <div className="pl-3 border-r-2 border-slate-200 space-y-2">
                                    {group.items.map((item, itemIndex) => (
                                        <div key={item.id} className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                                            <div className="flex items-start gap-2">
                                                 <div className="flex flex-col pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMoveItem(group.id, item.id, 'up')}
                                                        disabled={itemIndex === 0}
                                                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                                    >
                                                        <ChevronUpIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMoveItem(group.id, item.id, 'down')}
                                                        disabled={itemIndex === group.items.length - 1}
                                                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                                                    >
                                                        <ChevronDownIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <div className="flex-grow space-y-2">
                                                    <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-2">
                                                        <input type="text" value={item.label} onChange={e => handleItemChange(group.id, item.id, 'label', e.target.value)} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm flex-grow" placeholder="תוכן השאלה"/>
                                                        <select
                                                            value={item.type}
                                                            onChange={e => handleItemChange(group.id, item.id, 'type', e.target.value as FormItemType)}
                                                            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                                                        >
                                                            {formItemTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                                        </select>
                                                        <button onClick={() => removeItem(group.id, item.id)} className="p-1 text-slate-400 hover:text-red-700 rounded-lg"><TrashIcon className="w-4 h-4"/></button>
                                                    </div>
                                                    <textarea
                                                        value={item.description || ''}
                                                        onChange={e => handleItemChange(group.id, item.id, 'description', e.target.value)}
                                                        rows={2}
                                                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                                        placeholder="הוסף תיאור/הסבר לפריט (אופציונלי)"
                                                    />
                                                    {item.type === 'options' &&
                                                        <textarea value={item.options?.join('\n')} onChange={e => handleItemChange(group.id, item.id, 'options', e.target.value.split('\n'))} rows={2} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs" placeholder="כל אפשרות בשורה חדשה" />
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex flex-wrap gap-1.5 pt-2">
                                        <button onClick={() => addNewItem(group.id, FormItemType.YES_NO)} className="px-2.5 py-1 text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg transition-colors">+ כן/לא</button>
                                        <button onClick={() => addNewItem(group.id, FormItemType.OK_NOT_OK)} className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors">+ תקין/לא</button>
                                        <button onClick={() => addNewItem(group.id, FormItemType.OK_NOT_OK_NA)} className="px-2.5 py-1 text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors">+ תקין/לא/לא רלוונטי</button>
                                        <button onClick={() => addNewItem(group.id, FormItemType.OPTIONS)} className="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors">+ אפשרויות</button>
                                        <button onClick={() => addNewItem(group.id, FormItemType.TEXT)} className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">+ טקסט</button>
                                        <button onClick={() => addNewItem(group.id, FormItemType.DATE)} className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">+ תאריך</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                         {editingTemplate.groups?.length === 0 && <p className="text-slate-500 text-center p-6 text-sm">הוסף קבוצה כדי להתחיל לבנות את הטופס.</p>}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                    <button onClick={() => setIsModalOpen(false)} className="btn-secondary text-sm">ביטול</button>
                    <button onClick={handleSaveTemplate} className="btn-primary text-sm">שמור תבנית</button>
                </div>
            </div>}
        </Modal>
    );

    return (
        <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
            {/* Header & Controls */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">תבניות טפסים דיגיטליים</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">בנייה, עריכה והמרה חכמה של טפסי בדיקה, ביקורת ומסירה</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setIsPdfModalOpen(true)} className="btn-secondary text-xs sm:text-sm flex items-center gap-1.5 text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200">
                        <SparklesIcon className="w-4 h-4 text-purple-600"/>
                        <span>המר PDF (AI)</span>
                    </button>
                    <button onClick={openModalForNew} className="btn-primary text-xs sm:text-sm flex items-center gap-1.5">
                        <PlusIcon className="w-4 h-4" />
                        <span>צור תבנית חדשה</span>
                    </button>
                </div>
            </div>

            {templates.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-8">
                    <p className="text-slate-500 text-base font-medium">לא נמצאו תבניות טפסים.</p>
                    <p className="text-xs text-slate-400 mt-1">לחץ על 'צור תבנית חדשה' או המר קובץ PDF קיים באמצעות AI.</p>
                </div>
            ) : (
                <CollapsibleSection title={<h3 className="text-lg font-bold text-slate-900">תבניות מוגדרות במערכת</h3>} count={templates.length}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {templates.map(template => (
                            <div key={template.id} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group">
                                <div>
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="text-base font-bold text-slate-900 tracking-tight group-hover:text-sky-700 transition-colors">
                                            {template.name}
                                        </h3>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button 
                                                onClick={() => openModalForEdit(template)} 
                                                className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                                                title="ערוך תבנית"
                                            >
                                                <PencilIcon className="w-4 h-4"/>
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteTemplate(template.id)} 
                                                className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                title="מחק תבנית"
                                            >
                                                <TrashIcon className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </div>
                                    {template.description && (
                                        <p className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                                            {template.description}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between text-xs text-slate-400 pt-3 mt-3 border-t border-slate-100 font-mono-numbers">
                                    <span className="font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md text-[11px]">
                                        {template.groups.length} קבוצות שאלות
                                    </span>
                                    <span>עודכן: {formatDateTime(template.updatedAt)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CollapsibleSection>
            )}

            {renderTemplateEditor()}

            {/* AI PDF Convert Modal */}
            <Modal isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} title="המרת טופס PDF לתבנית דיגיטלית חכמה (AI)">
                {isConvertingPdf ? (
                    <LoadingSpinner text="מנתח טופס PDF ומחלץ שאלות בעזרת AI..." />
                ) : (
                    <div className="space-y-4">
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                            העלה קובץ PDF (דוח ביקורת, מסירה או בדיקה) והבינה המלאכותית תחלץ אוטומטית את מבנה השאלות, הקטגוריות וסוגי התשובות (כן/לא, תקין/לא תקין, טקסט).
                        </p>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                            <label className="block text-xs font-semibold text-slate-700 mb-2">בחר קובץ PDF לסריקה</label>
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => setPdfFile(e.target.files ? e.target.files[0] : null)}
                                className="block w-full text-xs text-slate-500 file:mr-4 file:rtl:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setIsPdfModalOpen(false)} className="btn-secondary text-sm">ביטול</button>
                            <button onClick={handleConvertPdf} disabled={!pdfFile} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50">
                                <SparklesIcon className="w-4 h-4"/>
                                <span>המר קובץ לטופס</span>
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default FormTemplatesListPage;