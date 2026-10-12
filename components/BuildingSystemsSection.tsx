import React, { useState, useMemo } from 'react';
import { BuildingSystemLog, BuildingSystemType, Project } from '../types';
import * as dbService from '../services/dbService';
import { generateId } from '../utils/idGenerator';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { formatDate } from '../utils/dateFormatter';
import { exportToExcel } from '../utils/exportUtils';
import { generateBuildingSystemsPdf } from '../services/pdfService';
import { PlusIcon, PencilIcon, TrashIcon, ArrowDownTrayIcon, PrinterIcon, MagnifyingGlassIcon } from './icons/ActionIcons';
import Modal from './common/Modal';
import { WrenchScrewdriverIcon } from './icons/GeneralIcons';
import { useTranslation } from '../src/i18n';

interface BuildingSystemsSectionProps {
    buildingId: string;
    systemLogs: BuildingSystemLog[];
    onRefresh: () => void;
    project?: Project | null;
}

const SYSTEM_TYPE_CONFIG: Record<BuildingSystemType, { labelKey: string; defaultLabel: string; icon: string; defaultTitle: string }> = {
    elevator: { labelKey: 'sysElevators', defaultLabel: 'מעליות ומעלונים', icon: '🛗', defaultTitle: 'מעלית נוסעים ראשית' },
    generator: { labelKey: 'sysGenerator', defaultLabel: 'גנרטור חירום ודלק', icon: '⚡', defaultTitle: 'גנרטור חירום דיזל' },
    hvac: { labelKey: 'sysHVAC', defaultLabel: 'מיזוג אוויר ו-HVAC', icon: '❄️', defaultTitle: 'יחידת מיזוג וצ׳ילר' },
    fire_safety: { labelKey: 'sysFireSafety', defaultLabel: 'מערכות גילוי וכיבוי אש', icon: '🧯', defaultTitle: 'ספרינקלרים ומטפים' },
    water_pumps: { labelKey: 'sysWaterPumps', defaultLabel: 'משאבות מים ומאגרים', icon: '💧', defaultTitle: 'משאבות לחץ מים' },
    electrical: { labelKey: 'sysElectrical', defaultLabel: 'חדר חשמל ומדידה', icon: '🔌', defaultTitle: 'לוח חשמל ראשי' },
    other: { labelKey: 'sysOther', defaultLabel: 'תשתית נוספת', icon: '⚙️', defaultTitle: 'מערכת תשתית' },
};

const STATUS_CONFIG: Record<string, { labelKey: string; defaultLabel: string; bg: string; text: string }> = {
    'תקין': { labelKey: 'statusNormal', defaultLabel: 'תקין', bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300' },
    'דורש בדיקה': { labelKey: 'statusNeedsCheck', defaultLabel: 'דורש בדיקה', bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300' },
    'תקול': { labelKey: 'statusFaulty', defaultLabel: 'תקול', bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300' },
    'מושבת': { labelKey: 'statusDisabled', defaultLabel: 'מושבת', bg: 'bg-neutral-100 dark:bg-neutral-800', text: 'text-neutral-700 dark:text-neutral-300' },
};

export const BuildingSystemsSection: React.FC<BuildingSystemsSectionProps> = ({ buildingId, systemLogs, onRefresh, project }) => {
    const { t } = useTranslation();
    const { settings } = useSettings();
    const { addToast } = useToast();

    // Filters & Sorting state
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'overdue' | 'dueSoon' | 'ok'>('all');
    const [sortBy, setSortBy] = useState<'nextInspection_asc' | 'nextInspection_desc' | 'lastInspection_desc' | 'title_asc' | 'urgency'>('nextInspection_asc');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<BuildingSystemLog | null>(null);
    const [formData, setFormData] = useState<Partial<BuildingSystemLog>>({});

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

    // Filter & Sort Logic
    const filteredAndSortedLogs = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return systemLogs.filter(log => {
            // Type filter
            if (typeFilter !== 'all' && log.systemType !== typeFilter) return false;

            // Status filter
            if (statusFilter !== 'all' && log.status !== statusFilter) return false;

            // Urgency filter
            if (urgencyFilter !== 'all') {
                if (!log.nextInspectionDate) {
                    if (urgencyFilter !== 'ok') return false;
                } else {
                    const next = new Date(log.nextInspectionDate);
                    const diffDays = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    if (urgencyFilter === 'overdue' && next >= today) return false;
                    if (urgencyFilter === 'dueSoon' && (diffDays < 0 || diffDays > 30)) return false;
                    if (urgencyFilter === 'ok' && diffDays <= 30) return false;
                }
            }

            // Search query
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                const matchTitle = log.title?.toLowerCase().includes(q);
                const matchTech = log.technicianName?.toLowerCase().includes(q);
                const matchPhone = log.technicianPhone?.toLowerCase().includes(q);
                const matchNotes = log.notes?.toLowerCase().includes(q);
                if (!matchTitle && !matchTech && !matchPhone && !matchNotes) return false;
            }

            return true;
        }).sort((a, b) => {
            if (sortBy === 'nextInspection_asc') {
                const dateA = a.nextInspectionDate ? new Date(a.nextInspectionDate).getTime() : Infinity;
                const dateB = b.nextInspectionDate ? new Date(b.nextInspectionDate).getTime() : Infinity;
                return dateA - dateB;
            }
            if (sortBy === 'nextInspection_desc') {
                const dateA = a.nextInspectionDate ? new Date(a.nextInspectionDate).getTime() : -Infinity;
                const dateB = b.nextInspectionDate ? new Date(b.nextInspectionDate).getTime() : -Infinity;
                return dateB - dateA;
            }
            if (sortBy === 'lastInspection_desc') {
                const dateA = a.lastInspectionDate ? new Date(a.lastInspectionDate).getTime() : -Infinity;
                const dateB = b.lastInspectionDate ? new Date(b.lastInspectionDate).getTime() : -Infinity;
                return dateB - dateA;
            }
            if (sortBy === 'title_asc') {
                return (a.title || '').localeCompare(b.title || '', 'he');
            }
            if (sortBy === 'urgency') {
                const todayMs = new Date().getTime();
                const score = (log: BuildingSystemLog) => {
                    let s = 0;
                    if (log.status === 'תקול' || log.status === 'מושבת') s += 100;
                    if (log.status === 'דורש בדיקה') s += 50;
                    if (log.nextInspectionDate) {
                        const ms = new Date(log.nextInspectionDate).getTime();
                        if (ms < todayMs) s += 80;
                        else if (ms < todayMs + 30 * 86400000) s += 40;
                    }
                    return s;
                };
                return score(b) - score(a);
            }
            return 0;
        });
    }, [systemLogs, typeFilter, statusFilter, urgencyFilter, searchTerm, sortBy]);

    // Export to Excel
    const handleExportExcel = () => {
        if (filteredAndSortedLogs.length === 0) {
            addToast('אין מערכות לייצוא', 'warning');
            return;
        }

        const dataToExport = filteredAndSortedLogs.map(s => {
            const typeCfg = SYSTEM_TYPE_CONFIG[s.systemType] || SYSTEM_TYPE_CONFIG.other;
            return {
                'שם המערכת': s.title,
                'סוג מערכת': t(typeCfg.labelKey, typeCfg.defaultLabel),
                'סטטוס': s.status,
                'תאריך בדיקה אחרונה': s.lastInspectionDate ? formatDate(s.lastInspectionDate) : '-',
                'תאריך ביקורת הבאה': s.nextInspectionDate ? formatDate(s.nextInspectionDate) : '-',
                'טכנאי / חברה': s.technicianName || '-',
                'טלפון טכנאי': s.technicianPhone || '-',
                'הערות': s.notes || '-',
            };
        });

        const bName = project?.name || 'building';
        exportToExcel(dataToExport, `systems_${bName}`, 'מערכות ותשתיות');
        addToast('קובץ Excel יוצא בהצלחה!', 'success');
    };

    // Export to PDF
    const handleExportPdf = async () => {
        if (filteredAndSortedLogs.length === 0) {
            addToast('אין מערכות לייצוא', 'warning');
            return;
        }
        addToast('יוצר קובץ PDF...', 'info');
        try {
            const fallbackProject: Project = project || ({
                id: buildingId,
                name: 'בניין',
                address: '',
                clientInfo: '',
                images: [],
                status: 'פעיל',
                files: [],
                todos: [],
                inventory: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            } as Project);
            await generateBuildingSystemsPdf({
                settings,
                project: fallbackProject,
                systemLogs: filteredAndSortedLogs
            });
            addToast('קובץ ה-PDF נוצר בהצלחה!', 'success');
        } catch (error) {
            console.error('Error generating PDF:', error);
            addToast('שגיאה ביצירת קובץ PDF', 'error');
        }
    };

    return (
        <div className="space-y-5">
            {/* Header with Title and Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-neutral-100 flex items-center gap-2">
                        <WrenchScrewdriverIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        {t('buildingSystemsPageTitle', 'מערכות ותשתיות הבניין')} ({filteredAndSortedLogs.length} מתוך {systemLogs.length})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                        {t('buildingSystemsSubtitle', 'ניהול בדיקות תקופתיות, מעליות, גנרטורים, כיבוי אש, משאבות מים ומערכות מיזוג')}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                        onClick={handleExportExcel}
                        className="btn-secondary text-xs font-semibold flex items-center gap-1.5 py-1.5 px-3 rounded-xl shadow-2xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        title="ייצוא לאקסל (.xlsx) עם תמיכה מלאה בעברית"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>ייצוא לאקסל</span>
                    </button>
                    <button
                        onClick={handleExportPdf}
                        className="btn-secondary text-xs font-semibold flex items-center gap-1.5 py-1.5 px-3 rounded-xl shadow-2xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        title="ייצוא קובץ PDF מעוצב"
                    >
                        <PrinterIcon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span>ייצוא PDF</span>
                    </button>
                    <button
                        onClick={() => handleOpenAdd()}
                        className="btn-primary text-xs font-semibold flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl shadow-xs"
                    >
                        <PlusIcon className="w-4 h-4" />
                        <span>{t('addSystemLog', 'הוסף מערכת / בדיקה')}</span>
                    </button>
                </div>
            </div>

            {/* Quick Filter Categories Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                <div
                    onClick={() => setTypeFilter('all')}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer text-center group shadow-2xs ${
                        typeFilter === 'all'
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 font-bold'
                            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                    }`}
                >
                    <div className="text-xl mb-0.5">📋</div>
                    <div className="text-xs truncate">כל הסוגים</div>
                    <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{systemLogs.length}</div>
                </div>

                {(Object.keys(SYSTEM_TYPE_CONFIG) as BuildingSystemType[]).map(type => {
                    const cfg = SYSTEM_TYPE_CONFIG[type];
                    const count = systemLogs.filter(l => l.systemType === type).length;
                    const label = t(cfg.labelKey, cfg.defaultLabel);
                    const isSelected = typeFilter === type;
                    return (
                        <div
                            key={type}
                            onClick={() => setTypeFilter(isSelected ? 'all' : type)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer text-center group shadow-2xs ${
                                isSelected
                                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 font-bold'
                                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-blue-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                            }`}
                            title={`סינון לפי ${label}`}
                        >
                            <div className="text-xl mb-0.5">{cfg.icon}</div>
                            <div className="text-xs truncate">{label}</div>
                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{count}</div>
                        </div>
                    );
                })}
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="חיפוש מערכת, טכנאי, טלפון..."
                            className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                        <MagnifyingGlassIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>

                    {/* Status Filter */}
                    <div>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        >
                            <option value="all">כל הסטטוסים</option>
                            <option value="תקין">תקין</option>
                            <option value="דורש בדיקה">דורש בדיקה</option>
                            <option value="תקול">תקול</option>
                            <option value="מושבת">מושבת</option>
                        </select>
                    </div>

                    {/* Inspection Urgency Filter */}
                    <div>
                        <select
                            value={urgencyFilter}
                            onChange={e => setUrgencyFilter(e.target.value as any)}
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        >
                            <option value="all">מועדי בדיקה: הכל</option>
                            <option value="overdue">🚨 באיחור בדיקה</option>
                            <option value="dueSoon">⏳ לבדיקה ב-30 יום הקרובים</option>
                            <option value="ok">✅ בדיקה תקינה ועתידית</option>
                        </select>
                    </div>

                    {/* Sort Dropdown */}
                    <div>
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as any)}
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        >
                            <option value="nextInspection_asc">מיון: בדיקה הבאה (מהקרוב לרחוק)</option>
                            <option value="nextInspection_desc">מיון: בדיקה הבאה (מהרחוק לקרוב)</option>
                            <option value="lastInspection_desc">מיון: בדיקה אחרונה (מהחדש לישן)</option>
                            <option value="title_asc">מיון: שם המערכת (א-ת)</option>
                            <option value="urgency">מיון: לפי דחיפות וליקויים</option>
                        </select>
                    </div>
                </div>

                {/* Active filters reset badge */}
                {(searchTerm || typeFilter !== 'all' || statusFilter !== 'all' || urgencyFilter !== 'all') && (
                    <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-neutral-500 dark:text-neutral-400">
                            נמצאו {filteredAndSortedLogs.length} תוצאות
                        </span>
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setTypeFilter('all');
                                setStatusFilter('all');
                                setUrgencyFilter('all');
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                        >
                            איפוס כל המסננים
                        </button>
                    </div>
                )}
            </div>

            {/* Systems Grid List */}
            {filteredAndSortedLogs.length === 0 ? (
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-8 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center">
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">{t('noSystemsFound', 'לא נמצאו מערכות התואמות את החיפוש והסינון.')}</p>
                    <button
                        onClick={() => handleOpenAdd()}
                        className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        + {t('noSystemsFoundPrompt', 'לחץ להוספת בדיקת מעלית, גנרטור, או כיבוי אש')}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredAndSortedLogs.map(log => {
                        const typeCfg = SYSTEM_TYPE_CONFIG[log.systemType] || SYSTEM_TYPE_CONFIG.other;
                        const statusCfg = STATUS_CONFIG[log.status] || STATUS_CONFIG['תקין'];
                        const isOverdue = log.nextInspectionDate && new Date(log.nextInspectionDate) < new Date();
                        const typeLabel = t(typeCfg.labelKey, typeCfg.defaultLabel);
                        const statusLabel = t(statusCfg.labelKey, statusCfg.defaultLabel);

                        return (
                            <div
                                key={log.id}
                                className={`p-5 rounded-2xl bg-white dark:bg-neutral-900 border shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-md transition flex flex-col justify-between ${
                                    isOverdue ? 'border-rose-400 dark:border-rose-900' : 'border-neutral-200 dark:border-neutral-800'
                                }`}
                            >
                                <div>
                                    <div className="flex justify-between items-start gap-2 mb-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-2xl">{typeCfg.icon}</span>
                                            <div>
                                                <h4 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm sm:text-base">{log.title}</h4>
                                                <span className="text-xs text-neutral-500 dark:text-neutral-400">{typeLabel}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                                                {statusLabel}
                                            </span>
                                            {isOverdue && (
                                                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 rounded-full font-bold">
                                                    {t('systemsSummaryExpired', 'בדיקה באיחור!')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {log.notes && (
                                        <p className="text-xs text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/60 p-2.5 rounded-xl mb-3 border border-neutral-100 dark:border-neutral-800">
                                            {log.notes}
                                        </p>
                                    )}

                                    <div className="grid grid-cols-2 gap-2 text-xs text-neutral-600 dark:text-neutral-300 mt-2">
                                        <div>
                                            <span className="text-neutral-400 dark:text-neutral-500 block text-[10px] font-bold">{t('lastInspectionDate', 'בדיקה אחרונה')}:</span>
                                            <strong className="font-mono text-neutral-800 dark:text-neutral-200">{log.lastInspectionDate ? formatDate(log.lastInspectionDate) : '-'}</strong>
                                        </div>
                                        <div>
                                            <span className="text-neutral-400 dark:text-neutral-500 block text-[10px] font-bold">{t('nextInspectionDate', 'בדיקה הבאה')}:</span>
                                            <strong className={`font-mono ${isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-neutral-800 dark:text-neutral-200'}`}>
                                                {log.nextInspectionDate ? formatDate(log.nextInspectionDate) : '-'}
                                            </strong>
                                        </div>
                                        {(log.technicianName || log.technicianPhone) && (
                                            <div className="col-span-2 pt-1 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px]">
                                                <span className="text-neutral-400 dark:text-neutral-500 font-semibold">{t('technician', 'בודק/טכנאי')}:</span>
                                                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                                                    {log.technicianName} {log.technicianPhone && `(${log.technicianPhone})`}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-1.5 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                                    <button
                                        onClick={() => handleOpenEdit(log)}
                                        className="p-1.5 text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                                        title="ערוך פרטי מערכת"
                                    >
                                        <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(log.id)}
                                        className="p-1.5 text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
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
                            {(Object.keys(SYSTEM_TYPE_CONFIG) as BuildingSystemType[]).map(typeKey => (
                                <option key={typeKey} value={typeKey}>
                                    {SYSTEM_TYPE_CONFIG[typeKey].icon} {t(SYSTEM_TYPE_CONFIG[typeKey].labelKey, SYSTEM_TYPE_CONFIG[typeKey].defaultLabel)}
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
