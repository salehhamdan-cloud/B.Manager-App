import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Problem, Project, Supplier } from '../types';
import { PencilIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, CameraIcon } from './icons/ActionIcons';
import { CheckCircleIcon } from './icons/FeedbackIcons';
import { SEVERITY_COLORS } from '../constants';
import Modal from './common/Modal';
import { useToast } from '../contexts/ToastContext';
import { shareFiles } from '../utils/shareUtils';
import ProblemDetailsModal from './common/ProblemDetailsModal';

interface ProblemItemProps {
  problem: Problem;
  project: Project | null;
  allSuppliers: Supplier[];
  onDelete: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  isFirst: boolean;
  isLast: boolean;
}

const ProblemItem: React.FC<ProblemItemProps> = ({ problem, project, allSuppliers, onDelete, onMove, isFirst, isLast }) => {
  const { projectId, reportId } = useParams<{ projectId: string; reportId:string }>();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const { addToast } = useToast();

  const severityClasses = SEVERITY_COLORS[problem.severity] || { bg: 'bg-slate-100', text: 'text-slate-700' };
  
  const hasImage = problem.images.length > 0;
  const problemImageUrl = hasImage ? problem.images[0].url || problem.images[0].dataUrl : '';

  const handleToggleImageSelection = (imageId: string) => {
    setSelectedImageIds(prev =>
        prev.includes(imageId)
            ? prev.filter(id => id !== imageId)
            : [...prev, imageId]
    );
  };

  const handleShareSelected = async () => {
      const imagesToShare = problem.images.filter(img => selectedImageIds.includes(img.id));
      if (imagesToShare.length === 0) {
          addToast('יש לבחור לפחות תמונה אחת לשיתוף', 'warning');
          return;
      }
      try {
          const filesToShare = imagesToShare.map(img => ({ dataUrl: img.url || img.dataUrl!, name: img.name }));
          await shareFiles(filesToShare, `תמונות עבור תקלה: ${problem.description}`);
          setSelectedImageIds([]); // Clear selection after sharing
      } catch (error: any) {
          addToast(error.message, 'error');
      }
  };

  const openGallery = () => {
    setSelectedImageIds([]); // Reset selection when opening gallery
    setIsGalleryOpen(true);
  }


  return (
    <>
      <div className="bg-white shadow-2xs rounded-2xl flex items-start p-4 gap-4 border border-slate-200/80 transition-all duration-200 hover:shadow-md hover:border-slate-300 group">
        <button
          type="button"
          onClick={() => setIsDetailsModalOpen(true)}
          className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100 relative group/thumb transition-transform active:scale-95 border border-slate-200/70"
          title="הצג פרטים ותמונות"
          aria-label={`הצג פרטים ותמונות של תקלה: ${problem.description}`}
        >
          {hasImage && problemImageUrl ? (
            <>
              <img 
                  src={problemImageUrl}
                  alt={`תמונת תקלה: ${problem.description.substring(0, 30)}`}
                  className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
              />
              {problem.images.length > 1 && (
                <span className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md font-mono-numbers">
                  +{problem.images.length - 1}
                </span>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-1 bg-slate-50">
                <span className="text-[11px] font-semibold text-slate-400">ללא תמונה</span>
            </div>
          )}
        </button>
        
        <div className="flex-grow flex flex-col self-stretch min-w-0">
          <div className="flex justify-between items-start gap-2 mb-1.5">
            <h5 className="text-sm sm:text-base font-bold text-slate-900 flex-grow tracking-tight group-hover:text-sky-800 transition-colors" title={problem.description}>
              {problem.description}
            </h5>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-lg whitespace-nowrap border ${severityClasses.bg} ${severityClasses.text} border-current/20`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {problem.severity}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5 flex-wrap">
            {problem.locationTag && (
              <span className="font-medium text-slate-700">
                מיקום: {problem.locationTag}
              </span>
            )}
            {problem.isFixed && (
              <>
                <span aria-hidden="true">&bull;</span>
                <span className="font-semibold text-emerald-700">נפתרה</span>
              </>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-600 mb-3 text-ellipsis overflow-hidden leading-relaxed flex-grow">
            {problem.notes || 'אין הערות נוספות.'}
          </p>

          <div className="flex items-center justify-between mt-auto pt-2.5 border-t border-slate-100">
            <div className="flex items-center">
                <button onClick={() => onMove(problem.id, 'up')} disabled={isFirst} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors" title="הזז למעלה" aria-label="הזז תקלה למעלה">
                    <ChevronUpIcon className="w-4 h-4"/>
                </button>
                <button onClick={() => onMove(problem.id, 'down')} disabled={isLast} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors" title="הזז למטה" aria-label="הזז תקלה למטה">
                    <ChevronDownIcon className="w-4 h-4"/>
                </button>
            </div>
            <div className="flex items-center gap-1">
                  {problem.images.length > 0 && (
                    <button
                      onClick={openGallery}
                      className="inline-flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg text-xs font-semibold transition-colors"
                      title="צפה ושתף תמונות"
                      aria-label={`צפה ושתף ${problem.images.length} תמונות עבור ${problem.description}`}
                    >
                      <CameraIcon className="w-4 h-4" />
                      <span className="font-mono-numbers">{problem.images.length}</span>
                    </button>
                  )}
                  <Link
                      to={`/project/${projectId}/report/${reportId}/problem/${problem.id}/edit`}
                      className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                      title="ערוך תקלה"
                      aria-label={`ערוך תקלה: ${problem.description}`}
                  >
                      <PencilIcon className="w-4 h-4" />
                  </Link>
                  <button
                      onClick={() => onDelete(problem.id)}
                      className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="מחק תקלה"
                      aria-label={`מחק תקלה: ${problem.description}`}
                  >
                      <TrashIcon className="w-4 h-4" />
                  </button>
            </div>
          </div>
        </div>
      </div>
      
      <ProblemDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        problem={problem}
        project={project}
        allSuppliers={allSuppliers}
      />

      {isGalleryOpen && (
        <Modal
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
          title={`בחר תמונות לשיתוף`}
          size="xl"
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-2 max-h-[65vh] overflow-y-auto">
            {problem.images.map(image => (
              <div 
                key={image.id} 
                className="relative group border-2 rounded-lg overflow-hidden shadow-sm cursor-pointer"
                onClick={() => handleToggleImageSelection(image.id)}
                style={{ borderColor: selectedImageIds.includes(image.id) ? '#0284c7' : 'transparent' }}
              >
                <img
                  src={image.url || image.dataUrl}
                  alt={image.name}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute top-2 right-2 bg-white/80 rounded-full p-1 transition-opacity opacity-75 group-hover:opacity-100">
                  <div className={`w-5 h-5 rounded-full border-2 transition-colors ${selectedImageIds.includes(image.id) ? 'bg-sky-500 border-sky-600' : 'bg-white border-slate-400'}`}>
                    {selectedImageIds.includes(image.id) && <CheckCircleIcon className="w-full h-full text-white" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t flex justify-end">
            <button
              onClick={handleShareSelected}
              disabled={selectedImageIds.length === 0}
              className="px-6 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              שתף ({selectedImageIds.length}) תמונות
            </button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default ProblemItem;