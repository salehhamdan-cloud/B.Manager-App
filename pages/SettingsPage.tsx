import React, { useState, ChangeEvent, useEffect, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { AppSettings, PdfTemplateStyle, CloudFile } from '../types';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import { PDF_TEMPLATE_STYLES, PDF_THEMES, DEFAULT_SETTINGS, COLOR_PALETTES } from '../constants';
import { optimizeImage } from '../services/imageService';
import * as dbService from '../services/dbService';
import { formatDateTime } from '../utils/dateFormatter';
import { ArrowDownTrayIcon, ArrowUpTrayIcon } from '../components/icons/ActionIcons';
import { useGoogleDrive } from '../contexts/GoogleDriveContext';
import CollapsibleSection from '../components/common/CollapsibleSection';
import { ExclamationTriangleIcon, ArrowPathIcon } from '../components/icons/FeedbackIcons';
import SyncProgressModal from '../components/common/SyncProgressModal';

const SettingsPage: React.FC = () => {
  const { settings, isLoading: isLoadingSettings, updateSettings, resetSettings } = useSettings();
  const { 
    isGapiReady, cloudInitFailed, isSignedIn, driveUser, isProcessing, 
    isAutoBackupEnabled, lastBackupTimestamp,
    signIn, signOut, backupToDrive, listBackupFiles, restoreFromDrive, 
    toggleAutoBackup 
  } = useGoogleDrive();
  
  const [localSettings, setLocalSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [fontFileToUpload, setFontFileToUpload] = useState<File | null>(null);
  const { addToast } = useToast();
  
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [backupFiles, setBackupFiles] = useState<CloudFile[]>([]);
  const [isFetchingFiles, setIsFetchingFiles] = useState(false);
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);
  const [clearDataConfirmation, setClearDataConfirmation] = useState('');
  
  // Mobile / ZIP Sync Progress State
  const [syncProgress, setSyncProgress] = useState<{
    isOpen: boolean;
    type: 'export' | 'import';
    title: string;
    percent: number;
    message: string;
    details?: string;
    isComplete?: boolean;
    stats?: any;
  }>({
    isOpen: false,
    type: 'export',
    title: '',
    percent: 0,
    message: '',
  });
  
  const localFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoadingSettings) {
        setLocalSettings(prev => ({...DEFAULT_SETTINGS, ...settings})); 
    }
  }, [settings, isLoadingSettings]);
  
  useEffect(() => {
    if (sessionStorage.getItem('restoreSuccess')) {
        addToast('השחזור הושלם בהצלחה!', 'success');
        sessionStorage.removeItem('restoreSuccess');
    }
  }, [addToast]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean | undefined = value;

    if (type === 'number' || type === 'range') {
        processedValue = parseFloat(value);
    }
    if (type === 'checkbox') {
        processedValue = (e.target as HTMLInputElement).checked;
    }
    if (type === 'date' && value === '') {
        processedValue = undefined;
    }

    if (name.includes('.')) {
        const [outerKey, innerKey] = name.split('.');
        setLocalSettings(prev => {
            const updatedOuter = { ...(prev as any)[outerKey], [innerKey]: processedValue };
            return { ...prev, [outerKey]: updatedOuter };
        });
    } else {
        setLocalSettings(prev => ({ ...prev, [name]: processedValue }));
    }
  };
  
  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const optimized = await optimizeImage(e.target.files[0], 200, 200, 0.9); 
        setLocalSettings(prev => ({
            ...prev,
            companyInfo: { ...prev.companyInfo, logo: optimized.dataUrl }
        }));
        addToast('לוגו הועלה בהצלחה', 'success');
      } catch (error) {
        addToast('שגיאה בהעלאת הלוגו', 'error');
        console.error("Logo upload error:", error);
      }
    }
  };

  const handleCustomFontUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'font/ttf' && !file.name.toLowerCase().endsWith('.ttf')) {
        addToast('אנא העלה קובץ TTF בלבד.', 'error');
        return;
      }
      const fontName = file.name.replace(/\.[^/.]+$/, "") || 'CustomFont';
      setLocalSettings(prev => ({ ...prev, customFontName: fontName }));
      setFontFileToUpload(file);
      addToast(`גופן '${fontName}' נבחר להעלאה. לחץ על 'שמור הגדרות' כדי להשלים.`, 'info');
    }
  };

  const handleRemoveFont = () => {
    setLocalSettings(prev => ({
        ...prev,
        customFontUrl: undefined,
        customFontStoragePath: undefined,
        customFontName: undefined
    }));
    setFontFileToUpload(null); 
    addToast('גופן מותאם אישית יוסר בשמירה.', 'info');
  };

  const handleTemplateChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newTemplate = e.target.value as PdfTemplateStyle;
    const theme = PDF_THEMES[newTemplate];
    if (theme && theme.pdfTheme) {
        setLocalSettings(prev => ({
            ...prev,
            pdfTemplate: newTemplate,
            pdfTheme: { ...prev.pdfTheme, ...theme.pdfTheme }
        }));
    }
  };

  const handleSaveSettings = async () => {
    try {
      await updateSettings(localSettings, fontFileToUpload || undefined);
      setFontFileToUpload(null); // Reset after saving
      addToast('ההגדרות נשמרו בהצלחה', 'success');
    } catch (error) {
      addToast('שגיאה בשמירת ההגדרות', 'error');
    }
  };

  const openRestoreModal = async () => {
    setIsRestoreModalOpen(true);
    setIsFetchingFiles(true);
    try {
        const files = await listBackupFiles();
        setBackupFiles(files);
    } catch (error) {
        console.error('Error fetching backup files', error);
        setIsRestoreModalOpen(false);
    } finally {
        setIsFetchingFiles(false);
    }
  };

  const handleRestore = async (file: CloudFile) => {
    if (!window.confirm(`האם אתה בטוח שברצונך לשחזר את הגיבוי "${file.name}"?\nכל המידע הנוכחי יימחק ויוחלף במידע מהגיבוי. לא ניתן לבטל פעולה זו.`)) {
        return;
    }
    setIsRestoreModalOpen(false);
    await restoreFromDrive(file.id);
  };

  const handleExportMobileZip = async () => {
    setIsExportModalOpen(false);
    setSyncProgress({
      isOpen: true,
      type: 'export',
      title: 'ייצוא ארכיון גיבוי למובייל',
      percent: 5,
      message: 'מתחיל הכנת קובץ building_manager_backup.zip...',
      isComplete: false,
    });
    try {
        const { createMobileZipBackup } = await import('../services/mobileZipSyncService');
        const { blob, filename, fileCount, dbSize } = await createMobileZipBackup(undefined, (prog) => {
          setSyncProgress(prev => ({
            ...prev,
            percent: prog.percent,
            message: prog.message,
            details: prog.details,
          }));
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setSyncProgress(prev => ({
          ...prev,
          percent: 100,
          isComplete: true,
          message: 'קובץ building_manager_backup.zip יוצא בהצלחה!',
          stats: { fileCount, dbSize }
        }));
        addToast(`קובץ ${filename} יוצא בהצלחה! כולל מסד נתונים SQLite ו-${fileCount} קבצים ותמונות.`, 'success');
    } catch (error) {
        console.error("Error exporting Mobile ZIP backup:", error);
        setSyncProgress(prev => ({ ...prev, isOpen: false }));
        addToast('שגיאה בייצוא קובץ ה-ZIP של המובייל', 'error');
    }
  };

  const handleExportJson = async () => {
    setIsExportModalOpen(false);
    addToast('מייצא גיבוי אוניברסלי מסונכרן בפורמט JSON (תואם Android Mobile ו-Web)...', 'info');
    try {
        const backupData = await dbService.exportAllData();
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().split('T')[0];
        a.download = `BManager_Universal_Sync_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast('הגיבוי האוניברסלי יוצא בהצלחה בפורמט JSON!', 'success');
    } catch (error) {
        console.error("Error exporting JSON backup:", error);
        addToast('שגיאה בייצוא הגיבוי', 'error');
    }
  };

  const handleExportMarkdown = async () => {
    setIsExportModalOpen(false);
    addToast('מייצא מסמך וגיבוי בפורמט Markdown (.MD)...', 'info');
    try {
        const mdString = await dbService.exportAllDataAsMarkdown();
        const blob = new Blob([mdString], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().split('T')[0];
        a.download = `BManager_Documentation_Backup_${date}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addToast('מסמך הגיבוי והתיעוד יוצא בהצלחה בפורמט Markdown (.MD)!', 'success');
    } catch (error) {
        console.error("Error exporting Markdown backup:", error);
        addToast('שגיאה בייצוא מסמך ה-Markdown', 'error');
    }
  };

  const handleExportBackup = () => {
    setIsExportModalOpen(true);
  };

  const triggerImport = () => {
    localFileInputRef.current?.click();
  };

  const handleImportBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSyncProgress({
      isOpen: true,
      type: 'import',
      title: 'שחזור וסנכרון נתונים',
      percent: 5,
      message: `קורא ומנתח קובץ גיבוי (${file.name})...`,
      details: file.name,
      isComplete: false,
    });

    try {
        const { isZipArchive, restoreFromMobileZip } = await import('../services/mobileZipSyncService');
        if (await isZipArchive(file)) {
            const summary = await restoreFromMobileZip(file, (prog) => {
              setSyncProgress(prev => ({
                ...prev,
                percent: prog.percent,
                message: prog.message,
                details: prog.details,
              }));
            });
            sessionStorage.setItem('restoreSuccess', 'true');
            setSyncProgress(prev => ({
              ...prev,
              percent: 100,
              isComplete: true,
              message: 'הסנכרון והשחזור מ-ZIP הושלמו בהצלחה מלאה!',
              stats: summary,
            }));
            addToast(`השחזור מ-ZIP הושלם בהצלחה: ${summary.buildings} מבנים, ${summary.tenants} דיירים, ${summary.issues} תקלות, ${summary.files} קבצים ותמונות!`, 'success');
            return;
        }

        setSyncProgress(prev => ({ ...prev, percent: 15, message: 'מנתח קובץ JSON/MD...' }));
        const text = await file.text();
        await dbService.importAllData(text, (prog) => {
          setSyncProgress(prev => ({
            ...prev,
            percent: prog.percent,
            message: prog.message,
            details: prog.details,
          }));
        });
        sessionStorage.setItem('restoreSuccess', 'true');
        setSyncProgress(prev => ({
          ...prev,
          percent: 100,
          isComplete: true,
          message: 'הסנכרון והייבוא הושלמו בהצלחה מלאה!',
        }));
        addToast('הסנכרון והייבוא הושלמו בהצלחה!', 'success');
    } catch (error) {
        console.error("Error importing backup:", error);
        setSyncProgress(prev => ({ ...prev, isOpen: false }));
        addToast(`שגיאה בייבוא הגיבוי. ודא שזהו קובץ ZIP תקין של אפליקציית המובייל, או קובץ JSON/MD.`, 'error');
    } finally {
        if (event.target) event.target.value = '';
    }
  };

  const handleResetSettings = async () => {
    if (window.confirm("האם אתה בטוח שברצונך לאפס את כל ההגדרות לברירת המחדל? לא ניתן לבטל פעולה זו.")) {
        try {
            await resetSettings();
            addToast('ההגדרות אופסו לברירת המחדל.', 'success');
        } catch (error) {
            addToast('שגיאה באיפוס ההגדרות.', 'error');
        }
    }
  };

  const handleClearAllData = async () => {
      if (clearDataConfirmation !== 'DELETE') {
          addToast('טקסט האישור אינו תואם.', 'error');
          return;
      }
      try {
          await dbService.clearAllData();
          addToast('כל נתוני האפליקציה נמחקו.', 'success');
          setIsClearDataModalOpen(false);
          setClearDataConfirmation('');
          // Reload to reflect cleared state
          setTimeout(() => {
              window.location.reload();
          }, 2000);
      } catch (error) {
          addToast('שגיאה במחיקת הנתונים.', 'error');
      }
  };

  if (isLoadingSettings) {
    return <LoadingSpinner text="טוען הגדרות..." />;
  }
  
  const renderColorInput = (label: string, name: string, value: string) => (
    <div className="flex items-center justify-between">
        <label htmlFor={name.toString()} className="text-sm font-medium text-slate-700">{label}</label>
        <input type="color" id={name.toString()} name={name.toString()} value={value} onChange={handleInputChange} className="w-24 h-8 p-0 border-none rounded"/>
    </div>
  );

  const renderNumberInput = (label: string, name: keyof AppSettings, value: number, min = 0, max = 100, step = 1) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-700">{label} ({value || min})</label>
        <input type="range" id={name} name={name} value={value || min} min={min} max={max} step={step} onChange={handleInputChange} className="mt-1 block w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"/>
    </div>
  );

  const renderSelectInput = (label: string, name: keyof AppSettings, value: string, options: {value: string, label: string}[]) => (
     <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-700">{label}</label>
        <select id={name} name={name} value={value} onChange={handleInputChange} className="mt-1 block w-full input-class">
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
  );

  const renderCloudBackupSection = () => {
    if (!isGapiReady) return <LoadingSpinner text="טוען שירותי ענן..." />;
    if (cloudInitFailed) {
        const message = 'גיבוי לענן אינו מוגדר. יש להגדיר את מפתחות ה-API הנדרשים כמשתני סביבה.';
        return ( <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-md border-r-4 border-amber-400 rtl:border-l-4 rtl:border-r-0"><p className="font-semibold">גיבוי ענן אינו פעיל</p><p>{message}</p></div> );
    }
    if (isSignedIn) {
        return ( <div className="space-y-4"><p className="text-sm text-slate-600">מחובר כ: <span className="font-semibold">{driveUser?.name} ({driveUser?.email})</span></p><div className="flex flex-wrap gap-3"><button onClick={backupToDrive} disabled={isProcessing} className="btn-primary flex items-center gap-2">{isProcessing ? <LoadingSpinner size="sm" /> : <ArrowUpTrayIcon className="w-5 h-5"/>} גיבוי לענן</button><button onClick={openRestoreModal} disabled={isProcessing} className="btn-secondary flex items-center gap-2"><ArrowDownTrayIcon className="w-5 h-5"/> שחזור מהענן</button><button onClick={signOut} className="text-sm text-red-600 hover:underline self-center">התנתק</button></div><div className="pt-4 border-t space-y-2"><h4 className="text-md font-medium text-slate-800">גיבוי אוטומטי תקופתי</h4><label className="flex items-center gap-3 cursor-pointer"><div className="relative"><input type="checkbox" className="sr-only" checked={isAutoBackupEnabled} onChange={toggleAutoBackup} /><div className={`block w-12 h-6 rounded-full transition ${isAutoBackupEnabled ? 'bg-sky-500' : 'bg-slate-300'}`}></div><div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${isAutoBackupEnabled ? 'translate-x-6' : ''}`}></div></div><span className="text-sm text-slate-600">{isAutoBackupEnabled ? 'מופעל (כל שעה)' : 'כבוי'}</span></label>{lastBackupTimestamp && ( <p className="text-xs text-slate-500">גיבוי אחרון (ידני או אוטומטי): {formatDateTime(lastBackupTimestamp)}</p> )}</div></div> );
    }
    return ( <div><p className="text-sm text-slate-600 mb-2">גבה את כל נתוני האפליקציה שלך בצורה מאובטחת לחשבון Google Drive שלך.</p><button onClick={signIn} disabled={isProcessing} className="btn-primary">{isProcessing ? <LoadingSpinner size="sm" /> : 'התחבר עם Google Drive'}</button></div> );
  };
  
  const CheckboxSetting: React.FC<{name: keyof AppSettings, label: string}> = ({ name, label }) => (
    <label className="flex items-center"><input type="checkbox" name={name} checked={!!localSettings[name]} onChange={handleInputChange} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"/><span className="ml-2 rtl:mr-2 text-sm text-slate-700">{label}</span></label>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">הגדרות מערכת, מיתוג ו-PDF</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">התאמת פרטי חברה, לוגו, צבעי מיתוג, שפה, מטבע וגיבוי ענן</p>
        </div>
        <button 
          onClick={handleSaveSettings} 
          className="btn-primary text-xs sm:text-sm flex items-center gap-2 self-stretch sm:self-auto justify-center"
        >
          <span>שמור את כל ההגדרות</span>
        </button>
      </div>
      
      <div className="bg-white p-5 sm:p-8 rounded-3xl shadow-xs border border-slate-200/90 space-y-8">
        <CollapsibleSection title={<h3 className="text-lg font-medium">מידע על החברה, שפה ומטבע</h3>} defaultOpen={true}>
            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="companyName" className="block text-sm font-medium text-slate-700">שם החברה / ארגון</label>
                        <input type="text" id="companyName" name="companyInfo.name" value={localSettings.companyInfo.name} onChange={handleInputChange} className="mt-1 block w-full input-class"/>
                    </div>
                    <div>
                        <label htmlFor="taxId" className="block text-sm font-medium text-slate-700">ח.פ / מספר עוסק מורשה (Tax ID)</label>
                        <input type="text" id="taxId" name="taxId" value={localSettings.taxId || ''} onChange={handleInputChange} placeholder="515000000" className="mt-1 block w-full input-class"/>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-slate-700">טלפון החברה / מוקד (Phone)</label>
                        <input type="tel" id="phone" name="phone" value={localSettings.phone || ''} onChange={handleInputChange} placeholder="03-0000000" className="mt-1 block w-full input-class"/>
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700">אימייל החברה (Email)</label>
                        <input type="email" id="email" name="email" value={localSettings.email || ''} onChange={handleInputChange} placeholder="office@company.co.il" className="mt-1 block w-full input-class"/>
                    </div>
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-slate-700">כתובת משרד ראשי (Address)</label>
                        <input type="text" id="address" name="address" value={localSettings.address || ''} onChange={handleInputChange} placeholder="רחוב הברזל 1, תל אביב" className="mt-1 block w-full input-class"/>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="currencySymbol" className="block text-sm font-medium text-slate-700">מטבע מוביל (Currency Symbol)</label>
                        <div className="mt-1 flex items-center gap-2">
                            <select 
                                value={['₪', '$', '€', 'د.إ', '£'].includes(localSettings.currencySymbol || '₪') ? localSettings.currencySymbol : 'custom'} 
                                onChange={(e) => {
                                    if (e.target.value !== 'custom') {
                                        setLocalSettings(prev => ({ ...prev, currencySymbol: e.target.value }));
                                    }
                                }}
                                className="input-class flex-1"
                            >
                                <option value="₪">₪ - שקל ישראלי (ILS)</option>
                                <option value="$">$ - דולר אמריקאי (USD)</option>
                                <option value="€">€ - אירו (EUR)</option>
                                <option value="د.إ">د.إ - דירהם איחוד האמירויות (AED)</option>
                                <option value="£">£ - ליש״ט (GBP)</option>
                                <option value="custom">אחר (מותאם אישית)</option>
                            </select>
                            <input 
                                type="text" 
                                value={localSettings.currencySymbol || '₪'} 
                                onChange={(e) => setLocalSettings(prev => ({ ...prev, currencySymbol: e.target.value }))}
                                className="input-class w-20 text-center font-bold"
                                title="סמל מטבע"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="language" className="block text-sm font-medium text-slate-700">שפת ממשק (Language)</label>
                        <select 
                            id="language" 
                            name="language" 
                            value={localSettings.language || 'he'} 
                            onChange={(e) => {
                                const newLang = e.target.value as 'he' | 'en' | 'ar';
                                setLocalSettings(prev => ({ ...prev, language: newLang }));
                                document.documentElement.dir = newLang === 'en' ? 'ltr' : 'rtl';
                                document.documentElement.lang = newLang;
                            }} 
                            className="mt-1 block w-full input-class"
                        >
                            <option value="he">עברית (Hebrew - RTL)</option>
                            <option value="en">English (LTR)</option>
                            <option value="ar">العربية (Arabic - RTL)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="logo" className="block text-sm font-medium text-slate-700">לוגו החברה (יופיע בכל הדוחות וטפסי הבדיקה)</label>
                    <input type="file" id="logo" accept="image/png, image/jpeg" onChange={handleLogoUpload} className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"/>
                    {localSettings.companyInfo.logo && <img src={localSettings.companyInfo.logo} alt="Company Logo Preview" className="mt-2 h-16 w-auto border p-1 rounded-md"/>}
                </div>
            </div>
        </CollapsibleSection>

        <CollapsibleSection title={<h3 className="text-lg font-medium">הגדרות PDF כלליות</h3>} defaultOpen={false}>
            <div className="space-y-4">
                 <div>
                    <label htmlFor="authorName" className="block text-sm font-medium text-slate-700">שם מחבר ברירת מחדל</label>
                    <input type="text" id="authorName" name="authorName" value={localSettings.authorName} onChange={handleInputChange} className="mt-1 block w-full input-class"/>
                </div>
                <div>
                    <label htmlFor="authorPhone" className="block text-sm font-medium text-slate-700">טלפון מחבר ברירת מחדל</label>
                    <input type="tel" id="authorPhone" name="authorPhone" value={localSettings.authorPhone || ''} onChange={handleInputChange} className="mt-1 block w-full input-class"/>
                </div>
                <div>
                    <label htmlFor="authorEmail" className="block text-sm font-medium text-slate-700">אימייל מחבר ברירת מחדל</label>
                    <input type="email" id="authorEmail" name="authorEmail" value={localSettings.authorEmail || ''} onChange={handleInputChange} className="mt-1 block w-full input-class"/>
                </div>
                <div>
                    <label htmlFor="customFont" className="block text-sm font-medium text-slate-700">העלה גופן עברי (TTF)</label>
                    <input type="file" id="customFont" accept=".ttf,font/ttf" onChange={handleCustomFontUpload} className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"/>
                    {(localSettings.customFontName || fontFileToUpload) && (
                        <div className="flex items-center gap-2 mt-2">
                             <p className="text-xs text-slate-500">גופן נוכחי: {localSettings.customFontName || fontFileToUpload?.name}</p>
                             <button onClick={handleRemoveFont} className="text-xs text-red-500 hover:underline">(הסר)</button>
                        </div>
                    )}
                </div>
            </div>
        </CollapsibleSection>
        
        <CollapsibleSection title={<h3 className="text-lg font-medium">עיצוב אפליקציה ופלטות צבעים (M3 Themes)</h3>} defaultOpen={false}>
          <div className="space-y-6">
              <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-2">מצב תצוגה (Theme Mode)</h4>
                  <div className="grid grid-cols-3 gap-3">
                      {[
                          { id: 'system', label: 'התאמה למכשיר (System)', icon: '🌓' },
                          { id: 'light', label: 'מצב בהיר (Light)', icon: '☀️' },
                          { id: 'dark', label: 'מצב כהה (Dark)', icon: '🌙' },
                      ].map(mode => {
                          const isSelected = (localSettings.themeMode || 'system') === mode.id;
                          return (
                              <button
                                  key={mode.id}
                                  type="button"
                                  onClick={() => setLocalSettings(prev => ({ ...prev, themeMode: mode.id as any }))}
                                  className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 ${
                                      isSelected ? 'ring-2 ring-sky-500 border-sky-400 bg-sky-50/60 shadow-xs font-bold text-sky-900' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                  }`}
                              >
                                  <span className="text-xl">{mode.icon}</span>
                                  <span className="text-xs">{mode.label}</span>
                              </button>
                          );
                      })}
                  </div>
              </div>

              <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-2">פלטות צבעים מובנות (Material 3 Color Palettes)</h4>
                  <p className="text-xs text-slate-500 mb-3">בחר אחת מהפלטות המובנות או התאם צבעים באופן חופשי:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {COLOR_PALETTES.map(palette => {
                          const isSelected = localSettings.appTheme.headerColor === palette.headerColor;
                          return (
                              <button
                                  key={palette.id}
                                  type="button"
                                  onClick={() => {
                                      setLocalSettings(prev => ({
                                          ...prev,
                                          colorPalette: palette.id as any,
                                          appTheme: {
                                              ...prev.appTheme,
                                              headerColor: palette.headerColor,
                                              accentColor: palette.accentColor,
                                              headerTextColor: '#ffffff',
                                          }
                                      }));
                                  }}
                                  className={`p-3 rounded-xl border text-right transition flex flex-col justify-between ${
                                      isSelected ? 'ring-2 ring-sky-500 border-sky-400 bg-sky-50/50 shadow-sm' : 'border-slate-200 hover:bg-slate-50'
                                  }`}
                              >
                                  <span className="text-xs font-bold text-slate-800 block mb-2">{palette.label}</span>
                                  <div className="flex items-center gap-1.5">
                                      <span className="w-5 h-5 rounded-full border shadow-xs" style={{ backgroundColor: palette.headerColor }}></span>
                                      <span className="w-4 h-4 rounded-full border shadow-xs" style={{ backgroundColor: palette.accentColor }}></span>
                                  </div>
                              </button>
                          );
                      })}
                  </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                  <h4 className="text-sm font-bold text-slate-800">התאמת צבעים אישית</h4>
                  {renderColorInput('צבע כותרת עליונה', 'appTheme.headerColor', localSettings.appTheme.headerColor)}
                  {renderColorInput('צבע טקסט כותרת', 'appTheme.headerTextColor', localSettings.appTheme.headerTextColor)}
                  {renderColorInput('צבע הדגשה', 'appTheme.accentColor', localSettings.appTheme.accentColor)}
                  {renderColorInput('רקע כותרת קבוצה', 'appTheme.groupHeaderBackgroundColor', localSettings.appTheme.groupHeaderBackgroundColor)}
                  {renderColorInput('צבע טקסט כותרת קבוצה', 'appTheme.groupHeaderTextColor', localSettings.appTheme.groupHeaderTextColor)}
              </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title={<h3 className="text-lg font-medium">עיצוב PDF</h3>} defaultOpen={false}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h4 className="font-semibold">תבניות עיצוב</h4>
                    <div>
                        <label htmlFor="pdfTemplate" className="block text-sm font-medium text-slate-700">תבנית עיצוב כללית</label>
                        <select id="pdfTemplate" name="pdfTemplate" value={localSettings.pdfTemplate} onChange={handleTemplateChange} className="mt-1 block w-full input-class">
                            {PDF_TEMPLATE_STYLES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <h4 className="font-semibold mt-4">צבעים מותאמים אישית (PDF)</h4>
                    {renderColorInput('צבע כותרת', 'pdfTheme.headerColor', localSettings.pdfTheme.headerColor)}
                    {renderColorInput('צבע טקסט כותרת', 'pdfTheme.headerTextColor', localSettings.pdfTheme.headerTextColor)}
                    {renderColorInput('צבע טקסט כללי', 'pdfTheme.textColor', localSettings.pdfTheme.textColor)}
                    {renderColorInput('צבע הדגשה', 'pdfTheme.accentColor', localSettings.pdfTheme.accentColor)}
                    {renderColorInput('רקע כותרת קבוצה (טופס)', 'pdfTheme.formGroupHeaderColor', localSettings.pdfTheme.formGroupHeaderColor)}
                    {renderColorInput('רקע כותרת טופס', 'pdfTheme.formTitleHeaderColor', localSettings.pdfTheme.formTitleHeaderColor)}
                    {renderColorInput('טקסט כותרת טופס', 'pdfTheme.formTitleTextColor', localSettings.pdfTheme.formTitleTextColor)}
                    {renderColorInput('רקע כותרת תמונה (טופס)', 'pdfTheme.formPhotoHeaderColor', localSettings.pdfTheme.formPhotoHeaderColor)}
                </div>
                <div className="space-y-4">
                     <h4 className="font-semibold">גדלים ומיקומים (PDF)</h4>
                    {renderNumberInput('גודל לוגו (%)', 'logoSize', localSettings.logoSize, 5, 50)}
                    {renderSelectInput('מיקום לוגו', 'logoPosition', localSettings.logoPosition, [{value: 'top-left', label: 'שמאל'}, {value: 'top-right', label: 'ימין'}, {value: 'top-center', label: 'מרכז'}])}
                    {renderNumberInput('גודל תמונת בניין (%)', 'projectImageSize', localSettings.projectImageSize, 10, 80)}
                    {renderSelectInput('מיקום תמונת בניין', 'projectImagePosition', localSettings.projectImagePosition, [{value: 'below-header', label: 'מתחת לכותרת'}, {value: 'top-left', label: 'שמאל עליון'}, {value: 'top-right', label: 'ימין עליון'}])}
                    {renderNumberInput('גודל תמונת תקלה (%)', 'problemImageSize', localSettings.problemImageSize, 10, 80)}
                     <h4 className="font-semibold mt-4">גודל גופן (נקודות, PDF)</h4>
                    {renderNumberInput('גודל גופן קטן', 'fontSizeSmall', localSettings.fontSizeSmall, 8, 14)}
                    {renderNumberInput('גודל גופן בינוני', 'fontSizeMedium', localSettings.fontSizeMedium, 10, 18)}
                    {renderNumberInput('גודל גופן גדול', 'fontSizeLarge', localSettings.fontSizeLarge, 12, 24)}
                </div>
            </div>
        </CollapsibleSection>

        <CollapsibleSection title={<h3 className="text-lg font-medium">הגדרות הפקת PDF</h3>} defaultOpen={false}>
            <div className="space-y-4">
                {renderSelectInput('כיוון הדף', 'pdfOrientation', localSettings.pdfOrientation, [
                    { value: 'portrait', label: 'לאורך (Portrait)' },
                    { value: 'landscape', label: 'לרוחב (Landscape)' }
                ])}
                <div className="pt-2 space-y-2">
                    <CheckboxSetting name="pdfIncludeDashboard" label="כלול Dashboard בדוח הראשי"/>
                    <CheckboxSetting name="pdfIncludeProblemPhotos" label="כלול תמונות של תקלות בדוח הראשי"/>
                </div>
                <div>
                    <h4 className="block text-sm font-medium text-slate-700 mb-2">סינון תאריכים עבור PDF של רשימת תקלות</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="pdfDateRangeStart" className="block text-sm font-medium text-slate-700">מתאריך</label>
                            <input 
                                type="date" 
                                id="pdfDateRangeStart" 
                                name="pdfDateRangeStart" 
                                value={localSettings.pdfDateRangeStart?.split('T')[0] || ''} 
                                onChange={handleInputChange}
                                className="mt-1 block w-full input-class"
                            />
                        </div>
                        <div>
                            <label htmlFor="pdfDateRangeEnd" className="block text-sm font-medium text-slate-700">עד תאריך</label>
                            <input 
                                type="date" 
                                id="pdfDateRangeEnd" 
                                name="pdfDateRangeEnd" 
                                value={localSettings.pdfDateRangeEnd?.split('T')[0] || ''} 
                                onChange={handleInputChange}
                                className="mt-1 block w-full input-class"
                            />
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => setLocalSettings(prev => ({...prev, pdfDateRangeStart: undefined, pdfDateRangeEnd: undefined}))}
                        className="text-sm text-sky-600 hover:underline mt-2"
                    >
                        נקה טווח תאריכים
                    </button>
                </div>
            </div>
        </CollapsibleSection>
        
        <CollapsibleSection title={<h3 className="text-lg font-medium">התראות במייל</h3>} defaultOpen={false}>
            <div className="space-y-4">
                <CheckboxSetting name="enableEmailNotifications" label="אפשר שליחת התראות במייל"/>
                <div><label htmlFor="notificationEmailAddress" className="block text-sm font-medium text-slate-700">כתובת מייל לקבלת התראות</label><input type="email" id="notificationEmailAddress" name="notificationEmailAddress" value={localSettings.notificationEmailAddress} onChange={handleInputChange} className="input-class w-full"/></div>
                
                <div className="pt-2 border-t">
                    <h4 className="font-semibold text-slate-700 mb-2">התראות על אירועים</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <CheckboxSetting name="notifyOnCriticalIssues" label="על תקלה קריטית"/>
                        <CheckboxSetting name="notifyOnTaskCompletion" label="על השלמת משימה"/>
                        <CheckboxSetting name="notifyOnNewReport" label="על דוח חדש"/>
                        <CheckboxSetting name="notifyOnQuotationStatusChange" label={'על שינוי סטטוס הצע"מ'}/>
                    </div>
                </div>
                
                <div className="pt-4 border-t">
                    <h4 className="font-semibold text-slate-700 mb-2">התראות על תפוגה קרובה (Digest)</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-x-4 gap-y-2">
                        <CheckboxSetting name="notifyOnFileDueSoon" label="תוקף קבצים"/>
                        <CheckboxSetting name="notifyOnTodoDueSoon" label="יעד משימות"/>
                        <CheckboxSetting name="notifyOnPermitDueSoon" label="תוקף היתרים"/>
                        <CheckboxSetting name="notifyOnWarrantyDueSoon" label="תוקף אחריות"/>
                    </div>
                </div>
                <div className="pt-4 border-t">
                    <h4 className="font-semibold text-slate-700 mb-2">התראות על פג תוקף (Digest)</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-x-4 gap-y-2">
                        <CheckboxSetting name="notifyOnFileExpired" label="תוקף קבצים"/>
                        <CheckboxSetting name="notifyOnTodoExpired" label="יעד משימות"/>
                        <CheckboxSetting name="notifyOnPermitExpired" label="תוקף היתרים"/>
                        <CheckboxSetting name="notifyOnWarrantyExpired" label="תוקף אחריות"/>
                    </div>
                </div>
            </div>
        </CollapsibleSection>

        <CollapsibleSection 
            title={
                <div className="flex items-center gap-2">
                    <ArrowPathIcon className="w-5 h-5 text-sky-600" />
                    <h3 className="text-lg font-bold text-slate-800">Backup & Sync (גיבוי וסנכרון מובייל ו-Web)</h3>
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full">Mobile Room v40 & Web</span>
                </div>
            } 
            defaultOpen={true}
        >
            <div className="space-y-6">
                {/* Mobile & Web Bridge Banner */}
                <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-lg p-5">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-sky-600 text-white rounded-lg shadow-sm">
                            <ArrowPathIcon className="w-6 h-6" />
                        </div>
                        <div className="flex-grow">
                            <h4 className="font-bold text-slate-900 text-base">גשר סנכרון מלא: Android Mobile ⟷ Web Application</h4>
                            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                                המערכת מגשרת ומסנכרנת באופן מלא את כל הישויות בין מסד הנתונים של אפליקציית האנדרואיד (Room Database v40) לבין אפליקציית ה-Web. 
                                ניתן לייצא ולייבא קבצים דו-כיווניים בפורמט <strong>JSON</strong> ו-<strong>Markdown (.MD)</strong>.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                                <span className="bg-white/90 border border-sky-200 text-slate-700 px-2.5 py-1 rounded-md shadow-xs">🏢 מבנים ונכסים</span>
                                <span className="bg-white/90 border border-sky-200 text-slate-700 px-2.5 py-1 rounded-md shadow-xs">👥 דיירים וחוזי שכירות</span>
                                <span className="bg-white/90 border border-sky-200 text-slate-700 px-2.5 py-1 rounded-md shadow-xs">⚠️ קריאות שירות ותקלות</span>
                                <span className="bg-white/90 border border-sky-200 text-slate-700 px-2.5 py-1 rounded-md shadow-xs">🛠️ יומני מערכות תשתית</span>
                                <span className="bg-white/90 border border-sky-200 text-slate-700 px-2.5 py-1 rounded-md shadow-xs">📅 לוח תחזוקה מונעת</span>
                                <span className="bg-white/90 border border-sky-200 text-slate-700 px-2.5 py-1 rounded-md shadow-xs">📦 פריטי ומחסני מלאי</span>
                                <span className="bg-white/90 border border-sky-200 text-slate-700 px-2.5 py-1 rounded-md shadow-xs">💼 ספקים וחשבוניות</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Local & Direct File Sync Section */}
                <section className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm space-y-4">
                    <div>
                        <h4 className="text-base font-bold text-slate-800">
                            סנכרון וגיבוי מקומי / קבצים (Local File Sync & Backup)
                        </h4>
                        <p className="text-sm text-slate-500 mt-0.5">
                            ייצוא וייבוא ישיר של כל נתוני המערכת בפורמט JSON או Markdown (.MD) לתאימות מלאה בין המכשיר הנייד ל-Web.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                        {/* Export Card */}
                        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 flex flex-col justify-between hover:border-sky-300 transition-colors">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                        <ArrowUpTrayIcon className="w-5 h-5 text-sky-600" />
                                        ייצוא וסנכרון נתונים (Export Data)
                                    </h5>
                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded font-mono font-bold">ZIP / JSON / MD</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                                    ייצוא מלא של כל נתוני המערכת. בחר בארכיון ה-ZIP של אפליקציית המובייל (building_manager_backup.zip) לסנכרון מלא הכולל SQLite, קבצים ותמונות, או ב-JSON / Markdown.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <button 
                                    type="button"
                                    onClick={handleExportMobileZip}
                                    disabled={isProcessing}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-lg shadow-xs hover:shadow transition-colors"
                                    title="ייצוא ארכיון ZIP תקני של אפליקציית המובייל"
                                >
                                    <ArrowUpTrayIcon className="w-4 h-4" />
                                    <span>ייצא ארכיון ZIP למובייל (building_manager_backup.zip)</span>
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={handleExportJson}
                                        disabled={isProcessing}
                                        className="btn-secondary text-xs py-2 flex items-center justify-center gap-1"
                                        title="ייצוא מהיר לקובץ JSON"
                                    >
                                        <span>ייצא JSON</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsExportModalOpen(true)}
                                        disabled={isProcessing}
                                        className="btn-secondary text-xs py-2 flex items-center justify-center gap-1"
                                        title="אפשרויות ייצוא נוספות"
                                    >
                                        <span>אפשרויות נוספות...</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Import Card */}
                        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 flex flex-col justify-between hover:border-emerald-300 transition-colors">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                        <ArrowDownTrayIcon className="w-5 h-5 text-emerald-600" />
                                        ייבוא וסנכרון גיבוי (Import / Sync)
                                    </h5>
                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded font-mono font-bold">.ZIP / .JSON / .MD</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                                    טען קובץ גיבוי מאפליקציית ה-Mobile (קובץ building_manager_backup.zip כולל databases, files ו-shared_prefs), או קובץ JSON / Markdown. המערכת תזהה את המבנה ותסנכרן את כל הנתונים.
                                </p>
                            </div>

                            <div>
                                <button 
                                    type="button"
                                    onClick={triggerImport} 
                                    disabled={isProcessing}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-md shadow-sm hover:shadow transition-colors"
                                >
                                    <ArrowDownTrayIcon className="w-5 h-5" />
                                    <span>טען קובץ גיבוי וסנכרן (ZIP / JSON / MD)</span>
                                </button>
                                <p className="text-[11px] text-center text-slate-500 mt-2 font-medium">
                                    תומך ב-building_manager_backup.zip (SQLite+קבצים+הגדרות), JSON ו-Markdown (.md)
                                </p>
                            </div>
                            <input 
                                type="file" 
                                ref={localFileInputRef} 
                                onChange={handleImportBackup} 
                                className="hidden" 
                                accept=".zip,.json,.md,application/zip,application/x-zip-compressed,text/markdown,application/json"
                            />
                        </div>
                    </div>
                </section>

                {/* Cloud Sync (Google Drive) */}
                <section className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
                    <h4 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                        <span>גיבוי וסנכרון בענן (Google Drive Cloud Sync)</span>
                    </h4>
                    <p className="text-sm text-slate-500 mb-4">
                        סנכרון אוטומטי ושמירת גיבויים מאובטחים בחשבון ה-Google Drive שלך.
                    </p>
                    <div className="p-4 border rounded-md shadow-sm bg-slate-50/50">{renderCloudBackupSection()}</div>
                </section>
            </div>
        </CollapsibleSection>
        
        <CollapsibleSection title={<h3 className="text-lg font-medium text-red-800">אזור סכנה</h3>} defaultOpen={false}>
            <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex justify-between items-center flex-wrap gap-2">
                    <div><h4 className="font-semibold text-red-700">איפוס הגדרות</h4><p className="text-sm text-red-600">שחזר את כל הגדרות האפליקציה וה-PDF לברירת המחדל.</p></div>
                    <button onClick={handleResetSettings} className="btn-danger">אפס הגדרות</button>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-red-200 flex-wrap gap-2">
                    <div><h4 className="font-semibold text-red-700">מחק את כל הנתונים</h4><p className="text-sm text-red-600">מחק לצמיתות את כל הפרויקטים, הדוחות, הקבצים וכו'. לא ניתן לבטל פעולה זו.</p></div>
                    <button onClick={() => setIsClearDataModalOpen(true)} className="btn-danger">מחק הכל</button>
                </div>
            </div>
        </CollapsibleSection>
      </div>

      <div className="flex justify-end pt-4">
        <button onClick={handleSaveSettings} className="btn-primary px-8 py-3 text-sm font-bold shadow-md">
          שמור את כל ההגדרות
        </button>
      </div>
      
      <Modal isOpen={isRestoreModalOpen} onClose={() => setIsRestoreModalOpen(false)} title="שחזור גיבוי מ-Google Drive" size="lg"> {isFetchingFiles ? <LoadingSpinner text="טוען רשימת גיבויים..."/> : (<div className="space-y-3 max-h-[60vh] overflow-y-auto p-1">{backupFiles.length > 0 ? backupFiles.map(file => (<div key={file.id} className="flex flex-wrap justify-between items-center p-3 bg-slate-50 rounded-md gap-3"><div className="flex-grow"><p className="font-medium text-slate-800 break-all">{file.name}</p><p className="text-xs text-slate-500">תאריך: {formatDateTime(file.modifiedTime)}</p></div><button onClick={() => handleRestore(file)} className="btn-secondary text-sm flex-shrink-0">שחזר</button></div>)) : <p className="text-slate-500 text-center py-4">לא נמצאו קבצי גיבוי בחשבון Google Drive שלך.</p>}</div>)}</Modal>

      {/* Export Data to MD/JSON/ZIP Modal */}
      <Modal 
          isOpen={isExportModalOpen} 
          onClose={() => setIsExportModalOpen(false)} 
          title="ייצוא וסנכרון נתונים (Export Data / Mobile Sync)" 
          size="md"
      >
          <div className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                  בחר את הפורמט הרצוי לייצוא נתוני המערכת. מומלץ לבחור בארכיון ה-ZIP לתאימות וסנכרון מלא עם אפליקציית ה-Mobile:
              </p>

              <div className="space-y-3">
                  <div 
                      onClick={handleExportMobileZip}
                      className="p-4 border-2 border-indigo-300 hover:border-indigo-600 hover:bg-indigo-50/80 rounded-xl cursor-pointer transition-all flex items-start gap-3 shadow-xs bg-indigo-50/30 group"
                  >
                      <div className="p-2.5 bg-indigo-600 text-white rounded-lg font-bold text-xs tracking-wider">
                          .ZIP
                      </div>
                      <div className="flex-grow">
                          <div className="flex items-center gap-2">
                              <h5 className="font-bold text-slate-900 text-sm group-hover:text-indigo-900 transition-colors">
                                  ארכיון Mobile App ZIP מלא (building_manager_backup.zip)
                              </h5>
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                                  מומלץ ביותר לסנכרון
                              </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                              כולל את מסד הנתונים השלם (SQLite / Room database ב-databases/building_manager_database), את כל התמונות והקבצים המצורפים (files/), ואת קובץ ההגדרות (shared_prefs/building_manager_preferences.xml). תואם 100% לאפליקציית ה-Mobile.
                          </p>
                      </div>
                  </div>

                  <div 
                      onClick={handleExportJson}
                      className="p-4 border-2 border-slate-200 hover:border-sky-500 hover:bg-sky-50/60 rounded-xl cursor-pointer transition-all flex items-start gap-3 shadow-xs"
                  >
                      <div className="p-2.5 bg-sky-600 text-white rounded-lg font-bold text-xs tracking-wider">
                          JSON
                      </div>
                      <div className="flex-grow">
                          <h5 className="font-bold text-slate-900 text-sm">קובץ Universal JSON (סנכרון מובייל ו-Web)</h5>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                              מבנה נתונים מלא התואם לטבלאות Room Database של אפליקציית האנדרואיד (גרסה 40) ולמבנה ה-Web המלא, לסנכרון מיידי בין מכשירים.
                          </p>
                      </div>
                  </div>

                  <div 
                      onClick={handleExportMarkdown}
                      className="p-4 border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/60 rounded-xl cursor-pointer transition-all flex items-start gap-3 shadow-xs"
                  >
                      <div className="p-2.5 bg-emerald-600 text-white rounded-lg font-bold text-xs tracking-wider">
                          .MD
                      </div>
                      <div className="flex-grow">
                          <h5 className="font-bold text-slate-900 text-sm">מסמך Markdown Documentation & Sync (.MD)</h5>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                              מסמך Markdown עשיר הכולל טבלאות נתונים קריאות (מבנים, דיירים, תקלות, מערכות, ספקים וחשבוניות) יחד עם בלוק גיבוי מוטמע המאפשר שחזור מושלם.
                          </p>
                      </div>
                  </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-200">
                  <button 
                      type="button" 
                      onClick={() => setIsExportModalOpen(false)} 
                      className="btn-secondary text-sm"
                  >
                      סגור
                  </button>
              </div>
          </div>
      </Modal>
      <Modal isOpen={isClearDataModalOpen} onClose={() => setIsClearDataModalOpen(false)} title="אישור מחיקת נתונים"><div className="space-y-4"><div className="flex items-start gap-3 bg-red-50 p-3 rounded-md"><ExclamationTriangleIcon className="w-6 h-6 text-red-500 flex-shrink-0" /><div><h3 className="font-bold text-red-800">זוהי פעולה הרסנית.</h3><p className="text-sm text-red-700 mt-1">אתה עומד למחוק לצמיתות את כל הנתונים באפליקציה זו. כולל כל הפרויקטים, הדוחות, הבעיות, הקבצים, ההגדרות והמלאי. לא ניתן לבטל פעולה זו.</p></div></div><p className="text-slate-600">כדי לאשר, אנא הקלד <strong>DELETE</strong> בתיבה למטה.</p><input type="text" value={clearDataConfirmation} onChange={(e) => setClearDataConfirmation(e.target.value)} className="input-class w-full text-center tracking-widest font-mono" /><div className="flex justify-end gap-2 pt-4"><button onClick={() => setIsClearDataModalOpen(false)} className="btn-secondary">ביטול</button><button onClick={handleClearAllData} disabled={clearDataConfirmation !== 'DELETE'} className="btn-danger disabled:bg-red-300 disabled:cursor-not-allowed">אני מבין, מחק את כל הנתונים</button></div></div></Modal>
      
      {/* Mobile ZIP Sync Progress Modal */}
      <SyncProgressModal
        isOpen={syncProgress.isOpen}
        type={syncProgress.type}
        title={syncProgress.title}
        percent={syncProgress.percent}
        message={syncProgress.message}
        details={syncProgress.details}
        isComplete={syncProgress.isComplete}
        stats={syncProgress.stats}
        onClose={() => {
          setSyncProgress(prev => ({ ...prev, isOpen: false }));
          if (syncProgress.isComplete && syncProgress.type === 'import') {
            window.location.reload();
          }
        }}
      />

      <style>{`.input-class { display: block; width: 100%; border: 1px solid #cbd5e1; border-radius: 0.375rem; padding: 0.5rem 0.75rem; transition: border-color 0.2s; } .input-class:focus { border-color: #0284c7; outline: none; box-shadow: 0 0 0 1px #0284c7; } .btn-primary { padding: 0.5rem 1rem; background-color: #0284c7; color: white; border-radius: 0.375rem; font-weight: 500; transition: background-color 0.2s; } .btn-primary:hover:not(:disabled) { background-color: #0369a1; } .btn-primary:disabled { background-color: #0284c7; opacity: 0.6; cursor: not-allowed; } .btn-secondary { padding: 0.5rem 1rem; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 0.375rem; font-weight: 500; } .btn-secondary:hover:not(:disabled) { background-color: #e2e8f0; } .btn-danger { padding: 0.5rem 1rem; background-color: #dc2626; color: white; border-radius: 0.375rem; font-weight: 500; } .btn-danger:hover:not(:disabled) { background-color: #b91c1c; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .animate-fadeIn { animation: fadeIn 0.3s ease-out; }`}</style>
    </div>
  );
};

export default SettingsPage;
