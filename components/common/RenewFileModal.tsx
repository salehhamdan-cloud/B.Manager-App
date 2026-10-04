import React, { useState, useEffect } from 'react';
import { ProjectFile } from '../../types';
import Modal from './Modal';
import { useToast } from '../../contexts/ToastContext';
import LoadingSpinner from './LoadingSpinner';

interface RenewFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (originalFile: ProjectFile, newFile: File, newDueDate?: string) => Promise<void>;
  file: ProjectFile | null;
}

const RenewFileModal: React.FC<RenewFileModalProps> = ({ isOpen, onClose, onSave, file }) => {
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setNewFile(null);
      setNewDueDate('');
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        setNewFile(selectedFile);
    }
  };

  const handleSave = async () => {
    if (!file) return;
    if (!newFile) {
      addToast('יש לבחור קובץ חדש.', 'warning');
      return;
    }
    setIsProcessing(true);
    await onSave(file, newFile, newDueDate || undefined);
    setIsProcessing(false);
  };

  if (!isOpen || !file) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`חידוש קובץ: ${file.name}`}>
      <div className="space-y-4">
        <div>
          <label htmlFor="new-file-upload" className="label-class">שלב 1: העלה את הקובץ המעודכן</label>
          <input
            id="new-file-upload"
            type="file"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 border border-slate-300 rounded-lg"
          />
          {newFile && <p className="text-xs text-slate-500 mt-1">נבחר: {newFile.name}</p>}
        </div>

        <div>
            <label htmlFor="new-due-date" className="label-class">שלב 2: הגדר תאריך תפוגה חדש (אופציונלי)</label>
            <input
                id="new-due-date"
                type="date"
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
                className="input-class w-full mt-1"
            />
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={isProcessing}>ביטול</button>
          <button type="button" onClick={handleSave} className="btn-primary" disabled={isProcessing || !newFile}>
            {isProcessing ? <LoadingSpinner size="sm" /> : 'שמור חידוש'}
          </button>
        </div>
      </div>
      <style>{`
        .label-class { display: block; margin-bottom: 0.25rem; font-size: 0.875rem; font-weight: 500; color: #334155; }
        .input-class { display: block; width: 100%; border: 1px solid #cbd5e1; border-radius: 0.375rem; padding: 0.5rem 0.75rem; }
        .btn-primary { padding: 0.5rem 1rem; background-color: #0284c7; color: white; border-radius: 0.375rem; font-weight: 500; }
        .btn-primary:hover:not(:disabled) { background-color: #0369a1; }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-secondary { padding: 0.5rem 1rem; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 0.375rem; font-weight: 500; }
        .btn-secondary:hover:not(:disabled) { background-color: #e2e8f0; }
      `}</style>
    </Modal>
  );
};

export default RenewFileModal;
