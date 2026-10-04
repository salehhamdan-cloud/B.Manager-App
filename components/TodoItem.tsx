import React from 'react';
import { ProjectTodo } from '../types';
import { formatDate } from '../utils/dateFormatter';
import { TrashIcon, PencilIcon, ChevronUpIcon, ChevronDownIcon } from './icons/ActionIcons';

interface TodoItemProps {
  todo: ProjectTodo;
  onToggle: (todoId: string) => void;
  onDelete?: (todoId: string) => void;
  onEdit?: (todoId: string) => void;
  onMove?: (todoId: string, direction: 'up' | 'down') => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const getTodoStatus = (todo: ProjectTodo) => {
    if (todo.isCompleted) {
        return { text: 'הושלם', color: 'text-blue-800', bg: 'bg-blue-100' };
    }
    if (!todo.dueDate) {
        return { text: 'אין תאריך יעד', color: 'text-slate-500', bg: 'bg-slate-100' };
    }
    const dueDate = new Date(todo.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { text: 'פג תוקף', color: 'text-red-800', bg: 'bg-red-100' };
    }
    if (diffDays <= 7) {
        return { text: `פג בעוד ${diffDays} ימים`, color: 'text-amber-800', bg: 'bg-amber-100' };
    }
    return { text: 'בתוקף', color: 'text-green-800', bg: 'bg-green-100' };
};

const TodoItem: React.FC<TodoItemProps> = ({ todo, onToggle, onDelete, onEdit, onMove, isFirst, isLast }) => {
    const status = getTodoStatus(todo);
    return (
        <div className={`group bg-white shadow-2xs rounded-xl p-3.5 flex items-start gap-3.5 border border-slate-200/80 hover:border-slate-300 transition-all ${todo.isCompleted ? 'bg-slate-50/60 opacity-65' : ''}`}>
            <input
                type="checkbox"
                checked={todo.isCompleted}
                onChange={() => onToggle(todo.id)}
                className="w-5 h-5 text-sky-600 rounded-md border-slate-300 focus:ring-sky-500 cursor-pointer flex-shrink-0 mt-0.5"
                aria-label={`סמן משימה כ${todo.isCompleted ? 'לא הושלמה' : 'הושלמה'}`}
            />
            <div className="flex-grow min-w-0">
                <p className={`font-semibold text-sm sm:text-base text-slate-900 leading-snug ${todo.isCompleted ? 'line-through text-slate-500' : ''}`} title={todo.description}>
                    {todo.description}
                </p>
                <div className="flex items-center gap-2 text-xs flex-wrap mt-1.5 text-slate-500">
                    <span className={`inline-flex items-center gap-1 font-semibold ${status.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.bg.replace('bg-', 'bg-current ')}`} />
                        {status.text}
                    </span>
                    {todo.group && (
                        <>
                            <span aria-hidden="true">&bull;</span>
                            <span className="font-medium text-slate-600">{todo.group}</span>
                        </>
                    )}
                    {todo.dueDate && (
                        <>
                            <span aria-hidden="true">&bull;</span>
                            <span className="font-mono-numbers">{formatDate(todo.dueDate)}</span>
                        </>
                    )}
                </div>
            </div>
            <div className="flex items-center flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                {onMove && (
                    <div className="flex items-center">
                        <button onClick={() => onMove(todo.id, 'up')} disabled={isFirst} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors" aria-label="הזז למעלה">
                            <ChevronUpIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => onMove(todo.id, 'down')} disabled={isLast} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors" aria-label="הזז למטה">
                            <ChevronDownIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
                {onEdit && (
                    <button
                        onClick={() => onEdit(todo.id)}
                        className="p-1.5 text-slate-400 hover:text-sky-700 rounded-lg hover:bg-sky-50 transition-colors"
                        title="ערוך משימה"
                        aria-label="ערוך משימה"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                )}
                {onDelete && (
                    <button
                        onClick={() => onDelete(todo.id)}
                        className="p-1.5 text-slate-400 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                        title="מחק משימה"
                        aria-label="מחק משימה"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default TodoItem;