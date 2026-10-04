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

const ReportItem: React.FC<ReportItemProps> = ({ report, onDelete }) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs transition-all duration-200 hover:shadow-lg hover:border-sky-300 flex flex-col justify-between group overflow-hidden">
        <Link to={`/project/${report.projectId}/report/${report.id}`} className="p-4 flex-grow block">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center flex-shrink-0 border border-sky-100/80 shadow-2xs group-hover:scale-105 transition-transform">
                    <ClipboardDocumentListIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-grow">
                    <h4 className="font-bold text-base text-slate-900 truncate tracking-tight group-hover:text-sky-700 transition-colors" title={report.title}>
                        {report.title}
                    </h4>
                    {report.projectName && (
                        <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                            {report.projectName}
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
                <span>צפה בדוח</span>
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