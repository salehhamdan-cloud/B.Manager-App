import React from 'react';
import { Link } from 'react-router-dom';
import { Project } from '../types';
import { formatDate } from '../utils/dateFormatter';
import { TrashIcon, PencilIcon, EyeIcon } from './icons/ActionIcons';
import { ChevronLeftIcon } from './icons/GeneralIcons';
import { useTranslation } from '../src/i18n';

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
    const { t, isRtl } = useTranslation();
    const mainImage = project.images?.[0];
    const apartmentsCount = project.apartmentsCount ?? project.tenants?.length ?? 0;
    const floorsCount = project.numberOfFloors ?? 1;
    const parkingCount = project.parkingSpots ?? 0;

    return (
        <div className="p-0 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-md transition overflow-hidden flex flex-col group">
            <Link to={`/project/${project.id}`} className="block relative overflow-hidden">
                <div className="h-44 bg-gradient-to-tr from-neutral-800 to-neutral-900 flex items-center justify-center relative">
                    {mainImage?.url || mainImage?.dataUrl ? (
                        <img 
                            src={mainImage.url || mainImage.dataUrl} 
                            alt={project.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-blue-900 via-neutral-800 to-indigo-950 p-4 text-center">
                            <span className="text-3xl font-black text-white/90 tracking-wider mb-1">{getInitials(project.name)}</span>
                            <span className="text-xs text-blue-200/80 font-medium">B.Manager {t('buildingDetail', 'נכס')}</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-3.5">
                        <div className="flex items-center justify-between w-full text-white">
                            <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full">
                                {project.status || t('active', 'פעיל')}
                            </span>
                            <span className="text-xs text-white/90 flex items-center gap-1 group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1 font-medium">
                                {t('enterProperty', 'כניסה לנכס')} <ChevronLeftIcon className={`w-3.5 h-3.5 ${isRtl ? '' : 'rotate-180'}`} />
                            </span>
                        </div>
                    </div>
                </div>
            </Link>

            <div className="p-5 flex-grow flex flex-col justify-between">
                <div>
                    <div className="mb-2">
                        <h3 className="font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100 truncate tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={project.name}>
                            {project.name}
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate" title={project.address}>
                            {project.address || t('addressNotSet', 'כתובת טרם הוגדרה')}
                        </p>
                    </div>

                    {/* Building Specs Row */}
                    <div className="grid grid-cols-3 gap-2 py-2.5 my-3 border-y border-neutral-100 dark:border-neutral-800 text-center bg-neutral-50 dark:bg-neutral-800/40 rounded-xl">
                        <div>
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block font-bold">{t('floors', 'קומות')}</span>
                            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 font-mono">{floorsCount}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block font-bold">{t('units', 'דירות/יחידות')}</span>
                            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 font-mono">{apartmentsCount}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block font-bold">{t('parking', 'חניות')}</span>
                            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 font-mono">{parkingCount}</span>
                        </div>
                    </div>

                    {project.managerName && (
                        <div className="text-xs text-neutral-600 dark:text-neutral-300 mb-2 truncate">
                            <span className="text-neutral-400 dark:text-neutral-500">{t('manager', 'מנהל')}:</span> {project.managerName} {project.managerPhone ? `• ${project.managerPhone}` : ''}
                        </div>
                    )}
                </div>

                <div className="pt-3 mt-1 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center text-xs">
                    <Link
                        to={`/project/${project.id}`}
                        className="flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 px-2 py-1 rounded-lg transition"
                    >
                        <EyeIcon className="w-4 h-4" />
                        <span>{t('details', 'פרטים')}</span>
                    </Link>

                    <div className="flex items-center gap-1">
                        <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 mr-2">
                            {formatDate(project.updatedAt)}
                        </span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(project.id); }} 
                            className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition" 
                            title={t('delete', 'מחק בניין')} 
                            aria-label={t('delete', 'מחק בניין')}
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BuildingItem;