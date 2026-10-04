import React, { useState, useRef, useEffect } from 'react';
import { usePendingSync } from '../../hooks/usePendingSync';
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from '../icons/FeedbackIcons';

// Modern colored Cloud Sync Icon
const ModernCloudSyncIcon: React.FC<{ isSyncing?: boolean; hasPending?: boolean; isOffline?: boolean; className?: string }> = ({
  isSyncing,
  hasPending,
  isOffline,
  className = "w-6 h-6",
}) => {
  if (isOffline) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-3.14 0-5.83 1.95-6.84 4.79C2.42 9.28 0.5 11.88 0.5 15c0 3.87 3.13 7 7 7h11.5c3.04 0 5.5-2.46 5.5-5.5 0-2.84-2.16-5.17-4.9-5.46"
          fill="#F59E0B"
          fillOpacity="0.2"
        />
        <path
          d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-3.14 0-5.83 1.95-6.84 4.79C2.42 9.28 0.5 11.88 0.5 15c0 3.87 3.13 7 7 7h11.5c3.04 0 5.5-2.46 5.5-5.5 0-2.84-2.16-5.17-4.9-5.46z"
          stroke="#D97706"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M3 3l18 18" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (hasPending) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-3.14 0-5.83 1.95-6.84 4.79C2.42 9.28 0.5 11.88 0.5 15c0 3.87 3.13 7 7 7h11.5c3.04 0 5.5-2.46 5.5-5.5 0-2.84-2.16-5.17-4.9-5.46"
          fill="#0284C7"
          fillOpacity="0.2"
        />
        <path
          d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-3.14 0-5.83 1.95-6.84 4.79C2.42 9.28 0.5 11.88 0.5 15c0 3.87 3.13 7 7 7h11.5c3.04 0 5.5-2.46 5.5-5.5 0-2.84-2.16-5.17-4.9-5.46z"
          stroke="#0284C7"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 12v4m0 0l-2-2m2 2l2-2"
          stroke="#F59E0B"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isSyncing ? "animate-bounce" : ""}
        />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-3.14 0-5.83 1.95-6.84 4.79C2.42 9.28 0.5 11.88 0.5 15c0 3.87 3.13 7 7 7h11.5c3.04 0 5.5-2.46 5.5-5.5 0-2.84-2.16-5.17-4.9-5.46"
        fill="#10B981"
        fillOpacity="0.2"
      />
      <path
        d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-3.14 0-5.83 1.95-6.84 4.79C2.42 9.28 0.5 11.88 0.5 15c0 3.87 3.13 7 7 7h11.5c3.04 0 5.5-2.46 5.5-5.5 0-2.84-2.16-5.17-4.9-5.46z"
        stroke="#10B981"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 14.5l2 2 4-4"
        stroke="#059669"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const PendingSyncIndicator: React.FC<{ headerTextColor?: string }> = ({
  headerTextColor = '#ffffff',
}) => {
  const {
    pendingCount,
    pendingItems,
    isOnline,
    isSyncing,
    syncNow,
    clearQueue,
    addTestChange,
    toggleSimulateOffline,
  } = usePendingSync();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const hasPending = pendingCount > 0;

  return (
    <div className="relative inline-block" ref={containerRef} dir="rtl">
      {/* Header Button / Status Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all active:scale-95 text-xs font-bold ${
          hasPending
            ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40 hover:bg-amber-500/30 shadow-sm'
            : !isOnline
            ? 'bg-rose-500/20 text-rose-200 border border-rose-400/40 hover:bg-rose-500/30'
            : 'hover:bg-white/20 opacity-90 hover:opacity-100'
        }`}
        style={{ color: hasPending ? undefined : headerTextColor }}
        title={
          hasPending
            ? `${pendingCount} שינויים מקומיים ממתינים לסנכרון למסד הנתונים`
            : !isOnline
            ? 'מצב לא מקוון - שינויים יישמרו מקומית'
            : 'כל הנתונים מסונכרנים'
        }
        aria-label="סטטוס סנכרון נתונים"
      >
        <div className="relative flex items-center justify-center">
          <ModernCloudSyncIcon
            isSyncing={isSyncing}
            hasPending={hasPending}
            isOffline={!isOnline}
            className="w-5 h-5 sm:w-5 sm:h-5"
          />
          {hasPending && (
            <span
              className="absolute -top-1.5 -right-2 flex h-4 min-w-[1rem] px-1 rounded-full bg-amber-500 text-slate-900 text-[10px] font-black items-center justify-center shadow-md animate-pulse ring-1 ring-white/80"
              aria-label={`${pendingCount} ממתינים לסנכרון`}
            >
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </div>

        {/* Text description on tablet & desktop */}
        <span className="hidden md:inline-flex items-center gap-1 font-semibold text-[11px] truncate max-w-[110px]">
          {isSyncing ? (
            <span className="flex items-center gap-1 text-sky-200">
              <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
              <span>מסנכרן...</span>
            </span>
          ) : hasPending ? (
            <span className="text-amber-300 font-bold truncate">
              {pendingCount} להמתנה
            </span>
          ) : !isOnline ? (
            <span className="text-rose-300">לא מקוון</span>
          ) : (
            <span className="opacity-80">מסונכרן</span>
          )}
        </span>
      </button>

      {/* Popover / Detailed Status Dropdown */}
      {isOpen && (
        <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 text-slate-800 animate-fadeInUp">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  hasPending
                    ? 'bg-amber-50 text-amber-600 ring-2 ring-amber-100'
                    : !isOnline
                    ? 'bg-rose-50 text-rose-600 ring-2 ring-rose-100'
                    : 'bg-emerald-50 text-emerald-600 ring-2 ring-emerald-100'
                }`}
              >
                <ModernCloudSyncIcon
                  isSyncing={isSyncing}
                  hasPending={hasPending}
                  isOffline={!isOnline}
                  className="w-5 h-5"
                />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800 leading-tight">
                  סטטוס סנכרון (Pending Sync)
                </h4>
                <div className="flex items-center gap-1.5 text-xs mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'
                    }`}
                  />
                  <span className="text-slate-500 font-medium">
                    {isOnline ? 'מחובר לאינטרנט ולמסד' : 'מצב לא מקוון (Offline)'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="סגור חלונית"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Pending status description */}
          <div className="py-3">
            {hasPending ? (
              <div className="bg-amber-50/80 border border-amber-200/70 rounded-xl p-3 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-600" />
                    <span>שינויים מקומיים שממתינים לסנכרון:</span>
                  </span>
                  <span className="bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-full text-xs font-black">
                    {pendingCount}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px] pt-1">
                  {isOnline
                    ? 'החיבור פעיל! ניתן לבצע סנכרון מיידי למסד הנתונים בלחיצה מטה, או להמשיך בעבודה כרגיל.'
                    : 'השינויים נשמרו בבטחה במאגר המקומי (IndexedDB). ברגע שיתחדש חיבור הרשת, הנתונים יסונכרנו אוטומטית למסד הנתונים.'}
                </p>
              </div>
            ) : (
              <div className="bg-emerald-50/80 border border-emerald-200/70 rounded-xl p-3 text-xs flex items-start gap-2.5 text-emerald-900">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-emerald-800">הכל מסונכרן ומעודכן</div>
                  <p className="text-slate-600 text-[11px] mt-0.5">
                    אין שינויים מקומיים הממתינים לסנכרון. מסד הנתונים מעודכן במלואו.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* List of pending changes if any */}
          {hasPending && pendingItems.length > 0 && (
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                פירוט השינויים הממתינים:
              </div>
              {pendingItems.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 border border-slate-200/70 rounded-lg p-2 text-xs flex items-center justify-between hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.action === 'create'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.action === 'update'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.action === 'create'
                        ? 'הוספה'
                        : item.action === 'update'
                        ? 'עדכון'
                        : 'מחיקה'}
                    </span>
                    <span className="font-medium text-slate-800 truncate" title={item.entityName}>
                      {item.entityName}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono flex-shrink-0 mr-2">
                    {new Date(item.timestamp).toLocaleTimeString('he-IL', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
              {pendingItems.length > 6 && (
                <p className="text-[11px] text-center text-slate-400">
                  ועוד {pendingItems.length - 6} שינויים נוספים...
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={syncNow}
              disabled={isSyncing || (!isOnline && hasPending)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-sm text-xs transition-all active:scale-[0.98]"
            >
              <ArrowPathIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>
                {isSyncing
                  ? 'מסנכרן נתונים כעת...'
                  : hasPending
                  ? `סנכרן כעת ${pendingCount} שינויים למסד הנתונים`
                  : 'בצע סנכרון ידני עכשיו'}
              </span>
            </button>

            <div className="flex items-center justify-between gap-2 text-[11px] pt-1">
              <button
                type="button"
                onClick={addTestChange}
                className="text-slate-500 hover:text-sky-600 transition-colors underline"
                title="מוסיף שינוי דמה לתור כדי לבדוק את התנהגות המונה והסנכרון"
              >
                + הוסף שינוי לבדיקה
              </button>

              <button
                type="button"
                onClick={toggleSimulateOffline}
                className="text-slate-500 hover:text-amber-600 transition-colors"
                title="מפעיל/מכבה מצב אופליין לצורך הדמיה"
              >
                {isOnline ? 'הדמה אופליין' : 'בטל הדמיית אופליין'}
              </button>

              {hasPending && (
                <button
                  type="button"
                  onClick={clearQueue}
                  className="text-rose-500 hover:text-rose-700 transition-colors"
                  title="מנקה את רשימת השינויים הממתינים"
                >
                  נקה רשימה
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingSyncIndicator;
