import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ToastContainer } from './components/common/Toast';
import {
  Bars3Icon,
  ArrowRightIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  BellIcon,
  BellAlertIcon,
  ChevronLeftIcon
} from './components/icons';
import BottomNavBar from './components/BottomNavBar';
import { useSettings } from './contexts/SettingsContext';
import { useNotifications } from './contexts/NotificationsContext';
import Sidebar from './components/Sidebar';
import GlobalSearchModal from './components/common/GlobalSearchModal';
import * as dbService from './services/dbService';
import LoadingSpinner from './components/common/LoadingSpinner';
import PendingSyncIndicator from './components/header/PendingSyncIndicator';
import { useTranslation } from './src/i18n';

// Lazy load pages for better initial load performance
const BuildingsListPage = lazy(() => import('./pages/ProjectsListPage'));
const BuildingDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
const ProjectSystemsPage = lazy(() => import('./pages/ProjectSystemsPage'));
const ReportDetailPage = lazy(() => import('./pages/ReportDetailPage'));
const ProblemEditorPage = lazy(() => import('./pages/ProblemEditorPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const FormTemplatesListPage = lazy(() => import('./pages/FormTemplatesListPage'));
const ProjectFormPage = lazy(() => import('./pages/ProjectFormPage'));
const ProjectChecklistPage = lazy(() => import('./pages/ProjectChecklistPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AllReportsPage = lazy(() => import('./pages/AllReportsPage'));
const AllFormsPage = lazy(() => import('./pages/AllFormsPage'));
const AllFilesPage = lazy(() => import('./pages/AllFilesPage'));
const AllTodosPage = lazy(() => import('./pages/AllTodosPage'));
const AllProblemsChecklistPage = lazy(() => import('./pages/AllProblemsChecklistPage'));
const AllInventoryPage = lazy(() => import('./pages/AllInventoryPage'));
const ProjectReportsPage = lazy(() => import('./pages/ProjectReportsPage'));
const ProjectFilesPage = lazy(() => import('./pages/ProjectFilesPage'));
const ProjectTodosPage = lazy(() => import('./pages/ProjectTodosPage'));
const ReportProblemsPage = lazy(() => import('./pages/ReportProblemsPage'));
const ReportFormsPage = lazy(() => import('./pages/ReportFormsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'));
const ProjectTenantsPage = lazy(() => import('./pages/ProjectTenantsPage'));
const AllTenantsPage = lazy(() => import('./pages/AllTenantsPage'));
const ApprovedQuotationsPage = lazy(() => import('./pages/ApprovedQuotationsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ProjectInventoryLocationsPage = lazy(() => import('./pages/ProjectInventoryLocationsPage'));
const ProjectInventoryGroupsPage = lazy(() => import('./pages/ProjectInventoryGroupsPage'));
const ProjectInventoryItemsPage = lazy(() => import('./pages/ProjectInventoryItemsPage').then(m => ({ default: m.ProjectInventoryItemsPage })));
const ProjectFormsPage = lazy(() => import('./pages/ProjectFormsPage'));
const CalculatorPage = lazy(() => import('./pages/CalculatorPage'));
const ProjectWorkersPage = lazy(() => import('./pages/ProjectWorkersPage'));
const AllWorkersPage = lazy(() => import('./pages/AllWorkersPage'));
const ProjectNotesPage = lazy(() => import('./pages/ProjectNotesPage'));
const OrderListPage = lazy(() => import('./pages/OrderListPage'));
const ProjectElectricalToolsPage = lazy(() => import('./pages/ProjectElectricalToolsPage'));
const ProjectSubProjectsPage = lazy(() => import('./pages/ProjectSubProjectsPage'));
const SubProjectDetailPage = lazy(() => import('./pages/SubProjectDetailPage'));
const AllSubProjectsPage = lazy(() => import('./pages/AllSubProjectsPage'));
const AllBuildingSystemsPage = lazy(() => import('./pages/AllBuildingSystemsPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const AISmartImportPage = lazy(() => import('./pages/AISmartImportPage'));


interface Breadcrumb {
  label: React.ReactNode;
  link: string;
}

const MainLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { t, isRtl } = useTranslation();
  const isRTL = isRtl;
  const { unreadCount } = useNotifications();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    (installPrompt as any).prompt();
    (installPrompt as any).userChoice.then(() => {
      setInstallPrompt(null);
    });
  };

  // The protected routes start from the root, so remove the base path for back/home buttons
  const isTrulyHome = location.pathname === '/';
  
  const showBackButton = !isTrulyHome;
  const showHomeButton = !isTrulyHome;

  useEffect(() => {
    const generateBreadcrumbs = async () => {
        const pathParts = location.pathname.split('/').filter(p => p);
        const newBreadcrumbs: Breadcrumb[] = [
            { label: <HomeIcon className="w-4 h-4" />, link: '/' }
        ];
        let currentPath = '';

        const staticLabels: Record<string, string> = {
            'dashboard': t('pageTitleDashboard', 'Dashboard'),
            'settings': t('pageTitleSettings', 'הגדרות'),
            'about': t('pageTitleAbout', 'אודות'),
            'notifications': t('pageTitleNotifications', 'יומן פעילות'),
            'form-templates': t('pageTitleFormTemplates', 'תבניות טפסים'),
            'all-reports': t('pageTitleAllReports', 'כל הדוחות וסקרי המבנה'),
            'all-building-systems': t('pageTitleBuildingSystems', 'מערכות תשתית ובטיחות'),
            'building-systems': t('pageTitleBuildingSystems', 'מערכות תשתית ובטיחות'),
            'systems': t('pageTitleBuildingSystems', 'מערכות תשתית ובטיחות'),
            'all-forms': t('pageTitleAllForms', 'כל הטפסים והסקרים'),
            'all-files': t('pageTitleAllFiles', 'כל הקבצים'),
            'all-todos': t('pageTitleAllTodos', 'כל המשימות'),
            'all-problems-checklist': t('pageTitleAllProblems', 'רשימת תקלות כללית'),
            'suppliers': t('pageTitleSuppliers', 'ספקים'),
            'all-tenants': t('pageTitleAllTenants', 'כל הדיירים'),
            'all-workers': t('pageTitleAllWorkers', 'כל עובדי התחזוקה'),
            'quotations': t('pageTitleQuotations', 'הצעות מחיר'),
            'all-inventory': t('pageTitleAllInventory', 'מלאי כללי'),
            'calculator': t('pageTitleCalculator', 'מחשבון'),
            'checklist': t('checklistTitle', 'רשימת תקלות'),
            'reports': t('reports', 'דוחות'),
            'files': t('files', 'קבצים'),
            'todos': t('todos', 'משימות'),
            'forms': t('forms', 'טפסים'),
            'tenants': t('tenants', 'דיירים'),
            'workers': t('workers', 'עובדי תחזוקה'),
            'inventory': t('inventory', 'מלאי'),
            'problems': t('problems', 'תקלות'),
            'notes': t('notes', 'הערות ומידע'),
            'order-list': t('pageTitleOrderList', 'פריטים להזמנה'),
            'electrical-tools': t('projectElectricalToolsTitle', 'כלי עבודה חשמליים'),
            'sub-projects': t('projects', 'פרויקטים'),
            'all-sub-projects': t('pageTitleAllSubProjects', 'כל פרויקטי המשנה'),
            'calendar': t('pageTitleCalendar', 'לוח שנה ותחזוקה מונעת'),
            'ai-smart-import': t('navSmartImport', 'ייבוא חכם ב-AI ✨'),
            'smart-import': t('navSmartImport', 'ייבוא חכם ב-AI ✨'),
        };

        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            const nextPart = pathParts[i + 1];
            let label: React.ReactNode = part;

            currentPath += `/${part}`;

            try {
                if (part === 'project' && nextPart) {
                    const projectId = nextPart;
                    currentPath += `/${projectId}`;
                    const project = await dbService.getProject(projectId);
                    label = project?.name || 'פרויקט';
                    i++; // Consume ID
                } else if (part === 'report' && nextPart) {
                    currentPath += `/${nextPart}`;
                    const reportId = nextPart;
                    const report = await dbService.getReport(reportId);
                    label = report?.title || 'דוח';
                    i++; // Consume ID
                } else if (part === 'sub-project' && nextPart) {
                    const subProjectId = nextPart;
                    currentPath += `/${subProjectId}`;
                    const projectId = pathParts[1];
                    const project = await dbService.getProject(projectId);
                    label = project?.subProjects?.find(sp => sp.id === subProjectId)?.name || 'פרויקט משנה';
                    i++; // Consume ID
                } else if (part === 'location' && nextPart) {
                    currentPath += `/${nextPart}`;
                    const locationId = nextPart;
                    const projectId = pathParts[1];
                    const project = await dbService.getProject(projectId);
                    label = project?.inventory?.find(l => l.id === locationId)?.name || 'מיקום';
                    i++;
                } else if (part === 'group' && nextPart) {
                    currentPath += `/${nextPart}`;
                    const groupId = nextPart;
                    const projectId = pathParts[1];
                    const locationId = pathParts[3];
                    const project = await dbService.getProject(projectId);
                    label = project?.inventory?.find(l => l.id === locationId)?.itemGroups.find(g => g.id === groupId)?.name || 'קבוצה';
                    i++;
                } else if (part === 'problem' && nextPart) {
                    label = nextPart === 'new' ? 'תקלה חדשה' : 'עריכת תקלה';
                    currentPath += `/${nextPart}`;
                    if(pathParts[i+2] === 'edit') {
                      currentPath += '/edit';
                      i++;
                    }
                    i++;
                } else if (staticLabels[part]) {
                    label = staticLabels[part];
                } else {
                    continue; // Skip parts we don't have a label for (like IDs that were not consumed)
                }
                newBreadcrumbs.push({ label, link: currentPath });
            } catch (error) {
                console.warn("Could not fetch breadcrumb data:", error);
                newBreadcrumbs.push({ label: part, link: currentPath });
            }
        }
        setBreadcrumbs(newBreadcrumbs);
    };

    if (!isTrulyHome) {
        generateBreadcrumbs();
    } else {
        setBreadcrumbs([]);
    }
  }, [location.pathname, isTrulyHome, settings.language]);


  const getPageTitle = (): string => {
    // Specific project sub-routes
    if (location.pathname.match(/\/project\/[^/]+\/systems$/)) return t('buildingSystemsPageTitle', 'מערכות ותשתיות הבניין');
    if (location.pathname.match(/\/project\/[^/]+\/reports$/)) return t('projectReportsTitle', 'דוחות הבניין');
    if (location.pathname.match(/\/project\/[^/]+\/files$/)) return t('projectFilesTitle', 'קבצי הבניין');
    if (location.pathname.match(/\/project\/[^/]+\/todos$/)) return t('projectTodosTitle', 'משימות הבניין');
    if (location.pathname.match(/\/project\/[^/]+\/forms$/)) return t('projectFormsTitle', 'טפסי הבניין');
    if (location.pathname.match(/\/project\/[^/]+\/tenants$/)) return t('projectTenantsTitle', 'דיירים');
    if (location.pathname.match(/\/project\/[^/]+\/workers$/)) return t('projectWorkersTitle', 'עובדי תחזוקה');
    if (location.pathname.match(/\/project\/[^/]+\/inventory/)) return t('projectInventoryTitle', 'מלאי הבניין');
    if (location.pathname.match(/\/project\/[^/]+\/notes$/)) return t('projectNotesTitle', 'הערות ומידע');
    if (location.pathname.match(/\/project\/[^/]+\/electrical-tools$/)) return t('projectElectricalToolsTitle', 'כלי עבודה חשמליים');
    if (location.pathname.match(/\/project\/[^/]+\/sub-projects$/)) return t('projectSubProjectsTitle', 'פרויקטים');
    if (location.pathname.match(/\/project\/[^/]+\/sub-project\/[^/]+$/)) return t('subProjectDetailTitle', 'פרטי פרויקט');
    if (location.pathname.match(/\/report\/[^/]+\/problems$/)) return t('reportProblemsTitle', 'תקלות בדוח');
    if (location.pathname.match(/\/report\/[^/]+\/forms$/)) return t('reportFormsTitle', 'טפסים בדוח');
    if (location.pathname.includes('/problem/')) return t('editProblemTitle', 'עריכת תקלה');
    if (location.pathname.includes('/report/')) return t('reportDetailTitle', 'פרטי דוח');
    if (location.pathname.endsWith('/checklist')) return t('checklistTitle', 'רשימת תקלות לטיפול');
    if (location.pathname.startsWith('/project/')) return t('buildingDetail', 'פרטי בניין');
    
    // General routes
    if (location.pathname === '/dashboard') return t('pageTitleDashboard', 'Dashboard');
    if (location.pathname === '/' || location.pathname === '/projects') return t('pageTitleBuildings', 'בניינים');
    if (location.pathname === '/settings') return t('pageTitleSettings', 'הגדרות');
    if (location.pathname === '/about') return t('pageTitleAbout', 'אודות');
    if (location.pathname === '/notifications') return t('pageTitleNotifications', 'יומן פעילות');
    if (location.pathname === '/form-templates') return t('pageTitleFormTemplates', 'תבניות טפסים');
    if (location.pathname.includes('/form/')) return t('pageTitleFillForm', 'מילוי טופס');
    if (location.pathname === '/all-reports') return t('pageTitleAllReports', 'כל הדוחות');
    if (location.pathname === '/all-problems-checklist') return t('pageTitleAllProblems', 'רשימת תקלות כללית');
    if (location.pathname === '/all-building-systems' || location.pathname === '/building-systems' || location.pathname === '/systems') return t('pageTitleBuildingSystems', 'מערכות תשתית ובטיחות');
    if (location.pathname === '/all-forms') return t('pageTitleAllForms', 'כל הטפסים');
    if (location.pathname === '/all-files') return t('pageTitleAllFiles', 'כל הקבצים');
    if (location.pathname === '/all-todos') return t('pageTitleAllTodos', 'כל המשימות');
    if (location.pathname === '/suppliers') return t('pageTitleSuppliers', 'ספקים');
    if (location.pathname === '/all-tenants') return t('pageTitleAllTenants', 'כל הדיירים');
    if (location.pathname === '/all-workers') return t('pageTitleAllWorkers', 'כל עובדי התחזוקה');
    if (location.pathname === '/quotations') return t('pageTitleQuotations', 'הצעות מחיר מאושרות');
    if (location.pathname === '/all-inventory') return t('pageTitleAllInventory', 'מלאי כללי');
    if (location.pathname === '/order-list') return t('pageTitleOrderList', 'פריטים להזמנה');
    if (location.pathname === '/calculator') return t('pageTitleCalculator', 'מחשבון');
    if (location.pathname === '/all-sub-projects') return t('pageTitleAllSubProjects', 'כל פרויקטי המשנה');
    if (location.pathname === '/calendar') return t('pageTitleCalendar', 'לוח תחזוקה מונעת');
    if (location.pathname === '/ai-smart-import' || location.pathname === '/smart-import') return t('navSmartImport', 'ייבוא חכם ב-AI');

    return t('appName', 'B.Manager App');
  };

  const isCustomPalette = Boolean(settings.colorPalette && settings.colorPalette !== 'default');

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {!isOnline && (
        <div className="bg-amber-500 text-white text-center p-2 font-semibold sticky top-0 z-50">
          {t('offlineBanner', 'אתה במצב לא מקוון. שינויים יישמרו מקומית.')}
        </div>
      )}
      <header
        style={isCustomPalette ? { backgroundColor: settings.appTheme.headerColor } : undefined}
        className={`px-2.5 sm:px-4 py-2 sm:py-2.5 sticky top-0 z-40 transition-colors backdrop-blur-md shadow-xs ${
          isCustomPalette
            ? 'border-b border-white/10'
            : 'bg-gradient-to-r from-sky-50/90 via-white/95 to-blue-50/90 dark:from-slate-900/95 dark:via-neutral-900/95 dark:to-slate-900/95 border-b border-sky-200/60 dark:border-slate-800'
        }`}
      >
        <div className="container max-w-7xl mx-auto">
            <div className="flex justify-between items-center gap-1.5 sm:gap-2">
            {/* Leading Actions: Menu, Back, Home */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 p-1.5 sm:p-2 rounded-xl active:scale-95 transition-all shadow-2xs flex items-center justify-center flex-shrink-0 ${
                      isCustomPalette
                        ? 'hover:bg-white/20'
                        : 'bg-white dark:bg-neutral-800/95 border border-sky-200/80 dark:border-neutral-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xs'
                    }`}
                    title={t('menu', 'תפריט')}
                    aria-label={t('menu', 'פתח תפריט')}
                    style={isCustomPalette ? { color: settings.appTheme.headerTextColor } : undefined}
                >
                    <Bars3Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5 drop-shadow-2xs" />
                </button>
                {showBackButton && (
                <button
                    onClick={() => navigate(-1)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 p-1.5 sm:p-2 rounded-xl active:scale-95 transition-all shadow-2xs flex items-center justify-center flex-shrink-0 ${
                      isCustomPalette
                        ? 'hover:bg-white/20'
                        : 'bg-white dark:bg-neutral-800/95 border border-sky-200/80 dark:border-neutral-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xs'
                    }`}
                    title={t('back', 'חזור')}
                    aria-label={t('back', 'חזור')}
                    style={isCustomPalette ? { color: settings.appTheme.headerTextColor } : undefined}
                >
                    <ArrowRightIcon className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-transform drop-shadow-2xs ${isRTL ? '' : 'rotate-180'}`} />
                </button>
                )}
                {showHomeButton && (
                <Link
                    to="/"
                    className={`w-9 h-9 sm:w-10 sm:h-10 p-1.5 sm:p-2 rounded-xl active:scale-95 transition-all shadow-2xs hidden sm:flex items-center justify-center flex-shrink-0 ${
                      isCustomPalette
                        ? 'hover:bg-white/20'
                        : 'bg-white dark:bg-neutral-800/95 border border-sky-200/80 dark:border-neutral-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xs'
                    }`}
                    title={t('home', 'דף הבית')}
                    aria-label={t('home', 'עבור לדף הבית')}
                    style={isCustomPalette ? { color: settings.appTheme.headerTextColor } : undefined}
                >
                    <HomeIcon className="w-5 h-5 sm:w-5.5 sm:h-5.5 drop-shadow-2xs" />
                </Link>
                )}
            </div>

            {/* Title - Center & gracefully truncated so icons always have full space on mobile */}
            <div className="flex-1 min-w-0 px-1 sm:px-2 text-center">
              <h1
                className={`text-xs sm:text-base md:text-lg font-bold tracking-tight truncate ${
                  isCustomPalette ? '' : 'text-slate-800 dark:text-neutral-100'
                }`}
                style={isCustomPalette ? { color: settings.appTheme.headerTextColor } : undefined}
              >
                  {getPageTitle()}
              </h1>
            </div>

            {/* Trailing Actions: Sync, Search, Notifications */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                <PendingSyncIndicator headerTextColor={isCustomPalette ? settings.appTheme.headerTextColor : undefined} />
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 p-1.5 sm:p-2 rounded-xl active:scale-95 transition-all shadow-2xs flex items-center justify-center flex-shrink-0 ${
                    isCustomPalette
                      ? 'hover:bg-white/20'
                      : 'bg-white dark:bg-neutral-800/95 border border-sky-200/80 dark:border-neutral-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xs'
                  }`}
                  title={t('search', 'חיפוש')}
                  aria-label={t('search', 'פתח חיפוש')}
                  style={isCustomPalette ? { color: settings.appTheme.headerTextColor } : undefined}
                >
                    <MagnifyingGlassIcon className="w-5 h-5 sm:w-5.5 sm:h-5.5 drop-shadow-2xs" />
                </button>
                <Link
                  to="/notifications"
                  className={`w-9 h-9 sm:w-10 sm:h-10 p-1.5 sm:p-2 rounded-xl active:scale-95 transition-all relative shadow-2xs flex items-center justify-center flex-shrink-0 ${
                    isCustomPalette
                      ? 'hover:bg-white/20'
                      : 'bg-white dark:bg-neutral-800/95 border border-sky-200/80 dark:border-neutral-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xs'
                  }`}
                  title={t('navNotifications', 'יומן פעילות')}
                  aria-label={t('navNotifications', 'פתח יומן פעילות')}
                  style={isCustomPalette ? { color: settings.appTheme.headerTextColor } : undefined}
                >
                {unreadCount > 0 ? (
                  <BellAlertIcon className="w-5 h-5 sm:w-5.5 sm:h-5.5 drop-shadow-2xs" />
                ) : (
                  <BellIcon className="w-5 h-5 sm:w-5.5 sm:h-5.5 drop-shadow-2xs" />
                )}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold ring-2 ring-white dark:ring-neutral-900 items-center justify-center animate-pulse shadow-xs" aria-label={`${unreadCount} התראות חדשות`}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
                </Link>
            </div>
            </div>
            {breadcrumbs.length > 1 && (
                <nav
                  aria-label="breadcrumb"
                  className={`text-xs mt-2.5 pt-2 border-t flex items-center gap-1.5 overflow-x-auto py-0.5 ${
                    isCustomPalette
                      ? 'border-white/10'
                      : 'border-neutral-100 dark:border-neutral-800/80 text-neutral-500 dark:text-neutral-400 font-medium'
                  }`}
                  style={isCustomPalette ? { color: settings.appTheme.headerTextColor } : undefined}
                >
                    {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={index}>
                            {index > 0 && <ChevronLeftIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isRTL ? '' : 'rotate-180'} ${isCustomPalette ? 'opacity-60' : 'text-neutral-400 dark:text-neutral-500'}`} />}
                            {index < breadcrumbs.length - 1 ? (
                                <Link to={crumb.link} className="hover:underline hover:text-neutral-900 dark:hover:text-neutral-100 truncate font-medium">
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span className={`font-bold truncate ${isCustomPalette ? 'opacity-100' : 'text-neutral-900 dark:text-neutral-100'}`} aria-current="page">
                                    {crumb.label}
                                </span>
                            )}
                        </React.Fragment>
                    ))}
                </nav>
            )}
        </div>
      </header>
      <main key={location.pathname} className="flex-grow container max-w-7xl mx-auto p-4 sm:p-6 animate-fadeInUp pb-48 sm:pb-52" style={{ animationDuration: '0.5s' }}>
        <Suspense fallback={<div className="flex justify-center items-center h-64"><LoadingSpinner text="טוען עמוד..."/></div>}>
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/" element={<BuildingsListPage />} />
              <Route path="/projects" element={<BuildingsListPage />} />
              <Route path="/smart-import" element={<AISmartImportPage />} />
              <Route path="/project/:projectId" element={<BuildingDetailPage />} />
              <Route path="/project/:projectId/systems" element={<ProjectSystemsPage />} />
              <Route path="/project/:projectId/checklist" element={<ProjectChecklistPage />} />
              <Route path="/project/:projectId/reports" element={<ProjectReportsPage />} />
              <Route path="/project/:projectId/files" element={<ProjectFilesPage />} />
              <Route path="/project/:projectId/todos" element={<ProjectTodosPage />} />
              <Route path="/project/:projectId/forms" element={<ProjectFormsPage />} />
              <Route path="/project/:projectId/tenants" element={<ProjectTenantsPage />} />
              <Route path="/project/:projectId/workers" element={<ProjectWorkersPage />} />
              <Route path="/project/:projectId/notes" element={<ProjectNotesPage />} />
              <Route path="/project/:projectId/electrical-tools" element={<ProjectElectricalToolsPage />} />
              <Route path="/project/:projectId/sub-projects" element={<ProjectSubProjectsPage />} />
              <Route path="/project/:projectId/sub-project/:subProjectId" element={<SubProjectDetailPage />} />
              <Route path="/project/:projectId/inventory" element={<ProjectInventoryLocationsPage />} />
              <Route path="/project/:projectId/inventory/location/:locationId" element={<ProjectInventoryGroupsPage />} />
              <Route path="/project/:projectId/inventory/location/:locationId/group/:groupId" element={<ProjectInventoryItemsPage />} />
              <Route path="/project/:projectId/report/:reportId" element={<ReportDetailPage />} />
              <Route path="/project/:projectId/report/:reportId/problems" element={<ReportProblemsPage />} />
              <Route path="/project/:projectId/report/:reportId/forms" element={<ReportFormsPage />} />
              <Route path="/project/:projectId/report/:reportId/problem/new" element={<ProblemEditorPage />} />
              <Route path="/project/:projectId/report/:reportId/problem/:problemId/edit" element={<ProblemEditorPage />} />
              <Route path="/project/:projectId/report/:reportId/form/:formId" element={<ProjectFormPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/form-templates" element={<FormTemplatesListPage />} />
              <Route path="/all-reports" element={<AllReportsPage />} />
              <Route path="/all-building-systems" element={<AllBuildingSystemsPage />} />
              <Route path="/building-systems" element={<AllBuildingSystemsPage />} />
              <Route path="/systems" element={<AllBuildingSystemsPage />} />
              <Route path="/all-forms" element={<AllFormsPage />} />
              <Route path="/all-files" element={<AllFilesPage />} />
              <Route path="/all-todos" element={<AllTodosPage />} />
              <Route path="/all-problems-checklist" element={<AllProblemsChecklistPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/all-tenants" element={<AllTenantsPage />} />
              <Route path="/all-workers" element={<AllWorkersPage />} />
              <Route path="/quotations" element={<ApprovedQuotationsPage />} />
              <Route path="/all-inventory" element={<AllInventoryPage />} />
              <Route path="/order-list" element={<OrderListPage />} />
              <Route path="/calculator" element={<CalculatorPage />} />
              <Route path="/all-sub-projects" element={<AllSubProjectsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/ai-smart-import" element={<AISmartImportPage />} />
              <Route path="/smart-import" element={<AISmartImportPage />} />
               {/* Fallback for unmatched routes */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
        {/* Dedicated bottom spacer ensuring cards and bottom elements are completely visible above the bottom navigation bar */}
        <div className="h-24 sm:h-28 w-full flex-shrink-0 pointer-events-none" aria-hidden="true" />
      </main>
      <BottomNavBar />
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        installPrompt={installPrompt}
        onInstallClick={handleInstallClick}
      />
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};

const App: React.FC = () => {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><LoadingSpinner text="טוען אפליקציה..."/></div>}>
            <MainLayout />
            <ToastContainer />
        </Suspense>
    );
};

const AppWrapper: React.FC = () => (
  <HashRouter>
    <App />
  </HashRouter>
);

export default AppWrapper;