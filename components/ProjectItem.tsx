import React from 'react';
import { Link } from 'react-router-dom';
import { Project } from '../types';
import { formatDate } from '../utils/dateFormatter';
import { TrashIcon } from './icons/ActionIcons';
import { ChevronLeftIcon } from './icons/GeneralIcons';

interface BuildingItemProps {
  project: Project;
  onDelete: (id: string) => void;
}

const getInitials = (name: string): string => {
  if (!name) return 'ב';
  return name
    .split(' ')
    .map(word => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const BuildingItem: React.FC<BuildingItemProps> = ({ project, onDelete }) => {
    const mainImage = project.images?.[0];
    const apartmentsCount = project.apartmentsCount ?? project.tenants?.length ?? 0;
    const floorsCount = project.numberOfFloors ?? 1;
    const parkingCount = project.parkingSpots ?? 0;

    return (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden flex flex-col transition-all duration-200 hover:shadow-lg hover:border-sky-300 group">
            <Link to={`/project/${project.id}`} className="block relative overflow-hidden">
                <div className="h-44 bg-gradient-to-tr from-slate-800 to-slate-900 flex items-center justify-center relative">
                    {mainImage?.url || mainImage?.dataUrl ? (
                        <img 
                            src={mainImage.url || mainImage.dataUrl} 
                            alt={project.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-sky-900 via-slate-800 to-indigo-950 p-4 text-center">
                            <span className="text-3xl font-black text-white/90 tracking-wider mb-1">{getInitials(project.name)}</span>
                            <span className="text-xs text-sky-200/80 font-medium">B.Manager נכס</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-3.5">
                        <div className="flex items-center justify-between w-full text-white">
                            <span className="text-xs font-semibold bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-md">
                                {project.status || 'פעיל'}
                            </span>
                            <span className="text-xs text-white/90 flex items-center gap-1 group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1 font-medium">
                                כניסה לנכס <ChevronLeftIcon className="w-3.5 h-3.5" />
                            </span>
                        </div>
                    </div>
                </div>
            </Link>

            <div className="p-4 flex-grow flex flex-col">
                <div className="mb-2">
                    <h3 className="font-bold text-lg text-slate-900 truncate tracking-tight group-hover:text-sky-700 transition-colors" title={project.name}>
                        {project.name}
                    </h3>
                    <p className="text-xs text-slate-500 truncate" title={project.address}>
                        {project.address || 'כתובת טרם הוגדרה'}
                    </p>
                </div>

                {/* Building Specs Row */}
                <div className="grid grid-cols-3 gap-2 py-2.5 my-2 border-y border-slate-100 text-center bg-slate-50/60 rounded-xl">
                    <div>
                        <span className="text-[10px] text-slate-400 block font-medium">קומות</span>
                        <span className="text-sm font-bold text-slate-800 font-mono-numbers">{floorsCount}</span>
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 block font-medium">דירות/יחידות</span>
                        <span className="text-sm font-bold text-slate-800 font-mono-numbers">{apartmentsCount}</span>
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 block font-medium">חניות</span>
                        <span className="text-sm font-bold text-slate-800 font-mono-numbers">{parkingCount}</span>
                    </div>
                </div>

                {project.managerName && (
                    <div className="text-xs text-slate-600 mb-2 truncate">
                        <span className="text-slate-400">מנהל:</span> {project.managerName} {project.managerPhone ? `• ${project.managerPhone}` : ''}
                    </div>
                )}

                <div className="mt-auto pt-2 flex justify-between items-center text-xs text-slate-400">
                    <span className="text-[11px]">עודכן: {formatDate(project.updatedAt)}</span>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(project.id); }} 
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                        title="מחק בניין" 
                        aria-label="מחק בניין"
                    >
                         <TrashIcon className="w-4 h-4"/>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BuildingItem;