import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Project, BuildingSystemLog } from '../types';
import * as dbService from '../services/dbService';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from '../src/i18n';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { BuildingSystemsSection } from '../components/BuildingSystemsSection';
import {
    ArrowRightIcon,
    WrenchScrewdriverIcon,
    CalendarDaysIcon,
    ExclamationTriangleIcon,
} from '../components/icons';

const ProjectSystemsPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const { t, isRtl } = useTranslation();

    const [project, setProject] = useState<Project | null>(null);
    const [systemLogs, setSystemLogs] = useState<BuildingSystemLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        try {
            const projectData = await dbService.getProject(projectId);
            if (projectData) {
                setProject(projectData);
                const logs = await dbService.getBuildingSystemLogs(projectId);
                setSystemLogs(logs);
            } else {
                addToast(t('buildingNotFound', 'בניין לא נמצא'), 'error');
                navigate('/projects');
            }
        } catch (error) {
            console.error('Error fetching building systems:', error);
            addToast(t('errorLoadingSystems', 'שגיאה בטעינת מערכות המבנה'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, addToast, navigate, t]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Statistics
    const totalSystems = systemLogs.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueSoonCount = systemLogs.filter(log => {
        if (!log.nextInspectionDate) return false;
        const next = new Date(log.nextInspectionDate);
        const diffDays = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 30;
    }).length;

    const overdueCount = systemLogs.filter(log => {
        if (!log.nextInspectionDate) return false;
        const next = new Date(log.nextInspectionDate);
        return next < today;
    }).length;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <LoadingSpinner text={t('loading', 'טוען מערכות תשתית ובטיחות...')} />
            </div>
        );
    }

    if (!project) {
        return null;
    }

    return (
        <div className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
            {/* Header / Breadcrumb navigation */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                    <Link
                        to={`/project/${project.id}`}
                        className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition active:scale-95 shadow-2xs"
                        title={t('back', 'חזור לבניין')}
                    >
                        <ArrowRightIcon className={`w-5 h-5 transition-transform ${isRtl ? '' : 'rotate-180'}`} />
                    </Link>
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100/60 dark:border-blue-900/40 shadow-2xs">
                        <WrenchScrewdriverIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <Link
                                to={`/project/${project.id}`}
                                className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
                            >
                                {project.name}
                            </Link>
                            <span className="text-neutral-300 dark:text-neutral-700">/</span>
                            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                                {t('buildingSystems', 'מערכות ותשתיות')}
                            </span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mt-0.5">
                            {t('buildingSystemsPageTitle', 'מערכות ותשתיות הבניין')}
                        </h1>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {t('buildingSystemsSubtitle', 'מעליות, גנרטורים, כיבוי אש, משאבות מים ומיזוג אוויר')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Link
                        to={`/all-building-systems`}
                        className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                    >
                        {t('navBuildingSystems', 'כל מערכות הבניינים')}
                    </Link>
                </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100/60 dark:border-blue-900/40">
                        <WrenchScrewdriverIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold">
                            {t('systemsSummaryTotal', 'סה״כ מערכות רשומות')}
                        </p>
                        <p className="text-2xl font-mono font-bold text-neutral-900 dark:text-neutral-100">
                            {totalSystems}
                        </p>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100/60 dark:border-amber-900/40">
                        <CalendarDaysIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold">
                            {t('systemsSummaryDueSoon', 'לבדיקה ב-30 יום')}
                        </p>
                        <p className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">
                            {dueSoonCount}
                        </p>
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100/60 dark:border-rose-900/40">
                        <ExclamationTriangleIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold">
                            {t('systemsSummaryExpired', 'באיחור בדיקה')}
                        </p>
                        <p className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400">
                            {overdueCount}
                        </p>
                    </div>
                </div>
            </div>

            {/* Building Systems Logs & Management */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 sm:p-7 shadow-2xs">
                <BuildingSystemsSection
                    buildingId={project.id}
                    systemLogs={systemLogs}
                    onRefresh={fetchData}
                    project={project}
                />
            </div>
        </div>
    );
};

export default ProjectSystemsPage;
