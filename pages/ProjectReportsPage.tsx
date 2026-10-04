import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as dbService from '../services/dbService';
import { Project, Report } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ReportItem from '../components/ReportItem';
import { useToast } from '../contexts/ToastContext';
import { PlusIcon } from '../components/icons/ActionIcons';
import Modal from '../components/common/Modal';
import { generateId } from '../utils/idGenerator';
import { useSettings } from '../contexts/SettingsContext';
import * as emailService from '../services/emailService';

const ProjectReportsPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const [project, setProject] = useState<Project | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();
    const { settings } = useSettings();
    
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [newReport, setNewReport] = useState<Partial<Report>>({ title: '', description: '', group: '', date: new Date().toISOString().split('T')[0] });

    const fetchData = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        try {
            const [projData, repData] = await Promise.all([
                dbService.getProject(projectId),
                dbService.getReportsByProjectId(projectId)
            ]);
            setProject(projData);
            setReports(repData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } catch (error) {
            addToast('Error fetching reports', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, addToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDeleteReport = async (id: string) => {
      if (window.confirm('האם אתה בטוח שברצונך למחוק דוח זה וכל התקלות הקשורות אליו?')) {
        try {
          await dbService.deleteReport(id);
          addToast('הדוח נמחק בהצלחה', 'success');
          fetchData();
        } catch (error) {
          addToast('שגיאה במחיקת הדוח', 'error');
        }
      }
    };
    
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewReport(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmitNewReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReport.title || !projectId) { addToast('כותרת הדוח היא שדה חובה', 'warning'); return; }
        const reportToAdd: Report = {
          id: generateId(), projectId: projectId, title: newReport.title!,
          date: newReport.date ? new Date(newReport.date).toISOString() : new Date().toISOString(),
          description: newReport.description || '', group: newReport.group?.trim() || undefined,
          files: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        try {
          await dbService.addReport(reportToAdd);
          addToast('דוח חדש נוסף בהצלחה', 'success');
          if (project) {
            emailService.triggerNewReportEmail(reportToAdd, project, settings);
          }
          setIsReportModalOpen(false);
          setNewReport({ title: '', description: '', group: '', date: new Date().toISOString().split('T')[0] });
          fetchData();
        } catch (error) {
          addToast('שגיאה בהוספת הדוח', 'error');
        }
    };

    if (isLoading) return <LoadingSpinner text="טוען דוחות..." />;

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
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">דוחות עבור: {project?.name}</h2>
                    <p className="text-sm text-slate-500 mt-1">צפייה ויצירת דוחות תקופתיים ותקלות בבניין</p>
                </div>
                <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition flex items-center gap-1.5"
                >
                    <PlusIcon className="w-4 h-4" />
                    <span>הוסף דוח</span>
                </button>
            </div>

            {reports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {reports.map(report => (
                        <ReportItem key={report.id} report={report} onDelete={handleDeleteReport} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-3xl shadow-xs border border-slate-200/90">
                    <div className="w-16 h-16 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <PlusIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">לא נמצאו דוחות עבור בניין זה</h3>
                    <p className="text-slate-500 text-sm mt-1">לחץ על 'הוסף דוח' כדי ליצור את הדוח הראשון לבניין.</p>
                </div>
            )}
            
            <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="הוספת דוח חדש">
                <form onSubmit={handleSubmitNewReport} className="space-y-4">
                    <div>
                        <label htmlFor="report-title" className="block text-sm font-semibold text-slate-700 mb-1">כותרת הדוח</label>
                        <input type="text" name="title" id="report-title" value={newReport.title || ''} onChange={handleInputChange} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" placeholder="לדוגמה: ביקורת חודשית מרץ 2026"/>
                    </div>
                    <div>
                        <label htmlFor="report-date" className="block text-sm font-semibold text-slate-700 mb-1">תאריך הדוח</label>
                        <input type="date" name="date" id="report-date" value={newReport.date || ''} onChange={handleInputChange} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition"/>
                    </div>
                    <div>
                        <label htmlFor="report-group" className="block text-sm font-semibold text-slate-700 mb-1">קבוצה (אופציונלי)</label>
                        <input type="text" name="group" id="report-group" value={newReport.group || ''} onChange={handleInputChange} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" placeholder="לדוגמה: בדיקות איטום"/>
                    </div>
                    <div>
                        <label htmlFor="report-description" className="block text-sm font-semibold text-slate-700 mb-1">תיאור (אופציונלי)</label>
                        <textarea name="description" id="report-description" value={newReport.description || ''} onChange={handleInputChange} rows={3} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none focus:bg-white transition" placeholder="פרטים והערות נוספות לגבי הדוח..."/>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setIsReportModalOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition">ביטול</button>
                        <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white transition shadow-xs">צור דוח</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ProjectReportsPage;
