import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { ArrowDownTrayIcon, ArrowPathIcon, DocumentDuplicateIcon } from '../icons/ActionIcons';
import { FolderIcon } from '../icons/NavigationIcons';
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker to prevent network failures
try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;
    }
} catch {
    // Worker fallback
}

export interface ViewableFile {
    name: string;
    url?: string;
    dataUrl?: string;
    mimeType?: string;
    size?: number;
    group?: string;
    uploadedAt?: string;
}

interface UniversalFileViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: ViewableFile | null;
}

/**
 * Robust helper to convert a base64 Data URL or string to a clean Uint8Array
 */
const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
    const base64Index = dataUrl.indexOf(';base64,');
    if (base64Index !== -1) {
        const base64 = dataUrl.substring(base64Index + 8);
        const binaryStr = atob(base64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        return bytes;
    }
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex !== -1) {
        const raw = decodeURIComponent(dataUrl.substring(commaIndex + 1));
        const len = raw.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = raw.charCodeAt(i);
        }
        return bytes;
    }
    try {
        const binaryStr = atob(dataUrl);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        return bytes;
    } catch {
        return new Uint8Array(0);
    }
};

/**
 * Creates a downloadable and viewable Blob URL from a data URL or returns the existing URL
 */
const getBlobUrl = (src: string, mimeType: string): string => {
    if (src.startsWith('data:')) {
        try {
            const bytes = dataUrlToUint8Array(src);
            const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
            return URL.createObjectURL(blob);
        } catch (e) {
            console.warn('Failed to convert dataUrl to Blob URL:', e);
            return src;
        }
    }
    return src;
};

export const UniversalFileViewerModal: React.FC<UniversalFileViewerModalProps> = ({
    isOpen,
    onClose,
    file,
}) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.2);
    const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
    const [blobUrl, setBlobUrl] = useState<string>('');
    const [viewMode, setViewMode] = useState<'native' | 'canvas'>('native');

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const renderTaskRef = useRef<any>(null);
    const pdfDocRef = useRef<any>(null);

    const fileSrc = file?.url || file?.dataUrl || '';
    const rawMime = file?.mimeType?.toLowerCase() || '';
    const fileName = file?.name?.toLowerCase() || '';

    const isPdf = rawMime.includes('pdf') || fileName.endsWith('.pdf') || fileSrc.startsWith('data:application/pdf');
    const isImage = rawMime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|bmp)$/i.test(fileName) || fileSrc.startsWith('data:image/');

    // Generate clean blob URL for download and opening
    useEffect(() => {
        if (!fileSrc) {
            setBlobUrl('');
            return;
        }
        const effectiveMime = isPdf ? 'application/pdf' : (rawMime || 'application/octet-stream');
        const bUrl = getBlobUrl(fileSrc, effectiveMime);
        setBlobUrl(bUrl);

        return () => {
            if (bUrl && bUrl.startsWith('blob:')) {
                URL.revokeObjectURL(bUrl);
            }
        };
    }, [fileSrc, isPdf, rawMime]);

    // Load PDF Document with pdfjs when in canvas mode or for counting pages
    useEffect(() => {
        if (!isOpen || !fileSrc || !isPdf) {
            setNumPages(0);
            setCurrentPage(1);
            pdfDocRef.current = null;
            return;
        }

        let isCancelled = false;
        setIsLoadingPdf(true);

        const loadPdf = async () => {
            try {
                let data: Uint8Array;
                if (fileSrc.startsWith('data:')) {
                    data = dataUrlToUint8Array(fileSrc);
                } else {
                    const response = await fetch(fileSrc);
                    const buffer = await response.arrayBuffer();
                    data = new Uint8Array(buffer);
                }

                if (data.length === 0) {
                    setIsLoadingPdf(false);
                    return;
                }

                const loadingTask = pdfjsLib.getDocument({
                    data,
                });

                const pdfDoc = await loadingTask.promise;
                if (isCancelled) return;

                pdfDocRef.current = pdfDoc;
                setNumPages(pdfDoc.numPages);
                setCurrentPage(1);
                setIsLoadingPdf(false);
            } catch (err: any) {
                if (isCancelled) return;
                console.warn('PDF.js loading notice (using native browser display):', err);
                setIsLoadingPdf(false);
            }
        };

        loadPdf();

        return () => {
            isCancelled = true;
        };
    }, [isOpen, fileSrc, isPdf]);

    // Render current page onto canvas when in canvas mode
    useEffect(() => {
        if (viewMode !== 'canvas' || !pdfDocRef.current || !canvasRef.current || currentPage < 1) {
            return;
        }

        let isSubscribed = true;

        const renderPage = async () => {
            try {
                if (renderTaskRef.current) {
                    try {
                        renderTaskRef.current.cancel();
                    } catch {
                        // ignore cancellation
                    }
                }

                const page = await pdfDocRef.current.getPage(currentPage);
                if (!isSubscribed || !canvasRef.current) return;

                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                if (!context) return;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                const renderTask = page.render(renderContext);
                renderTaskRef.current = renderTask;
                await renderTask.promise;
            } catch (err: any) {
                if (err?.name === 'RenderingCancelledException') {
                    return;
                }
                console.warn('Page render notice:', err);
            }
        };

        renderPage();

        return () => {
            isSubscribed = false;
        };
    }, [currentPage, scale, numPages, viewMode]);

    if (!isOpen || !file) return null;

    const handleDownload = () => {
        if (!fileSrc) return;
        const link = document.createElement('a');
        link.href = blobUrl || fileSrc;
        link.download = file.name || 'document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleOpenInNewTab = () => {
        const targetUrl = blobUrl || fileSrc;
        if (!targetUrl) return;
        try {
            const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
            if (!win) {
                const a = document.createElement('a');
                a.href = targetUrl;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        } catch {
            handleDownload();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2 max-w-md truncate">
                    <span className="truncate">{file.name}</span>
                    {file.group && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {file.group}
                        </span>
                    )}
                </div>
            }
            size="2xl"
        >
            <div className="flex flex-col h-[78vh] -mt-2">
                {/* Top Control Bar */}
                <div className="flex items-center justify-between p-3 bg-slate-100 border-b border-slate-200 rounded-t-lg gap-2 flex-wrap">
                    {/* View mode toggle for PDF */}
                    {isPdf && (
                        <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200 text-xs shadow-2xs">
                            <button
                                type="button"
                                onClick={() => setViewMode('native')}
                                className={`px-2.5 py-1 rounded-md font-medium transition ${
                                    viewMode === 'native'
                                        ? 'bg-sky-600 text-white shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                מציג מובנה (חלק)
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('canvas')}
                                className={`px-2.5 py-1 rounded-md font-medium transition ${
                                    viewMode === 'canvas'
                                        ? 'bg-sky-600 text-white shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                מציג עמודים {numPages > 0 ? `(${numPages})` : ''}
                            </button>
                        </div>
                    )}

                    {/* Page navigation for PDF in Canvas Mode */}
                    {isPdf && viewMode === 'canvas' && numPages > 0 && (
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-700">
                            <button
                                type="button"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage <= 1}
                                className="px-2.5 py-1 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 shadow-2xs"
                            >
                                הקודם
                            </button>
                            <span className="px-2">
                                עמוד <strong>{currentPage}</strong> מתוך <strong>{numPages}</strong>
                            </span>
                            <button
                                type="button"
                                onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                                disabled={currentPage >= numPages}
                                className="px-2.5 py-1 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 shadow-2xs"
                            >
                                הבא
                            </button>
                        </div>
                    )}

                    {/* Zoom Controls for Canvas Mode */}
                    {isPdf && viewMode === 'canvas' && (
                        <div className="hidden sm:flex items-center gap-1 text-xs">
                            <button
                                type="button"
                                onClick={() => setScale(s => Math.max(0.6, s - 0.2))}
                                className="px-2 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50"
                                title="הקטן"
                            >
                                -
                            </button>
                            <span className="px-1 text-slate-600 font-mono">{Math.round(scale * 100)}%</span>
                            <button
                                type="button"
                                onClick={() => setScale(s => Math.min(2.5, s + 0.2))}
                                className="px-2 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50"
                                title="הגדל"
                            >
                                +
                            </button>
                            <button
                                type="button"
                                onClick={() => setScale(1.2)}
                                className="px-2 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 text-[11px]"
                            >
                                איפוס
                            </button>
                        </div>
                    )}

                    {/* Actions: Download & Open in New Tab */}
                    <div className="flex items-center gap-2 mr-auto">
                        <button
                            type="button"
                            onClick={handleDownload}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition"
                            title="הורד קובץ למכשיר"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            <span>הורד קובץ</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenInNewTab}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-medium rounded-lg shadow-2xs transition"
                            title="פתח בחלון מלא / כרטיסייה חדשה"
                        >
                            <DocumentDuplicateIcon className="w-4 h-4 text-slate-500" />
                            <span>פתח בחלון מלא</span>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-grow overflow-auto p-2 sm:p-4 bg-slate-900/5 flex items-center justify-center relative">
                    {/* PDF Viewer Mode */}
                    {isPdf && (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                            {viewMode === 'native' ? (
                                <div className="w-full h-full bg-white rounded-xl shadow-xs overflow-hidden border border-slate-200">
                                    {blobUrl ? (
                                        <object
                                            data={`${blobUrl}#toolbar=1&navpanes=0`}
                                            type="application/pdf"
                                            className="w-full h-full min-h-[60vh]"
                                        >
                                            <iframe
                                                src={`${blobUrl}#toolbar=1`}
                                                title={file.name}
                                                className="w-full h-full min-h-[60vh] border-0"
                                            >
                                                <div className="p-8 text-center bg-white h-full flex flex-col items-center justify-center gap-4">
                                                    <p className="text-slate-700 font-medium">דפדפן זה אינו תומך בהטבעת PDF ישירה.</p>
                                                    <button onClick={handleDownload} className="btn-primary py-2 px-4">
                                                        הורד את הקובץ לצפייה
                                                    </button>
                                                </div>
                                            </iframe>
                                        </object>
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <ArrowPathIcon className="w-8 h-8 text-sky-600 animate-spin" />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-start min-h-full w-full py-4">
                                    {isLoadingPdf && (
                                        <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-10">
                                            <ArrowPathIcon className="w-8 h-8 text-sky-600 animate-spin" />
                                            <p className="text-sm font-medium text-slate-700">טוען קובץ PDF עם מציג מסמכים מובנה...</p>
                                        </div>
                                    )}

                                    <div className="bg-white p-2 sm:p-4 rounded-xl shadow-md border border-slate-200 overflow-auto max-w-full">
                                        <canvas ref={canvasRef} className="max-w-full h-auto mx-auto block shadow-xs rounded" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Image Viewer Mode */}
                    {isImage && (
                        <div className="flex items-center justify-center max-h-full w-full p-2">
                            <img
                                src={blobUrl || fileSrc}
                                alt={file.name}
                                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-md border border-slate-200 bg-white"
                            />
                        </div>
                    )}

                    {/* Generic / Unknown File Type */}
                    {!isPdf && !isImage && (
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md my-auto">
                            <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-4 border border-sky-100">
                                <FolderIcon className="w-8 h-8" />
                            </div>
                            <h4 className="font-bold text-slate-800 text-lg mb-1">{file.name}</h4>
                            <p className="text-xs text-slate-500 mb-6">
                                קובץ מסוג {file.mimeType || 'לא ידוע'}. ניתן להוריד את הקובץ ולפתוח אותו באמצעות תוכנה מתאימה במכשיר.
                            </p>
                            <button
                                type="button"
                                onClick={handleDownload}
                                className="btn-primary py-2.5 px-6 text-sm flex items-center justify-center gap-2 mx-auto"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                <span>הורד קובץ למכשיר</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default UniversalFileViewerModal;
