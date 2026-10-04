import React from 'react';
import { NavLink } from 'react-router-dom';
import { ArchiveBoxIcon, ClipboardDocumentListIcon, SettingsIcon, CalendarDaysIcon, HomeIcon, WrenchScrewdriverIcon } from './icons/GeneralIcons';
import { TruckIcon, ReceiptPercentIcon, CalculatorIcon } from './icons/BusinessIcons';
import { UserGroupIcon, IdentificationIcon } from './icons/UserIcons';
import { useSettings } from '../contexts/SettingsContext';
import { ChartPieIcon, QueueListIcon, RectangleGroupIcon, FolderIcon, DocumentChartBarIcon, ClipboardDocumentCheckIcon } from './icons/NavigationIcons';
import { InformationCircleIcon, XMarkIcon } from './icons/FeedbackIcons';
import { DocumentDuplicateIcon, ArrowDownTrayIcon } from './icons/ActionIcons';
import { SparklesIcon } from './icons/AiIcons';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  installPrompt: Event | null;
  onInstallClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, installPrompt, onInstallClick }) => {
  const { settings } = useSettings();

  const navGroups = [
    {
      title: 'תפעול ונכסים',
      items: [
        { to: '/', icon: <HomeIcon className="w-5 h-5" />, label: 'מבנים ונכסים' },
        { to: '/dashboard', icon: <ChartPieIcon className="w-5 h-5" />, label: 'לוח בקרה ראשי' },
        { to: '/all-problems-checklist', icon: <ClipboardDocumentCheckIcon className="w-5 h-5" />, label: 'תקלות וקריאות שירות' },
        { to: '/all-reports', icon: <DocumentChartBarIcon className="w-5 h-5" />, label: 'דוחות וסקרי מבנה' },
        { to: '/all-building-systems', icon: <WrenchScrewdriverIcon className="w-5 h-5" />, label: 'מערכות תשתית ובטיחות' },
        { to: '/calendar', icon: <CalendarDaysIcon className="w-5 h-5" />, label: 'לוח תחזוקה מונעת' },
        { to: '/all-sub-projects', icon: <RectangleGroupIcon className="w-5 h-5" />, label: 'פרויקטי משנה' },
        { to: '/all-todos', icon: <QueueListIcon className="w-5 h-5" />, label: 'משימות תפעוליות' },
        { to: '/all-files', icon: <FolderIcon className="w-5 h-5" />, label: 'מסמכים וקבצי בניין' },
      ]
    },
    {
      title: 'אנשי קשר וכספים',
      items: [
        { to: '/all-tenants', icon: <UserGroupIcon className="w-5 h-5" />, label: 'ספר דיירים' },
        { to: '/all-workers', icon: <IdentificationIcon className="w-5 h-5" />, label: 'עובדי תחזוקה' },
        { to: '/suppliers', icon: <TruckIcon className="w-5 h-5" />, label: 'ספקים וקבלנים' },
        { to: '/quotations', icon: <ReceiptPercentIcon className="w-5 h-5" />, label: 'הצעות מחיר וחשבוניות' },
        { to: '/calculator', icon: <CalculatorIcon className="w-5 h-5" />, label: 'מחשבון עלויות' },
      ]
    },
    {
      title: 'טפסים, סקרים ומלאי',
      items: [
        { to: '/all-forms', icon: <DocumentDuplicateIcon className="w-5 h-5" />, label: 'שאלוני ביקורת וסקרים' },
        { to: '/form-templates', icon: <ClipboardDocumentListIcon className="w-5 h-5" />, label: 'תבניות סקרים וטפסים' },
        { to: '/all-inventory', icon: <ArchiveBoxIcon className="w-5 h-5" />, label: 'מלאי חלפים וציוד' },
        { to: '/order-list', icon: <ClipboardDocumentListIcon className="w-5 h-5" />, label: 'פריטים להזמנה' },
      ]
    },
    {
      title: 'חכמה ומערכת',
      items: [
        { to: '/ai-smart-import', icon: <SparklesIcon className="w-5 h-5" />, label: 'ייבוא חכם ב-AI ✨' },
        { to: '/settings', icon: <SettingsIcon className="w-5 h-5" />, label: 'הגדרות וסנכרון גיבויים' },
        { to: '/about', icon: <InformationCircleIcon className="w-5 h-5" />, label: 'אודות המערכת' },
      ]
    }
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[500] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-[501] transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col border-l border-slate-200/80`}
        style={{ direction: 'rtl' }}
      >
        {/* Header */}
        <header
          className="p-5 flex items-center justify-between border-b border-white/10 shadow-sm relative overflow-hidden"
          style={{ backgroundColor: settings.appTheme.headerColor }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center font-black text-lg shadow-sm" style={{ color: settings.appTheme.headerTextColor }}>
              BM
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight" style={{ color: settings.appTheme.headerTextColor }}>
                {settings.companyInfo.name || 'B.Manager'}
              </h2>
              <p className="text-xs opacity-80" style={{ color: settings.appTheme.headerTextColor }}>
                מערכת ניהול ואחזקת מבנים
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 transition-colors"
            style={{ color: settings.appTheme.headerTextColor }}
            aria-label="סגור תפריט"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </header>

        {/* Navigation Content */}
        <nav className="flex-grow p-4 overflow-y-auto space-y-6">
          {installPrompt && (
            <button
              onClick={onInstallClick}
              className="flex items-center justify-between p-3 rounded-xl w-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-800 hover:from-emerald-100 hover:to-teal-100 font-semibold text-sm transition-all shadow-sm group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-sm group-hover:scale-105 transition-transform">
                  <ArrowDownTrayIcon className="w-4 h-4" />
                </div>
                <span>התקן אפליקציה למכשיר</span>
              </div>
              <span className="text-xs bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full font-bold">PWA</span>
            </button>
          )}

          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5 select-none">
                {group.title}
              </h3>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-medium ${
                      isActive
                        ? 'bg-sky-50 text-sky-800 font-bold border border-sky-100 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-sky-600 text-white shadow-xs' 
                            : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-800'
                        }`}>
                          {item.icon}
                        </div>
                        <span>{item.label}</span>
                      </div>
                      {isActive && (
                        <div className="w-1.5 h-4 bg-sky-600 rounded-full" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <footer className="p-4 border-t border-slate-100 bg-slate-50/70">
          <div className="text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} B.Manager &bull; פותח עבור ניהול מתקדם
          </div>
        </footer>
      </aside>
    </>
  );
};

export default Sidebar;
