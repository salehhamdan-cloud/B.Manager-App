import React from 'react';
import { CheckCircleIcon } from '../icons/FeedbackIcons';
import { ArrowDownTrayIcon, ArrowUpTrayIcon } from '../icons/ActionIcons';

export interface SyncProgressModalProps {
  isOpen: boolean;
  type: 'export' | 'import';
  title: string;
  percent: number;
  message: string;
  details?: string;
  isComplete?: boolean;
  stats?: {
    buildings?: number;
    tenants?: number;
    issues?: number;
    files?: number;
    fileCount?: number;
    dbSize?: number;
  };
  onClose?: () => void;
}

export const SyncProgressModal: React.FC<SyncProgressModalProps> = ({
  isOpen,
  type,
  title,
  percent,
  message,
  details,
  isComplete,
  stats,
  onClose,
}) => {
  if (!isOpen) return null;

  const clampedPercent = Math.min(Math.max(Math.round(percent), 0), 100);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn"
      dir="rtl"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-scaleUp">
        {/* Top Gradient Accent Banner */}
        <div
          className={`h-2.5 w-full ${
            isComplete
              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600'
              : type === 'export'
              ? 'bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600'
              : 'bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500'
          }`}
        />

        <div className="p-6 sm:p-7 space-y-5">
          {/* Header Icon & Title */}
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                isComplete
                  ? 'bg-emerald-50 text-emerald-600 ring-4 ring-emerald-100/70'
                  : type === 'export'
                  ? 'bg-sky-50 text-sky-600 ring-4 ring-sky-100/70 animate-pulse'
                  : 'bg-indigo-50 text-indigo-600 ring-4 ring-indigo-100/70 animate-pulse'
              }`}
            >
              {isComplete ? (
                <svg className="w-8 h-8 text-emerald-500" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="#10B981" fillOpacity="0.2" />
                  <path d="M8 12.5l2.5 2.5L16 9.5" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : type === 'export' ? (
                <svg className="w-8 h-8 text-sky-600" viewBox="0 0 24 24" fill="none">
                  <rect width="24" height="24" rx="6" fill="#0284C7" fillOpacity="0.12" />
                  <path d="M12 4v11m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="#0284C7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="none">
                  <rect width="24" height="24" rx="6" fill="#6366F1" fillOpacity="0.12" />
                  <path d="M12 16V5m0 0l-4 4m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="#6366F1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {type === 'export' ? 'סנכרון ייצוא מובייל' : 'סנכרון שחזור מובייל'}
                </span>
                <span
                  className={`text-sm font-black px-2.5 py-0.5 rounded-full ${
                    isComplete
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-sky-100 text-sky-800'
                  }`}
                >
                  {clampedPercent}%
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 truncate mt-0.5">
                {title}
              </h3>
              <p className="text-xs text-slate-500 font-mono">building_manager_backup.zip</p>
            </div>
          </div>

          {/* Progress Bar Track */}
          <div className="space-y-2">
            <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/80 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out relative ${
                  isComplete
                    ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                    : type === 'export'
                    ? 'bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 shadow-[0_0_12px_rgba(2,132,199,0.4)]'
                    : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                }`}
                style={{
                  width: `${clampedPercent}%`,
                  minWidth: clampedPercent > 0 ? '10px' : '0',
                }}
              >
                {/* Shimmer animation */}
                {!isComplete && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    isComplete
                      ? 'bg-emerald-500'
                      : 'bg-sky-500 animate-ping'
                  }`}
                />
                <span className="font-semibold text-slate-700 truncate">{message}</span>
              </div>
              <span className="font-bold text-slate-700 font-mono flex-shrink-0 mr-2">
                {clampedPercent < 100 ? `${clampedPercent}%` : 'הושלם 100%'}
              </span>
            </div>

            {details && (
              <p className="text-[11px] text-slate-400 font-mono truncate px-1" title={details}>
                {details}
              </p>
            )}
          </div>

          {/* Stat Summary Box upon completion */}
          {isComplete && stats && (
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl text-xs space-y-1.5 text-emerald-900 animate-fadeIn">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                <span>סיכום נתוני הסנכרון:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                {stats.buildings !== undefined && (
                  <div className="bg-white/80 p-1.5 rounded-lg border border-emerald-100 flex justify-between">
                    <span className="text-slate-600">מבנים:</span>
                    <span className="font-bold text-emerald-700">{stats.buildings}</span>
                  </div>
                )}
                {stats.tenants !== undefined && (
                  <div className="bg-white/80 p-1.5 rounded-lg border border-emerald-100 flex justify-between">
                    <span className="text-slate-600">דיירים:</span>
                    <span className="font-bold text-emerald-700">{stats.tenants}</span>
                  </div>
                )}
                {stats.issues !== undefined && (
                  <div className="bg-white/80 p-1.5 rounded-lg border border-emerald-100 flex justify-between">
                    <span className="text-slate-600">תקלות ודוחות:</span>
                    <span className="font-bold text-emerald-700">{stats.issues}</span>
                  </div>
                )}
                {(stats.files !== undefined || stats.fileCount !== undefined) && (
                  <div className="bg-white/80 p-1.5 rounded-lg border border-emerald-100 flex justify-between">
                    <span className="text-slate-600">קבצים ותמונות:</span>
                    <span className="font-bold text-emerald-700">{stats.files ?? stats.fileCount}</span>
                  </div>
                )}
                {stats.dbSize !== undefined && (
                  <div className="bg-white/80 p-1.5 rounded-lg border border-emerald-100 flex justify-between col-span-2">
                    <span className="text-slate-600">גודל מסד SQLite Room:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {(stats.dbSize / 1024).toFixed(1)} KB
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          {isComplete && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] text-sm"
              >
                סגור ורענן נתונים
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SyncProgressModal;
