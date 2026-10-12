import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../src/i18n';
import {
  HomeIcon,
  ClipboardDocumentCheckIcon,
  DocumentChartBarIcon,
  ExclamationTriangleIcon,
  FolderIcon
} from './icons';

const BottomNavBar: React.FC = () => {
    const { t } = useTranslation();
    const navItems = [
        { path: '/', label: t('buildings', 'בניינים'), icon: HomeIcon },
        { path: '/all-todos', label: t('todos', 'משימות'), icon: ClipboardDocumentCheckIcon },
        { path: '/all-reports', label: t('reports', 'דוחות'), icon: DocumentChartBarIcon },
        { path: '/all-problems-checklist', label: t('problems', 'תקלות'), icon: ExclamationTriangleIcon },
        { path: '/all-files', label: t('files', 'קבצים'), icon: FolderIcon },
    ];
    
    return (
        <div className="fixed bottom-0 left-0 right-0 backdrop-blur-xl bg-white/95 dark:bg-neutral-900/95 border-t border-neutral-200 dark:border-neutral-800 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-50 transition-all">
            <nav className="max-w-xl mx-auto flex justify-around items-center h-16 px-2">
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) => 
                            `group flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 active:scale-95 select-none min-h-[44px] ${
                                isActive 
                                    ? 'text-blue-600 dark:text-blue-400 font-bold' 
                                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 font-medium'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`p-1 rounded-xl transition-all duration-200 ${
                                    isActive 
                                        ? 'bg-blue-50 dark:bg-blue-950/60 shadow-2xs scale-110' 
                                        : 'opacity-80 group-hover:opacity-100 group-hover:scale-105'
                                }`}>
                                    <item.icon className="w-5.5 h-5.5 transition-transform" />
                                </div>
                                <span className={`text-[11px] mt-0.5 tracking-tight ${isActive ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium'}`}>
                                    {item.label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};

export default BottomNavBar;