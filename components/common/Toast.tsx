
import React from 'react';
import { useToast } from '../../contexts/ToastContext';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XCircleIcon, XMarkIcon } from '../icons/FeedbackIcons';


export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 end-5 z-[100] space-y-3">
      {toasts.map(toast => {
        let bgColor = 'bg-sky-600';
        let Icon = InformationCircleIcon;
        let iconColor = 'text-sky-100';

        switch (toast.type) {
          case 'success':
            bgColor = 'bg-green-600';
            Icon = CheckCircleIcon;
            iconColor = 'text-green-100';
            break;
          case 'error':
            bgColor = 'bg-red-600';
            Icon = XCircleIcon;
            iconColor = 'text-red-100';
            break;
          case 'warning':
            bgColor = 'bg-amber-500';
            Icon = ExclamationTriangleIcon;
            iconColor = 'text-amber-100';
            break;
        }

        return (
          <div
            key={toast.id}
            className={`${bgColor} text-white p-4 rounded-xl shadow-2xl flex items-center justify-between animate-fadeInUp`}
            role="alert"
            dir="rtl"
            style={{ animationDuration: '0.5s' }}
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-7 h-7 ${iconColor}`} />
              <p className="font-semibold">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="me-2 p-1 rounded-full hover:bg-white/20 transition-colors"
              aria-label="סגור התראה"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};