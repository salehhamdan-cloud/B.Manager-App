


import React, { useState, useEffect } from 'react';
import { ProjectFile } from '../../types';
import Modal from './Modal';
import RecurrenceEditor from './RecurrenceEditor';

interface EditFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (file: ProjectFile) => void;
  file: ProjectFile | null;
  // FIX: Add optional prop to hide date fields
  hideDateFields?: boolean;
}

const EditFileModal: React.FC<EditFileModalProps> = ({ isOpen, onClose, onSave, file, hideDateFields = false }) => {
  const [editedFile, setEditedFile] = useState<Partial<ProjectFile> | null>(null);

  useEffect(() => {
    if (file) {
      setEditedFile({ ...file });
    }
  }, [file]);

  const handleRecurrenceUpdate = (updates: Partial<ProjectFile>) => {
    setEditedFile(prev => ({ ...prev, ...updates }));
  };
  
  const handleChange = (field: keyof ProjectFile, value: string | undefined) => {
    setEditedFile(prev => {
        if (!prev) return null;
        return { ...prev, [field]: value };
    });
  };

  const handleSave = () => {
    if (editedFile?.name?.trim()) {
      onSave(editedFile as ProjectFile);
      onClose();
    }
  };

  if (!isOpen || !file || !editedFile) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="עריכת פרטי קובץ">
      <div className="space-y-4">
        <div>
          <label className="label-class">שם הקובץ</label>
          <input type="text" value={editedFile.name || ''} onChange={e => handleChange('name', e.target.value)} className="input-class" />
        </div>
        <div>
          <label className="label-class">קבוצה</label>
          <input type="text" value={editedFile.group || ''} onChange={e => handleChange('group', e.target.value)} className="input-class" />
        </div>

        {!hideDateFields && (
          <RecurrenceEditor
              type="file"
              details={editedFile}
              onUpdate={handleRecurrenceUpdate}
          />
        )}
        
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">ביטול</button>
          <button type="button" onClick={handleSave} className="btn-primary">שמור</button>
        </div>
      </div>
      <style>{`.label-class { display: block; margin-bottom: 0.25rem; font-size: 0.875rem; font-weight: 500; color: #334155; } .input-class { display: block; width: 100%; border: 1px solid #cbd5e1; border-radius: 0.375rem; padding: 0.5rem 0.75rem; } .btn-primary { padding: 0.5rem 1rem; background-color: #0284c7; color: white; border-radius: 0.375rem; font-weight: 500; } .btn-primary:hover { background-color: #0369a1; } .btn-secondary { padding: 0.5rem 1rem; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 0.375rem; font-weight: 500; } .btn-secondary:hover { background-color: #e2e8f0; }`}</style>
    </Modal>
  );
};

export default EditFileModal;