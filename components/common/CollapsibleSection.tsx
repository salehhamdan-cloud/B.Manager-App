import React, { ReactNode, useMemo } from 'react';
import { PlusIcon } from '../icons/ActionIcons';
import { useSettings } from '../../contexts/SettingsContext';

interface CollapsibleSectionProps {
    title: ReactNode;
    children: ReactNode;
    count?: number;
    defaultOpen?: boolean;
    className?: string;
    actionText?: string;
    onActionClick?: (e: React.MouseEvent) => void;
    variant?: 'default' | 'primary' | 'secondary';
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, count, className = '', actionText, onActionClick, variant = 'default' }) => {
    const { settings } = useSettings();

    const headerStyles = useMemo(() => {
        switch (variant) {
            case 'primary':
                return {
                    backgroundColor: settings.appTheme.headerColor,
                    color: settings.appTheme.headerTextColor,
                };
            case 'secondary':
                return {
                    backgroundColor: '#e2e8f0', // slate-200
                    color: '#1e293b', // slate-800
                };
            case 'default':
            default:
                return {
                    backgroundColor: settings.appTheme.groupHeaderBackgroundColor,
                    color: settings.appTheme.groupHeaderTextColor,
                };
        }
    }, [variant, settings.appTheme]);

    const countStyles = useMemo(() => {
        switch (variant) {
            case 'primary':
                return {
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    color: settings.appTheme.headerTextColor,
                };
            case 'secondary':
            case 'default':
            default:
                return {
                    backgroundColor: settings.appTheme.accentColor,
                    color: 'white',
                };
        }
    }, [variant, settings.appTheme]);

    return (
        <div className={`bg-white dark:bg-neutral-900 shadow-2xs rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden ${className}`}>
            <div
                className="w-full flex justify-between items-center p-4 text-left rtl:text-right font-bold flex-wrap gap-2"
                style={headerStyles}
            >
                <div className="flex items-center gap-3">
                    {title}
                    {count !== undefined && (
                        <span
                            className="text-xs font-mono font-bold px-2.5 py-1 rounded-full"
                            style={countStyles}
                        >
                            {count}
                        </span>
                    )}
                </div>
                {actionText && onActionClick && (
                    <button
                        onClick={onActionClick}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors shadow-2xs active:scale-95"
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            color: 'inherit'
                        }}
                    >
                        <PlusIcon className="w-4 h-4" />
                        {actionText}
                    </button>
                )}
            </div>
            <div className="p-4 sm:p-6 border-t border-neutral-100 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200">
                {children}
            </div>
        </div>
    );
};

export default CollapsibleSection;