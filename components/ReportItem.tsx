import React from 'react';
import { Link } from 'react-router-dom';
import { Report } from '../types';
import { formatDate } from '../utils/dateFormatter';
import { TrashIcon } from './icons/ActionIcons';
import { ClipboardDocumentListIcon, ChevronLeftIcon } from './icons/GeneralIcons';

interface ReportItemProps {
  report: Report & { projectName?: string };
  onDelete: (id: string) => void;
}

const REPORT_TYPE_CONFIG: Record<string, { label: string; badgeClass: string; iconText: string }> = {
  survey: { label: 'סקר מבנה', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200', iconText: '📋' },
  inspection: { label: 'ביקורת ליקויים', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200', iconText: '🔍' },
  handover: { label: 'פרוטוקול מסירה', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200', iconText: '🤝' },
  fire_safety: { label: 'בטיחות אש', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200', iconText: '🧯' },
  standard: { label: 'דוח תחזוקה', badgeClass: 'bg-sky-50 text-sky-800 border-sky-200', iconText: '📝' },
};

const ReportItem: React.FC<ReportItemProps> = ({ report, onDelete }) => {
  const isSurvey = report.reportType === 'survey' || report.title?.includes('סקר') || report.group?.includes('סקר');
  const typeCfg = report.reportType && REPORT_TYPE_CONFIG[report.reportType] 
    ? REPORT_TYPE_CONFIG[report.reportType]
    : (isSurvey ? REPORT_TYPE_CONFIG.survey : null);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs transition-all duration-200 hover:shadow-lg hover:border-sky-300 flex flex-col justify-between group overflow-hidden">
        <Link to={`/project/${report.projectId}/report/${report.id}`} className="p-4 flex-grow block">
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-2xs group-hover:scale-105 transition-transform ${
                    isSurvey ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-sky-50 text-sky-700 border-sky-100/80'
                }`}>
                    {isSurvey ? <span className="text-lg">📋</span> : <ClipboardDocumentListIcon className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-grow">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {typeCfg && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeCfg.badgeClass}`}>
                                {typeCfg.iconText} {typeCfg.label}
                            </span>
                        )}
                        {report.score !== undefined && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                report.score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                report.score >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                                ציון: {report.score}/100
                            </span>
                        )}
                    </div>

                    <h4 className="font-bold text-base text-slate-900 truncate tracking-tight group-hover:text-sky-700 transition-colors" title={report.title}>
                        {report.title}
                    </h4>
                    {report.projectName && (
                        <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                            🏢 {report.projectName}
                        </p>
                    )}
                    
                    {report.surveyorName && (
                        <p className="text-xs text-slate-600 font-medium mt-1">
                            👤 סוקר/בודק: <span className="font-bold text-slate-800">{report.surveyorName}</span>
                        </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-2 flex-wrap">
                        <span className="font-mono-numbers">{formatDate(report.date)}</span>
                        {report.group && (
                            <>
                                <span>&bull;</span>
                                <span className="font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md text-[11px]">
                                    {report.group}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Link>
        <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 flex justify-between items-center text-xs">
            <Link 
                to={`/project/${report.projectId}/report/${report.id}`}
                className="font-semibold text-slate-600 group-hover:text-sky-700 flex items-center gap-1 transition-colors"
            >
                <span>{isSurvey ? 'צפה בממצאי הסקר' : 'צפה בדוח'}</span>
                <ChevronLeftIcon className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(report.id); }}
              className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              title="מחק דוח"
              aria-label="מחק דוח"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
        </div>
    </div>
  );
};

export default ReportItem;