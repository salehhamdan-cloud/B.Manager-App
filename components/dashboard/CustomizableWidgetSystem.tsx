import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Project, GlobalDashboardStats, Report, ProblemWithContext, Notification, TodoWithContext } from '../../types';
import * as dbService from '../../services/dbService';
import { formatDate } from '../../utils/dateFormatter';
import { useToast } from '../../contexts/ToastContext';
import { 
    PlusIcon, PencilIcon, TrashIcon, ArrowDownTrayIcon, ArrowUpTrayIcon,
    ChevronUpIcon, ChevronDownIcon
} from '../icons/ActionIcons';
import {
    CheckCircleIcon, XMarkIcon, ArrowPathIcon,
    ExclamationTriangleIcon, InformationCircleIcon
} from '../icons/FeedbackIcons';
import { 
    ClipboardDocumentListIcon, CalendarDaysIcon, WrenchScrewdriverIcon, 
    SettingsIcon, ArchiveBoxIcon, ChevronLeftIcon 
} from '../icons/GeneralIcons';
import { ReceiptPercentIcon, CalculatorIcon } from '../icons/BusinessIcons';
import { UserGroupIcon, IdentificationIcon } from '../icons/UserIcons';
import { ChartPieIcon, RectangleGroupIcon, QueueListIcon, FolderIcon } from '../icons/NavigationIcons';

export type WidgetId = 
    | 'pending_reports'
    | 'urgent_maintenance'
    | 'recent_activity'
    | 'operational_warnings'
    | 'financial_summary'
    | 'preventive_schedule'
    | 'portfolio_charts';

export interface WidgetItemConfig {
    id: WidgetId;
    title: string;
    description: string;
    category: 'תפעול' | 'תחזוקה' | 'מערכת' | 'כספים';
    enabled: boolean;
    order: number;
    colSpan: 1 | 2; // 1 = regular half-width on desktop, 2 = full-width
}

const DEFAULT_WIDGETS: WidgetItemConfig[] = [
    {
        id: 'pending_reports',
        title: 'דוחות ממתינים לטיפול',
        description: 'מעקב אחר דוחות פעילים עם תקלות פתוחות ופירוט לפי בניין',
        category: 'תפעול',
        enabled: true,
        order: 1,
        colSpan: 1,
    },
    {
        id: 'urgent_maintenance',
        title: 'משימות ותקלות דחופות',
        description: 'תקלות קריטיות ומשימות תחזוקה באיחור הדורשות טיפול מיידי',
        category: 'תחזוקה',
        enabled: true,
        order: 2,
        colSpan: 1,
    },
    {
        id: 'recent_activity',
        title: 'יומן פעילות אחרונה',
        description: 'עדכונים ופעולות שבוצעו במערכת בזמן אמת עם תיוג שעה',
        category: 'מערכת',
        enabled: true,
        order: 3,
        colSpan: 2,
    },
    {
        id: 'operational_warnings',
        title: 'התראות תפעוליות ותקינה',
        description: 'סריקת חוזי שכירות לקראת סיום, בדיקות מעליות ותקינה',
        category: 'תפעול',
        enabled: true,
        order: 4,
        colSpan: 1,
    },
    {
        id: 'financial_summary',
        title: 'מבט פיננסי והוצאות',
        description: 'הוצאות מצטברות, חשבוניות באיחור ויתרות לתשלום לספקים',
        category: 'כספים',
        enabled: true,
        order: 5,
        colSpan: 1,
    },
    {
        id: 'preventive_schedule',
        title: 'לוח תחזוקה מונעת קרובה',
        description: 'אירועי טיפול תקופתיים וביקורות מתוכננות לחודש הקרוב',
        category: 'תחזוקה',
        enabled: true,
        order: 6,
        colSpan: 1,
    },
    {
        id: 'portfolio_charts',
        title: 'התפלגות וגרפי סטטוס',
        description: 'התפלגות סטטוס בניינים ותקלות קריטיות בנכסים',
        category: 'תפעול',
        enabled: true,
        order: 7,
        colSpan: 2,
    },
];

const STORAGE_KEY = 'bmanager_dashboard_custom_widgets_v2';

interface CustomizableWidgetSystemProps {
    stats: GlobalDashboardStats;
    projects: Project[];
    currency: string;
    statusChartRef?: React.RefObject<HTMLCanvasElement>;
    issuesChartRef?: React.RefObject<HTMLCanvasElement>;
    onRefreshStats?: () => void;
}

export const CustomizableWidgetSystem: React.FC<CustomizableWidgetSystemProps> = ({
    stats,
    projects,
    currency,
    statusChartRef,
    issuesChartRef,
    onRefreshStats,
}) => {
    const { addToast } = useToast();
    const navigate = useNavigate();

    // Widget configuration state
    const [widgets, setWidgets] = useState<WidgetItemConfig[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed: WidgetItemConfig[] = JSON.parse(saved);
                // Ensure all default widget IDs exist in case new ones were added
                const existingIds = new Set(parsed.map(w => w.id));
                const merged = [...parsed];
                DEFAULT_WIDGETS.forEach(dw => {
                    if (!existingIds.has(dw.id)) {
                        merged.push(dw);
                    }
                });
                return merged.sort((a, b) => a.order - b.order);
            }
        } catch (e) {
            console.warn('Failed to load custom widgets from localStorage:', e);
        }
        return DEFAULT_WIDGETS;
    });

    const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Live data for widgets
    const [allReports, setAllReports] = useState<Report[]>([]);
    const [allProblems, setAllProblems] = useState<ProblemWithContext[]>([]);
    const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
    const [allTodos, setAllTodos] = useState<TodoWithContext[]>([]);

    // Urgent filter tab
    const [urgentFilter, setUrgentFilter] = useState<'all' | 'critical_problems' | 'overdue_tasks'>('all');

    // Save configuration
    const saveWidgetsConfig = (newWidgets: WidgetItemConfig[]) => {
        setWidgets(newWidgets);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidgets));
        } catch (e) {
            console.error('Failed to save widgets config to localStorage:', e);
        }
    };

    // Fetch extra data for widgets
    const fetchWidgetData = useCallback(async () => {
        setIsLoadingData(true);
        try {
            const [reportsData, problemsData, notificationsData, todosData] = await Promise.all([
                dbService.getAllReports(),
                dbService.getAllProblemsWithContext(),
                dbService.getAllNotifications(),
                dbService.getAllTodos(),
            ]);
            setAllReports(reportsData);
            setAllProblems(problemsData);
            setAllNotifications(notificationsData);
            setAllTodos(todosData);
        } catch (error) {
            console.error('Error fetching dashboard widget data:', error);
        } finally {
            setIsLoadingData(false);
        }
    }, []);

    useEffect(() => {
        fetchWidgetData();
    }, [fetchWidgetData]);

    // Derived metric: Pending Reports (Reports with open problems or no fixed status)
    const pendingReportsData = useMemo(() => {
        const problemMap = new Map<string, ProblemWithContext[]>();
        allProblems.forEach(p => {
            const list = problemMap.get(p.reportId) || [];
            list.push(p);
            problemMap.set(p.reportId, list);
        });

        const pendingList: Array<{
            report: Report;
            projectName: string;
            openProblemsCount: number;
            totalProblemsCount: number;
        }> = [];

        const projectMap = new Map(projects.map(p => [p.id, p.name]));

        allReports.forEach(r => {
            const problems = problemMap.get(r.id) || [];
            const openProblems = problems.filter(p => !p.isFixed);
            // Consider pending if it has open problems or has 0 problems created yet
            if (openProblems.length > 0 || problems.length === 0) {
                pendingList.push({
                    report: r,
                    projectName: projectMap.get(r.projectId) || 'בניין כללי',
                    openProblemsCount: openProblems.length,
                    totalProblemsCount: problems.length,
                });
            }
        });

        // Sort by report date descending
        pendingList.sort((a, b) => new Date(b.report.date).getTime() - new Date(a.report.date).getTime());

        return {
            totalPending: pendingList.length,
            totalReports: allReports.length,
            list: pendingList,
        };
    }, [allReports, allProblems, projects]);

    // Derived metric: Urgent Maintenance Items
    const urgentItems = useMemo(() => {
        const criticalIssues = allProblems.filter(p => !p.isFixed && (p.severity === 'קריטית' || p.severity === 'גבוהה' || (p.severity as string)?.toLowerCase?.().includes('critical')));
        const overdueTodos = allTodos.filter(t => !t.isCompleted && t.dueDate && new Date(t.dueDate) < new Date());

        const items: Array<{
            id: string;
            type: 'problem' | 'todo';
            title: string;
            subtitle: string;
            location?: string;
            date?: string;
            severityLabel: string;
            severityColor: string;
            link: string;
            isProblem: boolean;
            problemData?: ProblemWithContext;
        }> = [];

        if (urgentFilter === 'all' || urgentFilter === 'critical_problems') {
            criticalIssues.forEach(prob => {
                items.push({
                    id: prob.id,
                    type: 'problem',
                    title: prob.description,
                    subtitle: prob.projectName,
                    location: prob.locationTag,
                    date: prob.reportDate || prob.createdAt,
                    severityLabel: prob.severity,
                    severityColor: 'bg-red-100 text-red-800 border-red-200',
                    link: `/project/${prob.projectId}/report/${prob.reportId}/problem/${prob.id}/edit`,
                    isProblem: true,
                    problemData: prob,
                });
            });
        }

        if (urgentFilter === 'all' || urgentFilter === 'overdue_tasks') {
            overdueTodos.forEach(todo => {
                items.push({
                    id: todo.id,
                    type: 'todo',
                    title: todo.description,
                    subtitle: todo.projectName,
                    location: todo.group,
                    date: todo.dueDate,
                    severityLabel: 'משימה באיחור',
                    severityColor: 'bg-amber-100 text-amber-800 border-amber-200',
                    link: `/all-todos`,
                    isProblem: false,
                });
            });
        }

        return {
            totalCount: criticalIssues.length + overdueTodos.length,
            criticalCount: criticalIssues.length,
            overdueCount: overdueTodos.length,
            items: items.slice(0, 8),
        };
    }, [allProblems, allTodos, urgentFilter]);

    // Derived metric: Recent Activity
    const recentActivities = useMemo(() => {
        const sorted = [...allNotifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return sorted.slice(0, 10);
    }, [allNotifications]);

    // Mark single notification or all as read
    const handleMarkAllRead = async () => {
        try {
            await dbService.markAllNotificationsAsRead();
            addToast('כל ההתראות סומנו כנקראו', 'success');
            fetchWidgetData();
        } catch (e) {
            addToast('שגיאה בעדכון התראות', 'error');
        }
    };

    // Quick toggle for a problem completion
    const handleToggleProblemFixed = async (prob: ProblemWithContext) => {
        try {
            await dbService.updateProblem({
                ...prob,
                isFixed: !prob.isFixed,
            });
            addToast(prob.isFixed ? 'התקלה הוחזרה לטיפול' : 'התקלה סומנה כנפתרה!', 'success');
            fetchWidgetData();
            if (onRefreshStats) onRefreshStats();
        } catch (e) {
            addToast('שגיאה בעדכון סטטוס תקלה', 'error');
        }
    };

    // Widget Customizer Handlers
    const toggleWidget = (id: WidgetId) => {
        const updated = widgets.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w);
        saveWidgetsConfig(updated);
    };

    const toggleColSpan = (id: WidgetId) => {
        const updated = widgets.map(w => w.id === id ? { ...w, colSpan: (w.colSpan === 1 ? 2 : 1) as 1 | 2 } : w);
        saveWidgetsConfig(updated);
    };

    const moveWidget = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= widgets.length) return;
        
        const copy = [...widgets];
        const temp = copy[index];
        copy[index] = copy[targetIndex];
        copy[targetIndex] = temp;
        
        // Re-assign order numbers
        const reordered = copy.map((w, idx) => ({ ...w, order: idx + 1 }));
        saveWidgetsConfig(reordered);
    };

    const resetToDefaults = () => {
        saveWidgetsConfig(DEFAULT_WIDGETS);
        addToast('הווידג׳טים אופסו לברירת המחדל', 'info');
    };

    const enableAllWidgets = () => {
        const updated = widgets.map(w => ({ ...w, enabled: true }));
        saveWidgetsConfig(updated);
        addToast('כל הווידג׳טים הופעלו', 'success');
    };

    // Relative time helper in Hebrew
    const formatRelativeTime = (isoString: string): string => {
        try {
            const date = new Date(isoString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffSec = Math.floor(diffMs / 1000);
            const diffMin = Math.floor(diffSec / 60);
            const diffHours = Math.floor(diffMin / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMin < 1) return 'ממש עכשיו';
            if (diffMin < 60) return `לפני ${diffMin} דק׳`;
            if (diffHours < 24) return `לפני ${diffHours} שעות`;
            if (diffDays === 1) return 'אתמול';
            if (diffDays < 7) return `לפני ${diffDays} ימים`;
            return formatDate(isoString);
        } catch {
            return formatDate(isoString);
        }
    };

    // Active widgets sorted by order
    const enabledWidgets = useMemo(() => {
        return widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order);
    }, [widgets]);

    return (
        <section className="space-y-5">
            {/* Header Control Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <ChartPieIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                                ווידג'טים וסטטיסטיקות בזמן אמת
                            </h2>
                            <span className="text-[11px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-mono-numbers">
                                {enabledWidgets.length}/{widgets.length} פעילים
                            </span>
                        </div>
                        <p className="text-xs text-slate-500">
                            מבט מהיר על דוחות פתוחים, תקלות דחופות, פעילות אחרונה ומדדים תפעוליים
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                        onClick={() => {
                            fetchWidgetData();
                            if (onRefreshStats) onRefreshStats();
                            addToast('הנתונים רועננו בהצלחה', 'info');
                        }}
                        disabled={isLoadingData}
                        className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
                        title="רענן נתונים כעת"
                    >
                        <ArrowPathIcon className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin text-sky-600' : ''}`} />
                        <span>רענון</span>
                    </button>

                    <button
                        onClick={() => setIsCustomizeModalOpen(true)}
                        className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700"
                        title="התאם אישית ווידג'טים וסדר תצוגה"
                    >
                        <SettingsIcon className="w-4 h-4" />
                        <span>התאם לוח בקרה</span>
                    </button>
                </div>
            </div>

            {/* Quick Stats Ribbon (Pinned high-impact overview metrics) */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Pending Reports Stat */}
                <div 
                    onClick={() => {
                        const widget = document.getElementById('widget-pending_reports');
                        if (widget) widget.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="cursor-pointer bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-sky-300 transition-all group"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">דוחות ממתינים לטיפול</span>
                        <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
                            <ClipboardDocumentListIcon className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono-numbers">
                            {pendingReportsData.totalPending}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                            מתוך {pendingReportsData.totalReports} דוחות
                        </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                        <span>{pendingReportsData.totalPending > 0 ? 'דורש מעקב וטיפול' : 'הכל מעודכן'}</span>
                        <ChevronLeftIcon className="w-3.5 h-3.5 rtl:rotate-0" />
                    </div>
                </div>

                {/* 2. Urgent Maintenance Tasks Stat */}
                <div 
                    onClick={() => {
                        const widget = document.getElementById('widget-urgent_maintenance');
                        if (widget) widget.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all shadow-2xs hover:shadow-md group ${
                        urgentItems.totalCount > 0 
                            ? 'bg-gradient-to-bl from-red-50/70 to-white border-red-200 hover:border-red-300' 
                            : 'bg-white border-slate-200/90 hover:border-sky-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">משימות ותקלות דחופות</span>
                        <div className={`p-2 rounded-xl group-hover:scale-105 transition-transform ${
                            urgentItems.totalCount > 0 ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                            <ExclamationTriangleIcon className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-2xl sm:text-3xl font-black font-mono-numbers ${urgentItems.totalCount > 0 ? 'text-red-700' : 'text-slate-900'}`}>
                            {urgentItems.totalCount}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                            {urgentItems.criticalCount} קריטיות • {urgentItems.overdueCount} באיחור
                        </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-red-700">
                        <span>{urgentItems.totalCount > 0 ? 'דורש טיפול עדיפות ראשונה' : 'אין תקלות דחופות'}</span>
                        <ChevronLeftIcon className="w-3.5 h-3.5 rtl:rotate-0" />
                    </div>
                </div>

                {/* 3. Recent Activity Count */}
                <div 
                    onClick={() => {
                        const widget = document.getElementById('widget-recent_activity');
                        if (widget) widget.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="cursor-pointer bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-sky-300 transition-all group"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">פעילות עדכנית במערכת</span>
                        <div className="p-2 rounded-xl bg-sky-50 text-sky-600 group-hover:scale-105 transition-transform">
                            <QueueListIcon className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono-numbers">
                            {allNotifications.filter(n => !n.isRead).length || allNotifications.length}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                            {allNotifications.filter(n => !n.isRead).length > 0 ? 'אירועים חדשים' : 'סה״כ אירועים'}
                        </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-sky-700">
                        <span>צפייה ביומן המלא</span>
                        <ChevronLeftIcon className="w-3.5 h-3.5 rtl:rotate-0" />
                    </div>
                </div>

                {/* 4. Portfolio Assets Stat */}
                <div 
                    onClick={() => navigate('/projects')}
                    className="cursor-pointer bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-sky-300 transition-all group"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">נכסים ובניינים מנוהלים</span>
                        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform">
                            <RectangleGroupIcon className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono-numbers">
                            {projects.length}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                            {stats.activeProjects} פעילים
                        </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-indigo-700">
                        <span>ספר נכסים מלא</span>
                        <ChevronLeftIcon className="w-3.5 h-3.5 rtl:rotate-0" />
                    </div>
                </div>
            </div>

            {/* Dynamic Grid of Enabled Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {enabledWidgets.map((widget) => {
                    const colClass = widget.colSpan === 2 ? 'md:col-span-2' : 'col-span-1';

                    // 1. Pending Reports Widget
                    if (widget.id === 'pending_reports') {
                        return (
                            <div
                                key={widget.id}
                                id={`widget-${widget.id}`}
                                className={`bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between ${colClass}`}
                            >
                                <div>
                                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 flex-wrap gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                                                <ClipboardDocumentListIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-base text-slate-900">
                                                    דוחות ממתינים לטיפול ({pendingReportsData.totalPending})
                                                </h3>
                                                <p className="text-xs text-slate-500">דוחות עם תקלות פתוחות או לא פתורות</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Link
                                                to="/all-reports"
                                                className="text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg transition"
                                            >
                                                כל הדוחות
                                            </Link>
                                        </div>
                                    </div>

                                    {pendingReportsData.list.length > 0 ? (
                                        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                                            {pendingReportsData.list.slice(0, 5).map(({ report, projectName, openProblemsCount, totalProblemsCount }) => (
                                                <div
                                                    key={report.id}
                                                    className="p-3 rounded-xl bg-slate-50 hover:bg-sky-50/60 border border-slate-200/70 hover:border-sky-200 transition-all flex items-center justify-between gap-3 group"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <Link
                                                                to={`/project/${report.projectId}/report/${report.id}/problems`}
                                                                className="font-bold text-sm text-slate-800 group-hover:text-sky-800 truncate hover:underline"
                                                                title={report.title}
                                                            >
                                                                {report.title}
                                                            </Link>
                                                            {report.group && (
                                                                <span className="text-[10px] bg-slate-200/80 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                                                                    {report.group}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                            <span className="font-semibold text-slate-600">{projectName}</span>
                                                            <span>&bull;</span>
                                                            <span className="font-mono-numbers">{formatDate(report.date)}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full font-mono-numbers ${
                                                            openProblemsCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                                        }`}>
                                                            {openProblemsCount} תקלות פתוחות
                                                        </span>
                                                        <Link
                                                            to={`/project/${report.projectId}/report/${report.id}/problems`}
                                                            className="p-1 text-slate-400 group-hover:text-sky-600 rounded-lg hover:bg-white"
                                                            title="צפה בתקלות הדוח"
                                                        >
                                                            <ChevronLeftIcon className="w-4 h-4 rtl:rotate-0" />
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <CheckCircleIcon className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                            <p className="text-sm font-bold text-slate-800">כל הדוחות טופלו בהצלחה!</p>
                                            <p className="text-xs text-slate-500 mt-0.5">אין כרגע דוחות עם תקלות פתוחות במערכת.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                                    <span>סה״כ {pendingReportsData.totalReports} דוחות מתועדים</span>
                                    <Link to="/all-reports" className="font-semibold text-sky-700 hover:underline">
                                        סריקת כל הדוחות &larr;
                                    </Link>
                                </div>
                            </div>
                        );
                    }

                    // 2. Urgent Maintenance Tasks Widget
                    if (widget.id === 'urgent_maintenance') {
                        return (
                            <div
                                key={widget.id}
                                id={`widget-${widget.id}`}
                                className={`bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between ${colClass}`}
                            >
                                <div>
                                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 flex-wrap gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-xl bg-red-50 text-red-700">
                                                <ExclamationTriangleIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-base text-slate-900">
                                                    משימות ותקלות דחופות ({urgentItems.totalCount})
                                                </h3>
                                                <p className="text-xs text-slate-500">דורש טיפול עדיפות ראשונה</p>
                                            </div>
                                        </div>

                                        {/* Filter Tabs */}
                                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                                            <button
                                                onClick={() => setUrgentFilter('all')}
                                                className={`px-2 py-1 rounded-md transition ${urgentFilter === 'all' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                                            >
                                                הכל ({urgentItems.totalCount})
                                            </button>
                                            <button
                                                onClick={() => setUrgentFilter('critical_problems')}
                                                className={`px-2 py-1 rounded-md transition ${urgentFilter === 'critical_problems' ? 'bg-white shadow-2xs text-red-700 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                                            >
                                                תקלות ({urgentItems.criticalCount})
                                            </button>
                                            <button
                                                onClick={() => setUrgentFilter('overdue_tasks')}
                                                className={`px-2 py-1 rounded-md transition ${urgentFilter === 'overdue_tasks' ? 'bg-white shadow-2xs text-amber-700 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                                            >
                                                באיחור ({urgentItems.overdueCount})
                                            </button>
                                        </div>
                                    </div>

                                    {urgentItems.items.length > 0 ? (
                                        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                                            {urgentItems.items.map((item) => (
                                                <div
                                                    key={`${item.type}-${item.id}`}
                                                    className="p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs transition-all flex items-start justify-between gap-3 group"
                                                >
                                                    <div className="min-w-0 flex-grow">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${item.severityColor}`}>
                                                                {item.severityLabel}
                                                            </span>
                                                            <Link
                                                                to={item.link}
                                                                className="font-bold text-sm text-slate-900 hover:text-sky-700 truncate"
                                                                title={item.title}
                                                            >
                                                                {item.title}
                                                            </Link>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1.5 flex-wrap">
                                                            <span className="font-semibold text-slate-700">{item.subtitle}</span>
                                                            {item.location && (
                                                                <>
                                                                    <span>&bull;</span>
                                                                    <span>{item.location}</span>
                                                                </>
                                                            )}
                                                            {item.date && (
                                                                <>
                                                                    <span>&bull;</span>
                                                                    <span className="font-mono-numbers">{formatDate(item.date)}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 flex-shrink-0 self-center">
                                                        {item.isProblem && item.problemData && (
                                                            <button
                                                                onClick={() => handleToggleProblemFixed(item.problemData!)}
                                                                className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition"
                                                                title="סמן כנפתרה"
                                                            >
                                                                פתור
                                                            </button>
                                                        )}
                                                        <Link
                                                            to={item.link}
                                                            className="p-1.5 text-slate-400 group-hover:text-sky-600 rounded-lg hover:bg-slate-100"
                                                            title="ערוך פריט"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </Link>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <CheckCircleIcon className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                            <p className="text-sm font-bold text-slate-800">אין תקלות או משימות דחופות!</p>
                                            <p className="text-xs text-slate-500 mt-0.5">כל התקלות הקריטיות והמשימות בסטטוס תקין.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                                    <Link to="/all-problems-checklist" className="font-semibold text-sky-700 hover:underline">
                                        צפה בצ׳ק ליסט תקלות מלא &larr;
                                    </Link>
                                    <Link to="/all-todos" className="font-semibold text-slate-600 hover:underline">
                                        כל המשימות &larr;
                                    </Link>
                                </div>
                            </div>
                        );
                    }

                    // 3. Recent Activity Widget
                    if (widget.id === 'recent_activity') {
                        return (
                            <div
                                key={widget.id}
                                id={`widget-${widget.id}`}
                                className={`bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between ${colClass}`}
                            >
                                <div>
                                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 flex-wrap gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                                                <QueueListIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-base text-slate-900">
                                                    יומן פעילות אחרונה במערכת
                                                </h3>
                                                <p className="text-xs text-slate-500">אירועים, שינויים ועדכונים בזמן אמת</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleMarkAllRead}
                                                className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition"
                                            >
                                                סמן הכל כנקרא
                                            </button>
                                            <Link
                                                to="/notifications"
                                                className="text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg transition"
                                            >
                                                צפה בכל הפעילויות
                                            </Link>
                                        </div>
                                    </div>

                                    {recentActivities.length > 0 ? (
                                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                            {recentActivities.map((act) => (
                                                <div
                                                    key={act.id}
                                                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                                                        act.isRead 
                                                            ? 'bg-slate-50/60 border-slate-100 text-slate-700' 
                                                            : 'bg-sky-50/50 border-sky-200/80 text-slate-900'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                            act.action === 'create' ? 'bg-emerald-500' :
                                                            act.action === 'complete' ? 'bg-indigo-500' :
                                                            act.action === 'delete' ? 'bg-red-500' : 'bg-sky-500'
                                                        }`} />
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-sm truncate">
                                                                {act.message}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                                                <span className="font-medium text-slate-500">
                                                                    {act.itemType === 'problem' ? 'תקלה' :
                                                                     act.itemType === 'report' ? 'דוח' :
                                                                     act.itemType === 'building' ? 'בניין' :
                                                                     act.itemType === 'todo' ? 'משימה' :
                                                                     act.itemType === 'tenant' ? 'דייר' :
                                                                     act.itemType === 'quotation' ? 'הצעת מחיר' : 'פעילות'}
                                                                </span>
                                                                <span>&bull;</span>
                                                                <span className="font-mono-numbers">{formatRelativeTime(act.createdAt)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                                                        <span className="text-[11px] font-mono-numbers text-slate-400">
                                                            {formatDate(act.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <InformationCircleIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                            <p className="text-sm font-bold text-slate-800">אין פעילויות עדכניות</p>
                                            <p className="text-xs text-slate-500 mt-0.5">פעולות שתבצע במערכת יופיעו כאן באופן אוטומטי.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                                    <span>מתעד אוטומטית שינויים בנכסים, דיירים, תקלות וחשבוניות</span>
                                    <Link to="/notifications" className="font-semibold text-sky-700 hover:underline">
                                        פתח יומן מלא &larr;
                                    </Link>
                                </div>
                            </div>
                        );
                    }

                    // 4. Operational Warnings Widget
                    if (widget.id === 'operational_warnings') {
                        return (
                            <div
                                key={widget.id}
                                id={`widget-${widget.id}`}
                                className={`bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between ${colClass}`}
                            >
                                <div>
                                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                                                <ExclamationTriangleIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-base text-slate-900">התראות ותקינה</h3>
                                                <p className="text-xs text-slate-500">תוקף חוזים, מעליות ובטיחות</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5">
                                        <Link
                                            to="/all-tenants"
                                            className="p-3 rounded-xl bg-slate-50 hover:bg-amber-50/80 border border-slate-200/80 transition flex flex-col justify-between"
                                        >
                                            <span className="text-xs font-semibold text-slate-600">חוזים קרובים לסיום</span>
                                            <div className="flex items-baseline gap-1 mt-2">
                                                <span className="text-2xl font-black text-amber-700 font-mono-numbers">
                                                    {stats.expiringLeasesCount || 0}
                                                </span>
                                                <span className="text-[10px] text-slate-400">&lt; 30 יום</span>
                                            </div>
                                        </Link>

                                        <Link
                                            to="/all-tenants"
                                            className="p-3 rounded-xl bg-slate-50 hover:bg-red-50/80 border border-slate-200/80 transition flex flex-col justify-between"
                                        >
                                            <span className="text-xs font-semibold text-slate-600">חוזים שפגו</span>
                                            <div className="flex items-baseline gap-1 mt-2">
                                                <span className="text-2xl font-black text-red-700 font-mono-numbers">
                                                    {stats.expiredLeasesCount || 0}
                                                </span>
                                                <span className="text-[10px] text-slate-400">לחידוש</span>
                                            </div>
                                        </Link>

                                        <Link
                                            to="/calendar"
                                            className="p-3 rounded-xl bg-slate-50 hover:bg-amber-50/80 border border-slate-200/80 transition flex flex-col justify-between"
                                        >
                                            <span className="text-xs font-semibold text-slate-600">ביקורות מעליות ותקינה</span>
                                            <div className="flex items-baseline gap-1 mt-2">
                                                <span className="text-2xl font-black text-amber-700 font-mono-numbers">
                                                    {stats.dueBuildingSystemsCount || 0}
                                                </span>
                                                <span className="text-[10px] text-slate-400">תשתיות</span>
                                            </div>
                                        </Link>

                                        <Link
                                            to="/all-inventory"
                                            className="p-3 rounded-xl bg-slate-50 hover:bg-orange-50/80 border border-slate-200/80 transition flex flex-col justify-between"
                                        >
                                            <span className="text-xs font-semibold text-slate-600">מלאי חלפים נמוך</span>
                                            <div className="flex items-baseline gap-1 mt-2">
                                                <span className="text-2xl font-black text-orange-700 font-mono-numbers">
                                                    {stats.lowInventoryCount || 0}
                                                </span>
                                                <span className="text-[10px] text-slate-400">להזמנה</span>
                                            </div>
                                        </Link>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
                                    <span>סריקה מתוזמנת אוטומטית</span>
                                    <Link to="/calendar" className="font-semibold text-sky-700 hover:underline">
                                        לוח ביקורות מקיף &larr;
                                    </Link>
                                </div>
                            </div>
                        );
                    }

                    // 5. Financial Summary Widget
                    if (widget.id === 'financial_summary') {
                        return (
                            <div
                                key={widget.id}
                                id={`widget-${widget.id}`}
                                className={`bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between ${colClass}`}
                            >
                                <div>
                                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                                                <ReceiptPercentIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-base text-slate-900">מבט פיננסי והוצאות</h3>
                                                <p className="text-xs text-slate-500">חשבוניות ספקים ויתרות תשלום</p>
                                            </div>
                                        </div>
                                        <Link
                                            to="/quotations"
                                            className="text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 px-2 py-1 rounded-lg"
                                        >
                                            הצעות מחיר
                                        </Link>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="p-3 rounded-xl bg-slate-50 flex items-center justify-between">
                                            <div>
                                                <span className="text-xs text-slate-500 block">הוצאות אחזקה מצטברות</span>
                                                <span className="text-xl font-black text-slate-900 font-mono-numbers">
                                                    {currency}{(stats.totalExpenses || 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                                שולם/בביצוע
                                            </span>
                                        </div>

                                        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 flex items-center justify-between">
                                            <div>
                                                <span className="text-xs text-amber-800 block">יתרת תשלום פתוחה לספקים</span>
                                                <span className="text-xl font-black text-amber-900 font-mono-numbers">
                                                    {currency}{(stats.unpaidExpenses || 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <span className="text-xs font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                                                {stats.overdueInvoicesCount || 0} באיחור
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                                    <Link to="/calculator" className="font-semibold text-sky-700 hover:underline flex items-center gap-1">
                                        <CalculatorIcon className="w-3.5 h-3.5" /> מחשבון עלויות
                                    </Link>
                                    <Link to="/suppliers" className="font-semibold text-slate-600 hover:underline">
                                        ספר ספקים &larr;
                                    </Link>
                                </div>
                            </div>
                        );
                    }

                    // 6. Preventive Schedule Widget
                    if (widget.id === 'preventive_schedule') {
                        return (
                            <div
                                key={widget.id}
                                id={`widget-${widget.id}`}
                                className={`bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between ${colClass}`}
                            >
                                <div>
                                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                                                <CalendarDaysIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-base text-slate-900">תחזוקה מונעת תקופתית</h3>
                                                <p className="text-xs text-slate-500">אירועים מתוכננים בלוח השנה</p>
                                            </div>
                                        </div>
                                        <Link
                                            to="/calendar"
                                            className="text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 px-2 py-1 rounded-lg"
                                        >
                                            פתח לוח שנה
                                        </Link>
                                    </div>

                                    {stats.upcomingTasks.length > 0 ? (
                                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                            {stats.upcomingTasks.slice(0, 4).map(task => (
                                                <div
                                                    key={`${task.type}-${task.id}`}
                                                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 transition flex items-center justify-between gap-3 text-xs"
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-slate-800 truncate">{task.name}</p>
                                                            <p className="text-slate-500 truncate">{task.projectName}</p>
                                                        </div>
                                                    </div>
                                                    <span className="font-bold text-slate-700 font-mono-numbers flex-shrink-0">
                                                        {formatDate(task.dueDate)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 bg-slate-50 rounded-xl text-slate-500 text-xs">
                                            אין אירועי תחזוקה מונעת קרובים ב-30 הימים הקרובים.
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                                    <span>סנכרון מלא עם לוח השנה העברי והלועזי</span>
                                    <Link to="/calendar" className="font-semibold text-sky-700 hover:underline">
                                        מעבר ללוח מלא &larr;
                                    </Link>
                                </div>
                            </div>
                        );
                    }

                    // 7. Portfolio Charts Widget
                    if (widget.id === 'portfolio_charts') {
                        return (
                            <div
                                key={widget.id}
                                id={`widget-${widget.id}`}
                                className={`bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs ${colClass}`}
                            >
                                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
                                            <ChartPieIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-base text-slate-900">גרפי סטטוס והתפלגות תיק הנכסים</h3>
                                            <p className="text-xs text-slate-500">סטטוס תפעולי וריכוז תקלות קריטיות לפי בניין</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-600 mb-2 text-center">בניינים לפי סטטוס תפעולי</h4>
                                        <div className="relative h-56">
                                            {projects.length > 0 ? (
                                                <canvas ref={statusChartRef}></canvas>
                                            ) : (
                                                <p className="text-center text-slate-400 pt-20 text-xs">אין נתוני בניינים להצגה.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold text-slate-600 mb-2 text-center">בניינים עם הכי הרבה תקלות קריטיות</h4>
                                        <div className="relative h-56">
                                            {issuesChartRef ? (
                                                <canvas ref={issuesChartRef}></canvas>
                                            ) : (
                                                <p className="text-center text-slate-400 pt-20 text-xs">אין תקלות קריטיות פתוחות.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return null;
                })}
            </div>

            {/* Customize Dashboard Modal */}
            {isCustomizeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
                    <div 
                        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
                        style={{ direction: 'rtl' }}
                    >
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-sky-600 text-white shadow-xs">
                                    <SettingsIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">התאמת לוח הבקרה והווידג'טים</h3>
                                    <p className="text-xs text-slate-500">קבע אילו ווידג'טים יוצגו בלוח הבקרה, את סדר הופעתם ואת רוחב התצוגה שלהם</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCustomizeModalOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 overflow-y-auto space-y-3 divide-y divide-slate-100">
                            {widgets.map((w, index) => (
                                <div
                                    key={w.id}
                                    className={`pt-3 first:pt-0 flex items-center justify-between gap-4 p-3 rounded-2xl transition ${
                                        w.enabled ? 'bg-sky-50/40 border border-sky-100' : 'bg-slate-50/60 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <button
                                            onClick={() => toggleWidget(w.id)}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                w.enabled ? 'bg-sky-600' : 'bg-slate-300'
                                            }`}
                                            role="switch"
                                            aria-checked={w.enabled}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                    w.enabled ? '-translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-slate-900">{w.title}</span>
                                                <span className="text-[10px] font-semibold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                                                    {w.category}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                                {w.description}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {/* Width selector button */}
                                        <button
                                            onClick={() => toggleColSpan(w.id)}
                                            className={`px-2 py-1 rounded-lg text-xs font-semibold border transition ${
                                                w.colSpan === 2 
                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-800' 
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                            }`}
                                            title="שנה רוחב תצוגה (רוחב כפול / עמודה יחידה)"
                                        >
                                            {w.colSpan === 2 ? 'רוחב כפול (2x)' : 'עמודה 1x'}
                                        </button>

                                        {/* Reorder Buttons */}
                                        <div className="flex items-center">
                                            <button
                                                onClick={() => moveWidget(index, 'up')}
                                                disabled={index === 0}
                                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white disabled:opacity-20 transition"
                                                title="הזז מעלה"
                                            >
                                                <ChevronUpIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => moveWidget(index, 'down')}
                                                disabled={index === widgets.length - 1}
                                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white disabled:opacity-20 transition"
                                                title="הזז מטה"
                                            >
                                                <ChevronDownIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={resetToDefaults}
                                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition shadow-2xs"
                                >
                                    איפוס לברירת מחדל
                                </button>
                                <button
                                    onClick={enableAllWidgets}
                                    className="text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-xl hover:bg-sky-100 transition shadow-2xs"
                                >
                                    הפעל את כל הווידג'טים
                                </button>
                            </div>

                            <button
                                onClick={() => setIsCustomizeModalOpen(false)}
                                className="btn-primary py-1.5 px-4 text-xs font-bold"
                            >
                                שמור וסגור
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
