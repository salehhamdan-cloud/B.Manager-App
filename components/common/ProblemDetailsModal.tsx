import React, { useState, useMemo } from 'react';
import { Problem, AnnotatedImage, Project, Supplier } from '../../types';
import Modal from './Modal';
import { SEVERITY_COLORS } from '../../constants';

interface ProblemDetailsModalProps {
  problem: Problem | null;
  project: Project | null;
  allSuppliers: Supplier[];
  isOpen: boolean;
  onClose: () => void;
}

const ImageViewer: React.FC<{ image: AnnotatedImage; onClose: () => void }> = ({ image, onClose }) => (
    <div
        className="fixed inset-0 bg-black/80 z-[1001] flex items-center justify-center p-4 animate-fadeIn"
        style={{ animationDuration: '0.2s' }}
        onClick={onClose}
    >
        <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img
                src={image.url || image.dataUrl}
                alt={image.caption || image.name}
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            {image.caption && (
                <p className="text-white text-center mt-3 bg-black/50 p-2 rounded-md">
                    {image.caption}
                </p>
            )}
            <button
                onClick={onClose}
                className="absolute -top-3 -right-3 bg-white/80 text-black p-1 rounded-full text-2xl w-8 h-8 flex items-center justify-center leading-none hover:bg-white transition-colors"
                aria-label="Close image viewer"
            >
                &times;
            </button>
        </div>
    </div>
);


const ProblemDetailsModal: React.FC<ProblemDetailsModalProps> = ({ problem, project, allSuppliers, isOpen, onClose }) => {
  const [viewingImage, setViewingImage] = useState<AnnotatedImage | null>(null);

  const associatedWorkers = useMemo(() => {
    if (!problem?.workerIds || !project?.workers) return [];
    return project.workers.filter(w => problem.workerIds!.includes(w.id));
  }, [problem, project]);

  const associatedSuppliers = useMemo(() => {
    if (!problem?.supplierIds || !allSuppliers) return [];
    return allSuppliers.filter(s => problem.supplierIds!.includes(s.id));
  }, [problem, allSuppliers]);
  
  const associatedTenants = useMemo(() => {
    if (!problem?.tenantIds || !project?.tenants) return [];
    return project.tenants.filter(t => problem.tenantIds!.includes(t.id));
  }, [problem, project]);


  if (!problem) return null;

  const handleClose = () => {
    setViewingImage(null);
    onClose();
  };

  const severityClasses = SEVERITY_COLORS[problem.severity] || { bg: 'bg-slate-100', text: 'text-slate-700' };

  return (
    <>
        <Modal isOpen={isOpen} onClose={handleClose} title="פרטי תקלה" size="xl">
        <div className="space-y-4">
            <header className="pb-4 border-b">
                <p className="text-lg font-semibold text-slate-800">{problem.description}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${severityClasses.bg} ${severityClasses.text}`}>
                        חומרה: {problem.severity}
                    </span>
                    {problem.locationTag && <span><strong>מיקום:</strong> {problem.locationTag}</span>}
                </div>
            </header>

            {problem.notes && (
                <div className="prose max-w-none">
                    <h3 className="text-md font-semibold text-slate-700">הערות נוספות:</h3>
                    <p className="text-slate-600">{problem.notes}</p>
                </div>
            )}

            {(associatedWorkers.length > 0 || associatedSuppliers.length > 0 || associatedTenants.length > 0) && (
            <div className="pt-4 border-t">
              <h3 className="text-md font-semibold text-slate-700 mb-2">גורמים משויכים</h3>
              <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
                {associatedWorkers.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-600">עובדים:</h4>
                    <ul className="list-disc list-inside text-slate-800">
                      {associatedWorkers.map(w => <li key={w.id}>{w.name}</li>)}
                    </ul>
                  </div>
                )}
                {associatedSuppliers.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-600">ספקים:</h4>
                    <ul className="list-disc list-inside text-slate-800">
                      {associatedSuppliers.map(s => <li key={s.id}>{s.name} ({s.group})</li>)}
                    </ul>
                  </div>
                )}
                 {associatedTenants.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-600">דיירים:</h4>
                    <ul className="list-disc list-inside text-slate-800">
                      {associatedTenants.map(t => <li key={t.id}>{t.name}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
            
            <div>
                <h3 className="text-md font-semibold text-slate-700 mb-2">תמונות ({problem.images.length}):</h3>
                {problem.images.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {problem.images.map(image => (
                            <div key={image.id}>
                                <button 
                                    type="button" 
                                    onClick={() => setViewingImage(image)} 
                                    className="border rounded-lg overflow-hidden shadow-sm block w-full hover:shadow-lg transition-shadow"
                                >
                                    <img
                                        src={image.url || image.dataUrl}
                                        alt={image.caption || image.name}
                                        className="w-full h-48 object-cover"
                                    />
                                </button>
                                {image.caption && (
                                    <p className="text-xs text-slate-600 mt-1 text-center bg-slate-50 p-1 rounded-b-md">
                                        {image.caption}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500 text-center py-4">אין תמונות מצורפות לתקלה זו.</p>
                )}
            </div>
        </div>
        </Modal>

        {viewingImage && <ImageViewer image={viewingImage} onClose={() => setViewingImage(null)} />}
    </>
  );
};

export default ProblemDetailsModal;