import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Project, InventoryItem } from '../types';
import * as dbService from '../services/dbService';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ArrowDownTrayIcon } from '../components/icons/ActionIcons';
import { ExclamationTriangleIcon, CheckCircleIcon } from '../components/icons/FeedbackIcons';
import { formatDate } from '../utils/dateFormatter';
import { useSettings } from '../contexts/SettingsContext';
import { generateElectricalToolsPdf } from '../services/pdfService';

const ProjectElectricalToolsPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const { settings } = useSettings();
    
    const [project, setProject] = useState<Project | null>(null);
    const [electricalTools, setElectricalTools] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        try {
            const data = await dbService.getProject(projectId);
            if (data) {
                setProject(data);
                const tools = data.inventory
                    ?.flatMap(l => l.itemGroups)
                    .find(g => g.name === 'כלי עבודה חשמליים')?.items || [];
                setElectricalTools(tools);
            } else {
                addToast('בניין לא נמצא', 'error');
                navigate('/');
            }
        } catch (error) {
            addToast('שגיאה בטעינת כלים', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, addToast, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleStatusChange = async (itemId: string, status: 'תקין' | 'דורש תיקון') => {
        if (!project) return;
        
        const updatedTools = electricalTools.map(item =>
            item.id === itemId
                ? { ...item, checkStatus: status, lastCheckedDate: new Date().toISOString() }
                : item
        );
        
        const updatedProject = {
            ...project,
            inventory: (project.inventory || []).map(location => ({
                ...location,
                itemGroups: location.itemGroups.map(group => 
                    group.name === 'כלי עבודה חשמליים'
                    ? { ...group, items: updatedTools }
                    : group
                )
            })),
            updatedAt: new Date().toISOString()
        };

        // Optimistic update
        setElectricalTools(updatedTools);
        setProject(updatedProject);

        try {
            await dbService.updateProject(updatedProject);
            addToast(`'${updatedTools.find(t=>t.id===itemId)?.name}' סומן כ'${status}'`, 'success');
        } catch (error) {
            addToast('שגיאה בעדכון סטטוס', 'error');
            // Revert on failure
            fetchData();
        }
    };
    
    const handleExportPdf = () => {
        if (!project || electricalTools.length === 0) {
            addToast('אין כלים לייצוא', 'warning');
            return;
        }
        addToast('מכין PDF...', 'info');
        generateElectricalToolsPdf({ settings, project, items: electricalTools });
    };

    if (isLoading) return <LoadingSpinner text="טוען כלי עבודה..." />;

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
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">בדיקת כלי עבודה חשמליים: {project?.name}</h1>
                    <p className="text-sm text-slate-500 mt-1">בדיקה תקופתית, מעקב תקינות ותיעוד סטטוס כלי עבודה</p>
                </div>
                <button onClick={handleExportPdf} className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-2 border border-slate-200/80 shadow-2xs">
                    <ArrowDownTrayIcon className="w-4 h-4"/>יצא PDF
                </button>
            </div>
            
            {electricalTools.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl shadow-xs border border-slate-200/90">
                    <p className="text-slate-500 text-sm">לא נמצאו פריטים בקבוצת "כלי עבודה חשמליים" במלאי הבניין.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {electricalTools.map(item => {
                        const isOk = item.checkStatus === 'תקין';
                        const needsRepair = item.checkStatus === 'דורש תיקון';
                        return (
                            <div key={item.id} className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 hover:shadow-md">
                                <div className="flex-grow">
                                    <p className="font-bold text-slate-900 text-base">{item.name}</p>
                                    <p className="text-sm text-slate-500 mt-0.5">{item.company} {item.model}</p>
                                    {item.lastCheckedDate && (
                                        <p className={`text-xs mt-2 font-semibold flex items-center gap-1.5 ${isOk ? 'text-emerald-600' : needsRepair ? 'text-rose-600' : 'text-slate-500'}`}>
                                            <span>נבדק לאחרונה:</span>
                                            <span>{formatDate(item.lastCheckedDate)} ({item.checkStatus})</span>
                                        </p>
                                    )}
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-2">
                                    <button
                                        onClick={() => handleStatusChange(item.id, 'תקין')}
                                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-2xs ${
                                            isOk ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                        }`}
                                    >
                                        <CheckCircleIcon className="w-4 h-4" /> תקין
                                    </button>
                                     <button
                                        onClick={() => handleStatusChange(item.id, 'דורש תיקון')}
                                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-2xs ${
                                            needsRepair ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                        }`}
                                    >
                                        <ExclamationTriangleIcon className="w-4 h-4" /> דורש תיקון
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default ProjectElectricalToolsPage;