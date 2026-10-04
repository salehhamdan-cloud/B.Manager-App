import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SubProjectWithContext } from '../types';
import * as dbService from '../services/dbService';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ArrowDownTrayIcon } from '../components/icons/ActionIcons';
import CollapsibleSection from '../components/common/CollapsibleSection';
import { useSettings } from '../contexts/SettingsContext';
import { generateAllSubProjectsPdf } from '../services/pdfService';
import { formatDate } from '../utils/dateFormatter';

const getStatusStyles = (status: string) => {
    switch (status) {
        case 'פעיל': return { bg: 'bg-green-100', text: 'text-green-800' };
        case 'הושלם': return { bg: 'bg-blue-100', text: 'text-blue-800' };
        case 'בהמתנה': return { bg: 'bg-amber-100', text: 'text-amber-800' };
        case 'בוטל': return { bg: 'bg-slate-100', text: 'text-slate-600' };
        default: return { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
};

const getInitials = (name: string): string => {
  if (!name) return '';
  return name.split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase();
};

const SortButton: React.FC<{ label: string; value: string; currentSort: string; setSort: (value: string) => void }> = ({ label, value, currentSort, setSort }) => (
    <button
        onClick={() => setSort(value)}
        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
            currentSort === value 
            ? 'bg-white shadow-xs text-sky-800 font-black border border-slate-200/80' 
            : 'text-slate-600 hover:bg-white/60'
        }`}
    >
        {label}
    </button>
);

const AllSubProjectsPage: React.FC = () => {
    const [subProjects, setSubProjects] = useState<SubProjectWithContext[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addToast } = useToast();
    const { settings } = useSettings();
    const [sortOrder, setSortOrder] = useState('projectName-asc');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const projects = await dbService.getAllProjects();
            const allSubProjects: SubProjectWithContext[] = projects.flatMap(p =>
                (p.subProjects || []).map(sp => ({
                    ...sp,
                    projectId: p.id,
                    projectName: p.name,
                }))
            );
            setSubProjects(allSubProjects);
        } catch (error) {
            addToast('שגיאה בטעינת פרויקטי משנה', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleExportPdf = () => {
        if (sortedSubProjects.length === 0) {
            addToast('אין פרויקטים לייצוא', 'warning');
            return;
        }
        addToast('מכין PDF...', 'info');
        generateAllSubProjectsPdf({ settings, subProjects: sortedSubProjects });
    };

    const sortedSubProjects = useMemo(() => {
        return [...subProjects].sort((a, b) => {
            const [key, direction] = sortOrder.split('-');
            let valA: string | number, valB: string | number;

            switch (key) {
                case 'name':
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
                    break;
                case 'status':
                    valA = a.status;
                    valB = b.status;
                    break;
                case 'workStartDate':
                    valA = a.workStartDate ? new Date(a.workStartDate).getTime() : 0;
                    valB = b.workStartDate ? new Date(b.workStartDate).getTime() : 0;
                    break;
                case 'projectName':
                default:
                    valA = a.projectName.toLowerCase();
                    valB = b.projectName.toLowerCase();
                    break;
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return a.projectName.localeCompare(b.projectName); // Secondary sort
        });
    }, [subProjects, sortOrder]);
    
    const groupedSubProjects = useMemo(() => {
        return sortedSubProjects.reduce((acc, sp) => {
            if (!acc[sp.projectName]) {
                acc[sp.projectName] = [];
            }
            acc[sp.projectName].push(sp);
            return acc;
        }, {} as Record<string, SubProjectWithContext[]>);
    }, [sortedSubProjects]);

    const sortedProjectKeys = useMemo(() => Object.keys(groupedSubProjects), [groupedSubProjects]);

    if (isLoading) return <LoadingSpinner text="טוען פרויקטים..." />;

    return (
        <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
            {/* Header & Controls */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        כל פרויקטי המשנה
                        <span className="text-xs bg-sky-50 text-sky-800 border border-sky-100 px-2.5 py-0.5 rounded-full font-bold">
                            {subProjects.length} פרויקטים
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">פרויקטי שדרוג, שיפוץ וחידוש מערכות בנכסים</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-between md:justify-end">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/60 overflow-x-auto">
                        <SortButton label="בניין (א-ת)" value="projectName-asc" currentSort={sortOrder} setSort={setSortOrder} />
                        <SortButton label="שם (א-ת)" value="name-asc" currentSort={sortOrder} setSort={setSortOrder} />
                        <SortButton label="תאריך התחלה" value="workStartDate-asc" currentSort={sortOrder} setSort={setSortOrder} />
                        <SortButton label="סטטוס" value="status-asc" currentSort={sortOrder} setSort={setSortOrder} />
                    </div>
                    <button onClick={handleExportPdf} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold">
                        <ArrowDownTrayIcon className="w-4 h-4"/>יצא PDF
                    </button>
                </div>
            </div>

            {subProjects.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl shadow-xs border border-slate-200/90 p-8">
                    <h3 className="text-base font-bold text-slate-800">לא נמצאו פרויקטי משנה</h3>
                    <p className="text-slate-500 text-xs mt-1">פתח כרטיס בניין כדי להוסיף פרויקט משנה חדש.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedProjectKeys.map(projectName => (
                        <CollapsibleSection
                            key={projectName}
                            title={<h2 className="text-lg font-bold text-slate-800">{projectName}</h2>}
                            count={groupedSubProjects[projectName].length}
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {groupedSubProjects[projectName].map(sp => {
                                    const statusStyles = getStatusStyles(sp.status);
                                    const coverPhotoUrl = sp.coverPhoto?.url || sp.coverPhoto?.dataUrl;
                                    return (
                                        <Link
                                            key={sp.id}
                                            to={`/project/${sp.projectId}/sub-project/${sp.id}`}
                                            className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden flex flex-col transition-all duration-200 hover:shadow-lg hover:border-sky-300 group"
                                        >
                                            <div className="h-40 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                                                {coverPhotoUrl ? (
                                                    <img src={coverPhotoUrl} alt={sp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-tr from-sky-900 to-slate-800 flex items-center justify-center text-white font-black text-3xl">
                                                        {getInitials(sp.name)}
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
                                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${statusStyles.bg} ${statusStyles.text}`}>
                                                        {sp.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="p-4 flex-grow flex flex-col justify-between">
                                                <div>
                                                    <h3 className="font-bold text-base text-slate-900 truncate group-hover:text-sky-700 transition-colors" title={sp.name}>{sp.name}</h3>
                                                    {sp.description && <p className="text-xs text-slate-500 line-clamp-2 mt-1">{sp.description}</p>}
                                                </div>
                                                {sp.workStartDate && (
                                                    <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                                                        התחלה: {formatDate(sp.workStartDate)}
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </CollapsibleSection>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AllSubProjectsPage;
