import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Tool, Shape } from '../../types';
import { generateId } from '../../utils/idGenerator';

// This tells TypeScript that a global variable 'fabric' exists, which is loaded via the CDN script in index.html.
declare const fabric: any;

// Type definitions for fabric.js objects to improve type safety.
type FabricCanvas = any;
type FabricGroup = any;
type FabricImage = any;
type FabricObject = any;

/**
 * Creates a fabric.js group representing an arrow.
 * @param points The start and end coordinates [fromX, fromY, toX, toY].
 * @param stroke The color of the arrow.
 * @param strokeWidth The width of the arrow line.
 * @returns A fabric.js Group object.
 */
const createArrow = (points: [number, number, number, number], stroke: string, strokeWidth: number): FabricGroup => {
    const [fromx, fromy, tox, toy] = points;
    const angle = Math.atan2(toy - fromy, tox - fromx);
    const headlen = strokeWidth * 3 + 5; // Arrow head size

    const line = new fabric.Line(points, {
        stroke: stroke,
        strokeWidth: strokeWidth,
        selectable: false,
        evented: false,
    });

    const arrowhead = new fabric.Triangle({
        left: tox,
        top: toy,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
        angle: (angle * 180) / Math.PI,
        width: headlen,
        height: headlen,
        fill: stroke,
    });

    return new fabric.Group([line, arrowhead], {
        left: fromx,
        top: fromy,
        selectable: true,
        evented: true,
    });
};

interface AnnotationCanvasProps {
    image: HTMLImageElement;
    shapes: Shape[];
    onShapesChange: (newShapes: Shape[]) => void;
    activeTool: Tool;
    toolSettings: {
        strokeColor: string;
        strokeWidth: number;
        fillColor: string;
    };
}

export const AnnotationCanvas = forwardRef<any, AnnotationCanvasProps>(({
    image, shapes, onShapesChange, activeTool, toolSettings
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<FabricCanvas | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDrawing = useRef(false);
    const currentShape = useRef<FabricObject | null>(null);
    const startPoint = useRef<{ x: number; y: number } | null>(null);

    useImperativeHandle(ref, () => ({
        deselectShape: () => {
            fabricCanvasRef.current?.discardActiveObject().renderAll();
        },
        getSelectedShapeId: () => {
            return (fabricCanvasRef.current?.getActiveObject() as any)?.id;
        },
        exportCanvas: async (): Promise<string> => {
            const canvas = fabricCanvasRef.current;
            if (!canvas) throw new Error("Canvas not available for export");
            canvas.discardActiveObject();
            canvas.renderAll();
            return canvas.toDataURL({ format: 'jpeg', quality: 0.9 });
        }
    }));
    
    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;
        const canvas = new fabric.Canvas(canvasRef.current, { selection: true });
        fabricCanvasRef.current = canvas;
        const resizeObserver = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            canvas.setWidth(width);
            canvas.setHeight(height);
            canvas.renderAll();
        });
        resizeObserver.observe(containerRef.current);
        return () => {
            resizeObserver.disconnect();
            if (canvas) {
                canvas.dispose();
            }
            fabricCanvasRef.current = null;
        };
    }, []);

    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || !image) return;
        fabric.Image.fromURL(image.src, (img: FabricImage, isError: boolean) => {
            if (isError || !img) {
                console.error("Fabric.js failed to load image from URL for annotation:", image.src);
                return;
            }
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                scaleX: canvas.width! / img.width!,
                scaleY: canvas.height! / img.height!,
                originX: 'left',
                originY: 'top',
            });
        }, { crossOrigin: 'Anonymous' });
    }, [image]);
    
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const canvasState = JSON.stringify(canvas.toJSON(['id']).objects);
        if (canvasState === JSON.stringify(shapes)) return;
        canvas.loadFromJSON({ objects: shapes }, () => {
            canvas.forEachObject((obj: any) => {
                obj.set({
                    borderColor: '#0284c7', cornerColor: '#ffffff', cornerStrokeColor: '#0284c7',
                    cornerSize: 10, transparentCorners: false,
                });
            });
            canvas.renderAll();
        });
    }, [shapes]);

    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        
        canvas.off('mouse:down');
        canvas.off('mouse:move');
        canvas.off('mouse:up');
        canvas.off('object:modified');
        canvas.off('path:created');
        canvas.off('editing:exited');

        const updateState = () => onShapesChange(canvas.toJSON(['id']).objects);

        canvas.on('object:modified', updateState);
        canvas.on('editing:exited', updateState);

        if (activeTool === 'pencil') {
            canvas.isDrawingMode = true;
            canvas.freeDrawingBrush.color = toolSettings.strokeColor;
            canvas.freeDrawingBrush.width = toolSettings.strokeWidth;
            canvas.on('path:created', (e: any) => {
                e.path.set('id', generateId());
                updateState();
            });
        } else {
            canvas.isDrawingMode = false;
        }

        if (['rectangle', 'circle', 'arrow', 'text'].includes(activeTool)) {
            canvas.selection = false;
            canvas.forEachObject((obj: any) => obj.set('selectable', false));

            canvas.on('mouse:down', (o: any) => {
                isDrawing.current = true;
                const pointer = canvas.getPointer(o.e);
                startPoint.current = { x: pointer.x, y: pointer.y };

                const commonProps = {
                    left: pointer.x, top: pointer.y,
                    stroke: toolSettings.strokeColor,
                    strokeWidth: toolSettings.strokeWidth,
                    fill: toolSettings.fillColor,
                    id: generateId(),
                };

                switch (activeTool) {
                    case 'rectangle': currentShape.current = new fabric.Rect({ ...commonProps, width: 0, height: 0 }); break;
                    case 'circle': currentShape.current = new fabric.Circle({ ...commonProps, radius: 0 }); break;
                    case 'arrow': currentShape.current = createArrow([pointer.x, pointer.y, pointer.x, pointer.y], toolSettings.strokeColor, toolSettings.strokeWidth); (currentShape.current as any).id = commonProps.id; break;
                    case 'text':
                        const text = new fabric.IText('הקלד כאן', { ...commonProps, fill: toolSettings.strokeColor, fontSize: 24, padding: 5 });
                        canvas.add(text);
                        canvas.setActiveObject(text);
                        text.enterEditing();
                        isDrawing.current = false;
                        currentShape.current = null;
                        break;
                }
                if (currentShape.current) canvas.add(currentShape.current);
            });

            canvas.on('mouse:move', (o: any) => {
                if (!isDrawing.current || !startPoint.current || !currentShape.current) return;
                const pointer = canvas.getPointer(o.e);
                const { x: startX, y: startY } = startPoint.current;

                switch (activeTool) {
                    case 'rectangle': currentShape.current.set({ width: Math.abs(pointer.x - startX), height: Math.abs(pointer.y - startY), left: Math.min(pointer.x, startX), top: Math.min(pointer.y, startY) }); break;
                    case 'circle': const radius = Math.sqrt(Math.pow(pointer.x - startX, 2) + Math.pow(pointer.y - startY, 2)) / 2; currentShape.current.set({ radius, left: startX + (pointer.x - startX) / 2, top: startY + (pointer.y - startY) / 2, originX: 'center', originY: 'center' }); break;
                    case 'arrow':
                        canvas.remove(currentShape.current);
                        const newArrow = createArrow([startX, startY, pointer.x, pointer.y], toolSettings.strokeColor, toolSettings.strokeWidth);
                        (newArrow as any).id = (currentShape.current as any).id;
                        currentShape.current = newArrow;
                        canvas.add(currentShape.current);
                        break;
                }
                canvas.renderAll();
            });

            canvas.on('mouse:up', () => {
                isDrawing.current = false;
                if (currentShape.current) {
                    updateState();
                    currentShape.current = null;
                }
            });
        } else {
            canvas.selection = true;
            canvas.forEachObject((obj: any) => obj.set('selectable', true));
        }

    }, [activeTool, toolSettings, onShapesChange]);

    return (
        <div ref={containerRef} className="w-full h-full touch-none">
            <canvas ref={canvasRef} />
        </div>
    );
});