import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as dbService from '../services/dbService';
import { Report, Problem, ProblemSeverity, Project, Supplier } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ProblemItem from '../components/ProblemItem';
import { useToast } from '../contexts/ToastContext';
import { PlusIcon } from '../components/icons/ActionIcons';
import { SEVERITY_COLORS } from '../constants';

const ReportProblemsPage: React.FC = () => {
    const { projectId, reportId } = useParams<{ projectId: string; reportId: string }>();
    const navigate = useNavigate();
    const [report, setReport] = useState<Report | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
    const [problems, setProblems] = useState<Problem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();
    const [severityFilter, setSeverityFilter] = useState<ProblemSeverity | 'all'>('all');

    const fetchData = useCallback(async () => {
        if (!reportId || !projectId) return;
        setIsLoading(true);
        try {
            const [repData, projData, probData, suppData] = await Promise.all([
                dbService.getReport(reportId),
                dbService.getProject(projectId),
                dbService.getProblemsByReportId(reportId),
                dbService.getAllSuppliers()
            ]);
            setReport(repData);
            setProject(projData);
            setProblems(probData.sort((a, b) => a.order - b.order));
            setAllSuppliers(suppData);
        } catch (error) {
            addToast('Error fetching problems', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [reportId, projectId, addToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDeleteProblem = async (id: string) => {
        if (window.confirm('האם אתה בטוח שברצונך למחוק תקלה זו?')) {
            try {
                await dbService.deleteProblem(id);
                addToast('התקלה נמחקה בהצלחה', 'success');
                fetchData();
            } catch (error) {
                addToast('שגיאה במחיקת התקלה', 'error');
            }
        }
    };

    const handleMoveProblem = async (problemId: string, direction: 'up' | 'down') => {
        const currentIndex = problems.findIndex(p => p.id === problemId);
        if (currentIndex === -1) return;
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= problems.length) return;
        const newProblems = [...problems];
        [newProblems[currentIndex], newProblems[newIndex]] = [newProblems[newIndex], newProblems[currentIndex]];
        newProblems[currentIndex].order = currentIndex;
        newProblems[newIndex].order = newIndex;
        setProblems(newProblems); // Optimistic update
        try {
            await dbService.updateProblemsOrder([newProblems[currentIndex], newProblems[newIndex]]);
        } catch (error) {
            addToast('שגיאה בעדכון סדר התקלות', 'error');
            setProblems(problems); // Revert
        }
    };

    const severityCounts = useMemo(() => {
        const counts: Record<ProblemSeverity, number> & { all: number } = {
            [ProblemSeverity.CRITICAL]: 0, [ProblemSeverity.HIGH]: 0,
            [ProblemSeverity.MEDIUM]: 0, [ProblemSeverity.LOW]: 0,
            all: problems.length,
        };
        problems.forEach(p => { counts[p.severity]++; });
        return counts;
    }, [problems]);

    const filteredProblems = useMemo(() => {
        if (severityFilter === 'all') return problems;
        return problems.filter(p => p.severity === severityFilter);
    }, [problems, severityFilter]);

    const FilterButton = ({ label, value, count, color }: { label: ProblemSeverity | 'all', value: string, count: number, color?: { bg: string, text: string } }) => {
        const isActive = severityFilter === label;
        const activeClasses = color ? `${color.bg} ${color.text} ring-2 ring-offset-1 ${color.text.replace('text', 'ring')}` : 'bg-sky-600 text-white ring-2 ring-offset-1 ring-sky-600';
        const inactiveClasses = 'bg-white text-slate-700 hover:bg-slate-100';
        return (
            <button onClick={() => setSeverityFilter(label)} className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${isActive ? activeClasses : inactiveClasses}`}>
                {value}
                <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-white/20' : 'bg-slate-200'}`}>{count}</span>
            </button>
        );
    };

    if (isLoading) return <LoadingSpinner text="טוען תקלות..." />;

    return (
        <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
            {/* Header & Controls */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <nav className="text-xs font-medium text-slate-400 mb-1">
                        <Link to={`/project/${projectId}/report/${reportId}`} className="text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1">
                            <span>←</span> חזרה לדוח {report?.title}
                        </Link>
                    </nav>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">תקלות בדוח: {report?.title}</h2>
                    <p className="text-sm text-slate-500 mt-1">ניהול, סידור והקצאת תקלות וליקויים לקבלנים</p>
                </div>
                 <Link
                    to={`/project/${projectId}/report/${reportId}/problem/new`}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition flex items-center gap-1.5"
                >
                    <PlusIcon className="w-4 h-4" />
                    <span>הוסף תקלה</span>
                </Link>
            </div>

            {/* Filter Pills */}
            <div className="bg-white border border-slate-200/90 p-3 rounded-2xl shadow-xs flex items-center justify-start sm:justify-center gap-2 flex-wrap">
                <FilterButton label="all" value="הכל" count={severityCounts.all} />
                <FilterButton label={ProblemSeverity.CRITICAL} value={ProblemSeverity.CRITICAL} count={severityCounts[ProblemSeverity.CRITICAL]} color={SEVERITY_COLORS[ProblemSeverity.CRITICAL]} />
                <FilterButton label={ProblemSeverity.HIGH} value={ProblemSeverity.HIGH} count={severityCounts[ProblemSeverity.HIGH]} color={SEVERITY_COLORS[ProblemSeverity.HIGH]} />
                <FilterButton label={ProblemSeverity.MEDIUM} value={ProblemSeverity.MEDIUM} count={severityCounts[ProblemSeverity.MEDIUM]} color={SEVERITY_COLORS[ProblemSeverity.MEDIUM]} />
                <FilterButton label={ProblemSeverity.LOW} value={ProblemSeverity.LOW} count={severityCounts[ProblemSeverity.LOW]} color={SEVERITY_COLORS[ProblemSeverity.LOW]} />
            </div>

            {filteredProblems.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredProblems.map((problem, index) => (
                        <ProblemItem 
                            key={problem.id} 
                            problem={problem} 
                            project={project}
                            allSuppliers={allSuppliers}
                            onDelete={handleDeleteProblem} 
                            onMove={handleMoveProblem} 
                            isFirst={index === 0} 
                            isLast={index === filteredProblems.length - 1} 
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-3xl shadow-xs border border-slate-200/90">
                    <div className="w-16 h-16 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <PlusIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">{severityFilter === 'all' ? 'לא נמצאו תקלות בדוח זה' : 'אין תקלות ברמת חומרה זו'}</h3>
                    <p className="text-slate-500 text-sm mt-1">{severityFilter === 'all' ? 'לחץ על "הוסף תקלה" כדי להוסיף את התקלה הראשונה.' : 'נסה לבחור דרגת חומרה אחרת בסינון למעלה.'}</p>
                </div>
            )}
        </div>
    );
};

export default ReportProblemsPage;
