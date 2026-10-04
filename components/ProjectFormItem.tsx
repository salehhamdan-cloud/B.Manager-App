import React from 'react';
import { Link } from 'react-router-dom';
import { ProjectForm, FormTemplate } from '../types';
import { formatDateTime } from '../utils/dateFormatter';
import { TrashIcon, ArrowDownTrayIcon } from './icons/ActionIcons';
import { DocumentTextIcon, ChevronLeftIcon } from './icons/GeneralIcons';

interface ProjectFormItemProps {
  form: ProjectForm;
  template: FormTemplate;
  onDelete: (formId: string) => void;
  onExportPdf: () => void;
  onExportCsv: () => void;
}

const ProjectFormItem: React.FC<ProjectFormItemProps> = ({ form, template, onDelete, onExportPdf, onExportCsv }) => {
    return (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs transition-all duration-200 hover:shadow-lg hover:border-sky-300 flex flex-col justify-between group overflow-hidden">
            <Link to={`/project/${form.projectId}/report/${form.reportId}/form/${form.id}`} className="p-4 flex-grow block">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center flex-shrink-0 border border-violet-100 shadow-2xs group-hover:scale-105 transition-transform">
                        <DocumentTextIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-grow">
                        <h4 className="font-bold text-base text-slate-900 truncate tracking-tight group-hover:text-sky-700 transition-colors" title={template.name}>
                            {template.name}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-2 flex-wrap font-mono-numbers">
                            <span>עודכן: {formatDateTime(form.updatedAt)}</span>
                        </div>
                    </div>
                </div>
            </Link>
            
            <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 flex justify-between items-center text-xs">
                <Link 
                    to={`/project/${form.projectId}/report/${form.reportId}/form/${form.id}`}
                    className="font-semibold text-slate-600 group-hover:text-sky-700 flex items-center gap-1 transition-colors"
                >
                    <span>פתח טופס</span>
                    <ChevronLeftIcon className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                </Link>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onExportCsv(); }}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="ייצוא Excel"
                        aria-label="ייצוא Excel"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onExportPdf(); }}
                        className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        title="ייצוא PDF"
                        aria-label="ייצוא PDF"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(form.id); }} 
                        className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors" 
                        title="מחק טופס"
                        aria-label="מחק טופס"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectFormItem;