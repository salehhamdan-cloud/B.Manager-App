import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Project, PreventiveEvent, MaintenanceFrequency } from '../types';
import * as dbService from '../services/dbService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';
import { generateId } from '../utils/idGenerator';
import { formatDate } from '../utils/dateFormatter';
import { PlusIcon, ArrowDownTrayIcon, PencilIcon, TrashIcon } from '../components/icons/ActionIcons';
import Modal from '../components/common/Modal';
import { CalendarDaysIcon, WrenchScrewdriverIcon } from '../components/icons/GeneralIcons';

const FREQUENCY_LABELS: Record<MaintenanceFrequency, string> = {
    weekly: 'שבועי',
    monthly: 'חודשי',
    quarterly: 'רבעוני',
    'bi-annually': 'חצי-שנתי',
    annually: 'שנתי',
    'שבועי': 'שבועי',
    'חודשי': 'חודשי',
    'רבעוני': 'רבעוני',
    'חצי-שנתי': 'חצי-שנתי',
    'שנתי': 'שנתי'
};

const COMMON_CATEGORIES = [
    'בדיקת מעליות',
    'בטיחות אש ומטפים',
    'גנרטור חירום ודלק',
    'משאבות מים ומאגרים',
    'מיזוג אוויר ו-HVAC',
    'לוחות חשמל ומדידה',
    'איטום גגות וניקוז',
    'הדברה',
    'כללי'
];

const CalendarPage: React.FC = () => {
    const [events, setEvents] = useState<PreventiveEvent[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all');
    const [selectedFrequency, setSelectedFrequency] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
    
    // Modal states
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<PreventiveEvent | null>(null);
    const [formData, setFormData] = useState<Partial<PreventiveEvent>>({});

    // Calendar navigation (Current year & month)
    const [currentDate, setCurrentDate] = useState(new Date());

    const { addToast } = useToast();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [eventsData, projectsData] = await Promise.all([
                dbService.getAllPreventiveEvents(),
                dbService.getAllProjects(),
            ]);
            setEvents(eventsData);
            setProjects(projectsData);
        } catch (error) {
            console.error('Error fetching calendar data:', error);
            addToast('שגיאה בטעינת אירועי התחזוקה', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p.name])), [projects]);

    const filteredEvents = useMemo(() => {
        return events.filter(e => {
            if (selectedBuildingId !== 'all' && e.buildingId !== selectedBuildingId) return false;
            if (selectedFrequency !== 'all' && e.frequency !== selectedFrequency) return false;
            return true;
        });
    }, [events, selectedBuildingId, selectedFrequency]);

    // Calendar calculations
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0-indexed

    const daysInMonth = useMemo(() => {
        return new Date(year, month + 1, 0).getDate();
    }, [year, month]);

    const firstDayIndex = useMemo(() => {
        // In Israel/Hebrew week starts on Sunday (day 0)
        return new Date(year, month, 1).getDay();
    }, [year, month]);

    const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const handleOpenAddModal = (dateStr?: string) => {
        setEditingEvent(null);
        setFormData({
            title: '',
            category: COMMON_CATEGORIES[0],
            buildingId: projects[0]?.id || '',
            scheduledDate: dateStr || new Date().toISOString().split('T')[0],
            frequency: 'monthly',
            description: '',
            assignedWorker: '',
            cost: undefined,
            isCompleted: false,
        });
        setIsEventModalOpen(true);
    };

    const handleOpenEditModal = (event: PreventiveEvent) => {
        setEditingEvent(event);
        setFormData({ ...event });
        setIsEventModalOpen(true);
    };

    const handleSaveEvent = async () => {
        if (!formData.title?.trim()) {
            addToast('נא להזין כותרת לאירוע', 'warning');
            return;
        }
        if (!formData.buildingId) {
            addToast('נא לבחור בניין', 'warning');
            return;
        }

        try {
            if (editingEvent) {
                const updated: PreventiveEvent = {
                    ...editingEvent,
                    ...formData,
                    title: formData.title.trim(),
                } as PreventiveEvent;
                await dbService.updatePreventiveEvent(updated);
                addToast('אירוע התחזוקה עודכן בהצלחה', 'success');
            } else {
                const newEv: PreventiveEvent = {
                    id: generateId(),
                    buildingId: formData.buildingId,
                    projectName: projectMap.get(formData.buildingId) || '',
                    title: formData.title.trim(),
                    description: formData.description || '',
                    scheduledDate: formData.scheduledDate || new Date().toISOString().split('T')[0],
                    frequency: (formData.frequency as MaintenanceFrequency) || 'monthly',
                    isCompleted: Boolean(formData.isCompleted),
                    assignedWorker: formData.assignedWorker,
                    cost: formData.cost,
                    category: formData.category || 'כללי',
                    createdAt: new Date().toISOString(),
                };
                await dbService.addPreventiveEvent(newEv);
                addToast('אירוע תחזוקה חדש נוסף', 'success');
            }
            setIsEventModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Error saving preventive event:', error);
            addToast('שגיאה בשמירת אירוע', 'error');
        }
    };

    const handleToggleComplete = async (event: PreventiveEvent) => {
        const updated: PreventiveEvent = {
            ...event,
            isCompleted: !event.isCompleted,
            completedDate: !event.isCompleted ? new Date().toISOString() : undefined,
        };
        try {
            await dbService.updatePreventiveEvent(updated);
            addToast(!event.isCompleted ? 'האירוע סומן כהושלם' : 'האירוע הוחזר לביצוע', 'success');
            fetchData();
        } catch (error) {
            addToast('שגיאה בעדכון סטטוס', 'error');
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (window.confirm('האם אתה בטוח שברצונך למחוק אירוע תחזוקה זה?')) {
            try {
                await dbService.deletePreventiveEvent(id);
                addToast('האירוע נמחק בהצלחה', 'success');
                fetchData();
            } catch (error) {
                addToast('שגיאה במחיקת אירוע', 'error');
            }
        }
    };

    const handleExportCsv = () => {
        if (filteredEvents.length === 0) {
            addToast('אין אירועים לייצוא', 'warning');
            return;
        }
        const headers = ['בניין', 'כותרת', 'קטגוריה', 'תדירות', 'תאריך מתוכנן', 'סטטוס', 'אחראי', 'עלות'];
        const rows = filteredEvents.map(e => [
            `"${projectMap.get(e.buildingId) || ''}"`,
            `"${e.title}"`,
            `"${e.category || ''}"`,
            `"${FREQUENCY_LABELS[e.frequency] || e.frequency}"`,
            `"${e.scheduledDate}"`,
            `"${e.isCompleted ? 'הושלם' : 'ממתין'}"`,
            `"${e.assignedWorker || ''}"`,
            `"${e.cost || ''}"`,
        ]);
        const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `לוח_תחזוקה_${year}_${month + 1}.csv`;
        link.click();
        addToast('קובץ Excel יוצא בהצלחה', 'success');
    };

    if (isLoading) return <LoadingSpinner text="טוען לוח שנה לתחזוקה מונעת..." />;

    // Group events by day of current month
    const eventsByDay: Record<number, PreventiveEvent[]> = {};
    filteredEvents.forEach(e => {
        if (!e.scheduledDate) return;
        const [eY, eM, eD] = e.scheduledDate.split('-').map(Number);
        if (eY === year && eM === month + 1) {
            if (!eventsByDay[eD]) eventsByDay[eD] = [];
            eventsByDay[eD].push(e);
        }
    });

    return (
        <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
            {/* Header & Controls */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
                        <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-700 border border-sky-100 shadow-xs">
                            <CalendarDaysIcon className="w-6 h-6" />
                        </div>
                        לוח שנה לתחזוקה מונעת
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 mr-12">
                        תכנון, מעקב ובקרת מחזורי בדיקות, מעליות, גנרטורים, כיבוי אש ומערכות קריטיות
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button onClick={handleExportCsv} className="btn-secondary flex items-center gap-1.5 text-xs font-semibold py-2 px-3">
                        <ArrowDownTrayIcon className="w-4 h-4" /> יצא Excel
                    </button>
                    <button
                        onClick={() => handleOpenAddModal()}
                        className="btn-primary flex items-center gap-2 text-xs font-bold py-2.5 px-4 shadow-sm"
                    >
                        <PlusIcon className="w-4 h-4" /> הוסף אירוע תחזוקה
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/90 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">סנן לפי בניין:</label>
                    <select
                        value={selectedBuildingId}
                        onChange={e => setSelectedBuildingId(e.target.value)}
                        className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                    >
                        <option value="all">כל הבניינים ({projects.length})</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">מחזוריות:</label>
                    <select
                        value={selectedFrequency}
                        onChange={e => setSelectedFrequency(e.target.value)}
                        className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                    >
                        <option value="all">כל התדירויות</option>
                        <option value="weekly">שבועי</option>
                        <option value="monthly">חודשי</option>
                        <option value="quarterly">רבעוני</option>
                        <option value="bi-annually">חצי-שנתי</option>
                        <option value="annually">שנתי</option>
                    </select>
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/60 self-end">
                    <button
                        onClick={() => setViewMode('month')}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${viewMode === 'month' ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        תצוגת חודש
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-sky-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        תצוגת רשימה
                    </button>
                </div>
            </div>

            {/* Month Navigation */}
            {viewMode === 'month' && (
                <div className="bg-white rounded-3xl shadow-xs border border-slate-200/90 overflow-hidden">
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg sm:text-xl font-black text-slate-800">
                                {monthNames[month]} {year}
                            </h2>
                            <button
                                onClick={handleToday}
                                className="text-xs px-3 py-1 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-100 shadow-2xs transition-colors"
                            >
                                היום
                            </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={handlePrevMonth}
                                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-bold transition-all shadow-2xs"
                                title="חודש קודם"
                            >
                                &larr; חודש קודם
                            </button>
                            <button
                                onClick={handleNextMonth}
                                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200/80 rounded-xl text-slate-700 text-xs font-bold transition-all shadow-2xs"
                                title="חודש הבא"
                            >
                                חודש הבא &rarr;
                            </button>
                        </div>
                    </div>

                    {/* Day Headers (Sun-Sat) */}
                    <div className="grid grid-cols-7 border-b border-slate-200/80 bg-slate-50/80 text-center font-bold text-xs text-slate-600 py-3">
                        <div>ראשון</div>
                        <div>שני</div>
                        <div>שלישי</div>
                        <div>רביעי</div>
                        <div>חמישי</div>
                        <div>שישי</div>
                        <div>שבת</div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 auto-rows-fr bg-slate-200/70 gap-[1px]">
                        {/* Empty padding cells for start of month */}
                        {Array.from({ length: firstDayIndex }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-slate-50/40 min-h-[110px] p-2" />
                        ))}

                        {/* Month Days */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const dayNum = i + 1;
                            const isToday =
                                new Date().getDate() === dayNum &&
                                new Date().getMonth() === month &&
                                new Date().getFullYear() === year;

                            const dayEvents = eventsByDay[dayNum] || [];

                            return (
                                <div
                                    key={`day-${dayNum}`}
                                    onClick={() => handleOpenAddModal(`${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`)}
                                    className={`bg-white min-h-[110px] p-2 flex flex-col justify-between hover:bg-sky-50/30 transition-colors cursor-pointer group`}
                                >
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full transition-transform group-hover:scale-105 ${isToday ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-700'}`}>
                                            {dayNum}
                                        </span>
                                        {dayEvents.length > 0 && (
                                            <span className="text-[10px] bg-sky-50 border border-sky-100 text-sky-700 px-1.5 py-0.5 rounded-md font-bold">
                                                {dayEvents.length}
                                            </span>
                                        )}
                                    </div>

                                    {/* Events inside Day */}
                                    <div className="space-y-1 overflow-y-auto max-h-[80px]">
                                        {dayEvents.map(ev => (
                                            <div
                                                key={ev.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenEditModal(ev);
                                                }}
                                                className={`text-[11px] p-1.5 rounded-lg font-medium truncate flex items-center justify-between border transition-all ${
                                                    ev.isCompleted
                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 line-through opacity-80'
                                                        : 'bg-sky-50 text-sky-900 border-sky-200/80 hover:bg-sky-100 hover:shadow-2xs'
                                                }`}
                                                title={`${ev.title} - ${projectMap.get(ev.buildingId) || ''}`}
                                            >
                                                <span className="truncate">{ev.title}</span>
                                                <span className="text-[9px] bg-white/90 text-slate-600 px-1 rounded ml-1 font-semibold">
                                                    {projectMap.get(ev.buildingId)?.slice(0, 8)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
                <div className="space-y-3">
                    {filteredEvents.length === 0 ? (
                        <div className="bg-white p-12 text-center rounded-3xl shadow-xs border border-slate-200/90">
                            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                                <WrenchScrewdriverIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-base font-bold text-slate-800">אין אירועי תחזוקה להצגה</h3>
                            <p className="text-slate-500 text-xs mt-1">לחץ על ״הוסף אירוע תחזוקה״ כדי לתזמן בדיקות תקופתיות לבניינים</p>
                        </div>
                    ) : (
                        filteredEvents
                            .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                            .map(ev => {
                                const isOverdue = !ev.isCompleted && new Date(ev.scheduledDate) < new Date(new Date().setHours(0,0,0,0));
                                return (
                                    <div
                                        key={ev.id}
                                        className={`bg-white p-4 sm:p-5 rounded-2xl shadow-xs border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                            ev.isCompleted ? 'border-emerald-200 bg-emerald-50/20' : isOverdue ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200/90 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={ev.isCompleted}
                                                onChange={() => handleToggleComplete(ev)}
                                                className="w-5 h-5 mt-1 rounded-md text-sky-600 focus:ring-sky-500 cursor-pointer"
                                            />
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className={`font-bold text-sm sm:text-base text-slate-800 ${ev.isCompleted ? 'line-through text-slate-400' : ''}`}>
                                                        {ev.title}
                                                    </h3>
                                                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg font-bold">
                                                        {projectMap.get(ev.buildingId) || 'בניין'}
                                                    </span>
                                                    {ev.category && (
                                                        <span className="text-xs bg-sky-50 text-sky-800 border border-sky-200/60 px-2 py-0.5 rounded-lg font-bold">
                                                            {ev.category}
                                                        </span>
                                                    )}
                                                    <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 rounded-lg font-bold">
                                                        מחזור: {FREQUENCY_LABELS[ev.frequency] || ev.frequency}
                                                    </span>
                                                    {isOverdue && (
                                                        <span className="text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded-lg font-black">
                                                            באיחור
                                                        </span>
                                                    )}
                                                </div>
                                                {ev.description && (
                                                    <p className="text-xs sm:text-sm text-slate-600 mt-1.5">{ev.description}</p>
                                                )}
                                                <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
                                                    <span>תאריך מתוכנן: <strong className="text-slate-800 font-bold">{formatDate(ev.scheduledDate)}</strong></span>
                                                    {ev.assignedWorker && <span>איש מקצוע: <strong className="text-slate-700 font-bold">{ev.assignedWorker}</strong></span>}
                                                    {ev.cost ? <span>עלות משוערת: <strong className="text-slate-800 font-black">₪{ev.cost.toLocaleString()}</strong></span> : null}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                                            <button
                                                onClick={() => handleOpenEditModal(ev)}
                                                className="p-2 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-xl transition-colors"
                                                title="ערוך אירוע"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteEvent(ev.id)}
                                                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                                title="מחק אירוע"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                    )}
                </div>
            )}

            {/* Add / Edit Event Modal */}
            <Modal
                isOpen={isEventModalOpen}
                onClose={() => setIsEventModalOpen(false)}
                title={editingEvent ? 'עריכת אירוע תחזוקה מונעת' : 'הוספת אירוע תחזוקה מונעת חדש'}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">בניין *</label>
                        <select
                            value={formData.buildingId || ''}
                            onChange={e => setFormData({ ...formData, buildingId: e.target.value })}
                            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                            required
                        >
                            <option value="" disabled>בחר בניין...</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">כותרת האירוע *</label>
                        <input
                            type="text"
                            value={formData.title || ''}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                            placeholder="לדוגמה: בדיקת מעלית חצי-שנתית ע״י בודק מוסמך"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">קטגוריית מערכת</label>
                            <input
                                list="categories-list"
                                value={formData.category || ''}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                                placeholder="בחר או הקלד קטגוריה"
                            />
                            <datalist id="categories-list">
                                {COMMON_CATEGORIES.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">תדירות מחזורית</label>
                            <select
                                value={formData.frequency || 'monthly'}
                                onChange={e => setFormData({ ...formData, frequency: e.target.value as MaintenanceFrequency })}
                                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                            >
                                <option value="weekly">שבועי</option>
                                <option value="monthly">חודשי</option>
                                <option value="quarterly">רבעוני (כל 3 חודשים)</option>
                                <option value="bi-annually">חצי-שנתי (כל 6 חודשים)</option>
                                <option value="annually">שנתי</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">תאריך ביצוע מתוכנן *</label>
                            <input
                                type="date"
                                value={formData.scheduledDate || ''}
                                onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })}
                                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">עלות משוערת (₪)</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.cost ?? ''}
                                onChange={e => setFormData({ ...formData, cost: e.target.value ? parseFloat(e.target.value) : undefined })}
                                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">טכנאי / ספק / אחראי לביצוע</label>
                        <input
                            type="text"
                            value={formData.assignedWorker || ''}
                            onChange={e => setFormData({ ...formData, assignedWorker: e.target.value })}
                            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                            placeholder="שם חברת השירות או הטכנאי"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">פירוט ומשימות בדיקה</label>
                        <textarea
                            value={formData.description || ''}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                            rows={3}
                            placeholder="הוראות מיוחדות, בדיקת רכיבים, דרישות תקינה..."
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="isCompletedCheck"
                            checked={Boolean(formData.isCompleted)}
                            onChange={e => setFormData({ ...formData, isCompleted: e.target.checked })}
                            className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                        <label htmlFor="isCompletedCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                            האירוע הושלם בהצלחה
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setIsEventModalOpen(false)} className="btn-secondary text-xs">
                            ביטול
                        </button>
                        <button type="button" onClick={handleSaveEvent} className="btn-primary text-xs font-bold">
                            שמור אירוע
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CalendarPage;
