import React, { createContext, useState, useEffect, useCallback, ReactNode, useContext } from 'react';
import { Notification } from '../types';
import * as dbService from '../services/dbService';
import { useSettings } from './SettingsContext';
import { useToast } from './ToastContext';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  refreshNotifications: () => void;
  markAllAsRead: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { settings, isLoading: isSettingsLoading } = useSettings();
  const { addToast } = useToast();

  const fetchAndSetNotifications = useCallback(async () => {
    const allNotifications = await dbService.getAllNotifications();
    setNotifications(allNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (isSettingsLoading) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      await dbService.checkAndGenerateNotifications(settings);
      await fetchAndSetNotifications();
    } catch (error) {
      console.error("Failed to refresh notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [settings, isSettingsLoading, fetchAndSetNotifications]);

  useEffect(() => {
    if (!isSettingsLoading) {
      refreshNotifications(); // Initial fetch
    }
  }, [isSettingsLoading, refreshNotifications]);

  const markAllAsRead = async () => {
    const originalNotifications = [...notifications];
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    try {
      await dbService.markAllNotificationsAsRead();
      addToast('כל ההתראות סומנו כנקראו', 'success');
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
      addToast('שגיאה בסימון ההתראות', 'error');
      setNotifications(originalNotifications);
    }
  };

  const markAsRead = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.isRead) {
        setNotifications(prev => prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
        ));
        try {
            await dbService.markNotificationAsRead(notificationId);
        } catch (error) {
            console.error("Failed to mark notification as read in DB:", error);
            addToast('Failed to update notification status.', 'error');
            setNotifications(prev => prev.map(n => 
                n.id === notificationId ? { ...n, isRead: false } : n
            ));
        }
    }
  };
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, isLoading, refreshNotifications, markAllAsRead, markAsRead }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = (): NotificationsContextType => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};
