import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as dbService from '../services/dbService';
import { Project, TodoWithContext, ProjectTodo } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDate, calculateNextStartDate, calculateDueDate } from '../utils/dateFormatter';
import { useToast } from '../contexts/ToastContext';
import { generateId } from '../utils/idGenerator';
import { PlusIcon, ArrowDownTrayIcon } from '../components/icons/ActionIcons';
import CollapsibleSection from '../components/common/CollapsibleSection';
import EditTodoModal from '../components/common/EditTodoModal';
import AddTodoModal from '../components/common/AddTodoModal';
import { useSettings } from '../contexts/SettingsContext';
import * as emailService from '../services/emailService';
import { generateAllTodosPdf } from '../services/pdfService';
import { exportToCsv } from '../utils/exportUtils';
import TodoItem from '../components/TodoItem';

const ControlButton: React.FC<{ label: string; value: string; currentValue: string; onClick: (value: string) => void }> = ({ label, value, currentValue, onClick }) => (
    <button
        onClick={() => onClick(value)}
        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
            currentValue === value 
            ? 'bg-sky-600 text-white shadow-xs' 
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
    >
        {label}
    </button>
);

const getTodoStatus = (todo: TodoWithContext, notificationDays: number) => {
    if (todo.isCompleted) {
        return { text: 'הושלם', color: 'text-blue-800', bg: 'bg-blue-100', isDueSoon: false };
    }
    if (!todo.dueDate) {
        return { text: 'אין תאריך יעד', color: 'text-slate-500', bg: 'bg-slate-100', isDueSoon: false };
    }
    const dueDate = new Date(todo.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { text: 'פג תוקף', color: 'text-red-800', bg: 'bg-red-100', isDueSoon: false };
    }
    if (diffDays <= notificationDays) {
        const dayText = diffDays === 1 ? 'יום' : 'ימים';
        const dueText = diffDays > 0 ? `בעוד ${diffDays} ${dayText}` : 'היום';
        return { text: `יעד: ${dueText}`, color: 'text-amber-800', bg: 'bg-amber-100', isDueSoon: true };
    }
    return { text: 'בתוקף', color: 'text-green-800', bg: 'bg-green-100', isDueSoon: false };
};

const AllTodosPage: React.FC = () => {
    const [todos, setTodos] = useState<TodoWithContext[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState('dueDate-asc');
    const [groupFilter, setGroupFilter] = useState('');
    const { addToast } = useToast();
    const { settings } = useSettings();
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingTodo, setEditingTodo] = useState<TodoWithContext | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [todosData, projectsData] = await Promise.all([
                dbService.getAllTodos(),
                dbService.getAllProjects()
            ]);
            setTodos(todosData);
            setProjects(projectsData);
        } catch (error) {
            console.error("Error fetching data:", error);
            addToast('שגיאה בטעינת המשימות', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDeleteTodo = async (projectId: string, todoId: string) => {
        const todoToDelete = todos.find(t => t.id === todoId);
        if (!todoToDelete) return;

        if (window.confirm(`האם אתה בטוח שברצונך למחוק את המשימה "${todoToDelete.description}"?`)) {
            try {
                await dbService.deleteProjectTodo(projectId, todoId);
                addToast('המשימה נמחקה בהצלחה', 'success');
                fetchData();
            } catch (error) {
                console.error('Error deleting todo:', error);
                addToast('שגיאה במחיקת המשימה', 'error');
            }
        }
    };

    const handleToggleTodoCompletion = async (todoId: string) => {
        const todoToUpdate = todos.find(t => t.id === todoId);
        if (!todoToUpdate) return;

        const projectToUpdate = await dbService.getProject(todoToUpdate.projectId);
        if (!projectToUpdate || !projectToUpdate.todos) return;
        
        let newTodosForProject: ProjectTodo[];
        let newAllTodos = [...todos];

        if (!todoToUpdate.isCompleted) {
            const updatedTodo = { ...todoToUpdate, isCompleted: true };
            newTodosForProject = projectToUpdate.todos.map(t => t.id === todoId ? updatedTodo : t);
            newAllTodos = todos.map(t => t.id === todoId ? updatedTodo : t);
            
            emailService.triggerTaskCompletionEmail(updatedTodo, projectToUpdate, settings);

            if (updatedTodo.recurrenceType === 'recurring' && updatedTodo.recurrence && updatedTodo.duration) {
                const currentStartDate = updatedTodo.startDate ? new Date(updatedTodo.startDate) : new Date(updatedTodo.createdAt);
                const nextStartDate = calculateNextStartDate(currentStartDate, updatedTodo.recurrence);
                const nextDueDate = calculateDueDate(nextStartDate, updatedTodo.duration);

                const newRecurringTodo: ProjectTodo = {
                    id: generateId(), description: updatedTodo.description, createdAt: new Date().toISOString(),
                    startDate: nextStartDate.toISOString(),
                    dueDate: nextDueDate.toISOString(),
                    recurrenceType: 'recurring',
                    recurrence: updatedTodo.recurrence,
                    duration: updatedTodo.duration,
                    isCompleted: false, group: updatedTodo.group,
                };
                newTodosForProject.push(newRecurringTodo);
                newAllTodos.push({ ...newRecurringTodo, projectId: projectToUpdate.id, projectName: projectToUpdate.name });
                addToast(`נוצרה משימה חוזרת לתאריך ${formatDate(nextStartDate)}`, 'info');
            }
        } else {
             const updatedTodo = { ...todoToUpdate, isCompleted: false };
             newTodosForProject = projectToUpdate.todos.map(t => t.id === todoId ? updatedTodo : t);
             newAllTodos = todos.map(t => t.id === todoId ? updatedTodo : t);
        }
        
        const finalProjectUpdate = { ...projectToUpdate, todos: newTodosForProject, updatedAt: new Date().toISOString() };
        
        setTodos(newAllTodos); // Optimistic update

        try {
            await dbService.updateProject(finalProjectUpdate);
            addToast(!todoToUpdate.isCompleted ? 'המשימה הושלמה' : 'המשימה הוחזרה לביצוע', 'success');
        } catch (error) {
            addToast('שגיאה בעדכון המשימה', 'error');
            setTodos(todos); 
            fetchData(); // Revert
        }
    };

    const handleAddNewTodo = async (newTodo: ProjectTodo) => {
        const projectToUpdate = projects.find(p => p.id === newTodo.projectId);
        if (!projectToUpdate) {
            addToast("Project not found to add todo", 'error');
            return;
        }
        
        const updatedProject = {
            ...projectToUpdate,
            todos: [...(projectToUpdate.todos || []), newTodo],
            updatedAt: new Date().toISOString()
        };
        
        try {
            await dbService.updateProject(updatedProject);
            addToast('משימה חדשה נוספה', 'success');
            fetchData();
        } catch (error) {
            addToast('שגיאה בהוספת המשימה', 'error');
        }
    };
    
    const handleSaveTodoEdit = async (updatedTodo: ProjectTodo) => {
        if (!editingTodo) return;
        try {
            const projectToUpdate = await dbService.getProject(editingTodo.projectId);
            if (!projectToUpdate) {
                throw new Error("Project not found");
            }
            projectToUpdate.todos = projectToUpdate.todos?.map(t => t.id === updatedTodo.id ? updatedTodo : t);
            projectToUpdate.updatedAt = new Date().toISOString();
            await dbService.updateProject(projectToUpdate);
            addToast('המשימה עודכנה בהצלחה', 'success');
            fetchData();
        } catch(error) {
            addToast('שגיאה בעדכון המשימה', 'error');
        } finally {
            setEditingTodo(null);
        }
    };

     const handleEditTodo = (todo: TodoWithContext) => {
        setEditingTodo(todo);
    };

    const uniqueGroups = useMemo(() => {
        const groups = new Set(todos.map(t => t.group).filter(Boolean) as string[]);
        // FIX: Use Array.from to correctly type the array from the Set.
        return Array.from(groups).sort((a, b) => a.localeCompare(b, 'he'));
    }, [todos]);

    const filteredAndSortedTodos = useMemo(() => {
        const filtered = todos.filter(todo => {
            if (!groupFilter) return true;
            if (groupFilter === '__none__') return !todo.group;
            return todo.group === groupFilter;
        });

        const sorted = [...filtered];
        const [key, direction] = sortOrder.split('-');

        sorted.sort((a, b) => {
            let compareResult = 0;
            switch (key) {
                case 'dueDate': {
                    const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                    const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                    compareResult = aDate - bDate;
                    break;
                }
                case 'projectName':
                    compareResult = a.projectName.localeCompare(b.projectName, 'he');
                    break;
                case 'group':
                    const groupA = a.group?.toLowerCase() || '\uFFFF';
                    const groupB = b.group?.toLowerCase() || '\uFFFF';
                    compareResult = groupA.localeCompare(groupB, 'he');
                    break;
                case 'createdAt':
                default:
                    compareResult = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    break;
            }
            if (compareResult === 0) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            return direction === 'desc' ? compareResult * -1 : compareResult;
        });
        return sorted;
    }, [todos, sortOrder, groupFilter]);

    const groupTodos = (list: TodoWithContext[]) => list.reduce((acc, todo) => {
        const key = todo.projectName;
        if (!acc[key]) acc[key] = { projectId: todo.projectId, todos: [] };
        acc[key].todos.push(todo);
        return acc;
    }, {} as Record<string, { projectId: string; todos: TodoWithContext[] }>);
    
    const { pendingTodos, completedTodos, groupedPending, groupedCompleted, sortedPendingKeys, sortedCompletedKeys } = useMemo(() => {
        const pending = filteredAndSortedTodos.filter(t => !t.isCompleted);
        const completed = filteredAndSortedTodos.filter(t => t.isCompleted);
        const groupedPending = groupTodos(pending);
        const groupedCompleted = groupTodos(completed);
        return {
            pendingTodos: pending,
            completedTodos: completed,
            groupedPending,
            groupedCompleted,
            sortedPendingKeys: Object.keys(groupedPending).sort((a, b) => a.localeCompare(b, 'he')),
            sortedCompletedKeys: Object.keys(groupedCompleted).sort((a, b) => a.localeCompare(b, 'he')),
        };
    }, [filteredAndSortedTodos]);

    const handleExportPdf = () => {
        if (filteredAndSortedTodos.length === 0) {
            addToast('אין משימות לייצוא', 'warning');
            return;
        }
        addToast('מכין PDF...', 'info');
        generateAllTodosPdf({ settings, todos: filteredAndSortedTodos });
    };

    const handleExportCsv = () => {
        if (filteredAndSortedTodos.length === 0) {
            addToast('אין משימות לייצוא', 'warning');
            return;
        }
        const dataToExport = filteredAndSortedTodos.map(t => ({
            'בניין': t.projectName,
            'תיאור': t.description,
            'תאריך התחלה': t.startDate ? formatDate(t.startDate) : '-',
            'תאריך יעד': t.dueDate ? formatDate(t.dueDate) : '-',
            'סטטוס': getTodoStatus(t, settings.notificationDays).text,
            'קבוצה': t.group || '-',
        }));
        exportToCsv(dataToExport, 'all_todos_list');
        addToast('קובץ Excel יוצא...', 'success');
    };
    
    if (isLoading) return <LoadingSpinner text="טוען משימות..." />;
    
    const renderTodoItem = (todo: TodoWithContext) => (
        <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={handleToggleTodoCompletion}
            onDelete={() => handleDeleteTodo(todo.projectId, todo.id)}
            onEdit={() => handleEditTodo(todo)}
        />
    );


    return (
        <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
             {/* Header & Controls */}
             <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        כל המשימות
                        <span className="text-xs bg-sky-50 text-sky-800 border border-sky-100 px-2.5 py-0.5 rounded-full font-bold">
                            {todos.length} משימות
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">מעקב משימות תפעוליות, תחזוקה תקופתית ודרישות רישוי</p>
                 </div>
                 <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handleExportPdf} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"><ArrowDownTrayIcon className="w-4 h-4"/>יצא PDF</button>
                    <button onClick={handleExportCsv} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"><ArrowDownTrayIcon className="w-4 h-4"/>יצא Excel</button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn-primary text-xs font-bold py-2.5 px-4 shadow-sm flex items-center gap-1.5"
                    >
                        <PlusIcon className="w-4 h-4" />
                        הוסף משימה
                    </button>
                 </div>
            </div>

             <div className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/90 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">סנן לפי קבוצה:</label>
                    <div className="flex flex-wrap gap-1.5">
                        <ControlButton label="הכל" value="" currentValue={groupFilter} onClick={setGroupFilter} />
                        <ControlButton label="ללא קבוצה" value="__none__" currentValue={groupFilter} onClick={setGroupFilter} />
                        {uniqueGroups.map(group => <ControlButton key={group} label={group} value={group} currentValue={groupFilter} onClick={setGroupFilter} />)}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">מיין לפי:</label>
                    <div className="flex flex-wrap gap-1.5">
                        <ControlButton label="תאריך יעד (הקרוב ביותר)" value="dueDate-asc" currentValue={sortOrder} onClick={setSortOrder} />
                        <ControlButton label="נוצר לאחרונה" value="createdAt-desc" currentValue={sortOrder} onClick={setSortOrder} />
                        <ControlButton label="בניין (א-ת)" value="projectName-asc" currentValue={sortOrder} onClick={setSortOrder} />
                        <ControlButton label="קבוצה (א-ת)" value="group-asc" currentValue={sortOrder} onClick={setSortOrder} />
                    </div>
                </div>
            </div>

            {todos.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl shadow-xs border border-slate-200/90 p-8">
                    <h3 className="text-base font-bold text-slate-800">אין משימות להצגה</h3>
                    <p className="text-slate-500 text-xs mt-1">{groupFilter ? "אין משימות התואמות לסינון שנבחר." : "עדיין לא נוספו משימות לאף בניין."}</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {pendingTodos.length > 0 && (
                        <CollapsibleSection
                            title={<h3 className="text-lg font-bold text-slate-800">משימות לביצוע</h3>}
                            count={pendingTodos.length}
                        >
                            <div className="space-y-4">
                                {sortedPendingKeys.map(projectName => {
                                    const group = groupedPending[projectName];
                                    return (
                                        <CollapsibleSection
                                            key={projectName}
                                            title={<h4 className="text-sm font-bold text-slate-800">{projectName}</h4>}
                                            count={group.todos.length}
                                            defaultOpen={true}
                                        >
                                            <div className="space-y-2.5">
                                                {group.todos.map(renderTodoItem)}
                                            </div>
                                        </CollapsibleSection>
                                    )
                                })}
                            </div>
                        </CollapsibleSection>
                    )}
                    {completedTodos.length > 0 && (
                         <CollapsibleSection
                            title={<h3 className="text-lg font-bold text-slate-800">משימות שהושלמו</h3>}
                            count={completedTodos.length}
                            defaultOpen={false}
                        >
                             <div className="space-y-4">
                                {sortedCompletedKeys.map(projectName => {
                                    const group = groupedCompleted[projectName];
                                    return (
                                        <CollapsibleSection
                                            key={projectName}
                                            title={<h4 className="text-sm font-bold text-slate-800">{projectName}</h4>}
                                            count={group.todos.length}
                                            defaultOpen={true}
                                        >
                                            <div className="space-y-2.5">
                                                {group.todos.map(renderTodoItem)}
                                            </div>
                                        </CollapsibleSection>
                                    )
                                })}
                            </div>
                        </CollapsibleSection>
                    )}
                </div>
            )}
            <AddTodoModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                projects={projects}
                onSave={handleAddNewTodo}
            />
             <EditTodoModal isOpen={!!editingTodo} onClose={() => setEditingTodo(null)} todo={editingTodo} onSave={handleSaveTodoEdit} />
        </div>
    );
};
export default AllTodosPage;
