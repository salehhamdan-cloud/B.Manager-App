import React, { createContext, useState, useEffect, useCallback, ReactNode, useContext } from 'react';
import * as dbService from '../services/dbService';
import * as googleDriveService from '../services/googleDriveService';
import { CloudFile, FullAppBackup } from '../types';
import { useToast } from './ToastContext';
import { useSettings } from './SettingsContext';

interface GoogleDriveContextType {
  isGapiReady: boolean;
  cloudInitFailed: boolean;
  isSignedIn: boolean;
  driveUser: { name: string; email: string; } | null;
  isProcessing: boolean;
  isAutoBackupEnabled: boolean;
  lastBackupTimestamp: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
  backupToDrive: () => Promise<void>;
  listBackupFiles: () => Promise<CloudFile[]>;
  restoreFromDrive: (fileId: string) => Promise<void>;
  toggleAutoBackup: () => void;
}

const GoogleDriveContext = createContext<GoogleDriveContextType | undefined>(undefined);

// One hour in milliseconds
const AUTO_BACKUP_INTERVAL = 60 * 60 * 1000; 

export const GoogleDriveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { addToast } = useToast();
  const { isLoading: isSettingsLoading } = useSettings();
  
  const [isGapiReady, setIsGapiReady] = useState(false);
  const [cloudInitFailed, setCloudInitFailed] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [driveUser, setDriveUser] = useState<{ name: string; email: string; } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState<boolean>(() => {
    return localStorage.getItem('autoBackupEnabled') === 'true';
  });
  const [lastBackupTimestamp, setLastBackupTimestamp] = useState<string | null>(() => {
    return localStorage.getItem('lastBackupTimestamp');
  });

  // Effect to initialize Google Drive service when settings are available
  useEffect(() => {
    const apiKey = (typeof process !== 'undefined' && process.env?.VITE_GOOGLE_API_KEY) || (import.meta as any).env?.VITE_GOOGLE_API_KEY || '';
    const clientId = (typeof process !== 'undefined' && process.env?.VITE_GOOGLE_CLIENT_ID) || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';

    const initCloud = async () => {
      if (!clientId) {
        setCloudInitFailed(true); // Mark as not configured
        setIsGapiReady(true); // Stop loading, show "not configured" message in Settings
        return;
      }
      
      try {
        await googleDriveService.init(apiKey, clientId);
        setIsGapiReady(true);
        setCloudInitFailed(false); // Success

        // Attempt to silently sign in the user on page load to persist session
        try {
          const signedInSilently = await googleDriveService.trySilentSignIn();
          setIsSignedIn(signedInSilently);
          if (signedInSilently) {
            const user = await googleDriveService.getSignedInUser();
            setDriveUser(user);
          }
        } catch (silentErr) {
          // Silent sign-in may not succeed if user hasn't granted permissions, which is normal
          console.debug("Silent sign-in not active:", silentErr);
        }

      } catch (error) {
        console.warn("Google Drive init notice:", error);
        setCloudInitFailed(true);
        setIsGapiReady(true); // Stop loading, show status in Settings
      }
    };
    
    if (!isSettingsLoading) {
        initCloud();
    }
  }, [isSettingsLoading]);
  
  // Effect for periodic auto-backup
  useEffect(() => {
    let intervalId: number | null = null;

    if (isAutoBackupEnabled && isSignedIn && !cloudInitFailed) {
      const performAutoBackup = async () => {
        if (!navigator.onLine) {
          console.log('Skipping auto-backup, user is offline.');
          return;
        }
        console.log('Performing periodic auto-backup...');
        addToast('מבצע גיבוי אוטומטי לענן...', 'info');
        try {
            const backupData = await dbService.exportAllData();
            await googleDriveService.uploadBackup(backupData);
            const timestamp = new Date().toISOString();
            setLastBackupTimestamp(timestamp);
            localStorage.setItem('lastBackupTimestamp', timestamp);
            addToast('הגיבוי האוטומטי הושלם בהצלחה!', 'success');
        } catch (error) {
            console.error('Auto-backup failed:', error);
            addToast('הגיבוי האוטומטי נכשל.', 'error');
        }
      };

      // Set up the interval
      intervalId = window.setInterval(performAutoBackup, AUTO_BACKUP_INTERVAL);
      
      // Perform an initial backup if no recent backup exists
      if (!lastBackupTimestamp) {
        performAutoBackup();
      }
    }

    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAutoBackupEnabled, isSignedIn, addToast, lastBackupTimestamp, cloudInitFailed]);
  
  const signIn = useCallback(async () => {
    if (!navigator.onLine) {
        addToast('נדרש חיבור לאינטרנט כדי להתחבר ל-Google Drive.', 'warning');
        return;
    }
    if (cloudInitFailed) {
        addToast('שירות גיבוי לענן אינו מוגדר או שאינו זמין כעת.', 'warning');
        return;
    }
    setIsProcessing(true);
    try {
      await googleDriveService.signIn();
      const user = await googleDriveService.getSignedInUser();
      setDriveUser(user);
      setIsSignedIn(true);
      
      if (user && user.name) {
        addToast(`מחובר כ-${user.name}`, 'success');
      } else {
        addToast('התחברת בהצלחה!', 'success');
      }

    } catch (error) {
      console.error('Sign in error', error);
      addToast('שגיאה בהתחברות ל-Google Drive', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [addToast]);

  const signOut = useCallback(() => {
    googleDriveService.signOut();
    setIsSignedIn(false);
    setDriveUser(null);
    addToast('התנתקת מ-Google Drive', 'info');
  }, [addToast]);

  const backupToDrive = useCallback(async () => {
    if (!navigator.onLine) {
      addToast('נדרש חיבור לאינטרנט כדי לגבות לענן.', 'warning');
      return;
    }
    if (!isSignedIn) {
      addToast('יש להתחבר ל-Google Drive תחילה', 'warning');
      return;
    }
    setIsProcessing(true);
    addToast('מתחיל גיבוי לענן...', 'info');
    try {
      const backupData = await dbService.exportAllData();
      await googleDriveService.uploadBackup(backupData);
      const timestamp = new Date().toISOString();
      setLastBackupTimestamp(timestamp);
      localStorage.setItem('lastBackupTimestamp', timestamp);
      addToast('הגיבוי הושלם בהצלחה!', 'success');
    } catch (error) {
      console.error('Backup to Drive failed', error);
      addToast('שגיאה במהלך הגיבוי לענן', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [isSignedIn, addToast]);

  const listBackupFiles = useCallback(async (): Promise<CloudFile[]> => {
    if (!navigator.onLine) {
        addToast('נדרש חיבור לאינטרנט כדי להציג גיבויים מהענן.', 'warning');
        return [];
    }
    if (!isSignedIn) {
      addToast('יש להתחבר ל-Google Drive תחילה', 'warning');
      return [];
    }
    setIsProcessing(true);
    try {
      return await googleDriveService.listFiles();
    } catch (error) {
      addToast('שגיאה בטעינת רשימת הגיבויים', 'error');
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [isSignedIn, addToast]);
  
  const restoreFromDrive = useCallback(async (fileId: string) => {
    if (!navigator.onLine) {
        addToast('נדרש חיבור לאינטרנט כדי לשחזר מהענן.', 'warning');
        return;
    }
    if (!isSignedIn) {
        addToast('יש להתחבר ל-Google Drive תחילה', 'warning');
        return;
    }
    setIsProcessing(true);
    addToast('מתחיל שחזור מהענן...', 'info');
    try {
        const backupData: any = await googleDriveService.downloadFile(fileId);
        if (!backupData || typeof backupData !== 'object') {
            throw new Error("Invalid backup file structure.");
        }
        await dbService.importAllData(backupData);
        sessionStorage.setItem('restoreSuccess', 'true');
        window.location.reload();
    } catch (error) {
        console.error('Restore from Drive failed', error);
        addToast('שגיאה במהלך השחזור מהענן.', 'error');
        setIsProcessing(false);
    }
  }, [isSignedIn, addToast]);

  const toggleAutoBackup = () => {
    const newValue = !isAutoBackupEnabled;
    setIsAutoBackupEnabled(newValue);
    localStorage.setItem('autoBackupEnabled', String(newValue));
    addToast(`גיבוי אוטומטי ${newValue ? 'הופעל' : 'כובה'}.`, 'info');
  };

  const value = {
    isGapiReady,
    cloudInitFailed,
    isSignedIn,
    driveUser,
    isProcessing,
    isAutoBackupEnabled,
    lastBackupTimestamp,
    signIn,
    signOut,
    backupToDrive,
    listBackupFiles,
    restoreFromDrive,
    toggleAutoBackup
  };

  return (
    <GoogleDriveContext.Provider value={value}>
      {children}
    </GoogleDriveContext.Provider>
  );
};

export const useGoogleDrive = (): GoogleDriveContextType => {
  const context = useContext(GoogleDriveContext);
  if (context === undefined) {
    throw new Error('useGoogleDrive must be used within a GoogleDriveProvider');
  }
  return context;
};