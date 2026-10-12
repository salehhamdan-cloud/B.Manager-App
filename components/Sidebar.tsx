import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from '../src/i18n';
import {
  HomeIcon,
  ChartPieIcon,
  ExclamationTriangleIcon,
  DocumentChartBarIcon,
  WrenchScrewdriverIcon,
  CalendarDaysIcon,
  RectangleGroupIcon,
  ClipboardDocumentCheckIcon,
  FolderIcon,
  UserGroupIcon,
  IdentificationIcon,
  TruckIcon,
  ReceiptPercentIcon,
  CalculatorIcon,
  ClipboardDocumentListIcon,
  DocumentDuplicateIcon,
  ArchiveBoxIcon,
  QueueListIcon,
  SparklesIcon,
  SettingsIcon,
  InformationCircleIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  BuildingOfficeIcon,
} from './icons';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  installPrompt: Event | null;
  onInstallClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, installPrompt, onInstallClick }) => {
  const { settings } = useSettings();
  const { t, isRtl, dir } = useTranslation();

  const navGroups = [
    {
      title: t('navGroupOperations', 'תפעול ונכסים'),
      items: [
        { to: '/', icon: <HomeIcon className="w-5 h-5" />, label: t('navBuildings', 'מבנים ונכסים') },
        { to: '/dashboard', icon: <ChartPieIcon className="w-5 h-5" />, label: t('navDashboard', 'לוח בקרה ראשי') },
        { to: '/all-problems-checklist', icon: <ExclamationTriangleIcon className="w-5 h-5" />, label: t('navProblems', 'תקלות וקריאות שירות') },
        { to: '/all-reports', icon: <DocumentChartBarIcon className="w-5 h-5" />, label: t('navReports', 'דוחות וסקרי מבנה') },
        { to: '/all-building-systems', icon: <WrenchScrewdriverIcon className="w-5 h-5" />, label: t('navBuildingSystems', 'מערכות תשתית ובטיחות') },
        { to: '/calendar', icon: <CalendarDaysIcon className="w-5 h-5" />, label: t('navCalendar', 'לוח תחזוקה מונעת') },
        { to: '/all-sub-projects', icon: <RectangleGroupIcon className="w-5 h-5" />, label: t('navSubProjects', 'פרויקטי משנה') },
        { to: '/all-todos', icon: <ClipboardDocumentCheckIcon className="w-5 h-5" />, label: t('navTodos', 'משימות תפעוליות') },
        { to: '/all-files', icon: <FolderIcon className="w-5 h-5" />, label: t('navFiles', 'מסמכים וקבצי בניין') },
      ]
    },
    {
      title: t('navGroupContacts', 'אנשי קשר וכספים'),
      items: [
        { to: '/all-tenants', icon: <UserGroupIcon className="w-5 h-5" />, label: t('navTenants', 'ספר דיירים') },
        { to: '/all-workers', icon: <IdentificationIcon className="w-5 h-5" />, label: t('navWorkers', 'עובדי תחזוקה') },
        { to: '/suppliers', icon: <TruckIcon className="w-5 h-5" />, label: t('navSuppliers', 'ספקים וקבלנים') },
        { to: '/quotations', icon: <ReceiptPercentIcon className="w-5 h-5" />, label: t('navQuotations', 'הצעות מחיר וחשבוניות') },
        { to: '/calculator', icon: <CalculatorIcon className="w-5 h-5" />, label: t('navCalculator', 'מחשבון עלויות') },
      ]
    },
    {
      title: t('navGroupForms', 'טפסים, סקרים ומלאי'),
      items: [
        { to: '/all-forms', icon: <ClipboardDocumentListIcon className="w-5 h-5" />, label: t('navForms', 'שאלוני ביקורת וסקרים') },
        { to: '/form-templates', icon: <DocumentDuplicateIcon className="w-5 h-5" />, label: t('navTemplates', 'תבניות סקרים וטפסים') },
        { to: '/all-inventory', icon: <ArchiveBoxIcon className="w-5 h-5" />, label: t('navInventory', 'מלאי חלפים וציוד') },
        { to: '/order-list', icon: <QueueListIcon className="w-5 h-5" />, label: t('navOrderList', 'פריטים להזמנה') },
      ]
    },
    {
      title: t('navGroupSystem', 'חכמה ומערכת'),
      items: [
        { to: '/ai-smart-import', icon: <SparklesIcon className="w-5 h-5" />, label: t('navSmartImport', 'ייבוא חכם ב-AI ✨') },
        { to: '/settings', icon: <SettingsIcon className="w-5 h-5" />, label: t('navSettings', 'הגדרות וסנכרון גיבויים') },
        { to: '/about', icon: <InformationCircleIcon className="w-5 h-5" />, label: t('navAbout', 'אודות המערכת') },
      ]
    }
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-[500] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 ${isRtl ? 'right-0 border-l' : 'left-0 border-r'} h-full w-80 max-w-[85vw] bg-white dark:bg-neutral-900 shadow-2xl z-[501] transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full')
        } flex flex-col border-neutral-200 dark:border-neutral-800`}
        dir={dir}
      >
        {/* Header */}
        <header className="p-5 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/40 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-xs p-1">
              <BuildingOfficeIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight leading-tight">
                {settings.companyInfo.name || 'B.Manager'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {t('appTagline', 'מערכת ניהול ואחזקת מבנים')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition active:scale-95"
            aria-label={t('close', 'סגור תפריט')}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </header>

        {/* Navigation Content */}
        <nav className="flex-grow p-4 overflow-y-auto space-y-6">
          {installPrompt && (
            <button
              onClick={onInstallClick}
              className="flex items-center justify-between p-3 rounded-xl w-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-semibold text-sm transition-all shadow-2xs group hover:bg-emerald-100 dark:hover:bg-emerald-950/80 active:scale-95"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-2xs group-hover:scale-105 transition-transform">
                  <ArrowDownTrayIcon className="w-4 h-4" />
                </div>
                <span>{t('installApp', 'התקן אפליקציה למכשיר')}</span>
              </div>
              <span className="text-xs bg-emerald-200/70 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 px-2 py-0.5 rounded-full font-bold">PWA</span>
            </button>
          )}

          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              <h3 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-3 mb-1.5 select-none">
                {group.title}
              </h3>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium min-h-[44px] ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200/60 dark:border-blue-900/40 shadow-2xs'
                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                          isActive 
                            ? 'bg-blue-600 text-white shadow-xs scale-105' 
                            : 'bg-slate-100 dark:bg-neutral-800 border border-slate-200/60 dark:border-neutral-700/60 text-slate-600 dark:text-neutral-300 group-hover:bg-blue-50 group-hover:border-blue-200/80 group-hover:text-blue-600 dark:group-hover:bg-neutral-750 dark:group-hover:text-blue-400'
                        }`}>
                          {item.icon}
                        </div>
                        <span className="truncate">{item.label}</span>
                      </div>
                      {isActive && (
                        <div className="w-1.5 h-4 bg-blue-600 dark:bg-blue-400 rounded-full" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <footer className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/40">
          <div className="text-center text-xs text-neutral-500 dark:text-neutral-400">
            &copy; {new Date().getFullYear()} B.Manager &bull; פותח עבור ניהול מתקדם
          </div>
        </footer>
      </aside>
    </>
  );
};

export default Sidebar;
