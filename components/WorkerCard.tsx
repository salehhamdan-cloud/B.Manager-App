import React from 'react';
import { WorkerWithContext } from '../types';
import { PhoneIcon, EnvelopeIcon } from './icons/ContactIcons';
import { PencilIcon, TrashIcon } from './icons/ActionIcons';

interface WorkerCardProps {
  worker: WorkerWithContext;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const getInitials = (name: string): string => {
    if (!name) return 'ע';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

const WorkerCard: React.FC<WorkerCardProps> = ({ worker, onSelect, onEdit, onDelete }) => {
  const photoSrc = worker.photo?.url || worker.photo?.dataUrl;
  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden flex flex-col transition-all duration-200 hover:shadow-lg hover:border-sky-300 group">
      <div 
        className="p-4 flex items-start gap-3.5 cursor-pointer"
        onClick={onSelect}
      >
        <div className="flex-shrink-0">
          {photoSrc ? (
            <img src={photoSrc} alt={worker.name} className="w-14 h-14 rounded-xl object-cover ring-2 ring-slate-100" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-sky-100 to-indigo-100 flex items-center justify-center text-lg font-bold text-sky-800 border border-sky-200/60 shadow-2xs">
              {getInitials(worker.name)}
            </div>
          )}
        </div>
        <div className="flex-grow min-w-0">
          <p className="font-bold text-base text-slate-900 truncate tracking-tight group-hover:text-sky-700 transition-colors" title={worker.name}>
            {worker.name}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
            {worker.specialty && (
              <span className="font-semibold text-sky-700">
                {worker.specialty}
              </span>
            )}
            {worker.projectName && (
              <>
                <span aria-hidden="true">&bull;</span>
                <span className="truncate">{worker.projectName}</span>
              </>
            )}
          </div>
          
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {worker.phone && (
              <>
                <a
                  href={`tel:${worker.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium font-mono-numbers transition-colors"
                  title="התקשר"
                >
                  <PhoneIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>{worker.phone}</span>
                </a>

                <a
                  href={`https://wa.me/${worker.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200/60 transition-colors"
                  title="שלח הודעת וואטסאפ"
                >
                  <span>WhatsApp</span>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="mt-auto px-4 py-2 bg-slate-50/60 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
        <span className="truncate">{worker.email || 'איש מקצוע פעיל'}</span>
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }} 
            className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors" 
            title="ערוך פרטי עובד"
          >
              <PencilIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }} 
            className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors" 
            title="מחק עובד"
          >
              <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkerCard;