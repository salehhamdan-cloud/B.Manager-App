import React, { useState } from 'react';
import { BuildingSystemLog, BuildingSystemType } from '../types';
import * as dbService from '../services/dbService';
import { generateId } from '../utils/idGenerator';
import { useToast } from '../contexts/ToastContext';
import { formatDate } from '../utils/dateFormatter';
import { PlusIcon, PencilIcon, TrashIcon } from './icons/ActionIcons';
import Modal from './common/Modal';
import { WrenchScrewdriverIcon } from './icons/GeneralIcons';

interface BuildingSystemsSectionProps {
    buildingId: string;
    systemLogs: BuildingSystemLog[];
    onRefresh: () => void;
}

const SYSTEM_TYPE_CONFIG: Record<BuildingSystemType, { label: string; icon: string; defaultTitle: string }> = {
    elevator: { label: 'מעליות ומעלונים', icon: '🛗', defaultTitle: 'מעלית נוסעים ראשית' },
    generator: { label: 'גנרטור חירום ודלק', icon: '⚡', defaultTitle: 'גנרטור חירום דיזל' },
    hvac: { label: 'מיזוג אוויר ו-HVAC', icon: '❄️', defaultTitle: 'יחידת מיזוג וצ׳ילר' },
    fire_safety: { label: 'מערכות גילוי וכיבוי אש', icon: '🧯', defaultTitle: 'ספרינקלרים ומטפים' },
    water_pumps: { label: 'משאבות מים ומאגרים', icon: '💧', defaultTitle: 'משאבות לחץ מים' },
    electrical: { label: 'חדר חשמל ומדידה', icon: '🔌', defaultTitle: 'לוח חשמל ראשי' },
    other: { label: 'תשתית נוספת', icon: '⚙️', defaultTitle: 'מערכת תשתית' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    'תקין': { label: 'תקין', bg: 'bg-green-100', text: 'text-green-800' },
    'דורש בדיקה': { label: 'דורש בדיקה', bg: 'bg-amber-100', text: 'text-amber-800' },
    'תקול': { label: 'תקול', bg: 'bg-red-100', text: 'text-red-800' },
    'מושבת': { label: 'מושבת', bg: 'bg-slate-200', text: 'text-slate-800' },
};

export const BuildingSystemsSection: React.FC<BuildingSystemsSectionProps> = ({ buildingId, systemLogs, onRefresh }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<BuildingSystemLog | null>(null);
    const [formData, setFormData] = useState<Partial<BuildingSystemLog>>({});
    const { addToast } = useToast();

    const handleOpenAdd = (type: BuildingSystemType = 'elevator') => {
        setEditingLog(null);
        setFormData({
            systemType: type,
            title: SYSTEM_TYPE_CONFIG[type].defaultTitle,
            status: 'תקין',
            lastInspectionDate: new Date().toISOString().split('T')[0],
            nextInspectionDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0],
            technicianName: '',
            technicianPhone: '',
            notes: '',
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (log: BuildingSystemLog) => {
        setEditingLog(log);
        setFormData({ ...log });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.title?.trim()) {
            addToast('נא להזין שם או תיאור מערכת', 'warning');
            return;
        }

        try {
            if (editingLog) {
                const updated: BuildingSystemLog = {
                    ...editingLog,
                    ...formData,
                    title: formData.title.trim(),
                    updatedAt: new Date().toISOString(),
                } as BuildingSystemLog;
                await dbService.updateSystemLog(updated);
                addToast('יומן המערכת עודכן בהצלחה', 'success');
            } else {
                const newLog: BuildingSystemLog = {
                    id: generateId(),
                    buildingId,
                    systemType: formData.systemType || 'elevator',
                    title: formData.title.trim(),
                    status: formData.status || 'תקין',
                    lastInspectionDate: formData.lastInspectionDate,
                    nextInspectionDate: formData.nextInspectionDate,
                    technicianName: formData.technicianName,
                    technicianPhone: formData.technicianPhone,
                    notes: formData.notes,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                await dbService.addSystemLog(newLog);
                addToast('מערכת חדשה נוספה ליומן התשתיות', 'success');
            }
            setIsModalOpen(false);
            onRefresh();
        } catch (error) {
            console.error('Error saving system log:', error);
            addToast('שגיאה בשמירת פרטי המערכת', 'error');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('האם אתה בטוח שברצונך למחוק יומן מערכת זה?')) {
            try {
                await dbService.deleteSystemLog(id, buildingId);
                addToast('רשומת המערכת נמחקה', 'success');
                onRefresh();
            } catch (error) {
                addToast('שגיאה במחיקת רשומה', 'error');
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <WrenchScrewdriverIcon className="w-5 h-5 text-sky-600" />
                        מערכות ותשתיות הבניין ({systemLogs.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                        ניהול בדיקות תקופתיות, מעליות, גנרטורים, כיבוי אש, משאבות מים ומערכות מיזוג
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleOpenAdd()}
                        className="btn-primary text-xs font-semibold flex items-center gap-1.5 py-1.5 px-3"
                    >
                        <PlusIcon className="w-4 h-4" /> הוסף מערכת / בדיקה
                    </button>
                </div>
            </div>

            {/* Quick Filter Categories Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {(Object.keys(SYSTEM_TYPE_CONFIG) as BuildingSystemType[]).map(type => {
                    const cfg = SYSTEM_TYPE_CONFIG[type];
                    const count = systemLogs.filter(l => l.systemType === type).length;
                    return (
                        <div
                            key={type}
                            onClick={() => handleOpenAdd(type)}
                            className="bg-white p-2.5 rounded-lg border border-slate-200 hover:border-sky-400 hover:bg-sky-50/30 transition-all cursor-pointer text-center group"
                            title={`לחץ להוספת ${cfg.label}`}
                        >
                            <div className="text-2xl mb-1">{cfg.icon}</div>
                            <div className="text-xs font-bold text-slate-700 group-hover:text-sky-700 truncate">{cfg.label}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{count} רשומות</div>
                        </div>
                    );
                })}
            </div>

            {/* Systems Grid List */}
            {systemLogs.length === 0 ? (
                <div className="bg-slate-50 p-8 rounded-xl border border-dashed border-slate-300 text-center">
                    <p className="text-slate-500 text-sm">עדיין לא הוגדרו מערכות ותשתיות לבניין זה.</p>
                    <button
                        onClick={() => handleOpenAdd()}
                        className="mt-2 text-xs font-semibold text-sky-600 hover:underline"
                    >
                        + לחץ להוספת בדיקת מעלית, גנרטור, או כיבוי אש
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {systemLogs.map(log => {
                        const typeCfg = SYSTEM_TYPE_CONFIG[log.systemType] || SYSTEM_TYPE_CONFIG.other;
                        const statusCfg = STATUS_CONFIG[log.status] || STATUS_CONFIG['תקין'];
                        const isOverdue = log.nextInspectionDate && new Date(log.nextInspectionDate) < new Date();

                        return (
                            <div
                                key={log.id}
                                className={`bg-white p-4 rounded-xl border transition-shadow shadow-sm hover:shadow-md flex flex-col justify-between ${
                                    isOverdue ? 'border-red-300' : 'border-slate-200'
                                }`}
                            >
                                <div>
                                    <div className="flex justify-between items-start gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{typeCfg.icon}</span>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-base">{log.title}</h4>
                                                <span className="text-xs text-slate-500">{typeCfg.label}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${statusCfg.bg} ${statusCfg.text}`}>
                                                {statusCfg.label}
                                            </span>
                                            {isOverdue && (
                                                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold">
                                                    בדיקה באיחור!
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {log.notes && (
                                        <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded mb-2">
                                            {log.notes}
                                        </p>
                                    )}

                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-2">
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">בדיקה אחרונה:</span>
                                            <strong>{log.lastInspectionDate ? formatDate(log.lastInspectionDate) : '-'}</strong>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">בדיקה הבאה:</span>
                                            <strong className={isOverdue ? 'text-red-600' : 'text-slate-700'}>
                                                {log.nextInspectionDate ? formatDate(log.nextInspectionDate) : '-'}
                                            </strong>
                                        </div>
                                        {log.technicianName && (
                                            <div className="col-span-2 flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                                                <span>טכנאי / חברה: <strong>{log.technicianName}</strong></span>
                                                {log.technicianPhone && (
                                                    <a href={`tel:${log.technicianPhone}`} className="text-sky-600 hover:underline">
                                                        📞 {log.technicianPhone}
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-1.5 mt-3 pt-2 border-t border-slate-100">
                                    <button
                                        onClick={() => handleOpenEdit(log)}
                                        className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded"
                                        title="ערוך פרטי מערכת"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(log.id)}
                                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded"
                                        title="מחק מערכת"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add / Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingLog ? 'עריכת פרטי מערכת תשתית' : 'הוספת מערכת / בדיקת תשתית חדשה'}
            >
                <div className="space-y-4">
                    <div>
                        <label className="label-class">סוג המערכת *</label>
                        <select
                            value={formData.systemType || 'elevator'}
                            onChange={e => {
                                const newType = e.target.value as BuildingSystemType;
                                setFormData({
                                    ...formData,
                                    systemType: newType,
                                    title: SYSTEM_TYPE_CONFIG[newType]?.defaultTitle || formData.title,
                                });
                            }}
                            className="input-class w-full"
                        >
                            {(Object.keys(SYSTEM_TYPE_CONFIG) as BuildingSystemType[]).map(t => (
                                <option key={t} value={t}>
                                    {SYSTEM_TYPE_CONFIG[t].icon} {SYSTEM_TYPE_CONFIG[t].label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label-class">שם או תיאור המערכת *</label>
                        <input
                            type="text"
                            value={formData.title || ''}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="input-class w-full"
                            required
                        />
                    </div>

                    <div>
                        <label className="label-class">סטטוס תפעולי</label>
                        <select
                            value={formData.status || 'תקין'}
                            onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                            className="input-class w-full"
                        >
                            <option value="תקין">תקין</option>
                            <option value="דורש בדיקה">דורש בדיקה</option>
                            <option value="תקול">תקול</option>
                            <option value="מושבת">מושבת</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="label-class">תאריך בדיקה אחרונה</label>
                            <input
                                type="date"
                                value={formData.lastInspectionDate || ''}
                                onChange={e => setFormData({ ...formData, lastInspectionDate: e.target.value })}
                                className="input-class w-full"
                            />
                        </div>
                        <div>
                            <label className="label-class">תאריך ביקורת הבאה</label>
                            <input
                                type="date"
                                value={formData.nextInspectionDate || ''}
                                onChange={e => setFormData({ ...formData, nextInspectionDate: e.target.value })}
                                className="input-class w-full"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="label-class">טכנאי / חברת שירות</label>
                            <input
                                type="text"
                                value={formData.technicianName || ''}
                                onChange={e => setFormData({ ...formData, technicianName: e.target.value })}
                                className="input-class w-full"
                                placeholder="לדוגמה: שינדלר מעליות"
                            />
                        </div>
                        <div>
                            <label className="label-class">טלפון שירות</label>
                            <input
                                type="tel"
                                value={formData.technicianPhone || ''}
                                onChange={e => setFormData({ ...formData, technicianPhone: e.target.value })}
                                className="input-class w-full"
                                placeholder="03-..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label-class">הערות ותוצאות בדיקה</label>
                        <textarea
                            value={formData.notes || ''}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="input-class w-full"
                            rows={3}
                            placeholder="הערות בודק מוסמך, מספרי תעודות, ליקויים לתיקון..."
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
                            ביטול
                        </button>
                        <button type="button" onClick={handleSave} className="btn-primary">
                            שמור מערכת
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
