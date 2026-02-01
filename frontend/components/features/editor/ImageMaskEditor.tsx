"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Transformer } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import { Plus, Trash2, Scan, MousePointer2 } from 'lucide-react';
import { cn } from "@/lib/utils";

interface Mask {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'privacy' | 'highlight';
}

interface ImageMaskEditorProps {
    imageUrl: string;
    initialMasks?: Array<{
        box_2d: number[]; // [ymin, xmin, ymax, xmax] 0-1000
        label?: string;
        type?: 'privacy' | 'highlight';
    }>;
    onUpdate: (masks: Array<{ box_2d: number[], label: string, type: 'privacy' | 'highlight' }>) => void;
    className?: string;
}

export function ImageMaskEditor({ imageUrl, initialMasks, onUpdate, className }: ImageMaskEditorProps) {
    const [image] = useImage(imageUrl);
    const [masks, setMasks] = useState<Mask[]>([]);
    const [selectedId, selectShape] = useState<string | null>(null);
    const stageRef = useRef<Konva.Stage>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Initialize masks from props
    useEffect(() => {
        if (image && initialMasks) {
            const newMasks = initialMasks.map((m, i) => {
                const coords = m.box_2d;
                let [ymin, xmin, ymax, xmax] = coords;

                // STRICTLY assume 0-1000 scale as per backend contract
                const scaleX = image.naturalWidth / 1000;
                const scaleY = image.naturalHeight / 1000;

                // Try to preserve existing ID to maintain selection state
                const existingId = masks.find(existing =>
                    Math.abs(existing.x - xmin * scaleX) < 1 &&
                    Math.abs(existing.y - ymin * scaleY) < 1
                )?.id;
                const id = existingId || `mask-${i}`;

                return {
                    id: id,
                    x: xmin * scaleX,
                    y: ymin * scaleY,
                    width: (xmax - xmin) * scaleX,
                    height: (ymax - ymin) * scaleY,
                    type: (m.type as 'privacy' | 'highlight') || 'privacy'
                };
            });

            setMasks(newMasks);
        }
    }, [image, initialMasks]);

    // Handle container resize
    useEffect(() => {
        const updateDimensions = () => {
            if (image && containerRef.current) {
                const containerWidth = containerRef.current.clientWidth;
                // Calculate height based on aspect ratio
                const ratio = image.naturalHeight / image.naturalWidth;
                const height = containerWidth * ratio;

                const scale = containerWidth / image.naturalWidth;
                setDimensions({
                    width: containerWidth,
                    height: height
                });
            }
        };

        updateDimensions();
        // Add resize listener just in case
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [image]);

    // Setup transformer
    useEffect(() => {
        if (selectedId && transformerRef.current && stageRef.current) {
            const node = stageRef.current.findOne('#' + selectedId);
            if (node) {
                transformerRef.current.nodes([node]);
                transformerRef.current.getLayer()?.batchDraw();
            }
        }
    }, [selectedId]);


    const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, id: string) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        // Reset scale and update width/height
        node.scaleX(1);
        node.scaleY(1);

        const newMasks = masks.map(mask => {
            if (mask.id === id) {
                // Use Math.abs to handle negative scaling (flipping)
                const newWidth = Math.abs(node.width() * scaleX);
                const newHeight = Math.abs(node.height() * scaleY);

                return {
                    ...mask,
                    x: node.x(),
                    y: node.y(),
                    width: newWidth,
                    height: newHeight,
                };
            }
            return mask;
        });
        setMasks(newMasks);
        notifyUpdate(newMasks);
    };

    const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, id: string) => {
        const newMasks = masks.map(mask => {
            if (mask.id === id) {
                return {
                    ...mask,
                    x: e.target.x(),
                    y: e.target.y(),
                };
            }
            return mask;
        });
        setMasks(newMasks);
        notifyUpdate(newMasks);
    };

    const notifyUpdate = (currentMasks: Mask[]) => {
        if (!image) return;

        // Convert back to normalized coordinates [ymin, xmin, ymax, xmax] (0-1000 scale)
        const normalizedMasks = currentMasks.map(mask => {
            const xmin = (mask.x / image.naturalWidth) * 1000;
            const ymin = (mask.y / image.naturalHeight) * 1000;
            const xmax = ((mask.x + mask.width) / image.naturalWidth) * 1000;
            const ymax = ((mask.y + mask.height) / image.naturalHeight) * 1000;

            return {
                label: mask.type === 'highlight' ? 'button' : 'sensitive',
                box_2d: [ymin, xmin, ymax, xmax].map(val => Math.min(1000, Math.max(0, Math.round(val)))),
                type: mask.type
            };
        });
        onUpdate(normalizedMasks);
    };

    const addMask = (type: 'privacy' | 'highlight') => {
        if (!image) return;
        // Add to center of view
        const width = image.naturalWidth * 0.2;
        const height = image.naturalHeight * 0.1;
        const x = (image.naturalWidth - width) / 2;
        const y = (image.naturalHeight - height) / 2;

        const newMask: Mask = {
            id: `mask-${Date.now()}`,
            x,
            y,
            width,
            height,
            type
        };
        const newMasks = [...masks, newMask];
        setMasks(newMasks);
        selectShape(newMask.id);
        notifyUpdate(newMasks);
    };

    const removeSelectedMask = () => {
        if (!selectedId) return;
        const newMasks = masks.filter(m => m.id !== selectedId);
        setMasks(newMasks);
        selectShape(null);
        notifyUpdate(newMasks);
    };

    if (!image) return <div className="animate-pulse bg-slate-100 w-full aspect-video rounded-lg"></div>;

    // Use natural dimensions for consistent aspect ratio calculation
    const scale = dimensions.width / image.naturalWidth;

    return (
        <div className={cn("space-y-2", className)}>
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-1 bg-white border rounded-lg shadow-sm w-fit">
                <div className="flex items-center gap-1 border-r pr-2 mr-1">
                    <span className="text-xs font-semibold text-slate-500 px-2">Edit Tool</span>
                </div>

                <button
                    onClick={() => addMask('privacy')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                    title="Add Privacy Mask"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Add Mask
                </button>
                <button
                    onClick={() => addMask('highlight')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
                    title="Add Highlight Frame"
                >
                    <Scan className="w-3.5 h-3.5" />
                    Add Highlight
                </button>

                <div className="w-px h-4 bg-slate-200 mx-1" />

                <button
                    onClick={removeSelectedMask}
                    disabled={!selectedId}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors",
                        selectedId
                            ? "text-red-600 hover:bg-red-50"
                            : "text-slate-300 cursor-not-allowed"
                    )}
                    title="Delete Selected"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Selected
                </button>
            </div>

            {/* Editor Area */}
            <div className="relative border rounded-lg overflow-hidden bg-slate-100 ring-offset-2 ring-indigo-500 has-[:focus]:ring-2" tabIndex={0} ref={containerRef}>
                <Stage
                    width={dimensions.width}
                    height={dimensions.height}
                    scaleX={scale}
                    scaleY={scale}
                    onMouseDown={(e) => {
                        const clickedOnEmpty = e.target === e.target.getStage();
                        if (clickedOnEmpty) {
                            selectShape(null);
                        }
                    }}
                    ref={stageRef}
                    style={{ cursor: 'crosshair' }}
                >
                    <Layer>
                        <KonvaImage image={image} />
                        {masks.map((mask) => (
                            <Rect
                                key={mask.id}
                                id={mask.id}
                                x={mask.x}
                                y={mask.y}
                                width={mask.width}
                                height={mask.height}
                                fill={mask.type === 'privacy' ? "rgba(0, 0, 0, 0.85)" : "rgba(255, 0, 0, 0.0)"}
                                stroke="#ef4444"
                                strokeWidth={mask.id === selectedId ? 4 / scale : (mask.type === 'highlight' ? 4 / scale : 0)}
                                dash={mask.type === 'highlight' ? undefined : undefined}
                                opacity={mask.type === 'privacy' ? 1 : 1}
                                draggable
                                onClick={() => selectShape(mask.id)}
                                onTap={() => selectShape(mask.id)}
                                onDragEnd={(e) => handleDragEnd(e, mask.id)}
                                onTransformEnd={(e) => handleTransformEnd(e, mask.id)}
                                onMouseEnter={(e) => {
                                    const container = e.target.getStage()?.container();
                                    if (container) container.style.cursor = 'move';
                                }}
                                onMouseLeave={(e) => {
                                    const container = e.target.getStage()?.container();
                                    if (container) container.style.cursor = 'crosshair';
                                }}
                            />
                        ))}
                        <Transformer
                            ref={transformerRef}
                            boundBoxFunc={(oldBox, newBox) => {
                                if (newBox.width < 5 || newBox.height < 5) {
                                    return oldBox;
                                }
                                return newBox;
                            }}
                            rotateEnabled={false}
                            keepRatio={false}
                            anchorSize={10}
                            borderStroke="#ef4444"
                            anchorStroke="#ef4444"
                            anchorFill="#ffffff"
                        />
                    </Layer>
                </Stage>

                {masks.length === 0 && (
                    <div className="absolute top-4 left-4 pointer-events-none text-xs text-slate-500 bg-white/80 px-2 py-1 rounded backdrop-blur-sm">
                        No masks added. Use the controls above to add masks or highlights.
                    </div>
                )}
            </div>

            <p className="text-xs text-slate-500 flex items-center gap-1">
                <MousePointer2 className="w-3 h-3" />
                Click on a mask/frame to resize or move. Click empty space to deselect.
            </p>
        </div>
    );
}
