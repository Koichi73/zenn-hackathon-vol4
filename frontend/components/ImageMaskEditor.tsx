"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Transformer } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import { Plus, Trash2 } from 'lucide-react';

interface Mask {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface ImageMaskEditorProps {
    imageUrl: string;
    initialMasks?: Array<{
        box_2d: number[]; // [ymin, xmin, ymax, xmax] 0-1000
        label?: string;
    }>;
    onUpdate: (masks: Array<{ box_2d: number[], label: string }>) => void;
}

export function ImageMaskEditor({ imageUrl, initialMasks, onUpdate }: ImageMaskEditorProps) {
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

                const maxVal = Math.max(ymin, xmin, ymax, xmax);
                const isNormalizedZeroOne = maxVal <= 1.0;

                const factor = isNormalizedZeroOne ? 1 : 1000;

                // Try to preserve existing ID to maintain selection state
                // This assumes order doesn't change, which is true for adds/edits here
                const existingId = masks[i]?.id;
                const id = existingId || `mask-${i}`;

                return {
                    id: id,
                    x: (xmin / factor) * image.width,
                    y: (ymin / factor) * image.height,
                    width: ((xmax - xmin) / factor) * image.width,
                    height: ((ymax - ymin) / factor) * image.height,
                };
            });

            // Only update if actually different to avoid cycles? 
            // Actually, we must update because parent is source of truth for normalized coords.
            // But checking equality might help performance/jitter. 
            // For now, let's just set it.
            setMasks(newMasks);
        }
    }, [image, initialMasks]); // Relying on parent to not pass new object ref if content same? 
    // ManualEditor creates new array on every edit. 
    // This might cause loop: Drag -> Notify -> Parent SetState -> Prop Change -> UseEffect -> SetMasks.
    // Ideally we break the loop if values are close enough.

    // Handle container resize
    useEffect(() => {
        if (image && containerRef.current) {
            // Use clientWidth to exclude borders
            const containerWidth = containerRef.current.clientWidth;
            const scale = containerWidth / image.width;
            setDimensions({
                width: containerWidth,
                height: image.height * scale
            });
        }
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

        // Convert back to normalized coordinates [ymin, xmin, ymax, xmax]
        const normalizedMasks = currentMasks.map(mask => {
            const xmin = (mask.x / image.width) * 1000;
            const ymin = (mask.y / image.height) * 1000;
            const xmax = ((mask.x + mask.width) / image.width) * 1000;
            const ymax = ((mask.y + mask.height) / image.height) * 1000;

            return {
                label: 'sensitive',
                box_2d: [ymin, xmin, ymax, xmax].map(Math.round)
            };
        });
        onUpdate(normalizedMasks);
    };

    const addMask = () => {
        if (!image) return;
        const newMask: Mask = {
            id: `mask-${Date.now()}`,
            x: image.width * 0.4,
            y: image.height * 0.4,
            width: image.width * 0.2,
            height: image.height * 0.1,
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

    if (!image) return <div className="animate-pulse bg-gray-200 w-full h-64 rounded-lg"></div>;

    const scale = dimensions.width / image.width;

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <button
                    onClick={addMask}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gray-800 rounded hover:bg-gray-700 transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Add Mask
                </button>
                {selectedId && (
                    <button
                        onClick={removeSelectedMask}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove Selected
                    </button>
                )}
            </div>

            <div className="border rounded-lg overflow-hidden bg-gray-900" ref={containerRef}>
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
                                fill="rgba(0, 0, 0, 0.5)" // Semi-transparent black specifically for privacy mask
                                stroke="#ef4444" // Red border to indicate editable area
                                strokeWidth={2 / scale} // Maintain constant stroke width regardless of scale
                                draggable
                                onClick={() => selectShape(mask.id)}
                                onTap={() => selectShape(mask.id)}
                                onDragEnd={(e) => handleDragEnd(e, mask.id)}
                                onTransformEnd={(e) => handleTransformEnd(e, mask.id)}
                            />
                        ))}
                        <Transformer
                            ref={transformerRef}
                            boundBoxFunc={(oldBox, newBox) => {
                                // Limit minimum size
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
            </div>
            <p className="text-xs text-gray-500">
                Click on a mask to resize or move. Click empty space to deselect.
            </p>
        </div>
    );
}
