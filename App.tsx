import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ToastContainer } from './components/common/Toast';
import { HomeIcon, ArrowRightIcon, ChevronLeftIcon } from './components/icons/GeneralIcons';
import BottomNavBar from './components/BottomNavBar';
import { useSettings } from './contexts/SettingsContext';
import { useNotifications } from './contexts/NotificationsContext';
import { BellIcon } from './components/icons/NotificationIcons';
import Sidebar from './components/Sidebar';
import { Bars3Icon } from './components/icons/MenuIcons';
import { MagnifyingGlassIcon, ArrowDownTrayIcon } from './components/icons/ActionIcons';
import GlobalSearchModal from './components/common/GlobalSearchModal';
import * as dbService from './services/dbService';
import LoadingSpinner from './components/common/LoadingSpinner';
import PendingSyncIndicator from './components/header/PendingSyncIndicator';

// Lazy load pages for better initial load performance
const BuildingsListPage = lazy(() => import('./pages/ProjectsListPage'));
const BuildingDetailPage = lazy(() => import('./pages/ProjectDetailPage'));
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
            'dashboard': 'Dashboard',
            'settings': 'הגדרות',
            'about': 'אודות',
            'notifications': 'יומן פעילות',
            'form-templates': 'תבניות טפסים',
            'all-reports': 'כל הדוחות וסקרי המבנה',
            'all-building-systems': 'מערכות תשתית ובטיחות',
            'building-systems': 'מערכות תשתית ובטיחות',
            'systems': 'מערכות תשתית ובטיחות',
            'all-forms': 'כל הטפסים והסקרים',
            'all-files': 'כל הקבצים',
            'all-todos': 'כל המשימות',
            'all-problems-checklist': 'רשימת תקלות כללית',
            'suppliers': 'ספקים',
            'all-tenants': 'כל הדיירים',
            'all-workers': 'כל עובדי התחזוקה',
            'quotations': 'הצעות מחיר',
            'all-inventory': 'מלאי כללי',
            'calculator': 'מחשבון',
            'checklist': 'רשימת תקלות',
            'reports': 'דוחות',
            'files': 'קבצים',
            'todos': 'משימות',
            'forms': 'טפסים',
            'tenants': 'דיירים',
            'workers': 'עובדי תחזוקה',
            'inventory': 'מלאי',
            'problems': 'תקלות',
            'notes': 'הערות ומידע',
            'order-list': 'פריטים להזמנה',
            'electrical-tools': 'כלי עבודה חשמליים',
            'sub-projects': 'פרויקטים',
            'all-sub-projects': 'כל פרויקטי המשנה',
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
}, [location.pathname, isTrulyHome]);


  const getPageTitle = (): string => {
    // New, more specific routes must be checked before general ones
    if (location.pathname.match(/\/project\/[^/]+\/reports$/)) return 'דוחות הבניין';
    if (location.pathname.match(/\/project\/[^/]+\/files$/)) return 'קבצי הבניין';
    if (location.pathname.match(/\/project\/[^/]+\/todos$/)) return 'משימות הבניין';
    if (location.pathname.match(/\/project\/[^/]+\/forms$/)) return 'טפסי הבניין';
    if (location.pathname.match(/\/project\/[^/]+\/tenants$/)) return 'דיירים';
    if (location.pathname.match(/\/project\/[^/]+\/workers$/)) return 'עובדי תחזוקה';
    if (location.pathname.match(/\/project\/[^/]+\/inventory/)) return 'מלאי הבניין';
    if (location.pathname.match(/\/project\/[^/]+\/notes$/)) return 'הערות ומידע';
    if (location.pathname.match(/\/project\/[^/]+\/electrical-tools$/)) return 'כלי עבודה חשמליים';
    if (location.pathname.match(/\/project\/[^/]+\/sub-projects$/)) return 'פרויקטים';
    if (location.pathname.match(/\/project\/[^/]+\/sub-project\/[^/]+$/)) return 'פרטי פרויקט';
    if (location.pathname.match(/\/report\/[^/]+\/problems$/)) return 'תקלות בדוח';
    if (location.pathname.match(/\/report\/[^/]+\/forms$/)) return 'טפסים בדוח';
    if (location.pathname.includes('/problem/')) return 'עריכת תקלה';
    if (location.pathname.includes('/report/')) return 'פרטי דוח';
    if (location.pathname.endsWith('/checklist')) return 'רשימת תקלות לטיפול';
    if (location.pathname.startsWith('/project/')) return 'פרטי בניין';
    
    // General routes
    if (location.pathname === '/dashboard') return 'Dashboard';
    if (location.pathname === '/') return 'בניינים';
    if (location.pathname === '/settings') return 'הגדרות';
    if (location.pathname === '/about') return 'אודות';
    if (location.pathname === '/notifications') return 'יומן פעילות';
    if (location.pathname === '/form-templates') return 'תבניות טפסים';
    if (location.pathname.includes('/form/')) return 'מילוי טופס';
    if (location.pathname === '/all-reports') return 'כל הדוחות';
    if (location.pathname === '/all-problems-checklist') return 'רשימת תקלות כללית';
    if (location.pathname === '/all-forms') return 'כל הטפסים';
    if (location.pathname === '/all-files') return 'כל הקבצים';
    if (location.pathname === '/all-todos') return 'כל המשימות';
    if (location.pathname === '/suppliers') return 'ספקים';
    if (location.pathname === '/all-tenants') return 'כל הדיירים';
    if (location.pathname === '/all-workers') return 'כל עובדי התחזוקה';
    if (location.pathname === '/quotations') return 'הצעות מחיר מאושרות';
    if (location.pathname === '/all-inventory') return 'מלאי כללי';
    if (location.pathname === '/order-list') return 'פריטים להזמנה';
    if (location.pathname === '/calculator') return 'מחשבון';
    if (location.pathname === '/all-sub-projects') return 'כל פרויקטי המשנה';
    if (location.pathname === '/calendar') return 'לוח תחזוקה מונעת';
    if (location.pathname === '/ai-smart-import' || location.pathname === '/smart-import') return 'ייבוא חכם ב-AI';

    return 'B.Manager App';
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {!isOnline && (
        <div className="bg-amber-500 text-white text-center p-2 font-semibold sticky top-0 z-50">
          אתה במצב לא מקוון. שינויים יישמרו מקומית.
        </div>
      )}
      <header style={{ backgroundColor: settings.appTheme.headerColor }} className="px-4 py-3.5 shadow-sm border-b border-white/10 sticky top-0 z-40 transition-colors backdrop-blur-md">
        <div className="container max-w-7xl mx-auto">
            <div className="flex justify-between items-center relative">
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 rounded-xl hover:bg-white/20 active:scale-95 transition-all"
                    title="תפריט"
                    aria-label="פתח תפריט"
                    style={{ color: settings.appTheme.headerTextColor }}
                >
                    <Bars3Icon className="w-6 h-6" />
                </button>
                {showBackButton && (
                <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/20 active:scale-95 transition-all" title="חזור" aria-label="חזור" style={{ color: settings.appTheme.headerTextColor }}>
                    <ArrowRightIcon className="w-6 h-6" />
                </button>
                )}
                {showHomeButton && (
                <Link to="/" className="p-2 rounded-xl hover:bg-white/20 active:scale-95 transition-all" title="דף הבית" aria-label="עבור לדף הבית" style={{ color: settings.appTheme.headerTextColor }}>
                    <HomeIcon className="w-6 h-6" />
                </Link>
                )}
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight absolute left-1/2 -translate-x-1/2 rtl:left-auto rtl:-translate-x-0 rtl:right-1/2 rtl:translate-x-1/2 whitespace-nowrap" style={{ color: settings.appTheme.headerTextColor }}>
                {getPageTitle()}
            </h1>
            <div className="flex items-center gap-1.5">
                <PendingSyncIndicator headerTextColor={settings.appTheme.headerTextColor} />
                <button onClick={() => setIsSearchOpen(true)} className="p-2 rounded-xl hover:bg-white/20 active:scale-95 transition-all" title="חיפוש" aria-label="פתח חיפוש" style={{ color: settings.appTheme.headerTextColor }}>
                    <MagnifyingGlassIcon className="w-6 h-6" />
                </button>
                <Link to="/notifications" className="p-2 rounded-xl hover:bg-white/20 active:scale-95 transition-all relative" title="יומן פעילות" aria-label="פתח יומן פעילות" style={{ color: settings.appTheme.headerTextColor }}>
                <BellIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-black ring-2 ring-white/90 items-center justify-center animate-pulse" aria-label={`${unreadCount} התראות חדשות`}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
                </Link>
            </div>
            </div>
            {breadcrumbs.length > 1 && (
                <nav aria-label="breadcrumb" className="text-xs mt-2 flex items-center gap-1.5 overflow-x-auto py-1" style={{ color: settings.appTheme.headerTextColor }}>
                    {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={index}>
                            {index > 0 && <ChevronLeftIcon className="w-3 h-3 flex-shrink-0 opacity-60" />}
                            {index < breadcrumbs.length - 1 ? (
                                <Link to={crumb.link} className="hover:underline opacity-85 truncate font-medium">
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span className="font-bold truncate opacity-100" aria-current="page">
                                    {crumb.label}
                                </span>
                            )}
                        </React.Fragment>
                    ))}
                </nav>
            )}
        </div>
      </header>
      <main key={location.pathname} className="flex-grow container mx-auto p-4 sm:p-6 animate-fadeInUp pb-40" style={{ animationDuration: '0.5s' }}>
        <Suspense fallback={<div className="flex justify-center items-center h-64"><LoadingSpinner text="טוען עמוד..."/></div>}>
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/" element={<BuildingsListPage />} />
              <Route path="/projects" element={<BuildingsListPage />} />
              <Route path="/smart-import" element={<AISmartImportPage />} />
              <Route path="/project/:projectId" element={<BuildingDetailPage />} />
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