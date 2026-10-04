import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DocumentPage } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { generateId } from '../../utils/idGenerator';
import LoadingSpinner from './LoadingSpinner';
import { CameraIcon, TrashIcon, PencilIcon } from '../icons/ActionIcons';
import { DocumentEditor } from './DocumentEditor';

interface DocumentScannerProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (pages: DocumentPage[], fileName: string) => void;
}

const DocumentScanner: React.FC<DocumentScannerProps> = ({ isOpen, onClose, onSave }) => {
    const { addToast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [pages, setPages] = useState<DocumentPage[]>([]);
    const [isCameraLoading, setIsCameraLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [fileName, setFileName] = useState(`Scanned_Doc_${new Date().toISOString().split('T')[0]}`);

    const startCamera = useCallback(async () => {
        if (stream) return;
        setIsCameraLoading(true);
    
        // Check if mediaDevices and getUserMedia are supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            addToast('הדפדפן שלך אינו תומך בגישה למצלמה.', 'error');
            onClose();
            return;
        }
    
        try {
            // Use Permissions API to check status first
            if (navigator.permissions && navigator.permissions.query) {
                const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
                if (permissionStatus.state === 'denied') {
                    addToast('הגישה למצלמה נחסמה. יש לאפשר אותה בהגדרות הדפדפן.', 'error');
                    onClose();
                    return;
                }
            }
            
            // If we're here, permission is either 'granted' or 'prompt'.
            // We can now safely call getUserMedia.
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
    
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            let errorMessage = 'שגיאה בגישה למצלמה. יש לוודא שניתנו הרשאות.';
            if (err instanceof DOMException) {
                if (err.name === 'NotAllowedError') {
                    errorMessage = 'הגישה למצלמה נדחתה. יש לרענן ולאשר גישה.';
                } else if (err.name === 'NotFoundError') {
                    errorMessage = 'לא נמצאה מצלמה במכשיר זה.';
                } else if (err.name === 'NotReadableError') {
                    errorMessage = 'שגיאת חומרה במצלמה. ייתכן שאפליקציה אחרת משתמשת בה.';
                }
            }
            console.error("Error accessing camera:", err);
            addToast(errorMessage, 'error');
            onClose();
        } finally {
            setIsCameraLoading(false);
        }
    }, [addToast, onClose, stream]);

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            if(videoRef.current) videoRef.current.srcObject = null;
        }
    }, [stream]);

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
            setPages([]); // Reset pages on close
        }
        return () => stopCamera();
    }, [isOpen, startCamera, stopCamera]);


    const handleCapture = () => {
        const video = videoRef.current;
        if (!video) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        
        const newPage: DocumentPage = {
            id: generateId(),
            originalDataUrl: dataUrl,
            editedDataUrl: dataUrl,
            annotationData: '[]'
        };
        setPages(prev => [...prev, newPage]);
        addToast(`עמוד ${pages.length + 1} צולם`, 'success');
    };

    const handleDeletePage = (id: string) => {
        setPages(prev => prev.filter(p => p.id !== id));
    };
    
    const handleEditorSave = (editedPages: DocumentPage[]) => {
        setPages(editedPages);
        setIsEditorOpen(false);
    };

    const handleFinalSave = () => {
        if (pages.length === 0) {
            addToast('יש לצלם לפחות עמוד אחד', 'warning');
            return;
        }
        if (!fileName.trim()) {
            addToast('יש להזין שם קובץ', 'warning');
            return;
        }
        onSave(pages, fileName);
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black z-[1000] flex flex-col p-4" role="dialog" aria-modal="true">
                <header className="flex-shrink-0 flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-white">סורק מסמכים</h2>
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-black bg-slate-200 hover:bg-slate-300 rounded-md shadow-sm">
                        ביטול
                    </button>
                </header>

                <main className="flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
                    <div className="flex-grow bg-slate-800 rounded-lg relative flex items-center justify-center">
                        {isCameraLoading && <LoadingSpinner text="טוען מצלמה..." />}
                        <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-contain ${isCameraLoading ? 'hidden' : ''}`}></video>
                        {!isCameraLoading && stream && (
                            <button onClick={handleCapture} className="absolute bottom-5 w-16 h-16 bg-white rounded-full border-4 border-slate-400 hover:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 flex items-center justify-center">
                                <CameraIcon className="w-8 h-8 text-slate-700" />
                            </button>
                        )}
                    </div>

                    <aside className="w-full md:w-64 flex-shrink-0 bg-slate-700 rounded-lg p-3 flex flex-col">
                        <h3 className="text-lg font-medium text-white mb-2">עמודים שצולמו ({pages.length})</h3>
                        <div className="flex-grow overflow-y-auto space-y-2 pr-2 -mr-2">
                           {pages.map((page, index) => (
                               <div key={page.id} className="bg-slate-600 rounded p-2 flex items-center gap-3">
                                   <img src={page.editedDataUrl} alt={`עמוד ${index + 1}`} className="w-12 h-16 object-cover rounded-sm border-2 border-slate-500"/>
                                   <span className="text-white font-medium flex-grow">עמוד {index + 1}</span>
                                   <button onClick={() => handleDeletePage(page.id)} className="p-1.5 text-red-300 hover:text-white hover:bg-red-500 rounded-full">
                                       <TrashIcon className="w-4 h-4" />
                                   </button>
                               </div>
                           ))}
                           {pages.length === 0 && <p className="text-slate-400 text-sm text-center pt-8">עדיין לא צולמו עמודים.</p>}
                        </div>
                    </aside>
                </main>
                
                <footer className="flex-shrink-0 mt-4 pt-4 border-t border-slate-600 flex flex-wrap justify-between items-center gap-4">
                    <input 
                        type="text"
                        value={fileName}
                        onChange={e => setFileName(e.target.value)}
                        placeholder="שם הקובץ (PDF)"
                        className="input-class bg-slate-800 border-slate-600 text-white px-3 py-2 rounded-md focus:ring-sky-500 focus:border-sky-500"
                    />
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsEditorOpen(true)} disabled={pages.length === 0} className="btn-secondary disabled:opacity-50 flex items-center gap-2">
                            <PencilIcon className="w-5 h-5" />
                            עריכה וחתימה
                        </button>
                        <button onClick={handleFinalSave} disabled={pages.length === 0} className="btn-primary disabled:opacity-50">
                            שמור כמסמך PDF
                        </button>
                    </div>
                </footer>
            </div>
            
            {isEditorOpen && (
                <DocumentEditor 
                    isOpen={isEditorOpen}
                    onClose={() => setIsEditorOpen(false)}
                    onSave={handleEditorSave}
                    initialPages={pages}
                />
            )}
            
            <style>{`
                .input-class { border: 1px solid #cbd5e1; border-radius: 0.375rem; }
                .btn-primary { padding: 0.5rem 1rem; background-color: #0284c7; color: white; border-radius: 0.375rem; font-weight: 500; }
                .btn-primary:hover:not(:disabled) { background-color: #0369a1; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 0.375rem; font-weight: 500; }
                .btn-secondary:hover:not(:disabled) { background-color: #e2e8f0; }
            `}</style>
        </>
    );
};

export default DocumentScanner;