import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, ChevronLeftIcon } from '../icons';
import { useTranslation } from '../../src/i18n';

interface NavigationCardProps {
  to: string;
  icon: ReactNode;
  title: string;
  count: number;
  actionText?: string;
  onActionClick?: (e: React.MouseEvent) => void;
  secondaryActionText?: string;
  onSecondaryActionClick?: (e: React.MouseEvent) => void;
  secondaryActionIcon?: ReactNode;
}

const NavigationCard: React.FC<NavigationCardProps> = ({ to, icon, title, count, actionText, onActionClick, secondaryActionText, onSecondaryActionClick, secondaryActionIcon }) => {
  const { t, isRtl } = useTranslation();

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-md transition flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100/60 dark:border-blue-900/40 shadow-2xs group-hover:scale-105 transition-transform">
              {icon}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">{title}</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{count}</span>{' '}
                {count === 1 ? t('itemRegistered', 'פריט רשום') : t('itemsRegistered', 'פריטים רשומים')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
              {onSecondaryActionClick && secondaryActionText && (
                  <button
                      onClick={(e) => {
                          e.preventDefault();
                          onSecondaryActionClick(e);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-900/40 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/80 transition-colors shadow-2xs active:scale-95"
                  >
                      {secondaryActionIcon}
                      {secondaryActionText}
                  </button>
              )}
              {onActionClick && actionText && (
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    onActionClick(e);
                  }} 
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-xs transition"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>{actionText}</span>
                </button>
              )}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 mt-3">
        <Link 
          to={to} 
          className="flex justify-between items-center w-full bg-neutral-50 dark:bg-neutral-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-neutral-200/60 dark:border-neutral-700/60 hover:border-blue-200 dark:hover:border-blue-800 px-3.5 py-2.5 rounded-xl transition-all"
        >
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {t('viewAll', 'צפה בכל')} {title}
          </span>
          <ChevronLeftIcon className={`w-4 h-4 text-neutral-400 dark:text-neutral-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-transform ${isRtl ? 'group-hover:-translate-x-1' : 'rotate-180 group-hover:translate-x-1'}`} />
        </Link>
      </div>
    </div>
  );
};

export default NavigationCard;