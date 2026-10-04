import React, { useState, useEffect } from 'react';
import { ProjectFile, DocumentPage } from '../../types';
import Modal from './Modal';
import { useToast } from '../../contexts/ToastContext';
import { generateId } from '../../utils/idGenerator';
import LoadingSpinner from './LoadingSpinner';
import DocumentScanner from './DocumentScanner';
import { generatePdfFromImages } from '../../services/pdfService';
import { DocumentScannerIcon } from '../icons/ScannerIcons';
import RecurrenceEditor from './RecurrenceEditor';
import { dataUrlToFile } from '../../utils/shareUtils';
import { useSettings } from '../../contexts/SettingsContext';

interface AddFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (files: ProjectFile[]) => Promise<void>;
  // FIX: Add optional prop to hide date fields
  hideDateFields?: boolean;
}

const AddFileModal: React.FC<AddFileModalProps> = ({ isOpen, onClose, onSave, hideDateFields = false }) => {
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [fileDetails, setFileDetails] = useState<Partial<ProjectFile>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const { addToast } = useToast();
  const { settings } = useSettings();

  useEffect(() => {
    // Reset state when modal is opened
    if (isOpen) {
      setFilesToUpload([]);
      setFileDetails({
        id: generateId(), // Temp id for details object
        group: '',
        startDate: new Date().toISOString(),
        recurrenceType: 'one-time',
        recurrence: { unit: 'years', interval: 1 },
        duration: { unit: 'days', value: 30 }
      });
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length > 0) {
        setFilesToUpload(prev => [...prev, ...newFiles]);
    }
  };
  
  const removeFileFromList = (fileName: string) => {
    setFilesToUpload(prev => prev.filter(f => f.name !== fileName));
  };


  const handleRecurrenceUpdate = (updates: Partial<ProjectFile>) => {
      setFileDetails(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (filesToUpload.length === 0) {
      addToast('יש לבחור לפחות קובץ אחד להעלאה.', 'warning');
      return;
    }
    setIsProcessing(true);

    try {
        const newFiles: ProjectFile[] = await Promise.all(
            filesToUpload.map(async (file) => {
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        if (event.target?.result) resolve(event.target.result as string);
                        else reject(new Error('File reading failed'));
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                const newFile: ProjectFile = {
                    id: generateId(),
                    name: file.name,
                    mimeType: file.type,
                    dataUrl: dataUrl,
                    uploadedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    startDate: fileDetails.startDate,
                    dueDate: fileDetails.dueDate,
                    group: fileDetails.group?.trim() || undefined,
                    recurrenceType: fileDetails.recurrenceType,
                    recurrence: fileDetails.recurrence,
                    duration: fileDetails.duration,
                };

                 if (newFile.mimeType.startsWith('image/')) {
                    newFile.annotationData = '[]';
                    newFile.originalDataUrl = dataUrl;
                }

                return newFile;
            })
        );
      
        await onSave(newFiles);
        handleClose();
    } catch (error) {
        console.error("Error processing files:", error);
        addToast('שגיאה בעיבוד הקבצים', 'error');
    } finally {
        setIsProcessing(false);
    }
  };

  const handleScannerSave = async (pages: DocumentPage[], fileName: string) => {
    addToast('יוצר קובץ PDF...', 'info');
    try {
        const imageB64s = pages.map(p => p.editedDataUrl);
        const pdfDataUrl = await generatePdfFromImages(imageB64s, fileName, settings);
        const finalFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
        const pdfFile = await dataUrlToFile(pdfDataUrl, finalFileName);

        setFilesToUpload([pdfFile]);
        setFileDetails(prev => ({...prev, name: undefined })); // Name is from file now
        
        setIsScannerOpen(false);
        addToast('המסמך הסרוק מוכן להעלאה', 'success');
    } catch (error) {
        addToast('שגיאה בשמירת המסמך הסרוק', 'error');
    }
  };

  const handleClose = () => {
    onClose();
  };
  
  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="הוספת קבצים חדשים" size="lg">
        <div className="space-y-4">
          <div>
            <label className="label-class">שלב 1: בחר קבצים או סרוק מסמך</label>
            <div className="flex gap-2">
                <label className="flex-grow cursor-pointer w-full text-sm text-slate-500 file:mr-4 file:rtl:ml-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 border border-slate-300 rounded-lg flex items-center justify-center p-2">
                    <span>בחר קבצים...</span>
                    <input type="file" onChange={handleFileChange} className="hidden" multiple/>
                </label>
                <button type="button" onClick={() => setIsScannerOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200">
                    <DocumentScannerIcon className="w-5 h-5" />סרוק
                </button>
            </div>
            {filesToUpload.length > 0 && (
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto border p-2 rounded-md">
                    {filesToUpload.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="text-xs flex justify-between items-center bg-slate-100 p-1.5 rounded">
                            <span>{file.name}</span>
                            <button onClick={() => removeFileFromList(file.name)} className="text-red-500">&times;</button>
                        </div>
                    ))}
                </div>
            )}
          </div>
          {filesToUpload.length > 0 && (
            <div className="space-y-4 animate-fadeIn">
                <p className="text-sm text-slate-600">שלב 2: הגדר פרטים (יחול על כל {filesToUpload.length} הקבצים)</p>
                <div>
                    <label htmlFor="file-modal-group" className="label-class">קבוצה (אופציונלי)</label>
                    <input id="file-modal-group" name="file-modal-group" type="text" value={fileDetails.group || ''} onChange={e => setFileDetails(prev => ({...prev, group: e.target.value}))} className="input-class w-full"/>
                </div>
                {!hideDateFields && (
                    <RecurrenceEditor
                        type="file"
                        details={fileDetails}
                        onUpdate={handleRecurrenceUpdate}
                    />
                )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={handleClose} className="btn-secondary" disabled={isProcessing}>ביטול</button>
            <button type="button" onClick={handleSave} className="btn-primary" disabled={isProcessing || filesToUpload.length === 0}>
              {isProcessing ? <LoadingSpinner size="sm"/> : `שמור ${filesToUpload.length} קבצים`}
            </button>
          </div>
           <style>{`.label-class { display: block; margin-bottom: 0.25rem; font-size: 0.875rem; font-weight: 500; color: #334155; } .input-class { display: block; width: 100%; border: 1px solid #cbd5e1; border-radius: 0.375rem; padding: 0.5rem 0.75rem; } .btn-primary { padding: 0.5rem 1rem; background-color: #0284c7; color: white; border-radius: 0.375rem; font-weight: 500; } .btn-primary:hover:not(:disabled) { background-color: #0369a1; } .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; } .btn-secondary { padding: 0.5rem 1rem; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 0.375rem; font-weight: 500; } .btn-secondary:hover:not(:disabled) { background-color: #e2e8f0; } .animate-fadeIn { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; }}`}</style>
        </div>
      </Modal>
      {isScannerOpen && <DocumentScanner isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onSave={handleScannerSave}/>}
    </>
  );
};

export default AddFileModal;