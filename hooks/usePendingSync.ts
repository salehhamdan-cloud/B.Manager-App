import { useState, useEffect, useCallback } from 'react';
import {
  getPendingSyncQueue,
  getPendingSyncCount,
  subscribeToSyncQueue,
  syncAllPendingChanges,
  clearPendingQueue,
  addTestPendingChange,
  isAppOffline,
  setSimulatedOffline,
  PendingSyncItem,
} from '../services/syncQueueService';
import { useToast } from '../contexts/ToastContext';

export interface UsePendingSyncResult {
  pendingCount: number;
  pendingItems: PendingSyncItem[];
  isOnline: boolean;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  clearQueue: () => void;
  addTestChange: () => void;
  toggleSimulateOffline: () => void;
}

export const usePendingSync = (): UsePendingSyncResult => {
  const [pendingCount, setPendingCount] = useState<number>(getPendingSyncCount());
  const [pendingItems, setPendingItems] = useState<PendingSyncItem[]>(getPendingSyncQueue());
  const [isOnline, setIsOnline] = useState<boolean>(!isAppOffline());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const { addToast } = useToast();

  const refreshState = useCallback(() => {
    setPendingCount(getPendingSyncCount());
    setPendingItems(getPendingSyncQueue());
    setIsOnline(!isAppOffline());
  }, []);

  useEffect(() => {
    refreshState();
    const unsubscribe = subscribeToSyncQueue(refreshState);

    const handleOnline = async () => {
      setIsOnline(!isAppOffline());
      const count = getPendingSyncCount();
      if (count > 0) {
        addToast(`חיבור הרשת חודש! מסנכרן ${count} שינויים מקומיים למסד הנתונים...`, 'info');
        setIsSyncing(true);
        try {
          const res = await syncAllPendingChanges();
          if (res.success && res.syncedCount > 0) {
            addToast(`סונכרנו בהצלחה ${res.syncedCount} שינויים מקומיים למסד הנתונים!`, 'success');
          }
        } catch (err) {
          console.error('Error auto-syncing upon online:', err);
        } finally {
          setIsSyncing(false);
          refreshState();
        }
      } else {
        addToast('חיבור הרשת חודש.', 'info');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      addToast('אתה במצב לא מקוון. כל שינוי שייעשה יישמר מקומית וימתין לסנכרון.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('app_online', handleOnline);
    window.addEventListener('app_offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('app_online', handleOnline);
      window.removeEventListener('app_offline', handleOffline);
    };
  }, [addToast, refreshState]);

  const syncNow = useCallback(async () => {
    if (isSyncing) return;
    if (isAppOffline()) {
      addToast('לא ניתן לסנכרן במצב לא מקוון. החיבור יחודש ברגע שהאינטרנט יחזור.', 'warning');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await syncAllPendingChanges();
      if (res.syncedCount > 0) {
        addToast(`סונכרנו בהצלחה ${res.syncedCount} שינויים מקומיים למסד הנתונים!`, 'success');
      } else {
        addToast('כל הנתונים כבר מסונכרנים ומעודכנים במסד הנתונים.', 'info');
      }
    } catch (err) {
      console.error('Manual sync failed:', err);
      addToast('שגיאה במהלך הסנכרון.', 'error');
    } finally {
      setIsSyncing(false);
      refreshState();
    }
  }, [isSyncing, addToast, refreshState]);

  const toggleSimulateOffline = useCallback(() => {
    const nextState = isOnline; // if online, become offline
    setSimulatedOffline(nextState);
    setIsOnline(!nextState);
    if (nextState) {
      addToast('מצב לא מקוון (Offline) מדומה הופעל לבדיקה.', 'warning');
    } else {
      addToast('מצב מקוון (Online) שוחזר.', 'info');
    }
  }, [isOnline, addToast]);

  return {
    pendingCount,
    pendingItems,
    isOnline,
    isSyncing,
    syncNow,
    clearQueue: clearPendingQueue,
    addTestChange: addTestPendingChange,
    toggleSimulateOffline,
  };
};
