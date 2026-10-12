import React, { useState } from 'react';
import Modal from './Modal';
import { ArrowDownTrayIcon, ArrowPathIcon } from '../icons/ActionIcons';
import { MagnifyingGlassIcon } from '../icons/ActionIcons';

export interface PhotoFileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
}

/**
 * Universal Media Lightbox (PhotoFileViewer)
 * Implements:
 * - Fullscreen dark backdrop (bg-black/90 backdrop-blur-md)
 * - Zoom in (+25%) and zoom out (-25%) with minimum and maximum bounds
 * - 90° clockwise rotation (essential for mobile photo uploads taken sideways)
 * - Direct file download button
 * - Fits modern SaaS dark/light tokens
 */
export const PhotoFileViewer: React.FC<PhotoFileViewerProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName = 'photo',
  mimeType = 'image/jpeg',
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  if (!isOpen || !fileUrl) return null;

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3.5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isPdf = mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 animate-fadeIn select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Top Header / Bar */}
      <div
        className="w-full max-w-5xl flex items-center justify-between text-white py-2 px-4 bg-neutral-900/80 border border-neutral-800 rounded-2xl shadow-xs backdrop-blur-sm z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="font-semibold text-sm sm:text-base text-neutral-100 truncate max-w-xs sm:max-w-md">
            {fileName}
          </span>
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
            {Math.round(zoom * 100)}%
          </span>
          {rotation > 0 && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300">
              {rotation}°
            </span>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!isPdf && (
            <>
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 disabled:opacity-40 transition shadow-2xs active:scale-95"
                title="הקטן (-25%)"
              >
                <span className="text-base font-bold leading-none px-1">−</span>
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 3.5}
                className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 disabled:opacity-40 transition shadow-2xs active:scale-95"
                title="הגדל (+25%)"
              >
                <span className="text-base font-bold leading-none px-1">+</span>
              </button>
              <button
                type="button"
                onClick={handleRotate}
                className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 transition shadow-2xs active:scale-95 flex items-center gap-1 text-xs"
                title="סובב 90° בכיוון השעון"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span className="hidden sm:inline">סובב 90°</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 transition text-xs font-medium"
                title="אפס תצוגה"
              >
                איפוס
              </button>
            </>
          )}

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition shadow-xs active:scale-95"
            title="הורד קובץ למכשיר"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span className="hidden sm:inline">הורדה</span>
          </button>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800/80 hover:bg-rose-900/60 hover:text-rose-300 text-neutral-300 transition shadow-2xs active:scale-95 text-base font-bold px-3"
            title="סגור"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Media Canvas Body */}
      <div
        className="flex-grow w-full flex items-center justify-center overflow-auto p-4 relative"
        onClick={onClose}
      >
        <div
          className="transition-transform duration-200 ease-out flex items-center justify-center max-w-full max-h-full"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {isPdf ? (
            <iframe
              src={`${fileUrl}#toolbar=1`}
              title={fileName}
              className="w-[85vw] h-[75vh] max-w-5xl rounded-2xl bg-white shadow-2xl border border-neutral-700"
            />
          ) : (
            <img
              src={fileUrl}
              alt={fileName}
              className="max-h-[80vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-neutral-800/60 bg-neutral-950"
            />
          )}
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="text-neutral-400 text-xs py-1 select-none pointer-events-none">
        לחץ בכל מקום מחוץ לתמונה לסגירה
      </div>
    </div>
  );
};

export default PhotoFileViewer;
