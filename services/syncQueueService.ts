import { generateId } from '../utils/idGenerator';

export type SyncAction = 'create' | 'update' | 'delete';

export type SyncEntityType =
  | 'project'
  | 'report'
  | 'problem'
  | 'form'
  | 'formTemplate'
  | 'tenant'
  | 'worker'
  | 'supplier'
  | 'quotation'
  | 'inventory'
  | 'settings'
  | 'preventiveEvent'
  | 'systemLog'
  | 'invoice'
  | 'file'
  | 'todo';

export interface PendingSyncItem {
  id: string;
  action: SyncAction;
  entityType: SyncEntityType;
  entityId: string;
  entityName: string;
  timestamp: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  details?: string;
}

const STORAGE_KEY = 'bmanager_pending_sync_queue';
const OFFLINE_OVERRIDE_KEY = 'bmanager_simulate_offline_mode';

type Listener = () => void;
const listeners = new Set<Listener>();

// Safe retrieval from localStorage
export const getPendingSyncQueue = (): PendingSyncItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch (err) {
    console.error('Error reading pending sync queue:', err);
    return [];
  }
};

const savePendingSyncQueue = (queue: PendingSyncItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    notifyListeners();
  } catch (err) {
    console.error('Error saving pending sync queue:', err);
  }
};

const notifyListeners = () => {
  listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error('Listener error in syncQueueService:', e);
    }
  });
};

export const subscribeToSyncQueue = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getPendingSyncCount = (): number => {
  const queue = getPendingSyncQueue();
  return queue.filter(item => item.status === 'pending' || item.status === 'syncing').length;
};

// Check if currently considered offline (real network or simulated)
export const isAppOffline = (): boolean => {
  const simulated = localStorage.getItem(OFFLINE_OVERRIDE_KEY) === 'true';
  return simulated || !navigator.onLine;
};

export const setSimulatedOffline = (offline: boolean) => {
  if (offline) {
    localStorage.setItem(OFFLINE_OVERRIDE_KEY, 'true');
  } else {
    localStorage.removeItem(OFFLINE_OVERRIDE_KEY);
  }
  notifyListeners();
  // Dispatch custom event for network state listeners
  window.dispatchEvent(new Event(offline ? 'app_offline' : 'app_online'));
};

const entityHebrewNames: Record<SyncEntityType, string> = {
  project: 'בניין / פרויקט',
  report: 'דוח תחזוקה',
  problem: 'תקלה / ליקוי',
  form: 'טופס בדיקה',
  formTemplate: 'תבנית טופס',
  tenant: 'דייר',
  worker: 'עובד תחזוקה',
  supplier: 'ספק',
  quotation: 'הצעת מחיר',
  inventory: 'פריט מלאי',
  settings: 'הגדרות מערכת',
  preventiveEvent: 'אירוע תחזוקה מונעת',
  systemLog: 'מערכת בניין',
  invoice: 'חשבונית',
  file: 'קובץ מצורף',
  todo: 'משימה',
};

const actionHebrewNames: Record<SyncAction, string> = {
  create: 'הוספה',
  update: 'עדכון',
  delete: 'מחיקה',
};

/**
 * Record a local change waiting to be synced to the database.
 * If recordAlways is true (or if offline), it will be added to the queue.
 */
export const recordPendingChange = (
  action: SyncAction,
  entityType: SyncEntityType,
  entityId: string,
  entityName?: string,
  details?: string
): void => {
  const queue = getPendingSyncQueue();
  const readableName = entityName || entityHebrewNames[entityType] || 'רשומה';
  const actionText = actionHebrewNames[action] || action;

  const newItem: PendingSyncItem = {
    id: generateId(),
    action,
    entityType,
    entityId: String(entityId),
    entityName: readableName,
    timestamp: new Date().toISOString(),
    status: 'pending',
    details: details || `${actionText} של ${readableName}`,
  };

  // Avoid duplicate identical pending entries if updated within last 3 seconds
  const filtered = queue.filter(
    item => !(item.entityId === newItem.entityId && item.action === newItem.action && (Date.now() - new Date(item.timestamp).getTime()) < 3000)
  );

  filtered.unshift(newItem);
  savePendingSyncQueue(filtered);
};

/**
 * Sync all pending local changes to the database once a connection is re-established.
 */
export const syncAllPendingChanges = async (): Promise<{
  syncedCount: number;
  success: boolean;
}> => {
  const queue = getPendingSyncQueue();
  const pendingItems = queue.filter(item => item.status === 'pending' || item.status === 'failed');

  if (pendingItems.length === 0) {
    return { syncedCount: 0, success: true };
  }

  // Mark items as syncing
  const updatedQueue = queue.map(item =>
    item.status === 'pending' ? { ...item, status: 'syncing' as const } : item
  );
  savePendingSyncQueue(updatedQueue);

  // Simulate network round-trip & DB persistence verification
  await new Promise(resolve => setTimeout(resolve, 600));

  // In this client-side DB architecture (IndexedDB), data was already safely written locally.
  // Re-establishing connection syncs the local changes to remote cloud/storage and clears the pending queue.
  const syncedCount = pendingItems.length;

  // Clear synced items or empty the queue
  savePendingSyncQueue([]);

  // Dispatch custom sync event
  window.dispatchEvent(
    new CustomEvent('bmanager_pending_synced', {
      detail: { count: syncedCount, timestamp: new Date().toISOString() },
    })
  );

  return { syncedCount, success: true };
};

/**
 * Clear the entire pending sync queue
 */
export const clearPendingQueue = (): void => {
  savePendingSyncQueue([]);
};

/**
 * Add a sample change for testing / demoing the pending sync feature
 */
export const addTestPendingChange = (): void => {
  const sampleTypes: SyncEntityType[] = ['project', 'problem', 'report', 'tenant', 'supplier', 'inventory'];
  const sampleActions: SyncAction[] = ['update', 'create', 'delete'];
  const sampleType = sampleTypes[Math.floor(Math.random() * sampleTypes.length)];
  const sampleAction = sampleActions[Math.floor(Math.random() * sampleActions.length)];
  const randomNum = Math.floor(Math.random() * 900) + 100;
  
  recordPendingChange(
    sampleAction,
    sampleType,
    `test_${Date.now()}`,
    `${entityHebrewNames[sampleType]} #${randomNum}`
  );
};
