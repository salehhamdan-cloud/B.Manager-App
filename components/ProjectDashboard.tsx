import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { Project, Problem, ProblemSeverity } from '../types';
import { SEVERITY_COLORS } from '../constants';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from '../src/i18n';
import { PieChart, BarChart3, Activity, ShieldAlert, Wrench, CheckSquare, Clock } from 'lucide-react';

Chart.register(...registerables);

interface BuildingDashboardProps {
  project: Project;
  problems: Problem[];
}

type ChartCategory = 'problems' | 'systems' | 'tasks' | 'overview';
type ChartDisplayType = 'doughnut' | 'bar' | 'polarArea';

const SYSTEM_TYPE_LABELS: Record<string, string> = {
    elevator: 'מעליות',
    generator: 'גנרטור',
    hvac: 'מיזוג אוויר',
    fire_safety: 'כיבוי אש',
    water_pumps: 'משאבות מים',
    electrical: 'חשמל',
    other: 'אחר',
};

const BuildingDashboard: React.FC<BuildingDashboardProps> = ({ project, problems }) => {
    const mainChartRef = useRef<HTMLCanvasElement>(null);
    const secondaryChartRef = useRef<HTMLCanvasElement>(null);
    const { settings } = useSettings();
    const { t } = useTranslation();

    const [activeCategory, setActiveCategory] = useState<ChartCategory>('problems');
    const [chartType, setChartType] = useState<ChartDisplayType>('doughnut');

    // Consolidated Statistics
    const stats = useMemo(() => {
        const openProblems = problems.filter(p => !p.isFixed);
        const severityCounts = {
            [ProblemSeverity.LOW]: 0,
            [ProblemSeverity.MEDIUM]: 0,
            [ProblemSeverity.HIGH]: 0,
            [ProblemSeverity.CRITICAL]: 0,
        };
        openProblems.forEach(p => {
            severityCounts[p.severity] = (severityCounts[p.severity] || 0) + 1;
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const notificationDateLimit = new Date();
        notificationDateLimit.setDate(today.getDate() + (settings.notificationDays || 7));

        const expiredFiles = (project.files || []).filter(file =>
            file.dueDate && new Date(file.dueDate) < today
        ).length;
        
        const dueSoonFiles = (project.files || []).filter(file => {
            if (!file.dueDate) return false;
            const dueDate = new Date(file.dueDate);
            return dueDate >= today && dueDate <= notificationDateLimit;
        }).length;

        const expiredTodos = (project.todos || []).filter(todo =>
            !todo.isCompleted && todo.dueDate && new Date(todo.dueDate) < today
        ).length;

        const completedTodos = (project.todos || []).filter(todo => todo.isCompleted).length;
        const openTodos = (project.todos || []).filter(todo => !todo.isCompleted && (!todo.dueDate || new Date(todo.dueDate) >= today)).length;

        let expiredPermits = 0;
        let dueSoonPermits = 0;
        (project.workers || []).forEach(w => {
            const permits = [w.safetyPermit, w.workAtHeightPermit, ...w.licenses.map(l => l.file)];
            permits.forEach(p => {
                if (p?.validUntil) {
                    const dueDate = new Date(p.validUntil);
                    if (dueDate < today) expiredPermits++;
                    else if (dueDate <= notificationDateLimit) dueSoonPermits++;
                }
            });
        });

        let expiredWarranties = 0;
        let dueSoonWarranties = 0;
        (project.inventory || []).forEach(l => l.itemGroups.forEach(g => g.items.forEach(i => {
            if (i.warrantyEndDate) {
                const dueDate = new Date(i.warrantyEndDate);
                if (dueDate < today) expiredWarranties++;
                else if (dueDate <= notificationDateLimit) dueSoonWarranties++;
            }
        })));

        // Building Systems statistics
        const sysLogs = project.systemLogs || [];
        const systemsByType: Record<string, number> = {};
        let systemsNormal = 0;
        let systemsNeedsCheck = 0;
        let systemsFaulty = 0;
        let systemsOverdue = 0;
        let systemsDueSoon = 0;

        sysLogs.forEach(s => {
            const typeKey = s.systemType || 'other';
            systemsByType[typeKey] = (systemsByType[typeKey] || 0) + 1;

            if (s.status === 'תקין') systemsNormal++;
            else if (s.status === 'דורש בדיקה') systemsNeedsCheck++;
            else systemsFaulty++;

            if (s.nextInspectionDate) {
                const nDate = new Date(s.nextInspectionDate);
                const diffDays = Math.ceil((nDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                if (nDate < today) systemsOverdue++;
                else if (diffDays <= 30) systemsDueSoon++;
            }
        });

        return {
            totalProblems: problems.length,
            openProblems: openProblems.length,
            fixedProblems: problems.length - openProblems.length,
            openCritical: severityCounts[ProblemSeverity.CRITICAL],
            severityCounts,
            expiredFiles,
            expiredTodos,
            openTodos,
            completedTodos,
            dueSoonFiles,
            expiredPermits,
            dueSoonPermits,
            expiredWarranties,
            dueSoonWarranties,
            totalSystems: sysLogs.length,
            systemsByType,
            systemsNormal,
            systemsNeedsCheck,
            systemsFaulty,
            systemsOverdue,
            systemsDueSoon,
        };
    }, [problems, project, settings.notificationDays]);

    // Dynamic Primary Chart Configuration
    const dynamicPrimaryChartData = useMemo(() => {
        if (activeCategory === 'problems') {
            const labels = Object.values(ProblemSeverity);
            const data = labels.map(label => stats.severityCounts[label]);
            const backgroundColors = labels.map(label => SEVERITY_COLORS[label]?.pdfFill || '#cccccc');
            const borderColors = labels.map(label => SEVERITY_COLORS[label]?.pdfText || '#666666');

            return {
                title: t('openProblemsBySeverity', 'תקלות פתוחות לפי חומרה'),
                hasData: stats.openProblems > 0,
                data: {
                    labels,
                    datasets: [{
                        label: t('problems', 'תקלות פתוחות'),
                        data,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1,
                    }]
                }
            };
        }

        if (activeCategory === 'systems') {
            const types = Object.keys(stats.systemsByType);
            const labels = types.map(tKey => SYSTEM_TYPE_LABELS[tKey] || tKey);
            const data = types.map(tKey => stats.systemsByType[tKey]);
            const colors = ['#3b82f6', '#f59e0b', '#06b6d4', '#ef4444', '#10b981', '#8b5cf6', '#6b7280'];

            return {
                title: t('systemsDistribution', 'חלוקת מערכות תשתית לפי סוג'),
                hasData: stats.totalSystems > 0,
                data: {
                    labels: labels.length > 0 ? labels : ['מעליות', 'כיבוי אש', 'גנרטור'],
                    datasets: [{
                        label: t('systems', 'מערכות רשומות'),
                        data: data.length > 0 ? data : [0, 0, 0],
                        backgroundColor: colors.slice(0, Math.max(3, labels.length)),
                        borderWidth: 1,
                    }]
                }
            };
        }

        if (activeCategory === 'tasks') {
            const labels = ['משימות שהושלמו', 'משימות פתוחות', 'באיחור תאריך יעד'];
            const data = [stats.completedTodos, stats.openTodos, stats.expiredTodos];
            const colors = ['#22c55e', '#3b82f6', '#ef4444'];

            return {
                title: t('tasksProgressChart', 'סטטוס ביצוע משימות ומטלות'),
                hasData: (stats.completedTodos + stats.openTodos + stats.expiredTodos) > 0,
                data: {
                    labels,
                    datasets: [{
                        label: 'כמות משימות',
                        data,
                        backgroundColor: colors,
                        borderWidth: 1,
                    }]
                }
            };
        }

        // Overview
        const labels = ['תקלות שטופלו', 'תקלות פתוחות', 'מערכות תקינות', 'מערכות לבדיקה'];
        const data = [stats.fixedProblems, stats.openProblems, stats.systemsNormal, stats.systemsNeedsCheck + stats.systemsOverdue];
        const colors = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

        return {
            title: t('overallBuildingHealth', 'מדד בריאות כולל לבניין'),
            hasData: true,
            data: {
                labels,
                datasets: [{
                    label: 'מדד ביצוע',
                    data,
                    backgroundColor: colors,
                    borderWidth: 1,
                }]
            }
        };
    }, [activeCategory, stats, t]);

    // Secondary Chart Data
    const secondaryChartData = useMemo(() => {
        if (activeCategory === 'systems') {
            const labels = ['תקין', 'דורש בדיקה', 'תקול / מושבת', 'באיחור בדיקה'];
            const data = [stats.systemsNormal, stats.systemsNeedsCheck, stats.systemsFaulty, stats.systemsOverdue];
            const colors = ['#10b981', '#f59e0b', '#ef4444', '#dc2626'];

            return {
                title: t('systemsStatus', 'סטטוס תפעולי של מערכות המבנה'),
                hasData: stats.totalSystems > 0,
                data: {
                    labels,
                    datasets: [{
                        label: 'מערכות',
                        data,
                        backgroundColor: colors,
                        borderWidth: 1,
                    }]
                }
            };
        }

        if (activeCategory === 'tasks') {
            const labels = ['מסמכים שפגו', 'היתרים שפגו', 'אחריות שפגה', 'מסמכים לתפוגה'];
            const data = [stats.expiredFiles, stats.expiredPermits, stats.expiredWarranties, stats.dueSoonFiles];
            const colors = ['#f97316', '#ef4444', '#eab308', '#a855f7'];

            return {
                title: t('validityAlerts', 'תוקף מסמכים, היתרים ואחריות'),
                hasData: (stats.expiredFiles + stats.expiredPermits + stats.expiredWarranties + stats.dueSoonFiles) > 0,
                data: {
                    labels,
                    datasets: [{
                        label: 'מסמכים',
                        data,
                        backgroundColor: colors,
                        borderWidth: 1,
                    }]
                }
            };
        }

        // Default: Problems status (Fixed vs Open)
        const labels = [t('fixed', 'טופלו'), t('open', 'פתוחות')];
        const data = [stats.fixedProblems, stats.openProblems];
        const colors = ['#22c55e', '#f59e0b'];

        return {
            title: t('problemsGeneralStatus', 'סטטוס תקלות כללי'),
            hasData: stats.totalProblems > 0,
            data: {
                labels,
                datasets: [{
                    label: 'תקלות',
                    data,
                    backgroundColor: colors,
                    borderColor: '#ffffff',
                    borderWidth: 2,
                }]
            }
        };
    }, [activeCategory, stats, t]);

    // Render Primary Chart
    useEffect(() => {
        let chartInstance: Chart | null = null;
        if (mainChartRef.current && dynamicPrimaryChartData.hasData) {
            chartInstance = new Chart(mainChartRef.current, {
                type: chartType,
                data: dynamicPrimaryChartData.data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: chartType === 'bar' ? 'top' : 'right' },
                        title: {
                            display: true,
                            text: dynamicPrimaryChartData.title,
                            font: { size: 13, weight: 'bold' }
                        }
                    },
                    scales: chartType === 'bar' ? {
                        y: { beginAtZero: true, ticks: { precision: 0 } }
                    } : undefined
                }
            });
        }
        return () => chartInstance?.destroy();
    }, [dynamicPrimaryChartData, chartType]);

    // Render Secondary Chart
    useEffect(() => {
        let chartInstance: Chart | null = null;
        if (secondaryChartRef.current && secondaryChartData.hasData) {
            chartInstance = new Chart(secondaryChartRef.current, {
                type: chartType === 'bar' ? 'bar' : 'pie',
                data: secondaryChartData.data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right' },
                        title: {
                            display: true,
                            text: secondaryChartData.title,
                            font: { size: 13, weight: 'bold' }
                        }
                    },
                    scales: chartType === 'bar' ? {
                        y: { beginAtZero: true, ticks: { precision: 0 } }
                    } : undefined
                }
            });
        }
        return () => chartInstance?.destroy();
    }, [secondaryChartData, chartType]);

    const StatCard = ({ title, value, colorClass }: { title: string, value: number, colorClass: string }) => (
        <div className="bg-white dark:bg-neutral-900 p-3 rounded-xl shadow-2xs text-center border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 transition">
            <p className="text-2xl font-bold font-mono text-neutral-800 dark:text-neutral-100">{value}</p>
            <p className={`text-xs font-semibold mt-0.5 ${colorClass}`}>{title}</p>
        </div>
    );

    return (
        <section className="mb-6 p-5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl shadow-2xs border border-neutral-200 dark:border-neutral-800 space-y-4">
            {/* Header with Title and Dynamic Chart Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-3 border-b border-neutral-200/80 dark:border-neutral-800 gap-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                            <span>{t('buildingSummary', 'מרכז ניתוח ותרשימים דינמיים לבניין')}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                Dynamic Live
                            </span>
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            מעקב תקלות, מערכות תשתית, משימות ותוקף מסמכים בזמן אמת
                        </p>
                    </div>
                </div>

                {/* Interactive Category & Chart Controls */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Category Selector Tabs */}
                    <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold shadow-2xs">
                        <button
                            onClick={() => setActiveCategory('problems')}
                            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                                activeCategory === 'problems'
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                            }`}
                        >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>תקלות ({stats.openProblems})</span>
                        </button>
                        <button
                            onClick={() => setActiveCategory('systems')}
                            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                                activeCategory === 'systems'
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                            }`}
                        >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>מערכות ({stats.totalSystems})</span>
                        </button>
                        <button
                            onClick={() => setActiveCategory('tasks')}
                            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                                activeCategory === 'tasks'
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                            }`}
                        >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>משימות ותפוגות</span>
                        </button>
                    </div>

                    {/* Chart Type Toggle */}
                    <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-semibold shadow-2xs">
                        <button
                            onClick={() => setChartType('doughnut')}
                            className={`p-1.5 rounded-lg transition-all ${
                                chartType === 'doughnut'
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                                    : 'text-neutral-500 hover:text-neutral-900'
                            }`}
                            title="תרשים עוגה/טבעת"
                        >
                            <PieChart className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setChartType('bar')}
                            className={`p-1.5 rounded-lg transition-all ${
                                chartType === 'bar'
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                                    : 'text-neutral-500 hover:text-neutral-900'
                            }`}
                            title="תרשים עמודות"
                        >
                            <BarChart3 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <StatCard title={t('totalProblems', 'סה״כ תקלות')} value={stats.totalProblems} colorClass="text-neutral-500 dark:text-neutral-400" />
                <StatCard title={t('openProblems', 'תקלות פתוחות')} value={stats.openProblems} colorClass="text-amber-600 dark:text-amber-400" />
                <StatCard title={t('openCritical', 'תקלות קריטיות')} value={stats.openCritical} colorClass="text-rose-600 dark:text-rose-400" />
                <StatCard title={t('totalSystems', 'סה״כ מערכות')} value={stats.totalSystems} colorClass="text-blue-600 dark:text-blue-400" />
                <StatCard title={t('systemsDueSoon', 'בדיקות באיחור/בקרוב')} value={stats.systemsOverdue + stats.systemsDueSoon} colorClass="text-orange-600 dark:text-orange-400" />
                <StatCard title={t('expiredDocuments', 'מסמכים/משימות שפגו')} value={stats.expiredTodos + stats.expiredFiles + stats.expiredPermits} colorClass="text-rose-600 dark:text-rose-400" />
            </div>

            {/* Interactive Dynamic Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl shadow-2xs border border-neutral-200 dark:border-neutral-800">
                    <div className="relative h-64 flex items-center justify-center">
                        {dynamicPrimaryChartData.hasData ? (
                            <canvas ref={mainChartRef}></canvas>
                        ) : (
                            <div className="text-center text-neutral-400 dark:text-neutral-500 p-6 text-xs">
                                <p className="font-semibold">{dynamicPrimaryChartData.title}</p>
                                <p className="mt-1">אין נתונים זמינים להצגה בקטגוריה זו.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl shadow-2xs border border-neutral-200 dark:border-neutral-800">
                    <div className="relative h-64 flex items-center justify-center">
                        {secondaryChartData.hasData ? (
                            <canvas ref={secondaryChartRef}></canvas>
                        ) : (
                            <div className="text-center text-neutral-400 dark:text-neutral-500 p-6 text-xs">
                                <p className="font-semibold">{secondaryChartData.title}</p>
                                <p className="mt-1">אין נתונים זמינים להצגה בקטגוריה זו.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default BuildingDashboard;
