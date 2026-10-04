
import React, { useState, useEffect } from 'react';
import { ProjectTodo } from '../../types';
import Modal from './Modal';
import RecurrenceEditor from './RecurrenceEditor';

interface EditTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (todo: ProjectTodo) => void;
  todo: ProjectTodo | null;
}

const EditTodoModal: React.FC<EditTodoModalProps> = ({ isOpen, onClose, onSave, todo }) => {
  const [editedTodo, setEditedTodo] = useState<Partial<ProjectTodo> | null>(null);

  useEffect(() => { if (todo) setEditedTodo({ ...todo }); }, [todo]);

  const handleUpdate = (updates: Partial<ProjectTodo>) => {
    setEditedTodo(prev => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
  };

  const handleSave = () => {
    if (editedTodo?.description?.trim()) {
      onSave(editedTodo as ProjectTodo);
      onClose();
    }
  };

  if (!isOpen || !todo || !editedTodo) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="עריכת משימה">
      <div className="space-y-4">
        <div>
          <label className="label-class">תיאור המשימה</label>
          <textarea value={editedTodo.description || ''} onChange={e => handleUpdate({ description: e.target.value })} rows={3} className="input-class" required />
        </div>
        <div>
          <label className="label-class">קבוצה</label>
          <input type="text" value={editedTodo.group || ''} onChange={e => handleUpdate({ group: e.target.value })} className="input-class" />
        </div>
        
        <RecurrenceEditor
            type="todo"
            details={editedTodo}
            onUpdate={handleUpdate}
        />

        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">ביטול</button>
          <button type="button" onClick={handleSave} className="btn-primary">שמור</button>
        </div>
      </div>
      <style>{`.label-class { display: block; margin-bottom: 0.25rem; font-size: 0.875rem; font-weight: 500; color: #334155; } .input-class { display: block; width: 100%; border: 1px solid #cbd5e1; border-radius: 0.375rem; padding: 0.5rem 0.75rem; } .btn-primary { padding: 0.5rem 1rem; background-color: #0284c7; color: white; border-radius: 0.375rem; font-weight: 500; } .btn-primary:hover { background-color: #0369a1; } .btn-secondary { padding: 0.5rem 1rem; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 0.375rem; font-weight: 500; } .btn-secondary:hover { background-color: #e2e8f0; }`}</style>
    </Modal>
  );
};

export default EditTodoModal;
