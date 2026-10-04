import React, { useRef, useEffect, useState, useCallback } from 'react';
import Modal from './Modal';
import { AnnotationCanvas } from './AnnotationCanvas';
import { Tool, Shape, DocumentPage } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import LoadingSpinner from './LoadingSpinner';
import { PencilScribbleIcon, TrashIcon } from '../icons/ActionIcons';
import { ArrowLeftIcon, ArrowRightIcon } from '../icons/GeneralIcons';


const ToolButton: React.FC<{ title: string; active: boolean; onClick: () => void; children: React.ReactNode }> = ({ title, active, onClick, children }) => (
    <button
        type="button"
        title={title}
        onClick={onClick}
        className={`p-2 rounded-lg transition-colors ${active ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
    >
        {children}
    </button>
);

interface DocumentEditorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (pages: DocumentPage[]) => void;
    initialPages: DocumentPage[];
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({ isOpen, onClose, onSave, initialPages }) => {
    const canvasRef = useRef<any>(null);
    const { addToast } = useToast();

    const [pages, setPages] = useState<DocumentPage[]>([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [activeTool, setActiveTool] = useState<Tool>('select');
    const [toolSettings, setToolSettings] = useState({ strokeColor: '#ff0000', strokeWidth: 5, fillColor: 'transparent' });
    
    // History is managed per page-edit session to simplify.
    const [shapes, setShapes] = useState<Shape[]>([]);
    const [history, setHistory] = useState<Shape[][]>([[]]);
    const [historyStep, setHistoryStep] = useState(0);
    
    const currentPage = pages[currentPageIndex];

    useEffect(() => {
        if (isOpen) {
            setPages(JSON.parse(JSON.stringify(initialPages))); // Deep copy
            setCurrentPageIndex(0);
        }
    }, [isOpen, initialPages]);

    useEffect(() => {
        if (!isOpen || !currentPage) {
            setImage(null);
            return;
        }

        setIsLoading(true);
        const img = new window.Image();
        img.crossOrigin = 'Anonymous';
        
        const handleLoad = () => {
            setImage(img);
            setIsLoading(false);
            try {
                const parsedData = JSON.parse(currentPage.annotationData || '[]');
                const initialShapes = Array.isArray(parsedData) ? parsedData : [];
                setShapes(initialShapes);
                setHistory([initialShapes]);
                setHistoryStep(0);
            } catch (e) {
                addToast('Could not load annotations for this page.', 'warning');
                setShapes([]);
                setHistory([[]]);
                setHistoryStep(0);
            }
        };

        img.onload = handleLoad;
        img.onerror = () => {
            addToast('Failed to load image for editing.', 'error');
            setIsLoading(false);
        };
        
        // Use the edited version if it exists, otherwise the original
        img.src = currentPage.editedDataUrl || currentPage.originalDataUrl;
    }, [currentPage, isOpen, addToast]);


    const handleShapesChange = (newShapes: Shape[]) => {
        setShapes(newShapes);
        const newHistory = history.slice(0, historyStep + 1);
        newHistory.push(newShapes);
        setHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
    };

    const saveCurrentPageChanges = async () => {
        if (!canvasRef.current || !currentPage) return false;
        canvasRef.current.deselectShape();

        try {
            const annotatedDataUrl = await canvasRef.current.exportCanvas();
            const annotationData = JSON.stringify(shapes);
            
            setPages(prevPages => prevPages.map((page, index) => 
                index === currentPageIndex
                    ? { ...page, editedDataUrl: annotatedDataUrl, annotationData }
                    : page
            ));
            return true;
        } catch (error) {
            addToast('Failed to save page annotations.', 'error');
            console.error(error);
            return false;
        }
    };

    const goToPage = async (newIndex: number) => {
        const saved = await saveCurrentPageChanges();
        if (saved && newIndex >= 0 && newIndex < pages.length) {
            setCurrentPageIndex(newIndex);
        }
    };
    
    const handleFinalSave = async () => {
        const saved = await saveCurrentPageChanges();
        if (saved) {
            // We need to wait for the state update to complete before saving.
            // Awaiting a small timeout is a simple way to achieve this.
            setTimeout(() => {
                onSave(pages);
            }, 50);
        }
    };
    
    const handleUndo = useCallback(() => {
        if (historyStep > 0) {
            const newStep = historyStep - 1;
            setHistoryStep(newStep);
            setShapes(history[newStep]);
        }
    }, [history, historyStep]);

    const handleRedo = useCallback(() => {
        if (historyStep < history.length - 1) {
            const newStep = historyStep + 1;
            setHistoryStep(newStep);
            setShapes(history[newStep]);
        }
    }, [history, historyStep]);

     const handleDeleteSelected = () => {
        const selectedId = canvasRef.current?.getSelectedShapeId();
        if (selectedId) {
            const newShapes = shapes.filter(s => s.id !== selectedId);
            handleShapesChange(newShapes);
            canvasRef.current?.deselectShape();
        } else {
            addToast("Please select a shape to delete.", "info");
        }
    };

    const tools: { name: Tool, title: string, icon: React.ReactNode }[] = [
        { name: 'select', title: 'Select/Move', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25a.75.75 0 01.75.75v.008l.008.008.008.008v.008l.008.008.008.008.008.008h.008a.75.75 0 010 1.5h-.008l-.008-.008L12 3.75l-.008.008-.008.008-.008.008v.008l-.008.008-.008.008H11.25a.75.75 0 010-1.5h.008l.008-.008.008-.008.008-.008V3a.75.75 0 01.75-.75z" /></svg> },
        { name: 'pencil', title: 'Pencil', icon: <PencilScribbleIcon className="w-5 h-5"/> },
        { name: 'rectangle', title: 'Rectangle', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.563A.563.563 0 019 14.437V9.563z" /></svg> },
        { name: 'circle', title: 'Circle', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        { name: 'arrow', title: 'Arrow', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg> },
        { name: 'text', title: 'Text', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-6.75 3h9m-9 3h3.375c.621 0 1.125-.504 1.125-1.125V18.375m-3.375 2.25c.621 0 1.125-.504 1.125-1.125V18.375m-3.375 2.25h13.5m-13.5 0V6.75A2.25 2.25 0 015.25 4.5h9.5A2.25 2.25 0 0117.25 6.75v12.75" /></svg> },
    ];
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Document Editor" size="full">
            <div className="flex flex-col h-full bg-slate-800">
                <header className="flex-shrink-0 p-2 bg-slate-900 flex items-center justify-between gap-4">
                     <div className="flex items-center gap-2">
                        {tools.map(tool => ( <ToolButton key={tool.name} title={tool.title} active={activeTool === tool.name} onClick={() => setActiveTool(tool.name)}>{tool.icon}</ToolButton> ))}
                         <ToolButton title="Delete Selected" active={false} onClick={handleDeleteSelected}><TrashIcon className="w-5 h-5"/></ToolButton>
                    </div>
                     <div className="flex items-center gap-3 text-white">
                        <button onClick={() => goToPage(currentPageIndex - 1)} disabled={currentPageIndex === 0} className="p-2 disabled:opacity-50"><ArrowRightIcon className="w-5 h-5"/></button>
                        <span>עמוד {currentPageIndex + 1} / {pages.length}</span>
                        <button onClick={() => goToPage(currentPageIndex + 1)} disabled={currentPageIndex === pages.length - 1} className="p-2 disabled:opacity-50"><ArrowLeftIcon className="w-5 h-5"/></button>
                    </div>
                     <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-slate-300">Color:<input type="color" value={toolSettings.strokeColor} onChange={e => setToolSettings(s => ({...s, strokeColor: e.target.value}))} className="bg-transparent border-0 w-8 h-8 p-0" /></label>
                        <ToolButton title="Undo" active={false} onClick={handleUndo}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg></ToolButton>
                         <ToolButton title="Redo" active={false} onClick={handleRedo}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" /></svg></ToolButton>
                    </div>
                </header>
                <main className="flex-grow relative flex items-center justify-center overflow-auto p-4 bg-slate-800">
                   {isLoading || !image ? ( <LoadingSpinner text="טוען עמוד..." /> ) : (
                        <AnnotationCanvas
                            ref={canvasRef}
                            image={image}
                            shapes={shapes}
                            onShapesChange={handleShapesChange}
                            activeTool={activeTool}
                            toolSettings={toolSettings}
                        />
                    )}
                </main>
                <footer className="flex-shrink-0 p-3 bg-slate-900 flex justify-end gap-3">
                     <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md">Cancel</button>
                    <button type="button" onClick={handleFinalSave} className="px-6 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md shadow-sm">Save & Close</button>
                </footer>
            </div>
        </Modal>
    );
};