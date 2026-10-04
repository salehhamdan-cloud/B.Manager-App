import React, { useState, useMemo } from 'react';
import { useNotifications } from '../contexts/NotificationsContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import NotificationItem from '../components/common/NotificationItem';
import { CheckCircleIcon } from '../components/icons/FeedbackIcons';
import { BellIcon } from '../components/icons/NotificationIcons';
import { ShieldExclamationIcon } from '../components/icons/GeneralIcons';

const NotificationsPage: React.FC = () => {
  const { notifications, isLoading, markAllAsRead, unreadCount } = useNotifications();
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'issues' | 'projects'>('all');

  const filteredNotifications = useMemo(() => {
    switch (filterTab) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      case 'issues':
        return notifications.filter(n => n.itemType === 'problem' || n.itemType === 'system');
      case 'projects':
        return notifications.filter(n => n.itemType === 'building' || n.itemType === 'report' || n.itemType === 'todo');
      case 'all':
      default:
        return notifications;
    }
  }, [notifications, filterTab]);

  if (isLoading) {
    return <LoadingSpinner text="טוען יומן פעילות..." />;
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100 shadow-2xs">
              <BellIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">יומן פעילות והתראות</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">מעקב חי אחר פעולות, שינויים והתראות מערכת</p>
            </div>
          </div>
        </div>

        <button
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="btn-secondary text-xs sm:text-sm flex items-center gap-2 self-stretch sm:self-auto justify-center disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
          <span>סמן הכל כנקרא</span>
          {unreadCount > 0 && (
            <span className="font-mono-numbers px-1.5 py-0.5 rounded-full bg-sky-600 text-white text-[11px] font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'הכל', count: notifications.length },
          { key: 'unread', label: 'לא נקראו', count: unreadCount },
          { key: 'issues', label: 'תקלות והתראות', count: notifications.filter(n => n.itemType === 'problem' || n.itemType === 'system').length },
          { key: 'projects', label: 'פרויקטים ומשימות', count: notifications.filter(n => n.itemType === 'building' || n.itemType === 'report' || n.itemType === 'todo').length },
        ].map(tab => {
          const isActive = filterTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key as any)}
              className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`font-mono-numbers text-[11px] px-1.5 py-0.2 rounded-full ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List / Empty State */}
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200">
            <BellIcon className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {filterTab === 'unread' ? 'אין התראות חדשות שלא נקראו' : 'יומן הפעילות ריק בחתך זה'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            כל פעולה או עדכון שיתבצעו באפליקציה יופיעו כאן בזמן אמת.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredNotifications.map(notification => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;