import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon } from '../icons/ActionIcons';
import { ChevronLeftIcon } from '../icons/GeneralIcons';

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
  return (
    <div className="bg-white shadow-xs rounded-2xl border border-slate-200/90 p-5 transition-all duration-200 hover:shadow-lg hover:border-sky-300 flex flex-col justify-between group">
      <div>
        <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100/80 shadow-2xs group-hover:scale-105 transition-transform">
              {icon}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
              <p className="text-xs text-slate-500 font-medium">
                <span className="font-mono-numbers font-bold text-slate-700">{count}</span> {count === 1 ? 'פריט רשום' : 'פריטים רשומים'}
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-800 bg-purple-50 border border-purple-200/70 rounded-xl hover:bg-purple-100 transition-colors shadow-2xs"
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200/70 rounded-xl hover:bg-sky-100 transition-colors shadow-2xs"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  {actionText}
                </button>
              )}
          </div>
        </div>
      </div>

      <Link 
        to={to} 
        className="mt-2 flex justify-between items-center w-full bg-slate-50 hover:bg-sky-50/80 border border-slate-100 hover:border-sky-100 px-3.5 py-2.5 rounded-xl transition-all"
      >
        <span className="text-xs font-semibold text-slate-700 group-hover:text-sky-800 transition-colors">
          צפה בכל {title}
        </span>
        <ChevronLeftIcon className="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition-transform group-hover:-translate-x-1" />
      </Link>
    </div>
  );
};

export default NavigationCard;