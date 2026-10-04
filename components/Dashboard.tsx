import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { Project, GlobalDashboardStats } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/dateFormatter';
import { FolderIcon, QueueListIcon, RectangleGroupIcon } from './icons/NavigationIcons';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import * as emailService from '../services/emailService';
import * as dbService from '../services/dbService';
import { EnvelopeIcon } from '../components/icons/ContactIcons';
import { SparklesIcon } from './icons/AiIcons';
import { PlusIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from './icons/ActionIcons';
import { ReceiptPercentIcon } from './icons/BusinessIcons';
import { UserGroupIcon } from './icons/UserIcons';
import { ExclamationTriangleIcon } from './icons/FeedbackIcons';
import { CalendarDaysIcon, WrenchScrewdriverIcon, ArchiveBoxIcon } from './icons/GeneralIcons';
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
        case 'פעיל': return '#0284c7';
        case 'הושלם': return '#10b981';
        case 'בהמתנה': return '#f59e0b';
        case 'בוטל': return '#64748b';
        default: return '#94a3b8';
    }
};

const Dashboard: React.FC<DashboardProps> = ({ stats, projects, statusChartRef, issuesChartRef, className, onRefresh }) => {
    const internalStatusChartRef = useRef<HTMLCanvasElement>(null);
    const internalIssuesChartRef = useRef<HTMLCanvasElement>(null);
    const finalStatusChartRef = statusChartRef || internalStatusChartRef;
    const finalIssuesChartRef = issuesChartRef || internalIssuesChartRef;
    
    const { settings } = useSettings();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const [isSyncing, setIsSyncing] = useState(false);
    const syncFileInputRef = useRef<HTMLInputElement>(null);

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

    // Status Chart
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
                borderColor: '#ffffff',
                borderWidth: 2,
            }]
        };
    }, [stats.statusCounts]);

    // Critical issues chart
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
                backgroundColor: 'rgba(239, 68, 68, 0.75)',
                borderColor: 'rgba(220, 38, 38, 1)',
                borderWidth: 1,
            }]
        };
    }, [projects, stats.criticalIssuesByProject]);

    useEffect(() => {
        let statusChartInstance: Chart | null = null;
        if (finalStatusChartRef.current) {
            const existingChart = Chart.getChart(finalStatusChartRef.current);
            if (existingChart) existingChart.destroy();
            
            statusChartInstance = new Chart(finalStatusChartRef.current, {
                type: 'doughnut',
                data: statusChartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right', labels: { font: { family: 'Heebo' } } } }
                }
            });
        }
        return () => statusChartInstance?.destroy();
    }, [statusChartData, finalStatusChartRef]);
    
    useEffect(() => {
        let issuesChartInstance: Chart | null = null;
        if (finalIssuesChartRef.current && criticalIssuesChartData.labels.length > 0) {
            const existingChart = Chart.getChart(finalIssuesChartRef.current);
            if (existingChart) existingChart.destroy();

            issuesChartInstance = new Chart(finalIssuesChartRef.current, {
                type: 'bar',
                data: criticalIssuesChartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { beginAtZero: true, ticks: { precision: 0 } },
                      y: { ticks: { font: { family: 'Heebo' } } }
                    }
                }
            });
        }
        return () => issuesChartInstance?.destroy();
    }, [criticalIssuesChartData, finalIssuesChartRef]);

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

    // Total Reminders count
    const totalActiveWarnings =
        (stats.expiringLeasesCount || 0) +
        (stats.expiredLeasesCount || 0) +
        (stats.expiredTodos || 0) +
        (stats.dueSoonTodos || 0) +
        (stats.expiredFiles || 0) +
        (stats.dueBuildingSystemsCount || 0) +
        (stats.lowInventoryCount || 0) +
        (stats.overdueInvoicesCount || 0) +
        (stats.openCriticalIssues || 0);

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

            {/* Welcome & Portfolio Header */}
            <div className="bg-gradient-to-r from-sky-700 via-sky-800 to-indigo-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs uppercase tracking-wider font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
                            מרכז שליטה ובקרה • Building Manager
                        </span>
                        <span className="text-xs bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                            מערכת מקוונת
                        </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
                        {settings.companyInfo.name || 'תיק נכסים ומבנים'}
                    </h1>
                    <p className="text-sm text-sky-200 mt-1 max-w-xl">
                        ניהול שוטף, אחזקה מונעת, דיירים, הוצאות וסנכרון מלא עם אפליקציית המובייל
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {settings.enableEmailNotifications && (
                        <button
                            onClick={handleSendDigest}
                            className="bg-white/10 hover:bg-white/20 border border-white/30 text-white text-xs sm:text-sm font-semibold py-2 px-3.5 rounded-xl transition flex items-center gap-1.5"
                            title="שלח סיכום התראות למייל"
                        >
                            <EnvelopeIcon className="w-4 h-4" /> סיכום למייל
                        </button>
                    )}
                    <button
                        onClick={handleExportUniversalBackup}
                        disabled={isSyncing}
                        className="bg-white/10 hover:bg-white/20 border border-white/30 text-white text-xs sm:text-sm font-semibold py-2 px-3.5 rounded-xl transition flex items-center gap-1.5"
                        title="ייצוא ארכיון גיבוי מלא לאפליקציית המובייל (building_manager_backup.zip)"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" /> ייצוא מובייל (.ZIP)
                    </button>
                    <button
                        onClick={() => syncFileInputRef.current?.click()}
                        disabled={isSyncing}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-semibold py-2 px-3.5 rounded-xl shadow-lg transition flex items-center gap-1.5"
                        title="ייבוא וסנכרון ארכיון ZIP של אפליקציית המובייל או קובץ Room JSON"
                    >
                        <ArrowUpTrayIcon className="w-4 h-4" /> סנכרון ממובייל (ZIP / JSON)
                    </button>
                </div>
            </div>

            {/* Quick Action Grid (MD Section 3.1) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Link
                    to="/projects"
                    className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-sky-500 hover:shadow-md transition flex flex-col items-center text-center group"
                >
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <PlusIcon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">הוסף בניין</span>
                </Link>

                <Link
                    to="/all-tenants"
                    className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-sky-500 hover:shadow-md transition flex flex-col items-center text-center group"
                >
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <UserGroupIcon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">הוסף דייר</span>
                </Link>

                <Link
                    to="/all-todos"
                    className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-sky-500 hover:shadow-md transition flex flex-col items-center text-center group"
                >
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <QueueListIcon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">משימה חדשה</span>
                </Link>

                <Link
                    to="/calendar"
                    className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-sky-500 hover:shadow-md transition flex flex-col items-center text-center group"
                >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <CalendarDaysIcon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">לוח שנה לתחזוקה</span>
                </Link>

                <Link
                    to="/ai-smart-import"
                    className="bg-gradient-to-tr from-sky-50 to-indigo-50 p-3.5 rounded-xl border border-sky-300 hover:border-indigo-500 hover:shadow-md transition flex flex-col items-center text-center group"
                >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-sm">
                        <SparklesIcon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-extrabold text-indigo-900">ייבוא חכם AI ✨</span>
                </Link>

                <Link
                    to="/all-reports"
                    className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-sky-500 hover:shadow-md transition flex flex-col items-center text-center group"
                >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <ArrowDownTrayIcon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">דוחות וייצוא</span>
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
