import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { Project, GlobalDashboardStats } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import * as emailService from '../services/emailService';
import * as dbService from '../services/dbService';
import {
  Building2,
  Users,
  CheckSquare,
  Calendar,
  Sparkles,
  FileText,
  Download,
  Upload,
  Mail,
  AlertTriangle,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
  ShieldAlert,
  Clock,
  Plus,
  Wrench,
  CheckCircle2,
  Percent,
  ChevronLeft,
  Filter,
  Eye,
  Camera
} from 'lucide-react';
import { CustomizableWidgetSystem } from './dashboard/CustomizableWidgetSystem';
import SyncProgressModal from './common/SyncProgressModal';

Chart.register(...registerables);

interface DashboardProps {
  stats: GlobalDashboardStats;
  projects: Project[];
  statusChartRef?: React.RefObject<HTMLCanvasElement>;
  issuesChartRef?: React.RefObject<HTMLCanvasElement>;
  className?: string;
  onRefresh?: () => void;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'פעיל': return '#2563eb'; // blue-600
        case 'הושלם': return '#059669'; // emerald-600
        case 'בהמתנה': return '#d97706'; // amber-600
        case 'בוטל': return '#737373'; // neutral-500
        default: return '#3b82f6';
    }
};

const Dashboard: React.FC<DashboardProps> = ({ stats, projects, statusChartRef, issuesChartRef, className, onRefresh }) => {
    const internalStatusChartRef = useRef<HTMLCanvasElement>(null);
    const internalIssuesChartRef = useRef<HTMLCanvasElement>(null);
    const interactiveCanvasRef = useRef<HTMLCanvasElement>(null);

    const finalStatusChartRef = statusChartRef || internalStatusChartRef;
    const finalIssuesChartRef = issuesChartRef || internalIssuesChartRef;
    
    const { settings } = useSettings();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [isSyncing, setIsSyncing] = useState(false);
    const syncFileInputRef = useRef<HTMLInputElement>(null);

    // Interactive Canvas View State
    const [canvasChartType, setCanvasChartType] = useState<'status' | 'issues' | 'adherence'>('status');

    // Dynamic Bars Category Filter
    const [barCategoryFilter, setBarCategoryFilter] = useState<'all' | 'safety' | 'maintenance' | 'occupancy'>('all');

    // Mobile / ZIP Sync Progress State
    const [syncProgress, setSyncProgress] = useState<{
      isOpen: boolean;
      type: 'export' | 'import';
      title: string;
      percent: number;
      message: string;
      details?: string;
      isComplete?: boolean;
      stats?: any;
    }>({
      isOpen: false,
      type: 'export',
      title: '',
      percent: 0,
      message: '',
    });

    const currency = settings.currencySymbol || '₪';

    // Calculate dynamic health and progress rates for dynamic bars
    const dynamicMetrics = useMemo(() => {
        // 1. Issue Resolution & Safety Rate
        const totalIssues = (stats.totalOpenIssues || 0) + (stats.openCriticalIssues || 0);
        const resolvedEstimate = totalIssues > 0 ? Math.max(0, 100 - Math.round((stats.openCriticalIssues / Math.max(1, totalIssues)) * 60)) : 100;

        // 2. Lease & Occupancy Health Rate
        const totalTenants = stats.totalTenants || 0;
        const healthyTenants = Math.max(0, totalTenants - (stats.expiringLeasesCount || 0) - (stats.expiredLeasesCount || 0));
        const leaseHealthRate = totalTenants > 0 ? Math.round((healthyTenants / totalTenants) * 100) : 100;

        // 3. Preventive Maintenance Compliance Rate
        const dueSystems = stats.dueBuildingSystemsCount || 0;
        const totalEstimatedSystems = Math.max(dueSystems + 4, projects.length * 3);
        const preventiveComplianceRate = totalEstimatedSystems > 0 
            ? Math.max(15, Math.round(((totalEstimatedSystems - dueSystems) / totalEstimatedSystems) * 100))
            : 100;

        // 4. Tasks & Operations Adherence Rate
        const overdueTasks = (stats.expiredTodos || 0) + (stats.expiredFiles || 0);
        const totalTasksPool = Math.max(10, overdueTasks + (stats.dueSoonTodos || 0) + 12);
        const taskAdherenceRate = Math.max(20, Math.round(((totalTasksPool - overdueTasks) / totalTasksPool) * 100));

        return {
            resolvedEstimate,
            totalIssues,
            leaseHealthRate,
            totalTenants,
            healthyTenants,
            preventiveComplianceRate,
            dueSystems,
            taskAdherenceRate,
            overdueTasks
        };
    }, [stats, projects]);

    // Status Chart Data
    const statusChartData = useMemo(() => {
        const labels = Object.keys(stats.statusCounts);
        const data = Object.values(stats.statusCounts);
        const backgroundColor = labels.map(label => getStatusColor(label));

        return {
            labels,
            datasets: [{
                label: 'בניינים לפי סטטוס',
                data,
                backgroundColor,
                borderColor: typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? '#171717' : '#ffffff',
                borderWidth: 2,
            }]
        };
    }, [stats.statusCounts]);

    // Critical issues chart data
    const criticalIssuesChartData = useMemo(() => {
        const projectMap = new Map(projects.map(p => [p.id, p.name]));
        const issuesByProject = stats.criticalIssuesByProject;

        const sortedProjects = Object.entries(issuesByProject)
            .sort((a, b) => Number(b[1]) - Number(a[1]))
            .slice(0, 5);

        const labels = sortedProjects.map(([projectId]) => projectMap.get(projectId) || 'בניין');
        const data = sortedProjects.map(([, count]) => count);

        return {
            labels,
            datasets: [{
                label: 'תקלות קריטיות פתוחות',
                data,
                backgroundColor: 'rgba(225, 29, 72, 0.85)',
                borderColor: '#e11d48',
                borderWidth: 1.5,
                borderRadius: 8,
            }]
        };
    }, [projects, stats.criticalIssuesByProject]);

    // Adherence comparison chart data
    const adherenceChartData = useMemo(() => {
        return {
            labels: ['בטיחות מתקלות', 'תחזוקה מונעת', 'תקינות חוזים', 'עמידה בזמנים'],
            datasets: [
                {
                    label: 'שיעור ביצוע נוכחי (%)',
                    data: [
                        dynamicMetrics.resolvedEstimate,
                        dynamicMetrics.preventiveComplianceRate,
                        dynamicMetrics.leaseHealthRate,
                        dynamicMetrics.taskAdherenceRate
                    ],
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.85)', // emerald
                        'rgba(37, 99, 235, 0.85)',  // blue
                        'rgba(59, 130, 246, 0.85)', // sky
                        'rgba(245, 158, 11, 0.85)', // amber
                    ],
                    borderRadius: 8,
                    borderWidth: 1.5,
                },
                {
                    label: 'יעד שנתי מוגדר (%)',
                    data: [95, 90, 95, 85],
                    backgroundColor: 'rgba(115, 115, 115, 0.25)',
                    borderColor: 'rgba(115, 115, 115, 0.5)',
                    borderRadius: 8,
                    borderWidth: 1,
                }
            ]
        };
    }, [dynamicMetrics]);

    // Render interactive main canvas based on canvasChartType
    useEffect(() => {
        let chartInstance: Chart | null = null;
        if (interactiveCanvasRef.current) {
            const existing = Chart.getChart(interactiveCanvasRef.current);
            if (existing) existing.destroy();

            const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
            const textColor = isDark ? '#d4d4d4' : '#404040';
            const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';

            if (canvasChartType === 'status') {
                chartInstance = new Chart(interactiveCanvasRef.current, {
                    type: 'doughnut',
                    data: statusChartData,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '68%',
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: {
                                    font: { family: "'Plus Jakarta Sans', system-ui, sans-serif", size: 12 },
                                    color: textColor,
                                    boxWidth: 12,
                                    boxHeight: 12,
                                    borderRadius: 3,
                                    useBorderRadius: true,
                                    padding: 14,
                                }
                            },
                            tooltip: {
                                backgroundColor: isDark ? '#262626' : '#ffffff',
                                titleColor: isDark ? '#f5f5f5' : '#171717',
                                bodyColor: isDark ? '#d4d4d4' : '#404040',
                                borderColor: isDark ? '#404040' : '#e5e5e5',
                                borderWidth: 1,
                                padding: 10,
                                boxPadding: 4,
                            }
                        }
                    }
                });
            } else if (canvasChartType === 'issues') {
                chartInstance = new Chart(interactiveCanvasRef.current, {
                    type: 'bar',
                    data: criticalIssuesChartData.labels.length > 0 ? criticalIssuesChartData : {
                        labels: ['אין תקלות'],
                        datasets: [{ label: 'תקלות קריטיות', data: [0], backgroundColor: 'rgba(16, 185, 129, 0.8)' }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: isDark ? '#262626' : '#ffffff',
                                titleColor: isDark ? '#f5f5f5' : '#171717',
                                bodyColor: isDark ? '#d4d4d4' : '#404040',
                                borderColor: isDark ? '#404040' : '#e5e5e5',
                                borderWidth: 1,
                                padding: 10,
                            }
                        },
                        scales: {
                            x: {
                                beginAtZero: true,
                                ticks: { precision: 0, color: textColor, font: { family: "'JetBrains Mono', monospace" } },
                                grid: { color: gridColor }
                            },
                            y: {
                                ticks: { color: textColor, font: { family: "'Plus Jakarta Sans', system-ui, sans-serif", size: 11 } },
                                grid: { display: false }
                            }
                        }
                    }
                });
            } else if (canvasChartType === 'adherence') {
                chartInstance = new Chart(interactiveCanvasRef.current, {
                    type: 'bar',
                    data: adherenceChartData,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top',
                                labels: {
                                    font: { family: "'Plus Jakarta Sans', system-ui, sans-serif", size: 11 },
                                    color: textColor,
                                    boxWidth: 12,
                                    borderRadius: 3,
                                    useBorderRadius: true,
                                }
                            },
                            tooltip: {
                                backgroundColor: isDark ? '#262626' : '#ffffff',
                                titleColor: isDark ? '#f5f5f5' : '#171717',
                                bodyColor: isDark ? '#d4d4d4' : '#404040',
                                borderColor: isDark ? '#404040' : '#e5e5e5',
                                borderWidth: 1,
                                padding: 10,
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                ticks: {
                                    callback: (val) => `${val}%`,
                                    color: textColor,
                                    font: { family: "'JetBrains Mono', monospace" }
                                },
                                grid: { color: gridColor }
                            },
                            x: {
                                ticks: { color: textColor, font: { family: "'Plus Jakarta Sans', system-ui, sans-serif", size: 11 } },
                                grid: { display: false }
                            }
                        }
                    }
                });
            }
        }
        return () => chartInstance?.destroy();
    }, [canvasChartType, statusChartData, criticalIssuesChartData, adherenceChartData, settings.themeMode]);

    // Also support external or widget-based status chart ref
    useEffect(() => {
        let statusChartInstance: Chart | null = null;
        if (finalStatusChartRef.current && finalStatusChartRef.current !== interactiveCanvasRef.current) {
            const existingChart = Chart.getChart(finalStatusChartRef.current);
            if (existingChart) existingChart.destroy();
            
            const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
            const textColor = isDark ? '#d4d4d4' : '#404040';

            statusChartInstance = new Chart(finalStatusChartRef.current, {
                type: 'doughnut',
                data: statusChartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                font: { family: "'Plus Jakarta Sans', system-ui, sans-serif", size: 12 },
                                color: textColor,
                                boxWidth: 12,
                                boxHeight: 12,
                                borderRadius: 3,
                                useBorderRadius: true,
                                padding: 14,
                            }
                        }
                    }
                }
            });
        }
        return () => statusChartInstance?.destroy();
    }, [statusChartData, finalStatusChartRef, settings.themeMode]);
    
    // Also support external or widget-based issues chart ref
    useEffect(() => {
        let issuesChartInstance: Chart | null = null;
        if (finalIssuesChartRef.current && finalIssuesChartRef.current !== interactiveCanvasRef.current && criticalIssuesChartData.labels.length > 0) {
            const existingChart = Chart.getChart(finalIssuesChartRef.current);
            if (existingChart) existingChart.destroy();

            const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
            const textColor = isDark ? '#d4d4d4' : '#404040';
            const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';

            issuesChartInstance = new Chart(finalIssuesChartRef.current, {
                type: 'bar',
                data: criticalIssuesChartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { 
                          beginAtZero: true, 
                          ticks: { precision: 0, color: textColor, font: { family: "'JetBrains Mono', monospace" } },
                          grid: { color: gridColor }
                      },
                      y: { 
                          ticks: { color: textColor, font: { family: "'Plus Jakarta Sans', system-ui, sans-serif", size: 11 } },
                          grid: { display: false }
                      }
                    }
                }
            });
        }
        return () => issuesChartInstance?.destroy();
    }, [criticalIssuesChartData, finalIssuesChartRef, settings.themeMode]);

    // Export active canvas as PNG image
    const handleExportCanvasImage = () => {
        if (!interactiveCanvasRef.current) return;
        const dataUrl = interactiveCanvasRef.current.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `bmanager_chart_${canvasChartType}_${new Date().toISOString().slice(0, 10)}.png`;
        link.href = dataUrl;
        link.click();
        addToast('התרשים הורד בהצלחה כקובץ תמונה PNG', 'success');
    };

    const handleSendDigest = () => {
        if (!settings.notificationEmailAddress) {
            addToast('יש להגדיר כתובת מייל בהגדרות.', 'warning');
            return;
        }
        emailService.triggerDigestEmail(stats, settings);
        addToast('פותח תוכנת מייל עם סיכום התראות...', 'info');
    };

    // Mobile / Universal Backup Export
    const handleExportUniversalBackup = async () => {
        setIsSyncing(true);
        setSyncProgress({
            isOpen: true,
            type: 'export',
            title: 'ייצוא ארכיון גיבוי למובייל',
            percent: 5,
            message: 'מתחיל הכנת קובץ building_manager_backup.zip...',
            isComplete: false,
        });
        try {
            const { createMobileZipBackup } = await import('../services/mobileZipSyncService');
            const { blob, filename, fileCount, dbSize } = await createMobileZipBackup(undefined, (prog) => {
                setSyncProgress(prev => ({
                    ...prev,
                    percent: prog.percent,
                    message: prog.message,
                    details: prog.details,
                }));
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setSyncProgress(prev => ({
                ...prev,
                percent: 100,
                isComplete: true,
                message: 'קובץ building_manager_backup.zip יוצא בהצלחה!',
                stats: { fileCount, dbSize }
            }));
            addToast(`קובץ ${filename} הורד בהצלחה! כולל SQLite ו-${fileCount} קבצים ותמונות.`, 'success');
        } catch (error) {
            console.error('Export error:', error);
            setSyncProgress(prev => ({ ...prev, isOpen: false }));
            addToast('שגיאה בייצוא הגיבוי', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    // Mobile / Universal Backup Import
    const handleImportUniversalBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsSyncing(true);
        setSyncProgress({
            isOpen: true,
            type: 'import',
            title: 'שחזור וסנכרון נתונים',
            percent: 5,
            message: 'קורא ומנתח קובץ גיבוי מובייל...',
            isComplete: false,
        });

        try {
            const { isZipArchive, restoreFromMobileZip } = await import('../services/mobileZipSyncService');
            if (await isZipArchive(file)) {
                const summary = await restoreFromMobileZip(file, (prog) => {
                    setSyncProgress(prev => ({
                        ...prev,
                        percent: prog.percent,
                        message: prog.message,
                        details: prog.details,
                    }));
                });
                setSyncProgress(prev => ({
                    ...prev,
                    percent: 100,
                    isComplete: true,
                    message: 'הסנכרון והשחזור מ-ZIP הושלמו בהצלחה מלאה!',
                    stats: summary,
                }));
                addToast(`סונכרנו בהצלחה: ${summary.buildings} מבנים, ${summary.tenants} דיירים, ${summary.issues} תקלות, ${summary.files} קבצים ותמונות!`, 'success');
            } else {
                setSyncProgress(prev => ({ ...prev, percent: 15, message: 'מנתח קובץ JSON/MD...' }));
                const text = await file.text();
                await dbService.importAllData(text, (prog) => {
                    setSyncProgress(prev => ({
                        ...prev,
                        percent: prog.percent,
                        message: prog.message,
                        details: prog.details,
                    }));
                });
                setSyncProgress(prev => ({ ...prev, percent: 100, isComplete: true, message: 'הייבוא הושלם בהצלחה מלאה!' }));
                addToast('כל נתוני אפליקציית המובייל סונכרנו ויובאו בהצלחה!', 'success');
            }
        } catch (error) {
            console.error('Import error:', error);
            setSyncProgress(prev => ({ ...prev, isOpen: false }));
            addToast('שגיאה בסנכרון קובץ הגיבוי. ודא שזהו קובץ ZIP, JSON או MD תקין.', 'error');
        } finally {
            setIsSyncing(false);
            if (syncFileInputRef.current) syncFileInputRef.current.value = '';
        }
    };

    return (
        <div className={`space-y-6 ${className || ''}`}>
            {/* Hidden sync file input */}
            <input
                type="file"
                ref={syncFileInputRef}
                accept=".zip,.json,.md,application/zip,application/x-zip-compressed,application/json,text/markdown"
                onChange={handleImportUniversalBackup}
                className="hidden"
            />

            {/* Welcome & Portfolio Header Banner */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 sm:p-7 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs uppercase tracking-wider font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40 px-3 py-1 rounded-full flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            מרכז שליטה ובקרה &bull; תיק נכסים
                        </span>
                        <span className="text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40 font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            מערכת מקוונת
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 tracking-tight">
                        {settings.companyInfo.name || 'תיק נכסים ומבנים'}
                    </h1>
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xl">
                        ניהול שוטף, אחזקה מונעת, דיירים, הוצאות וסנכרון מלא עם אפליקציית המובייל (Room Schema v40)
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {settings.enableEmailNotifications && (
                        <button
                            onClick={handleSendDigest}
                            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition flex items-center gap-1.5 active:scale-95"
                            title="שלח סיכום התראות למייל"
                        >
                            <Mail className="w-4 h-4 text-neutral-500" />
                            <span>סיכום למייל</span>
                        </button>
                    )}
                    <button
                        onClick={handleExportUniversalBackup}
                        disabled={isSyncing}
                        className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition flex items-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50"
                        title="ייצוא ארכיון גיבוי מלא לאפליקציית המובייל (building_manager_backup.zip)"
                    >
                        <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>ייצוא מובייל (.ZIP)</span>
                    </button>
                    <button
                        onClick={() => syncFileInputRef.current?.click()}
                        disabled={isSyncing}
                        className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-50"
                        title="ייבוא וסנכרון ארכיון ZIP של אפליקציית המובייל או קובץ Room JSON"
                    >
                        <Upload className="w-4 h-4" />
                        <span>סנכרון ממובייל</span>
                    </button>
                </div>
            </div>

            {/* Dynamic KPI Progress Bars (Dynamic Bars Section) */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 sm:p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                                מדדי ביצוע תפעוליים דינמיים ועמידה ביעדים
                            </h2>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                פסי התקדמות חיים וחישובי בריאות מערכת בזמן אמת לפי תקני Room Schema v40
                            </p>
                        </div>
                    </div>

                    {/* Filter Tabs for Dynamic Bars */}
                    <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl self-start lg:self-auto text-xs font-semibold overflow-x-auto max-w-full">
                        <button
                            onClick={() => setBarCategoryFilter('all')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                barCategoryFilter === 'all'
                                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs font-bold'
                                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                            }`}
                        >
                            הכל (4 מדדים)
                        </button>
                        <button
                            onClick={() => setBarCategoryFilter('safety')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                barCategoryFilter === 'safety'
                                    ? 'bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 shadow-2xs font-bold'
                                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                            }`}
                        >
                            בטיחות ותקלות
                        </button>
                        <button
                            onClick={() => setBarCategoryFilter('maintenance')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                barCategoryFilter === 'maintenance'
                                    ? 'bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                            }`}
                        >
                            תחזוקה ובדיקות
                        </button>
                        <button
                            onClick={() => setBarCategoryFilter('occupancy')}
                            className={`px-3 py-1.5 rounded-lg transition-all ${
                                barCategoryFilter === 'occupancy'
                                    ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                            }`}
                        >
                            דיירים ותפעול
                        </button>
                    </div>
                </div>

                {/* Dynamic Bars Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                    {/* Dynamic Bar 1: Issue Resolution Rate */}
                    {(barCategoryFilter === 'all' || barCategoryFilter === 'safety') && (
                        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 transition flex flex-col justify-between space-y-3.5">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                                        <span>שיעור תקינות מתקלות</span>
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        dynamicMetrics.resolvedEstimate >= 85
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                            : dynamicMetrics.resolvedEstimate >= 65
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                            : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                                    }`}>
                                        {dynamicMetrics.resolvedEstimate >= 85 ? 'מצוין' : dynamicMetrics.resolvedEstimate >= 65 ? 'דורש מעקב' : 'קריטי'}
                                    </span>
                                </div>

                                <div className="flex items-baseline justify-between mb-1.5">
                                    <span className="text-2xl font-black font-mono text-neutral-900 dark:text-neutral-100">
                                        {dynamicMetrics.resolvedEstimate}%
                                    </span>
                                    <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                                        יעד: 95%
                                    </span>
                                </div>

                                {/* Animated bar track */}
                                <div className="w-full h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden relative">
                                    <div
                                        className={`h-full transition-all duration-700 ease-out rounded-full ${
                                            dynamicMetrics.resolvedEstimate >= 85 ? 'bg-emerald-500' : dynamicMetrics.resolvedEstimate >= 65 ? 'bg-amber-500' : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${Math.min(100, Math.max(8, dynamicMetrics.resolvedEstimate))}%` }}
                                    />
                                    {/* 95% benchmark line */}
                                    <div className="absolute top-0 bottom-0 left-[5%] w-0.5 bg-neutral-900/40 dark:bg-white/40" title="יעד 95%" />
                                </div>
                            </div>

                            <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between text-xs">
                                <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                                    תקלות קריטיות: <strong className="font-mono text-rose-600 dark:text-rose-400">{stats.openCriticalIssues || 0}</strong>
                                </span>
                                <Link
                                    to="/all-problems-checklist"
                                    className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline text-xs"
                                >
                                    <span>צפה בתקלות</span>
                                    <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-0" />
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Dynamic Bar 2: Preventive Maintenance Compliance */}
                    {(barCategoryFilter === 'all' || barCategoryFilter === 'maintenance') && (
                        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 transition flex flex-col justify-between space-y-3.5">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                                        <Wrench className="w-4 h-4 text-blue-500" />
                                        <span>תחזוקה מונעת ובטיחות</span>
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        dynamicMetrics.preventiveComplianceRate >= 80
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                    }`}>
                                        {dynamicMetrics.preventiveComplianceRate >= 80 ? 'תקין' : 'דורש בדיקה'}
                                    </span>
                                </div>

                                <div className="flex items-baseline justify-between mb-1.5">
                                    <span className="text-2xl font-black font-mono text-neutral-900 dark:text-neutral-100">
                                        {dynamicMetrics.preventiveComplianceRate}%
                                    </span>
                                    <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                                        יעד: 90%
                                    </span>
                                </div>

                                <div className="w-full h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden relative">
                                    <div
                                        className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out"
                                        style={{ width: `${Math.min(100, Math.max(8, dynamicMetrics.preventiveComplianceRate))}%` }}
                                    />
                                    <div className="absolute top-0 bottom-0 left-[10%] w-0.5 bg-neutral-900/40 dark:bg-white/40" title="יעד 90%" />
                                </div>
                            </div>

                            <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between text-xs">
                                <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                                    מערכות לבדיקה: <strong className="font-mono text-amber-600 dark:text-amber-400">{dynamicMetrics.dueSystems}</strong>
                                </span>
                                <Link
                                    to="/calendar"
                                    className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline text-xs"
                                >
                                    <span>לוח ביקורות</span>
                                    <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-0" />
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Dynamic Bar 3: Lease & Occupancy Health */}
                    {(barCategoryFilter === 'all' || barCategoryFilter === 'occupancy') && (
                        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 transition flex flex-col justify-between space-y-3.5">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                                        <Users className="w-4 h-4 text-emerald-600" />
                                        <span>תקינות חוזי שכירות</span>
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                        פעיל
                                    </span>
                                </div>

                                <div className="flex items-baseline justify-between mb-1.5">
                                    <span className="text-2xl font-black font-mono text-neutral-900 dark:text-neutral-100">
                                        {dynamicMetrics.leaseHealthRate}%
                                    </span>
                                    <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                                        יעד: 95%
                                    </span>
                                </div>

                                <div className="w-full h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden relative">
                                    <div
                                        className="h-full bg-emerald-600 rounded-full transition-all duration-700 ease-out"
                                        style={{ width: `${Math.min(100, Math.max(8, dynamicMetrics.leaseHealthRate))}%` }}
                                    />
                                    <div className="absolute top-0 bottom-0 left-[5%] w-0.5 bg-neutral-900/40 dark:bg-white/40" title="יעד 95%" />
                                </div>
                            </div>

                            <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between text-xs">
                                <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                                    דיירים פעילים: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{dynamicMetrics.healthyTenants}/{dynamicMetrics.totalTenants}</strong>
                                </span>
                                <Link
                                    to="/all-tenants"
                                    className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline text-xs"
                                >
                                    <span>ניהול דיירים</span>
                                    <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-0" />
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Dynamic Bar 4: Operations & Tasks Adherence */}
                    {(barCategoryFilter === 'all' || barCategoryFilter === 'occupancy') && (
                        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700 transition flex flex-col justify-between space-y-3.5">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                                        <CheckSquare className="w-4 h-4 text-amber-500" />
                                        <span>עמידה בלוחות זמנים</span>
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                                        שוטף
                                    </span>
                                </div>

                                <div className="flex items-baseline justify-between mb-1.5">
                                    <span className="text-2xl font-black font-mono text-neutral-900 dark:text-neutral-100">
                                        {dynamicMetrics.taskAdherenceRate}%
                                    </span>
                                    <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                                        יעד: 85%
                                    </span>
                                </div>

                                <div className="w-full h-2.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden relative">
                                    <div
                                        className="h-full bg-amber-500 rounded-full transition-all duration-700 ease-out"
                                        style={{ width: `${Math.min(100, Math.max(8, dynamicMetrics.taskAdherenceRate))}%` }}
                                    />
                                    <div className="absolute top-0 bottom-0 left-[15%] w-0.5 bg-neutral-900/40 dark:bg-white/40" title="יעד 85%" />
                                </div>
                            </div>

                            <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 flex items-center justify-between text-xs">
                                <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">
                                    משימות באיחור: <strong className="font-mono text-amber-600 dark:text-amber-400">{dynamicMetrics.overdueTasks}</strong>
                                </span>
                                <Link
                                    to="/all-todos"
                                    className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline text-xs"
                                >
                                    <span>רשימת משימות</span>
                                    <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-0" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Dedicated Interactive Canvas Hub (Canvas Analytics) */}
            <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 sm:p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-5">
                {/* Canvas Hub Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
                                <span>מרכז ניתוח גרפי וקנבס דינמי</span>
                                <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                    Canvas 2D Live
                                </span>
                            </h2>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                ויזואליזציה אינטראקטיבית בזמן אמת עם תמיכה מלאה ב-Chart.js, התאמה ל-RTL וייצוא תמונה
                            </p>
                        </div>
                    </div>

                    {/* Canvas Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Tab Switcher */}
                        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl text-xs font-semibold">
                            <button
                                onClick={() => setCanvasChartType('status')}
                                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                                    canvasChartType === 'status'
                                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs font-bold'
                                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                                }`}
                            >
                                <PieChart className="w-3.5 h-3.5 text-blue-600" />
                                <span>סטטוס מבנים</span>
                            </button>
                            <button
                                onClick={() => setCanvasChartType('issues')}
                                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                                    canvasChartType === 'issues'
                                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs font-bold'
                                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                                }`}
                            >
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                <span>עומס תקלות</span>
                            </button>
                            <button
                                onClick={() => setCanvasChartType('adherence')}
                                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                                    canvasChartType === 'adherence'
                                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs font-bold'
                                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                                }`}
                            >
                                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>עמידה ביעדים</span>
                            </button>
                        </div>

                        {/* Export Canvas as PNG button */}
                        <button
                            onClick={handleExportCanvasImage}
                            className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition flex items-center gap-1.5 shadow-2xs active:scale-95 border border-neutral-200 dark:border-neutral-800"
                            title="הורד את תרשים ה-Canvas הנוכחי כתמונה (PNG)"
                        >
                            <Camera className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>שמור PNG</span>
                        </button>
                    </div>
                </div>

                {/* Canvas Surface Container */}
                <div className="p-4 sm:p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200/80 dark:border-neutral-800/80 relative">
                    <div className="relative h-64 sm:h-72 w-full flex items-center justify-center">
                        <canvas ref={interactiveCanvasRef} className="w-full h-full max-h-72"></canvas>
                    </div>
                </div>

                {/* Canvas KPI Summary Footnotes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800/70">
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">בניינים פעילים</span>
                        <span className="text-lg font-bold font-mono text-neutral-900 dark:text-neutral-100">
                            {stats.activeProjects || projects.length}
                        </span>
                    </div>
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800/70">
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">תקלות קריטיות</span>
                        <span className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
                            {stats.openCriticalIssues || 0}
                        </span>
                    </div>
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800/70">
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">תפוסת דיירים</span>
                        <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            {stats.totalTenants || 0} דיירים
                        </span>
                    </div>
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/70 dark:border-neutral-800/70">
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">ביקורות תקופתיות</span>
                        <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                            {stats.dueBuildingSystemsCount || 0} לבדיקה
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick Action Grid (MD Section 3.1) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Link
                    to="/projects"
                    className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-500 hover:shadow-md transition flex flex-col items-center text-center group shadow-2xs"
                >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">הוסף בניין</span>
                </Link>

                <Link
                    to="/all-tenants"
                    className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-500 hover:shadow-md transition flex flex-col items-center text-center group shadow-2xs"
                >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Users className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">הוסף דייר</span>
                </Link>

                <Link
                    to="/all-todos"
                    className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-500 hover:shadow-md transition flex flex-col items-center text-center group shadow-2xs"
                >
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <CheckSquare className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">משימה חדשה</span>
                </Link>

                <Link
                    to="/calendar"
                    className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-500 hover:shadow-md transition flex flex-col items-center text-center group shadow-2xs"
                >
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">לוח שנה לתחזוקה</span>
                </Link>

                <Link
                    to="/ai-smart-import"
                    className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/60 hover:border-blue-500 hover:shadow-md transition flex flex-col items-center text-center group shadow-2xs"
                >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-xs">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300">ייבוא חכם AI ✨</span>
                </Link>

                <Link
                    to="/all-reports"
                    className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-500 hover:shadow-md transition flex flex-col items-center text-center group shadow-2xs"
                >
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">דוחות וייצוא</span>
                </Link>
            </div>

            {/* Customizable Dashboard Widgets System */}
            <CustomizableWidgetSystem
                stats={stats}
                projects={projects}
                currency={currency}
                statusChartRef={finalStatusChartRef}
                issuesChartRef={finalIssuesChartRef}
                onRefreshStats={onRefresh}
            />

            {/* Mobile / ZIP Sync Progress Modal */}
            <SyncProgressModal
                isOpen={syncProgress.isOpen}
                type={syncProgress.type}
                title={syncProgress.title}
                percent={syncProgress.percent}
                message={syncProgress.message}
                details={syncProgress.details}
                isComplete={syncProgress.isComplete}
                stats={syncProgress.stats}
                onClose={() => {
                    setSyncProgress(prev => ({ ...prev, isOpen: false }));
                    if (syncProgress.isComplete && syncProgress.type === 'import') {
                        window.location.reload();
                    }
                }}
            />
        </div>
    );
};

export default Dashboard;
