import React, { createContext, useState, useEffect, useCallback, ReactNode, useContext } from 'react';
import { AppSettings } from '../types';
import { getSettings as dbGetSettings, updateSettings as dbUpdateSettings } from '../services/dbService';
import { DEFAULT_SETTINGS, PDF_THEMES, SETTINGS_ID } from '../constants';
import { useToast } from './ToastContext';

interface SettingsContextType {
  settings: AppSettings;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<AppSettings>, fontFile?: File) => Promise<void>;
  applyTheme: (themeName: AppSettings['pdfTemplate']) => void;
  resetSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { addToast } = useToast();

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      let loadedSettings = await dbGetSettings();
      if (loadedSettings) {
          setSettings({ ...DEFAULT_SETTINGS, ...loadedSettings });
      } else {
          setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      setSettings(DEFAULT_SETTINGS); // Fallback to default
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    const handleSettingsUpdated = (e: any) => {
      if (e.detail) {
        setSettings(prev => ({ ...prev, ...e.detail }));
      } else {
        loadSettings();
      }
    };
    window.addEventListener('app-settings-updated', handleSettingsUpdated);
    window.addEventListener('app-data-imported', loadSettings);
    return () => {
      window.removeEventListener('app-settings-updated', handleSettingsUpdated);
      window.removeEventListener('app-data-imported', loadSettings);
    };
  }, [loadSettings]);

  useEffect(() => {
    if (settings.language) {
      document.documentElement.lang = settings.language;
      document.documentElement.dir = settings.language === 'en' ? 'ltr' : 'rtl';
    }
    const isDark = settings.themeMode === 'dark' || 
      (settings.themeMode === 'system' && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.language, settings.themeMode]);

  const updateSettings = useCallback(async (newSettingsPartial: Partial<AppSettings>, fontFile?: File) => {
    const oldSettings = { ...settings };
    const settingsToUpdate: AppSettings = { ...settings, ...newSettingsPartial, id: SETTINGS_ID };
    
    // Optimistic update for UI responsiveness
    setSettings(settingsToUpdate);

    try {
      let finalSettings = { ...settingsToUpdate };
      if (fontFile) {
        const fontDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(fontFile);
        });
        finalSettings = { ...finalSettings, customFontUrl: fontDataUrl, customFontStoragePath: undefined };
      }
      
      await dbUpdateSettings(finalSettings);
      addToast('ההגדרות נשמרו', 'success');
      // After successfully saving, refetch settings to be sure.
      const reloadedSettings = await dbGetSettings();
      if (reloadedSettings) {
          setSettings({ ...DEFAULT_SETTINGS, ...reloadedSettings });
      }
    } catch (error) {
      console.error("Failed to update settings:", error);
      setSettings(oldSettings); // Revert on failure
      addToast('שגיאה בשמירת ההגדרות', 'error');
      throw error;
    }
  }, [settings, addToast]);


  const applyTheme = useCallback((themeName: AppSettings['pdfTemplate']) => {
    const theme = PDF_THEMES[themeName];
    if (theme && theme.pdfTheme) {
      updateSettings({
        pdfTemplate: themeName,
        pdfTheme: { ...settings.pdfTheme, ...theme.pdfTheme }
      });
    }
  }, [updateSettings, settings.pdfTheme]);

  const resetSettings = useCallback(async () => {
    const oldSettings = { ...settings };
    setSettings(DEFAULT_SETTINGS); // Optimistic update
    try {
        await dbUpdateSettings(DEFAULT_SETTINGS);
    } catch (error) {
        console.error("Failed to reset settings:", error);
        setSettings(oldSettings); // Revert
        throw new Error("Could not reset settings in the database.");
    }
  }, []);


  return (
    <SettingsContext.Provider value={{ settings, isLoading, updateSettings, applyTheme, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};