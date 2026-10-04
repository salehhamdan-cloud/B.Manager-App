import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Project, ProblemWithContext, Problem, ProjectFile, FileWithContext } from '../types';
import * as dbService from '../services/dbService';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { PencilIcon, ArrowDownTrayIcon } from '../components/icons/ActionIcons';
import { CheckCircleIcon, ExclamationTriangleIcon } from '../components/icons/FeedbackIcons';
import { PLACEHOLDER_IMAGE_URL_PROBLEM, SEVERITY_COLORS } from '../constants';
import { useSettings } from '../contexts/SettingsContext';
import { generateChecklistPdf } from '../services/pdfService';
import { formatDate } from '../utils/dateFormatter';

type FilterStatus = 'all' | 'pending' | 'fixed';

const FilterButton: React.FC<{ status: FilterStatus; label: string; count?: number; filter: FilterStatus; setFilter: (status: FilterStatus) => void; }> = ({ status, label, count, filter, setFilter }) => (
    <button
        onClick={() => setFilter(status)}
        className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
            filter === status
            ? 'bg-slate-900 text-white shadow-xs'
            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
        }`}
    >
        <span>{label}</span>
        {count !== undefined && (
            <span className={`font-mono-numbers text-[11px] px-1.5 py-0.2 rounded-full ${
                filter === status ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
                {count}
            </span>
        )}
    </button>
);

const ProjectChecklistPage: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { addToast } = useToast();
    const { settings } = useSettings();
    const [project, setProject] = useState<Project | null>(null);
    const [allProblems, setAllProblems] = useState<ProblemWithContext[]>([]);
    const [expiredFiles, setExpiredFiles] = useState<FileWithContext[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<FilterStatus>('pending');

    const fetchChecklistData = useCallback(async () => {
        if (!projectId) return;
        setIsLoading(true);
        try {
            const projectData = await dbService.getProject(projectId);
            if (!projectData) throw new Error('Project not found');
            setProject(projectData);

            // Check for expired files
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to the beginning of today for comparison
            const expired = (projectData.files || []).filter(file => 
                file.dueDate && new Date(file.dueDate) < today
            ).map((file): FileWithContext => ({
                ...file,
                projectId: projectData.id,
                projectName: projectData.name,
            }));
            setExpiredFiles(expired.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()));

            const reports = await dbService.getReportsByProjectId(projectId);
            const problemsPromises = reports.map(report => 
                dbService.getProblemsByReportId(report.id).then(problems => 
                    problems.map(p => ({ 
                        ...p, 
                        reportTitle: report.title,
                        reportDate: report.date, // Pass report date for filtering
                        projectId: projectData.id,
                        projectName: projectData.name,
                    }))
                )
            );

            const problemsByReport = await Promise.all(problemsPromises);
            const flattenedProblems = problemsByReport.flat().sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
            setAllProblems(flattenedProblems);

        } catch (error) {
            console.error("Error fetching checklist data:", error);
            addToast('שגיאה בטעינת רשימת התקלות', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [projectId, addToast]);

    useEffect(() => {
        fetchChecklistData();
    }, [fetchChecklistData]);
    
    const handleGeneratePdf = async () => {
        if (!project) return;
        addToast('מכין PDF...', 'info');

        let problemsToExport = [...allProblems];
        if (settings.pdfDateRangeStart || settings.pdfDateRangeEnd) {
            const start = settings.pdfDateRangeStart ? new Date(settings.pdfDateRangeStart).getTime() : 0;
            const end = settings.pdfDateRangeEnd ? new Date(settings.pdfDateRangeEnd).getTime() + (24 * 60 * 60 * 1000 - 1) : Infinity;

            problemsToExport = allProblems.filter(p => {
                if (!p.reportDate) return false;
                const reportDate = new Date(p.reportDate).getTime();
                return reportDate >= start && reportDate <= end;
            });
            addToast(`מסנן דוחות PDF לפי טווח תאריכים`, 'info');
        }

        const pendingProblems = problemsToExport.filter(p => !p.isFixed);
        const fixedProblems = problemsToExport.filter(p => p.isFixed);

        try {
            await generateChecklistPdf({
                settings,
                project,
                problems: problemsToExport,
                pendingProblems,
                fixedProblems,
                expiredFiles,
            });
            addToast('PDF נוצר והורד בהצלחה', 'success');
        } catch (error) {
            console.error('Error generating checklist PDF:', error);
            addToast('שגיאה ביצירת PDF', 'error');
        }
    };

    const handleToggleFix = async (problem: Problem) => {
        const updatedProblem = { ...problem, isFixed: !problem.isFixed };
        
        setAllProblems(prev => prev.map(p => p.id === problem.id ? {...p, isFixed: updatedProblem.isFixed} : p));

        try {
            await dbService.updateProblem(updatedProblem);
            addToast(updatedProblem.isFixed ? 'התקלה סומנה כמתוקנת' : 'התקלה סומנה כלא מתוקנת', 'success');
        } catch (error) {
            setAllProblems(prev => prev.map(p => p.id === problem.id ? {...p, isFixed: problem.isFixed} : p));
            addToast('שגיאה בעדכון סטטוס התקלה', 'error');
        }
    };

    const isProblem = (item: ProblemWithContext | FileWithContext): item is ProblemWithContext => {
        return 'reportTitle' in item;
    };

    const displayedItems = useMemo(() => {
        const pendingProblems = allProblems.filter(p => !p.isFixed);
        const fixedProblems = allProblems.filter(p => p.isFixed);

        if (filter === 'fixed') return fixedProblems;
        if (filter === 'pending') return [...expiredFiles, ...pendingProblems];
        return [...expiredFiles, ...pendingProblems, ...fixedProblems];
    }, [allProblems, expiredFiles, filter]);


    const pendingCount = useMemo(() => allProblems.filter(p => !p.isFixed).length + expiredFiles.length, [allProblems, expiredFiles]);
    const fixedCount = useMemo(() => allProblems.filter(p => p.isFixed).length, [allProblems]);
    const totalCount = allProblems.length + expiredFiles.length;
    const progressPercentage = totalCount > 0 ? (fixedCount / totalCount) * 100 : 0;

    if (isLoading) return <LoadingSpinner text="טוען רשימת תקלות..." />;

    return (
        <div className="animate-fadeIn space-y-6 max-w-5xl mx-auto">
            {/* Header & Progress Card */}
            <section className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200/90">
                <div className="flex justify-between items-start sm:items-center flex-wrap gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{project?.name || 'בניין'}</h2>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">רשימת תקלות וקבצים לטיפול בבניין</p>
                    </div>
                    <button
                        onClick={handleGeneratePdf}
                        className="btn-secondary text-xs sm:text-sm flex items-center gap-2"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4"/>
                        <span>ייצוא PDF</span>
                    </button>
                </div>

                <div className="mt-5 p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs sm:text-sm font-semibold text-slate-700">התקדמות טיפול בבניין</span>
                        <span className="text-xs sm:text-sm font-bold text-sky-700 font-mono-numbers">
                            {fixedCount} / {totalCount} ({progressPercentage.toFixed(0)}%)
                        </span>
                    </div>
                    <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-sky-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500" 
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>
            </section>
            
            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <FilterButton status="pending" label="לטיפול" count={pendingCount} filter={filter} setFilter={setFilter} />
                <FilterButton status="fixed" label="טופלו" count={fixedCount} filter={filter} setFilter={setFilter} />
                <FilterButton status="all" label="הכל" count={totalCount} filter={filter} setFilter={setFilter} />
            </div>

            {displayedItems.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-8">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <CheckCircleIcon className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                        {filter === 'fixed' ? 'לא נמצאו תקלות שטופלו' : 'מעולה! אין כרגע תקלות או מסמכים לטיפול'}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                        כל המערכות בבניין במצב מעודכן ותקין.
                    </p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {displayedItems.map(item => (
                        isProblem(item) ? (
                            <div 
                                key={item.id} 
                                className={`bg-white rounded-2xl p-4 border transition-all duration-200 hover:shadow-md flex items-center gap-3.5 group ${
                                    item.isFixed ? 'border-slate-200/80 bg-slate-50/50 opacity-80' : 'border-slate-200/90 hover:border-slate-300'
                                }`}
                            >
                                <button 
                                    onClick={() => handleToggleFix(item)} 
                                    className="flex-shrink-0 w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center cursor-pointer transition-all hover:border-emerald-500 hover:bg-emerald-50 active:scale-95" 
                                    title={item.isFixed ? 'סמן כלא תוקן' : 'סמן כתוקן'}
                                    aria-label="שינוי סטטוס טיפול"
                                >
                                    {item.isFixed ? (
                                        <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
                                    ) : (
                                        <span className="w-3.5 h-3.5 rounded-full bg-slate-200 group-hover:bg-emerald-400 transition-colors" />
                                    )}
                                </button>

                                <div className="flex-grow min-w-0">
                                    <p className={`font-bold text-sm sm:text-base text-slate-900 tracking-tight leading-snug ${
                                        item.isFixed ? 'line-through text-slate-500' : ''
                                    }`}>
                                        {item.description}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                                        <span>דוח:</span>
                                        <Link to={`/project/${item.projectId}/report/${item.reportId}`} className="text-sky-700 font-semibold hover:underline">
                                            {item.reportTitle}
                                        </Link>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border whitespace-nowrap ${SEVERITY_COLORS[item.severity].bg} ${SEVERITY_COLORS[item.severity].text} border-current/20`}>
                                        {item.severity}
                                    </span>
                                    <Link 
                                        to={`/project/${item.projectId}/report/${item.reportId}/problem/${item.id}/edit`} 
                                        className="p-1.5 text-slate-400 hover:text-sky-700 rounded-lg hover:bg-sky-50 transition-colors"
                                        title="ערוך תקלה"
                                    >
                                        <PencilIcon className="w-4 h-4"/>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                             <div key={item.id} className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 flex items-center gap-3.5 transition-all hover:shadow-md">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                                    <ExclamationTriangleIcon className="w-4 h-4"/>
                                </div>
                                <div className="flex-grow min-w-0">
                                    <p className="font-bold text-sm sm:text-base text-amber-950 tracking-tight">
                                        פג תוקף: {item.name}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-amber-800/80 mt-1 flex-wrap font-mono-numbers">
                                        <span>תוקף עד: {formatDate(item.dueDate)}</span>
                                    </div>
                                </div>
                                <Link 
                                    to={`/project/${item.projectId}/files`} 
                                    className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors flex-shrink-0"
                                    title="צפה בקובץ"
                                >
                                    <PencilIcon className="w-4 h-4"/>
                                </Link>
                            </div>
                        )
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProjectChecklistPage;