import React from 'react';
import { Link } from 'react-router-dom';
import { Notification, NotificationAction } from '../../types';
import { formatDateTime } from '../../utils/dateFormatter';
import { PlusIcon, PencilIcon, TrashIcon } from '../icons/ActionIcons';
import { CheckCircleIcon, InformationCircleIcon, ExclamationTriangleIcon } from '../icons/FeedbackIcons';
import { useNotifications } from '../../contexts/NotificationsContext';

const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
  const { markAsRead } = useNotifications();
  
    const actionInfo: Record<NotificationAction, { text: string; bg: string; textCol: string; borderCol: string; icon: React.FC<any> }> = {
        create: { text: 'יצירה', bg: 'bg-emerald-50', textCol: 'text-emerald-700', borderCol: 'border-emerald-200/60', icon: PlusIcon },
        update: { text: 'עדכון', bg: 'bg-sky-50', textCol: 'text-sky-700', borderCol: 'border-sky-200/60', icon: PencilIcon },
        delete: { text: 'מחיקה', bg: 'bg-rose-50', textCol: 'text-rose-700', borderCol: 'border-rose-200/60', icon: TrashIcon },
        complete: { text: 'השלמה', bg: 'bg-purple-50', textCol: 'text-purple-700', borderCol: 'border-purple-200/60', icon: CheckCircleIcon },
        info: { text: 'מידע', bg: 'bg-amber-50', textCol: 'text-amber-700', borderCol: 'border-amber-200/60', icon: InformationCircleIcon },
    };
    
    const meta = actionInfo[notification.action] || actionInfo.info;
    const ActionIcon = meta.icon;
    const isSystemError = notification.itemType === 'system';
    
    const getLink = () => {
        switch(notification.itemType) {
            case 'building': return `/project/${notification.itemId}`;
            case 'report': return `/project/${notification.projectId}/report/${notification.itemId}`;
            case 'problem': return `/project/${notification.projectId}/checklist`;
            case 'form': return `/project/${notification.projectId}/report/${notification.itemId}`;
            case 'file': return `/project/${notification.projectId}/files`;
            case 'todo': return `/project/${notification.projectId}/todos`;
            case 'tenant': return `/project/${notification.projectId}/tenants`;
            case 'worker': return `/project/${notification.projectId}/workers`;
            case 'inventory': return `/project/${notification.projectId}/inventory`;
            case 'supplier': return `/suppliers`;
            case 'quotation': return `/quotations`;
            case 'formTemplate': return `/form-templates`;
            case 'sub-project': return `/project/${notification.projectId}/sub-project/${notification.itemId}`;
            default:
                return notification.projectId ? `/project/${notification.projectId}` : '#';
        }
    };

    const handleItemClick = () => {
        if (!notification.isRead) {
            markAsRead(notification.id);
        }
    };

    const link = getLink();
    
    return (
        <Link
            to={link}
            onClick={handleItemClick}
            className={`block p-4 rounded-2xl border transition-all duration-200 hover:shadow-md relative overflow-hidden group ${
                notification.isRead 
                ? 'bg-white border-slate-200/80 hover:border-slate-300' 
                : 'bg-sky-50/50 border-sky-200 hover:border-sky-300 ring-1 ring-sky-100'
            } ${ isSystemError ? 'border-rose-300 bg-rose-50/60 hover:bg-rose-50' : ''}`}
        >
            {!notification.isRead && (
                <span className="absolute top-4 left-4 w-2 h-2 rounded-full bg-sky-500 animate-pulse" title="חדש / לא נקרא" />
            )}
            
            <div className="flex items-start gap-3.5">
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border shadow-2xs group-hover:scale-105 transition-transform ${
                    isSystemError 
                    ? 'bg-rose-100 text-rose-700 border-rose-200' 
                    : `${meta.bg} ${meta.textCol} ${meta.borderCol}`
                }`}>
                    {isSystemError ? <ExclamationTriangleIcon className="w-5 h-5 text-rose-600" /> : <ActionIcon className="w-5 h-5" />}
                </div>

                <div className="flex-grow min-w-0">
                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isSystemError ? 'text-rose-900 font-medium' : 'text-slate-800'}`}>
                        {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400 font-mono-numbers">
                        <span>{formatDateTime(notification.createdAt)}</span>
                        {notification.action && (
                            <>
                                <span>&bull;</span>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${meta.bg} ${meta.textCol}`}>
                                    {meta.text}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default NotificationItem;