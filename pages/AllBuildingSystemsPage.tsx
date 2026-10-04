import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as dbService from '../services/dbService';
import { Project, BuildingSystemLog, BuildingSystemType } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useToast } from '../contexts/ToastContext';
import { formatDate } from '../utils/dateFormatter';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from '../components/icons/ActionIcons';
import Modal from '../components/common/Modal';
import UniversalFileViewerModal from '../components/common/UniversalFileViewerModal';
import { generateId } from '../utils/idGenerator';
import { WrenchScrewdriverIcon, CalendarDaysIcon } from '../components/icons/GeneralIcons';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '../components/icons/FeedbackIcons';

const SYSTEM_TYPE_CONFIG: Record<BuildingSystemType, { label: string; icon: string; defaultTitle: string; color: string }> = {
    elevator: { label: 'מעליות ומעלונים', icon: '🛗', defaultTitle: 'מעלית נוסעים ראשית', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
    generator: { label: 'גנרטור חירום ודלק', icon: '⚡', defaultTitle: 'גנרטור חירום דיזל', color: 'bg-amber-50 border-amber-200 text-amber-700' },
    hvac: { label: 'מיזוג אוויר ו-HVAC', icon: '❄️', defaultTitle: 'יחידת מיזוג וצ׳ילר', color: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
    fire_safety: { label: 'גילוי וכיבוי אש', icon: '🧯', defaultTitle: 'ספרינקלרים ומטפים', color: 'bg-red-50 border-red-200 text-red-700' },
    water_pumps: { label: 'משאבות מים ומאגרים', icon: '💧', defaultTitle: 'משאבות לחץ מים', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    electrical: { label: 'חדר חשמל ומדידה', icon: '🔌', defaultTitle: 'לוח חשמל ראשי', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    other: { label: 'תשתית נוספת', icon: '⚙️', defaultTitle: 'מערכת תשתית', color: 'bg-slate-50 border-slate-200 text-slate-700' },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
    'תקין': { label: 'תקין', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    'דורש בדיקה': { label: 'דורש בדיקה', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    'תקול': { label: 'תקול', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    'מושבת': { label: 'מושבת', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
};

export const AllBuildingSystemsPage: React.FC = () => {
    const [systems, setSystems] = useState<BuildingSystemLog[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [buildingFilter, setBuildingFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    
    // Modal states
    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [editingSystem, setEditingSystem] = useState<BuildingSystemLog | null>(null);
    const [formData, setFormData] = useState<Partial<BuildingSystemLog>>({});
    const [viewingCert, setViewingCert] = useState<{ name: string; url?: string; dataUrl?: string } | null>(null);

    const { addToast } = useToast();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [projectsData, storeSystems] = await Promise.all([
                dbService.getAllProjects(),
                dbService.getAllSystemLogs(),
            ]);
            
            // Combine both store and embedded project systemLogs deduplicated by ID
            const allSystems = [...storeSystems, ...projectsData.flatMap(p => p.systemLogs || [])];
            const uniqueSystems = Array.from(new Map(allSystems.map(s => [s.id, s])).values());

            setProjects(projectsData);
            setSystems(uniqueSystems);
        } catch (error) {
            console.error('Error fetching building systems:', error);
            addToast('שגיאה בטעינת מערכות המבנה', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenAdd = () => {
        setEditingSystem(null);
        setFormData({
            buildingId: projects[0]?.id || '',
            systemType: 'elevator',
            title: SYSTEM_TYPE_CONFIG['elevator'].defaultTitle,
            status: 'תקין',
            lastInspectionDate: new Date().toISOString().split('T')[0],
            nextInspectionDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0],
            technicianName: '',
            technicianPhone: '',
            notes: '',
        });
        setIsAddEditModalOpen(true);
    };

    const handleOpenEdit = (sys: BuildingSystemLog) => {
        setEditingSystem(sys);
        setFormData({ ...sys });
        setIsAddEditModalOpen(true);
    };

    const handleDelete = async (id: string, buildingId: string) => {
        if (window.confirm('האם אתה בטוח שברצונך למחוק מערכת זו?')) {
            try {
                await dbService.deleteSystemLog(id, buildingId);
                addToast('המערכת נמחקה בהצלחה', 'success');
                fetchData();
            } catch (error) {
                console.error('Failed to delete system log:', error);
                addToast('שגיאה במחיקת המערכת', 'error');
            }
        }
    };

    const handleSave = async () => {
        if (!formData.title?.trim()) {
            addToast('נא להזין שם או תיאור מערכת', 'warning');
            return;
        }
        if (!formData.buildingId) {
            addToast('נא לבחור בניין', 'warning');
            return;
        }

        try {
            if (editingSystem) {
                const updated: BuildingSystemLog = {
                    ...editingSystem,
                    ...formData,
                    title: formData.title.trim(),
                    updatedAt: new Date().toISOString(),
                } as BuildingSystemLog;
                await dbService.updateSystemLog(updated);
                addToast('יומן המערכת עודכן בהצלחה', 'success');
            } else {
                const newSys: BuildingSystemLog = {
                    id: generateId(),
                    buildingId: formData.buildingId!,
                    systemType: formData.systemType || 'other',
                    title: formData.title.trim(),
                    status: formData.status || 'תקין',
                    lastInspectionDate: formData.lastInspectionDate,
                    nextInspectionDate: formData.nextInspectionDate,
                    technicianName: formData.technicianName?.trim(),
                    technicianPhone: formData.technicianPhone?.trim(),
                    notes: formData.notes?.trim(),
                    certificateFile: formData.certificateFile,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                await dbService.addSystemLog(newSys);
                addToast('המערכת נוספה בהצלחה', 'success');
            }
            setIsAddEditModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save system log:', error);
            addToast('שגיאה בשמירת המערכת', 'error');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setFormData(prev => ({
                ...prev,
                certificateFile: {
                    name: file.name,
                    mimeType: file.type || 'application/pdf',
                    url: dataUrl,
                }
            }));
        };
        reader.readAsDataURL(file);
    };

    // Filtered systems
    const filteredSystems = useMemo(() => {
        return systems.filter(sys => {
            const matchesBuilding = buildingFilter === 'all' || sys.buildingId === buildingFilter;
            const matchesType = typeFilter === 'all' || sys.systemType === typeFilter;
            const matchesStatus = statusFilter === 'all' || sys.status === statusFilter;
            
            const bName = projects.find(p => p.id === sys.buildingId)?.name || '';
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm || 
                sys.title.toLowerCase().includes(searchLower) ||
                (sys.technicianName && sys.technicianName.toLowerCase().includes(searchLower)) ||
                (sys.notes && sys.notes.toLowerCase().includes(searchLower)) ||
                bName.toLowerCase().includes(searchLower);

            return matchesBuilding && matchesType && matchesStatus && matchesSearch;
        });
    }, [systems, projects, buildingFilter, typeFilter, statusFilter, searchTerm]);

    // KPI stats
    const stats = useMemo(() => {
        const total = systems.length;
        const ok = systems.filter(s => s.status === 'תקין').length;
        const warning = systems.filter(s => s.status === 'דורש בדיקה').length;
        const faulty = systems.filter(s => s.status === 'תקול' || s.status === 'מושבת').length;

        const now = new Date();
        const nextMonth = new Date();
        nextMonth.setDate(now.getDate() + 30);

        const dueSoon = systems.filter(s => {
            if (!s.nextInspectionDate) return false;
            const d = new Date(s.nextInspectionDate);
            return d <= nextMonth;
        }).length;

        return { total, ok, warning, faulty, dueSoon };
    }, [systems]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner text="טוען מערכות תשתית ובטיחות..." />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-sky-100/70 text-sky-700 rounded-2xl">
                        <WrenchScrewdriverIcon className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                            מערכות תשתית ובטיחות
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                            מעקב, רישוי ובדיקות תקופתיות למעליות, גנרטורים, מיזוג, מערכות כיבוי ומשאבות מים
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={handleOpenAdd}
                        className="btn-primary py-2.5 px-4 text-sm font-bold flex items-center justify-center gap-2 flex-grow sm:flex-grow-0 rounded-xl shadow-xs"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span>מערכת חדשה</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                    <p className="text-xs text-slate-500 font-semibold mb-1">סה״כ מערכות</p>
                    <p className="text-2xl font-black text-slate-800">{stats.total}</p>
                </div>
                <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs">
                    <p className="text-xs text-emerald-800 font-semibold mb-1">במצב תקין</p>
                    <p className="text-2xl font-black text-emerald-700">{stats.ok}</p>
                </div>
                <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-2xs">
                    <p className="text-xs text-amber-800 font-semibold mb-1">דורש בדיקה</p>
                    <p className="text-2xl font-black text-amber-700">{stats.warning}</p>
                </div>
                <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 shadow-2xs">
                    <p className="text-xs text-rose-800 font-semibold mb-1">תקול / מושבת</p>
                    <p className="text-2xl font-black text-rose-700">{stats.faulty}</p>
                </div>
                <div className="bg-sky-50/70 p-4 rounded-xl border border-sky-200 shadow-2xs col-span-2 lg:col-span-1">
                    <p className="text-xs text-sky-800 font-semibold mb-1">ביקורת ב-30 יום הקרובים</p>
                    <p className="text-2xl font-black text-sky-700">{stats.dueSoon}</p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="חיפוש מערכת, טכנאי או הערות..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                        />
                        <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>

                    {/* Building Filter */}
                    <select
                        value={buildingFilter}
                        onChange={e => setBuildingFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden bg-white"
                    >
                        <option value="all">כל המבנים</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>

                    {/* Type Filter */}
                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden bg-white"
                    >
                        <option value="all">כל סוגי המערכות</option>
                        {Object.entries(SYSTEM_TYPE_CONFIG).map(([key, cfg]) => (
                            <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden bg-white"
                    >
                        <option value="all">כל הסטטוסים</option>
                        <option value="תקין">תקין</option>
                        <option value="דורש בדיקה">דורש בדיקה</option>
                        <option value="תקול">תקול</option>
                        <option value="מושבת">מושבת</option>
                    </select>
                </div>
            </div>

            {/* Systems Grid */}
            {filteredSystems.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-3xl">
                        ⚙️
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">לא נמצאו מערכות מבנה</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                        לא נמצאו מערכות תואמות לסינונים הנוכחיים. לחץ על "מערכת חדשה" כדי להוסיף מעליות, גנרטור, או מערכות כיבוי.
                    </p>
                    <button onClick={handleOpenAdd} className="btn-primary py-2 px-4 text-sm font-semibold rounded-xl">
                        הוסף מערכת ראשונה
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredSystems.map(sys => {
                        const typeConfig = SYSTEM_TYPE_CONFIG[sys.systemType] || SYSTEM_TYPE_CONFIG.other;
                        const statusConfig = STATUS_CONFIG[sys.status] || STATUS_CONFIG['תקין'];
                        const building = projects.find(p => p.id === sys.buildingId);

                        const isOverdue = sys.nextInspectionDate && new Date(sys.nextInspectionDate) < new Date();
                        const cert = sys.certificateFile;

                        return (
                            <div
                                key={sys.id}
                                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
                            >
                                <div className="space-y-3">
                                    {/* Top Row: Type & Status */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-2xl p-2 rounded-xl bg-slate-100/80 border border-slate-200/60 shadow-2xs">
                                                {typeConfig.icon}
                                            </span>
                                            <div>
                                                <h3 className="font-bold text-base text-slate-800 tracking-tight leading-tight">
                                                    {sys.title}
                                                </h3>
                                                <Link
                                                    to={`/project/${sys.buildingId}`}
                                                    className="text-xs font-semibold text-sky-600 hover:underline inline-block mt-0.5"
                                                >
                                                    🏢 {building?.name || 'בניין'}
                                                </Link>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                                            {statusConfig.label}
                                        </span>
                                    </div>

                                    {/* Dates & Inspection Info */}
                                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                                        <div>
                                            <span className="text-slate-500 font-medium block">ביקורת אחרונה:</span>
                                            <span className="font-bold text-slate-700">
                                                {formatDate(sys.lastInspectionDate)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 font-medium block">ביקורת הבאה:</span>
                                            <span className={`font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                                                {formatDate(sys.nextInspectionDate)} {isOverdue && '⚠️ עבר הזמן'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Technician Details */}
                                    {(sys.technicianName || sys.technicianPhone) && (
                                        <div className="text-xs text-slate-600 flex items-center justify-between border-t border-slate-100 pt-2">
                                            <span className="font-medium text-slate-500">בודק מוסמך / טכנאי:</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800">{sys.technicianName || '—'}</span>
                                                {sys.technicianPhone && (
                                                    <a
                                                        href={`tel:${sys.technicianPhone}`}
                                                        className="text-sky-600 hover:text-sky-700 font-semibold px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200"
                                                    >
                                                        📞 {sys.technicianPhone}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Notes */}
                                    {sys.notes && (
                                        <p className="text-xs text-slate-600 bg-amber-50/40 p-2.5 rounded-lg border border-amber-100/70 italic">
                                            {sys.notes}
                                        </p>
                                    )}
                                </div>

                                {/* Bottom Row Actions */}
                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                    {/* Certificate file button */}
                                    {cert && (cert.url || cert.dataUrl) ? (
                                        <button
                                            type="button"
                                            onClick={() => setViewingCert({ name: cert.name || `אישור תקינות - ${sys.title}`, url: cert.url, dataUrl: cert.dataUrl })}
                                            className="text-xs text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg border border-sky-200 font-bold flex items-center gap-1.5 transition"
                                        >
                                            📄 <span>הצג תעודה/אישור רישוי</span>
                                        </button>
                                    ) : (
                                        <span className="text-xs text-slate-400">אין תעודה מצורפת</span>
                                    )}

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleOpenEdit(sys)}
                                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition"
                                            title="ערוך מערכת"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(sys.id, sys.buildingId)}
                                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                            title="מחק מערכת"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add / Edit System Modal */}
            <Modal
                isOpen={isAddEditModalOpen}
                onClose={() => setIsAddEditModalOpen(false)}
                title={editingSystem ? 'עריכת מערכת מבנה' : 'הוספת מערכת מבנה חדשה'}
                size="lg"
            >
                <div className="space-y-4">
                    {/* Building Selection */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">בניין / נכס*</label>
                        <select
                            value={formData.buildingId || ''}
                            onChange={e => setFormData(prev => ({ ...prev, buildingId: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 bg-white"
                        >
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name} - {p.address}</option>
                            ))}
                        </select>
                    </div>

                    {/* System Type & Title */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">סוג מערכת*</label>
                            <select
                                value={formData.systemType || 'elevator'}
                                onChange={e => {
                                    const type = e.target.value as BuildingSystemType;
                                    setFormData(prev => ({
                                        ...prev,
                                        systemType: type,
                                        title: prev.title || SYSTEM_TYPE_CONFIG[type].defaultTitle,
                                    }));
                                }}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 bg-white"
                            >
                                {Object.entries(SYSTEM_TYPE_CONFIG).map(([key, cfg]) => (
                                    <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">שם / תיאור מערכת*</label>
                            <input
                                type="text"
                                value={formData.title || ''}
                                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="לדוגמה: מעלית ראשית, גנרטור חירום..."
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                            />
                        </div>
                    </div>

                    {/* Status & Inspection Frequency */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">סטטוס מערכת</label>
                            <select
                                value={formData.status || 'תקין'}
                                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 bg-white"
                            >
                                <option value="תקין">תקין</option>
                                <option value="דורש בדיקה">דורש בדיקה</option>
                                <option value="תקול">תקול</option>
                                <option value="מושבת">מושבת</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">תדירות בדיקה נדרשת</label>
                            <select
                                value={formData.category || 'חצי-שנתי'}
                                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 bg-white"
                            >
                                <option value="חודשי">חודשי</option>
                                <option value="רבעוני">רבעוני (3 חודשים)</option>
                                <option value="חצי-שנתי">חצי-שנתי (6 חודשים)</option>
                                <option value="שנתי">שנתי (12 חודשים)</option>
                            </select>
                        </div>
                    </div>

                    {/* Inspection Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">תאריך בדיקה אחרונה</label>
                            <input
                                type="date"
                                value={formData.lastInspectionDate?.split('T')[0] || ''}
                                onChange={e => setFormData(prev => ({ ...prev, lastInspectionDate: e.target.value }))}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">תאריך בדיקה הבאה (רישוי/תקופתי)</label>
                            <input
                                type="date"
                                value={formData.nextInspectionDate?.split('T')[0] || ''}
                                onChange={e => setFormData(prev => ({ ...prev, nextInspectionDate: e.target.value }))}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                            />
                        </div>
                    </div>

                    {/* Technician Name & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">שם הבודק / חברת השירות</label>
                            <input
                                type="text"
                                value={formData.technicianName || ''}
                                onChange={e => setFormData(prev => ({ ...prev, technicianName: e.target.value }))}
                                placeholder="לדוגמה: ישראליפט, אלקטרה..."
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">טלפון ליצירת קשר / מוקד</label>
                            <input
                                type="tel"
                                value={formData.technicianPhone || ''}
                                onChange={e => setFormData(prev => ({ ...prev, technicianPhone: e.target.value }))}
                                placeholder="050-1234567"
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                            />
                        </div>
                    </div>

                    {/* Certificate / Protocol Upload */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            אישור תקינות / תעודת בדיקה (PDF או תמונה)
                        </label>
                        <input
                            type="file"
                            accept="application/pdf,image/*"
                            onChange={handleFileUpload}
                            className="w-full text-xs text-slate-500 file:mr-4 file:rtl:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 border border-slate-300 rounded-xl"
                        />
                        {formData.certificateFile && (
                            <p className="text-xs text-emerald-600 mt-1 font-semibold">
                                ✓ קובץ מצורף: {formData.certificateFile.name}
                            </p>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">הערות ותוצאות בדיקה</label>
                        <textarea
                            value={formData.notes || ''}
                            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            rows={3}
                            placeholder="הערות טכנאי, דרישות לתיקון, מספר רישוי או הערות כלליות..."
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={() => setIsAddEditModalOpen(false)}
                            className="btn-secondary py-2 px-4 text-sm font-semibold rounded-xl"
                        >
                            ביטול
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="btn-primary py-2 px-5 text-sm font-bold rounded-xl"
                        >
                            {editingSystem ? 'שמור שינויים' : 'הוסף מערכת'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Certificate PDF Viewer Modal */}
            <UniversalFileViewerModal
                isOpen={!!viewingCert}
                onClose={() => setViewingCert(null)}
                file={viewingCert ? { name: viewingCert.name, url: viewingCert.url, dataUrl: viewingCert.dataUrl, mimeType: 'application/pdf' } : null}
            />
        </div>
    );
};

export default AllBuildingSystemsPage;
