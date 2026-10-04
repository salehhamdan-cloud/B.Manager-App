import React, { useState, useEffect } from 'react';
import { ProjectTodo, Project } from '../../types';
import Modal from './Modal';
import { useToast } from '../../contexts/ToastContext';
import { generateId } from '../../utils/idGenerator';
import RecurrenceEditor from './RecurrenceEditor';

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (todo: ProjectTodo) => Promise<void>;
  groupSuggestions?: string[];
  projects?: Project[];
}

const AddTodoModal: React.FC<AddTodoModalProps> = ({ isOpen, onClose, onSave, groupSuggestions = [], projects = [] }) => {
  const [details, setDetails] = useState<Partial<ProjectTodo>>({});
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
        setDetails({
            description: '',
            group: '',
            projectId: projects.length === 1 ? projects[0].id : '',
            startDate: new Date().toISOString(),
            recurrenceType: 'one-time',
            recurrence: { unit: 'weeks', interval: 1 },
            duration: { unit: 'days', value: 7 },
        });
    }
  }, [isOpen, projects]);

  const handleUpdate = (updates: Partial<ProjectTodo>) => {
    setDetails(prev => ({...prev, ...updates}));
  };

  const handleSave = async () => {
    if (!details.description?.trim()) {
      addToast('תיאור המשימה הוא שדה חובה', 'warning');
      return;
    }
    if (projects.length > 1 && !details.projectId) {
      addToast('יש לבחור בניין', 'warning');
      return;
    }

    const newTodo: ProjectTodo = {
      id: generateId(),
      description: details.description.trim(),
      group: details.group?.trim() || undefined,
      startDate: details.startDate,
      dueDate: details.dueDate,
      recurrenceType: details.recurrenceType,
      recurrence: details.recurrence,
      duration: details.duration,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      projectId: details.projectId,
    };
    await onSave(newTodo);
    onClose();
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="הוספת משימה חדשה">
      <div className="space-y-4">
        <datalist id="todo-groups-datalist-modal">
            {groupSuggestions.map(g => <option key={g} value={g} />)}
        </datalist>

        {projects.length > 1 && (
             <div>
                <label className="label-class">בניין</label>
                <select value={details.projectId} onChange={e => handleUpdate({ projectId: e.target.value })} className="input-class w-full">
                    <option value="" disabled>בחר בניין...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
        )}

        <div>
          <label htmlFor="todo-desc" className="label-class">תיאור המשימה</label>
          <textarea
            id="todo-desc"
            value={details.description}
            onChange={e => handleUpdate({ description: e.target.value })}
            rows={3}
            className="input-class w-full"
            required
          />
        </div>
        <div>
          <label htmlFor="todo-group" className="label-class">קבוצה (אופציונלי)</label>
          <input
            id="todo-group"
            type="text"
            value={details.group}
            onChange={e => handleUpdate({ group: e.target.value })}
            className="input-class w-full"
            list="todo-groups-datalist-modal"
          />
        </div>
        
        <RecurrenceEditor
            type="todo"
            details={details}
            onUpdate={handleUpdate}
        />
        
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">ביטול</button>
          <button type="button" onClick={handleSave} className="btn-primary">שמור משימה</button>
        </div>
         <style>{`.label-class { display: block; margin-bottom: 0.25rem; font-size: 0.875rem; font-weight: 500; color: #334155; } .input-class { display: block; width: 100%; border: 1px solid #cbd5e1; border-radius: 0.375rem; padding: 0.5rem 0.75rem; } .btn-primary { padding: 0.5rem 1rem; background-color: #0284c7; color: white; border-radius: 0.375rem; font-weight: 500; } .btn-primary:hover { background-color: #0369a1; } .btn-secondary { padding: 0.5rem 1rem; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 0.375rem; font-weight: 500; } .btn-secondary:hover { background-color: #e2e8f0; }`}</style>
      </div>
    </Modal>
  );
};

export default AddTodoModal;