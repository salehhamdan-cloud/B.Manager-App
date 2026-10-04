import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as dbService from '../services/dbService';
import { Project, ProjectTodo } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import TodoItem from '../components/TodoItem';
import { useToast } from '../contexts/ToastContext';
import { PlusIcon, ArrowDownTrayIcon } from '../components/icons/ActionIcons';
import { generateId } from '../utils/idGenerator';
import CollapsibleSection from '../components/common/CollapsibleSection';
import { formatDate, calculateNextStartDate, calculateDueDate } from '../utils/dateFormatter';
import AddTodoModal from '../components/common/AddTodoModal';
import EditTodoModal from '../components/common/EditTodoModal';
import { useSettings } from '../contexts/SettingsContext';
import * as emailService from '../services/emailService';
import { generateProjectTodosPdf } from '../services/pdfService';
import { exportToCsv } from '../utils/exportUtils';
import Modal from '../components/common/Modal';

const ProjectTodosPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();
    const { settings } = useSettings();
    const [isAddTodoModalOpen, setIsAddTodoModalOpen] = useState(false);
    const [editingTodo, setEditingTodo] = useState<ProjectTodo | null>(null);

    const [yearFilter, setYearFilter] = useState('all');
    const [groupFilter, setGroupFilter] = useState('all');
    
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [selectedPdfTodos, setSelectedPdfTodos] = useState<string[]>([]);
    const [pdfModalSelectedGroups, setPdfModalSelectedGroups] = useState<string[]>([]);
    const [pdfModalSelectedYears, setPdfModalSelectedYears] = useState<string[]>([]);

    const fetchData = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        try {
            const projData = await dbService.getProject(projectId);
            setProject(projData);
        } catch (error) {
            addToast('Error fetching project todos', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, addToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleToggleTodoCompletion = async (todoId: string) => {
        if (!project || !project.todos) return;

        const originalProject = JSON.parse(JSON.stringify(project));
        const todoToUpdate = project.todos.find(t => t.id === todoId);
        if (!todoToUpdate) return;
        
        let newTodos: ProjectTodo[];
        if (!todoToUpdate.isCompleted) {
            const updatedTodo = { ...todoToUpdate, isCompleted: true };
            newTodos = project.todos.map(t => (t.id === todoId ? updatedTodo : t));
            
            if (project) {
                emailService.triggerTaskCompletionEmail(updatedTodo, project, settings);
            }
            
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
                newTodos.push(newRecurringTodo);
                addToast(`נוצרה משימה חוזרת לתאריך ${formatDate(nextStartDate)}`, 'info');
            }
        } else {
            newTodos = project.todos.map(t => (t.id === todoId ? { ...t, isCompleted: false } : t));
        }

        const projectToUpdate = { ...project, todos: newTodos, updatedAt: new Date().toISOString() };
        setProject(projectToUpdate); // Optimistic update

        try {
            await dbService.updateProject(projectToUpdate);
            addToast(!todoToUpdate.isCompleted ? 'המשימה הושלמה' : 'המשימה הוחזרה לביצוע', 'success');
        } catch (error) {
            addToast('שגיאה בעדכון המשימה', 'error');
            setProject(originalProject); // Revert
        }
    };

    const handleAddTodo = async (newTodo: ProjectTodo) => {
        if (!project) return;
        const projectToUpdate: Project = {
            ...project,
            todos: [...(project.todos || []), { ...newTodo, projectId: undefined }], // Remove temp projectId before saving
            updatedAt: new Date().toISOString(),
        };
        try {
            await dbService.updateProject(projectToUpdate);
            addToast('המשימה נוספה בהצלחה', 'success');
            fetchData(); // Refresh data
        } catch (error) {
            addToast('שגיאה בהוספת משימה', 'error');
        }
    };
    
    const handleDeleteTodo = async (todoId: string) => {
        if (!project) return;
        if (window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
            try {
                await dbService.deleteProjectTodo(projectId!, todoId);
                addToast('המשימה נמחקה', 'success');
                fetchData(); // Refresh list
            } catch (error) {
                addToast('שגיאה במחיקת המשימה', 'error');
            }
        }
    };
    
    const handleSaveTodoEdit = async (updatedTodo: ProjectTodo) => {
        if (!project) return;
        const projectToUpdate: Project = {
            ...project,
            todos: project.todos?.map(t => t.id === updatedTodo.id ? updatedTodo : t),
            updatedAt: new Date().toISOString(),
        };
        try {
            await dbService.updateProject(projectToUpdate);
            addToast('המשימה עודכנה בהצלחה', 'success');
            fetchData();
        } catch(error) {
            addToast('שגיאה בעדכון המשימה', 'error');
        }
    };

    const handleEditTodo = (todoId: string) => {
        const todoToEdit = project?.todos?.find(t => t.id === todoId);
        if (todoToEdit) {
            setEditingTodo(todoToEdit);
        }
    };
    
    const handleMoveTodo = async (todoId: string, direction: 'up' | 'down') => {
        if (!project || !project.todos) return;

        const todos = [...project.todos];
        const currentIndex = todos.findIndex(t => t.id === todoId);
        if (currentIndex === -1) return;

        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= todos.length) return;

        [todos[currentIndex], todos[newIndex]] = [todos[newIndex], todos[currentIndex]]; // Swap

        const updatedProject = { ...project, todos, updatedAt: new Date().toISOString() };
        
        setProject(updatedProject); // Optimistic UI update

        try {
            await dbService.updateProject(updatedProject);
        } catch (error) {
            addToast('שגיאה בסידור המשימות', 'error');
            fetchData(); // Revert on failure
        }
    };
    
    const getTodoStatusText = (todo: ProjectTodo) => {
        if (todo.isCompleted) return 'הושלם';
        if (!todo.dueDate) return 'אין תאריך יעד';
        const dueDate = new Date(todo.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dueDate < today) return 'פג תוקף';
        return 'בתהליך';
    };

    const handleExportCsv = () => {
        if (!project || !project.todos || project.todos.length === 0) {
            addToast('אין משימות לייצוא', 'warning');
            return;
        }
        const dataToExport = (project.todos || []).map(t => ({
            'תיאור': t.description,
            'תאריך התחלה': t.startDate ? formatDate(t.startDate) : '-',
            'תאריך יעד': t.dueDate ? formatDate(t.dueDate) : '-',
            'סטטוס': getTodoStatusText(t),
            'קבוצה': t.group || '-',
        }));
        exportToCsv(dataToExport, `todos_${project.name}`);
    };

    const { uniqueYears, uniqueGroups } = useMemo(() => {
        if (!project?.todos) return { uniqueYears: [], uniqueGroups: [] };
        const years = new Set(project.todos.map(t => new Date(t.startDate || t.createdAt).getFullYear().toString()));
        const groups = new Set(project.todos.map(t => t.group).filter(Boolean) as string[]);
        return {
            uniqueYears: Array.from(years).sort((a: string, b: string) => b.localeCompare(a)),
            uniqueGroups: Array.from(groups).sort((a: string, b: string) => a.localeCompare(b,'he')),
        };
    }, [project?.todos]);

    const uniqueGroupsForModal = useMemo(() => {
        if (!project?.todos) return [];
        const groups = new Set<string>();
        project.todos.forEach(t => {
            groups.add(t.group || '__none__');
        });
        const groupArray = Array.from(groups);
        return groupArray.sort((a, b) => {
            if (a === '__none__') return 1;
            if (b === '__none__') return -1;
            return a.localeCompare(b, 'he');
        });
    }, [project?.todos]);

    const filteredTodos = useMemo(() => {
        if (!project?.todos) return [];
        return project.todos.filter(todo => {
            const todoYear = new Date(todo.startDate || todo.createdAt).getFullYear().toString();
            const yearMatch = yearFilter === 'all' || todoYear === yearFilter;
            const groupMatch = (groupFilter === 'all' || groupFilter === '')
                ? true
                : (groupFilter === '__none__' ? !todo.group : todo.group === groupFilter);
            return yearMatch && groupMatch;
        });
    }, [project?.todos, yearFilter, groupFilter]);
    
    const { pendingTodoGroups, completedTodoGroups, pendingTodosCount, completedTodosCount } = useMemo(() => {
        const groupTodos = (todoList: ProjectTodo[]): Record<string, ProjectTodo[]> => {
          return todoList.reduce((acc, todo) => {
            const groupName = todo.group?.trim() || 'כללי';
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(todo);
            return acc;
          }, {} as Record<string, ProjectTodo[]>);
        };
        const pending = filteredTodos.filter(t => !t.isCompleted);
        const completed = filteredTodos.filter(t => t.isCompleted).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return {
          pendingTodoGroups: groupTodos(pending), completedTodoGroups: groupTodos(completed),
          pendingTodosCount: pending.length, completedTodosCount: completed.length
        };
      }, [filteredTodos]);

      const projectTodoGroupSuggestions = useMemo(() => {
        const groups = project?.todos?.map(t => t.group).filter(Boolean) as string[];
        return [...new Set(groups)];
      }, [project?.todos]);

    const todosForPdfModal = useMemo(() => {
        return filteredTodos.filter(todo => {
            const todoYear = new Date(todo.startDate || todo.createdAt).getFullYear().toString();
            const yearMatch = pdfModalSelectedYears.length === 0 || pdfModalSelectedYears.includes(todoYear);
            const groupName = todo.group || '__none__';
            const groupMatch = pdfModalSelectedGroups.length === 0 || pdfModalSelectedGroups.includes(groupName);
            return yearMatch && groupMatch;
        });
    }, [filteredTodos, pdfModalSelectedGroups, pdfModalSelectedYears]);
    
    useEffect(() => {
        if (isPdfModalOpen) {
            setSelectedPdfTodos(todosForPdfModal.map(t => t.id));
        }
    }, [todosForPdfModal, isPdfModalOpen]);
    
    const handleOpenPdfModal = () => {
        if (filteredTodos.length === 0) {
            addToast('אין משימות לייצוא', 'warning');
            return;
        }
        setPdfModalSelectedGroups(uniqueGroupsForModal);
        setPdfModalSelectedYears(uniqueYears);
        setIsPdfModalOpen(true);
    };
    
    const handleGeneratePdf = () => {
        if (!project || selectedPdfTodos.length === 0) {
            addToast('יש לבחור לפחות משימה אחת לייצוא', 'warning');
            return;
        }
        const todosToExport = project.todos.filter(todo => selectedPdfTodos.includes(todo.id));
        addToast('מכין PDF...', 'info');
        generateProjectTodosPdf({ settings, project, todos: todosToExport });
        setIsPdfModalOpen(false);
    };

    const handleSelectAllVisibleTodos = () => {
        const visibleIds = todosForPdfModal.map(t => t.id);
        const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedPdfTodos.includes(id));

        if (allVisibleSelected) {
            setSelectedPdfTodos(prev => prev.filter(id => !visibleIds.includes(id)));
        } else {
            setSelectedPdfTodos(prev => [...new Set([...prev, ...visibleIds])]);
        }
    };
    
    const handlePdfGroupSelectionChange = (group: string) => {
        setPdfModalSelectedGroups(prev => 
            prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
        );
    };

    const handlePdfYearSelectionChange = (year: string) => {
        setPdfModalSelectedYears(prev =>
            prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
        );
    };

    const toggleAllGroups = () => {
        if (pdfModalSelectedGroups.length === uniqueGroupsForModal.length) {
            setPdfModalSelectedGroups([]);
        } else {
            setPdfModalSelectedGroups(uniqueGroupsForModal);
        }
    };

    const toggleAllYears = () => {
        if (pdfModalSelectedYears.length === uniqueYears.length) {
            setPdfModalSelectedYears([]);
        } else {
            setPdfModalSelectedYears(uniqueYears);
        }
    };


    if (isLoading) return <LoadingSpinner text="טוען משימות..." />;

    return (
        <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
            {/* Header & Controls */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div>
                    <nav className="text-xs font-medium text-slate-400 mb-1">
                        <Link to={`/project/${projectId}`} className="text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1">
                            <span>←</span> חזרה לבניין {project?.name}
                        </Link>
                    </nav>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">משימות עבור: {project?.name}</h2>
                    <p className="text-sm text-slate-500 mt-1">ניהול משימות תחזוקה, בדיקות תקופתיות ומעקב ביצוע</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handleOpenPdfModal} className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-2 border border-slate-200/80 shadow-2xs">
                        <ArrowDownTrayIcon className="w-4 h-4"/>יצא PDF
                    </button>
                    <button onClick={handleExportCsv} className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-2 border border-slate-200/80 shadow-2xs">
                        <ArrowDownTrayIcon className="w-4 h-4"/>יצא Excel
                    </button>
                    <button onClick={() => setIsAddTodoModalOpen(true)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition flex items-center gap-1.5">
                        <PlusIcon className="w-4 h-4" /> <span>הוסף משימה</span>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[160px]">
                    <label htmlFor="groupFilter" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">סנן לפי קבוצה:</label>
                    <select id="groupFilter" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition">
                        <option value="all">כל הקבוצות</option>
                        <option value="__none__">ללא קבוצה</option>
                        {uniqueGroups.map(group => <option key={group} value={group}>{group}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[160px]">
                    <label htmlFor="yearFilter" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">סנן לפי שנה:</label>
                    <select id="yearFilter" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition">
                        <option value="all">כל השנים</option>
                        {uniqueYears.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                </div>
            </div>

            {project?.todos && project.todos.length > 0 ? (
                <div className="space-y-6">
                    {pendingTodosCount > 0 && (
                        <CollapsibleSection title="משימות לביצוע" count={pendingTodosCount}>
                            <div className="space-y-4">
                                {Object.keys(pendingTodoGroups).sort().map(groupName => (
                                    <CollapsibleSection
                                        key={groupName}
                                        title={<h4 className="text-base font-bold text-slate-800">{groupName}</h4>}
                                        count={pendingTodoGroups[groupName].length}
                                        defaultOpen={true}
                                    >
                                        <div className="space-y-2">
                                            {pendingTodoGroups[groupName].map((todo, index) => 
                                                <TodoItem 
                                                    key={todo.id} 
                                                    todo={todo} 
                                                    onToggle={handleToggleTodoCompletion} 
                                                    onDelete={() => handleDeleteTodo(todo.id)} 
                                                    onEdit={() => handleEditTodo(todo.id)} 
                                                    onMove={handleMoveTodo}
                                                    isFirst={index === 0}
                                                    isLast={index === pendingTodoGroups[groupName].length - 1}
                                                />
                                            )}
                                        </div>
                                    </CollapsibleSection>
                                ))}
                            </div>
                        </CollapsibleSection>
                    )}
                    {completedTodosCount > 0 && (
                        <CollapsibleSection title="משימות שהושלמו" count={completedTodosCount} defaultOpen={false}>
                            <div className="space-y-4">
                               {Object.keys(completedTodoGroups).sort().map(groupName => (
                                    <CollapsibleSection
                                        key={groupName}
                                        title={<h4 className="text-base font-bold text-slate-800">{groupName}</h4>}
                                        count={completedTodoGroups[groupName].length}
                                        defaultOpen={true}
                                    >
                                        <div className="space-y-2">
                                            {completedTodoGroups[groupName].map(todo => <TodoItem key={todo.id} todo={todo} onToggle={handleToggleTodoCompletion} onDelete={() => handleDeleteTodo(todo.id)} onEdit={() => handleEditTodo(todo.id)} />)}
                                        </div>
                                    </CollapsibleSection>
                                ))}
                            </div>
                        </CollapsibleSection>
                    )}
                </div>
            ) : (
                 <div className="text-center py-16 bg-white rounded-3xl shadow-xs border border-slate-200/90">
                    <p className="text-slate-500 text-sm">אין משימות בבניין זה.</p>
                </div>
            )}
            <AddTodoModal
                isOpen={isAddTodoModalOpen}
                onClose={() => setIsAddTodoModalOpen(false)}
                onSave={handleAddTodo}
                groupSuggestions={projectTodoGroupSuggestions}
                projects={project ? [project] : []}
            />
            <EditTodoModal
                isOpen={!!editingTodo}
                onClose={() => setEditingTodo(null)}
                todo={editingTodo}
                onSave={handleSaveTodoEdit}
            />
            <Modal isOpen={isPdfModalOpen} onClose={() => setIsPdfModalOpen(false)} title="בחירת משימות להפקת PDF" size="lg">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">סנן לפי שנה:</label>
                                <button onClick={toggleAllYears} className="text-xs text-sky-600 hover:underline">
                                    {pdfModalSelectedYears.length === uniqueYears.length ? 'בטל הכל' : 'בחר הכל'}
                                </button>
                            </div>
                            <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-white">
                                {uniqueYears.map(year => (
                                    <label key={year} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded text-sm text-slate-700">
                                        <input type="checkbox" className="w-4 h-4 text-sky-600 rounded" checked={pdfModalSelectedYears.includes(year)} onChange={() => handlePdfYearSelectionChange(year)} />
                                        {year}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">סנן לפי קבוצה:</label>
                                <button onClick={toggleAllGroups} className="text-xs text-sky-600 hover:underline">
                                    {pdfModalSelectedGroups.length === uniqueGroupsForModal.length ? 'בטל הכל' : 'בחר הכל'}
                                </button>
                            </div>
                            <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-white">
                                {uniqueGroupsForModal.map(group => (
                                    <label key={group} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded text-sm text-slate-700">
                                        <input type="checkbox" className="w-4 h-4 text-sky-600 rounded" checked={pdfModalSelectedGroups.includes(group)} onChange={() => handlePdfGroupSelectionChange(group)} />
                                        {group === '__none__' ? 'ללא קבוצה' : group}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <button onClick={handleSelectAllVisibleTodos} className="text-sm font-semibold text-sky-600 hover:underline">
                        {todosForPdfModal.length > 0 && todosForPdfModal.every(f => selectedPdfTodos.includes(f.id)) ? 'בטל בחירת הכל' : 'בחר הכל'}
                    </button>
                    <div className="max-h-[40vh] overflow-y-auto space-y-2 p-1 border border-slate-200 rounded-xl">
                        {todosForPdfModal.map(todo => (
                            <label key={todo.id} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                                    checked={selectedPdfTodos.includes(todo.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedPdfTodos(prev => [...prev, todo.id]);
                                        } else {
                                            setSelectedPdfTodos(prev => prev.filter(id => id !== todo.id));
                                        }
                                    }}
                                />
                                <div className="flex-grow">
                                    <span className="text-sm font-semibold text-slate-800">{todo.description}</span>
                                    <span className="text-xs text-slate-500 block">{todo.group || 'ללא קבוצה'} / {new Date(todo.startDate || todo.createdAt).getFullYear()}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-slate-100">
                        <button onClick={() => setIsPdfModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition">ביטול</button>
                        <button onClick={handleGeneratePdf} disabled={selectedPdfTodos.length === 0} className="px-5 py-2 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 transition shadow-xs">הפק PDF ({selectedPdfTodos.length})</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ProjectTodosPage;
