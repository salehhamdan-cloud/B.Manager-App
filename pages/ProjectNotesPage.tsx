import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Project, ProjectNote } from '../types';
import * as dbService from '../services/dbService';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PlusIcon, TrashIcon, ArrowDownTrayIcon } from '../components/icons/ActionIcons';
import { generateId } from '../utils/idGenerator';
import { formatDateTime } from '../utils/dateFormatter';
import { generateProjectNotesPdf } from '../services/pdfService';
import { exportToCsv } from '../utils/exportUtils';

const ProjectNotesPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const { settings } = useSettings();
    
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [newNoteContent, setNewNoteContent] = useState('');

    const fetchData = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        try {
            const data = await dbService.getProject(projectId);
            if (data) {
                setProject(data);
            } else {
                addToast('בניין לא נמצא', 'error');
                navigate('/');
            }
        } catch (error) {
            addToast('שגיאה בטעינת הערות', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, addToast, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddNote = async () => {
        if (!newNoteContent.trim() || !project) return;

        const newNote: ProjectNote = {
            id: generateId(),
            content: newNoteContent.trim(),
            author: settings.authorName,
            createdAt: new Date().toISOString()
        };

        const updatedProject: Project = {
            ...project,
            notes: [...(project.notes || []), newNote],
            updatedAt: new Date().toISOString()
        };

        try {
            await dbService.updateProject(updatedProject);
            addToast('הערה נוספה בהצלחה', 'success');
            setNewNoteContent('');
            fetchData();
        } catch (error) {
            addToast('שגיאה בשמירת ההערה', 'error');
        }
    };
    
    const handleDeleteNote = async (noteId: string) => {
        if (!project || !window.confirm("האם למחוק הערה זו?")) return;
        
        const updatedProject: Project = {
            ...project,
            notes: (project.notes || []).filter(note => note.id !== noteId),
            updatedAt: new Date().toISOString()
        };

        try {
            await dbService.updateProject(updatedProject);
            addToast('ההערה נמחקה', 'success');
            fetchData();
        } catch (error) {
            addToast('שגיאה במחיקת ההערה', 'error');
        }
    };

    const notes = project?.notes?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];

    const handleExportPdf = () => {
        if (!project || notes.length === 0) {
            addToast('אין הערות לייצוא', 'warning');
            return;
        }
        addToast('מכין PDF...', 'info');
        generateProjectNotesPdf({ settings, project, notes });
    };

    const handleExportCsv = () => {
        if (notes.length === 0) {
            addToast('אין הערות לייצוא', 'warning');
            return;
        }
        const dataToExport = notes.map(note => ({
            'תאריך': formatDateTime(note.createdAt),
            'תוכן': note.content,
            'נכתב על ידי': note.author,
        }));
        exportToCsv(dataToExport, `notes_${project?.name}`);
    };

    if (isLoading) return <LoadingSpinner text="טוען הערות..." />;

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
            {/* Header & Controls */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <nav className="text-xs font-medium text-slate-400 mb-1">
                        <Link to={`/project/${projectId}`} className="text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1">
                            <span>←</span> חזרה לבניין {project?.name}
                        </Link>
                    </nav>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">הערות ומידע: {project?.name} ({notes.length})</h1>
                    <p className="text-sm text-slate-500 mt-1">יומן הערות, תזכורות, הנחיות ועדכונים שוטפים</p>
                </div>
                 <div className="flex items-center gap-2">
                    <button onClick={handleExportPdf} className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-2 border border-slate-200/80 shadow-2xs">
                        <ArrowDownTrayIcon className="w-4 h-4"/>PDF
                    </button>
                    <button onClick={handleExportCsv} className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-2 border border-slate-200/80 shadow-2xs">
                        <ArrowDownTrayIcon className="w-4 h-4"/>Excel
                    </button>
                </div>
            </div>
            
            {/* Add Note Card */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200/90 space-y-3">
                <h2 className="text-base font-bold text-slate-800">הוסף הערה חדשה</h2>
                <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    rows={3}
                    placeholder="כתוב כאן מידע כללי, תזכורות, קודי כניסה, עדכונים או הנחיות..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition"
                />
                <div className="flex justify-end">
                    <button
                        onClick={handleAddNote}
                        disabled={!newNoteContent.trim()}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50 transition shadow-xs flex items-center gap-1.5"
                    >
                        <PlusIcon className="w-4 h-4"/>
                        <span>שמור הערה</span>
                    </button>
                </div>
            </div>

            {notes.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl shadow-xs border border-slate-200/90">
                    <p className="text-slate-500 text-sm">לא נמצאו הערות. התחל על ידי הוספת הערה חדשה למעלה.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {notes.map(note => (
                        <div key={note.id} className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 flex items-start gap-3 transition-all duration-200 hover:shadow-md hover:border-sky-300">
                            <div className="flex-grow">
                                <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                <div className="text-xs text-slate-400 mt-3 pt-2.5 border-t border-slate-100 flex justify-between items-center">
                                    <span className="font-medium text-slate-500">{note.author}</span>
                                    <span>{formatDateTime(note.createdAt)}</span>
                                </div>
                            </div>
                            <div className="flex-shrink-0">
                                <button
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                    title="מחק הערה"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProjectNotesPage;