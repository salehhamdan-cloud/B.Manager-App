import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon } from './icons/GeneralIcons';
import { QueueListIcon, ClipboardDocumentCheckIcon, DocumentChartBarIcon, FolderIcon } from './icons/NavigationIcons';

const BottomNavBar: React.FC = () => {
    const navItems = [
        { path: '/', label: 'בניינים', icon: HomeIcon },
        { path: '/all-todos', label: 'משימות', icon: QueueListIcon },
        { path: '/all-reports', label: 'דוחות', icon: DocumentChartBarIcon },
        { path: '/all-problems-checklist', label: 'תקלות', icon: ClipboardDocumentCheckIcon },
        { path: '/all-files', label: 'קבצים', icon: FolderIcon },
    ];
    
    return (
        <div className="fixed bottom-0 left-0 right-0 backdrop-blur-xl bg-white/95 border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] z-50 transition-all">
            <nav className="max-w-xl mx-auto flex justify-around items-center h-16 px-2">
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) => 
                            `group flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 active:scale-95 select-none ${
                                isActive 
                                    ? 'text-sky-700 font-bold' 
                                    : 'text-slate-500 hover:text-slate-900 font-medium'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`p-1 rounded-lg transition-all duration-200 ${
                                    isActive ? 'bg-sky-100 text-sky-700 shadow-sm scale-110' : 'text-slate-500 group-hover:text-slate-700'
                                }`}>
                                    <item.icon className="w-5 h-5 transition-transform" />
                                </div>
                                <span className={`text-[11px] mt-0.5 tracking-tight ${isActive ? 'font-bold text-sky-800' : 'font-medium'}`}>
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