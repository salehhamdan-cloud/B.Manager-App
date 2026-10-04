
import React, { useRef, useEffect, useState } from 'react';
import { TrashIcon, PencilIcon } from '../icons/ActionIcons';
import { useToast } from '../../contexts/ToastContext';
import Modal from './Modal';

interface SignaturePadProps {
    title: string;
    onSave: (dataUrl: string) => void;
    onClear: () => void;
    signatureUrl?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ title, onSave, onClear, signatureUrl }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSigned, setHasSigned] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { addToast } = useToast();

    const getContext = () => canvasRef.current?.getContext('2d');

    const initializeCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = getContext();
        if (!ctx) return;

        const container = canvas.parentElement;
        if (container) {
            const width = container.clientWidth;
            canvas.width = width;
            canvas.height = width / 2; // Maintain a 2:1 aspect ratio
        }
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setHasSigned(false);
    };

    useEffect(() => {
        if (isModalOpen) {
            // Delay initialization to ensure modal and container are rendered and sized
            setTimeout(initializeCanvas, 50);
            window.addEventListener('resize', initializeCanvas);
        }
        return () => window.removeEventListener('resize', initializeCanvas);
    }, [isModalOpen]);

    const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
        event.preventDefault();
        const ctx = getContext();
        if (!ctx) return;
        const pos = getPosition(event);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        setIsDrawing(true);
        setHasSigned(true);
    };

    const draw = (event: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        event.preventDefault();
        const ctx = getContext();
        if (!ctx) return;
        const pos = getPosition(event);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const stopDrawing = (event: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        event.preventDefault(); // Prevent further actions like scrolling
        const ctx = getContext();
        if (!ctx) return;
        ctx.closePath();
        setIsDrawing(false);
    };

    const getPosition = (event: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if ('touches' in event) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = getContext();
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setHasSigned(false);
        }
    };

    const handleSaveAndClose = () => {
        const canvas = canvasRef.current;
        if (canvas && hasSigned) {
            // A simple check to see if the canvas is more than just a blank image
            if (canvas.toDataURL().length > 2000) { 
                onSave(canvas.toDataURL('image/png'));
                addToast('חתימה נשמרה', 'success');
                setIsModalOpen(false);
            } else {
                addToast('אנא חתום לפני השמירה', 'warning');
            }
        } else {
            addToast('אנא חתום לפני השמירה', 'warning');
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">{title}</label>
            <div className="border border-slate-300 rounded-md bg-white p-2 min-h-[100px] flex items-center justify-center">
                {signatureUrl ? (
                    <div className="text-center w-full">
                        <img src={signatureUrl} alt="חתימה" className="max-h-24 mx-auto object-contain cursor-pointer" onClick={() => setIsModalOpen(true)} title="ערוך חתימה" />
                        <button type="button" onClick={onClear} className="mt-2 text-sm text-red-600 hover:underline">
                            מחק חתימה
                        </button>
                    </div>
                ) : (
                    <button type="button" onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium py-4">
                        <PencilIcon className="w-5 h-5" />
                        הוסף חתימה
                    </button>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="חתימה">
                <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-md touch-none">
                     <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="cursor-crosshair w-full"
                    />
                </div>
                <div className="flex justify-between items-center mt-4">
                    <button type="button" onClick={clearCanvas} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600">
                        <TrashIcon className="w-5 h-5"/>
                        נקה
                    </button>
                    <div className="flex gap-2">
                         <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md shadow-sm">
                            ביטול
                        </button>
                        <button type="button" onClick={handleSaveAndClose} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md shadow-sm">
                            שמור חתימה
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SignaturePad;
