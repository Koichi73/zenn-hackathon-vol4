"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Cast as MaskIcon, Play, Maximize2, Minimize2, X, ChevronRight, PenTool, Save, Share2, Loader2 } from 'lucide-react';
import { useVideo } from "@/components/providers/VideoProvider";
import { ManualPreview } from "@/components/ManualPreview";
import { ImageMaskEditor } from "@/components/ImageMaskEditor";
import { cn } from "@/lib/utils";
import { saveManualToGCS } from "@/api/manual-storage-api";

export function EditorView() {
    const { steps, filename, updateStep, reset, isProcessing, videoUrl, videoFile } = useVideo();
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!steps || !filename) return;
        setIsSaving(true);
        try {
            await saveManualToGCS(filename, steps, videoFile);
            alert("手順書をGCSに保存しました！\nmanuals/ 配下にJSONと動画・画像が保存されました。");
        } catch (error) {
            console.error("Save error:", error);
            alert("保存に失敗しました: " + (error instanceof Error ? error.message : "不明なエラー"));
        } finally {
            setIsSaving(false);
        }
    };

    // Video widget state
    const [isVideoWidgetOpen, setIsVideoWidgetOpen] = useState(true);
    const [isVideoWidgetExpanded, setIsVideoWidgetExpanded] = useState(true);

    // Video ref
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Refs for scrolling to steps
    const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

    const getStep = (index: number) => steps ? steps[index] : null;

    const handleDescriptionChange = (index: number, description: string) => {
        const step = getStep(index);
        if (step) {
            updateStep(index, { ...step, description });
        }
    };

    const handleMaskUpdate = (stepIndex: number, newMasks: any[]) => {
        const step = getStep(stepIndex);
        if (!step) return;

        // Split combined masks back into highlight_box and mask_boxes
        const highlightMask = newMasks.find(m => m.type === 'highlight');
        const privacyMasks = newMasks.filter(m => m.type === 'privacy' || !m.type).map(m => ({
            label: m.label || 'privacy',
            box: {
                ymin: m.box_2d[0],
                xmin: m.box_2d[1],
                ymax: m.box_2d[2],
                xmax: m.box_2d[3]
            }
        }));

        let highlight_box = undefined;
        if (highlightMask) {
            highlight_box = {
                ymin: highlightMask.box_2d[0],
                xmin: highlightMask.box_2d[1],
                ymax: highlightMask.box_2d[2],
                xmax: highlightMask.box_2d[3]
            };
        }

        updateStep(stepIndex, {
            ...step,
            highlight_box: highlight_box,
            mask_boxes: privacyMasks
        });
    };

    const scrollToStep = (index: number) => {
        stepRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const convertTimestampToSeconds = (timestamp: string) => {
        const parts = timestamp.split(':').map(Number);
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    };

    const handleStepClick = (timestamp: string) => {
        if (videoRef.current) {
            videoRef.current.currentTime = convertTimestampToSeconds(timestamp);
            videoRef.current.play();
        }
    };

    const generateMarkdown = () => {
        if (!steps) return '';
        let md = `# Video Manual: ${filename}\n\n`;

        steps.forEach((step: any, index: number) => {
            md += `## Step ${index + 1}: ${step.title}\n`;
            md += `**Timestamp:** ${step.timestamp}\n\n`;
            md += `${step.description}\n\n`;

            if (step.image_url) {
                const fullImageUrl = `http://localhost:8000${step.image_url}`;

                // Encode masks into the URL for the preview renderer
                let imageUrlForMarkdown = fullImageUrl;

                // Combine highlight_box and mask_boxes for preview rendering (which expects a flat list)
                const combinedMasks = [];
                if (step.highlight_box) {
                    combinedMasks.push({
                        type: 'highlight',
                        label: 'highlight',
                        box_2d: [step.highlight_box.ymin, step.highlight_box.xmin, step.highlight_box.ymax, step.highlight_box.xmax]
                    });
                }
                if (step.mask_boxes) {
                    step.mask_boxes.forEach((m: any) => {
                        combinedMasks.push({
                            type: 'privacy',
                            label: m.label,
                            box_2d: [m.box.ymin, m.box.xmin, m.box.ymax, m.box.xmax]
                        });
                    });
                }

                if (combinedMasks.length > 0) {
                    const masksJson = JSON.stringify(combinedMasks);
                    const encodedMasks = encodeURIComponent(masksJson);
                    imageUrlForMarkdown = `${fullImageUrl}?masks=${encodedMasks}`;
                }

                md += `![Step ${index + 1} Image](${imageUrlForMarkdown})\n`;

                // Add note about masked areas if present
                if (step.mask_boxes && step.mask_boxes.length > 0) {
                    md += `\n> [!NOTE]\n> This image contains ${step.mask_boxes.length} masked area(s) for privacy.\n`;
                }
                md += `\n`;
            }

            md += `---\n\n`;
        });
        return md;
    };

    if (!steps && isProcessing) {
        return (
            <div className="flex flex-col h-[calc(100vh-64px)]">
                {/* Project Toolbar Skeleton */}
                <div className="border-b bg-white sticky top-0 z-40 shadow-sm">
                    <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
                        <Skeleton className="h-9 w-[200px]" />
                        <Skeleton className="h-6 w-[300px]" />
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-20" />
                            <Skeleton className="h-9 w-24" />
                        </div>
                    </div>
                </div>

                {/* Main Content Skeleton */}
                <div className="flex flex-1 overflow-hidden bg-slate-50">
                    <div className="w-full h-full relative overflow-y-auto px-4 py-8 sm:px-8">
                        <div className="max-w-6xl mx-auto space-y-8 pb-32">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white border rounded-lg overflow-hidden shadow-sm">
                                    <div className="p-4 border-b flex items-center gap-3">
                                        <Skeleton className="w-8 h-8 rounded-full" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-[200px]" />
                                            <Skeleton className="h-3 w-[100px]" />
                                        </div>
                                    </div>
                                    <div className="p-6 border-b flex justify-center bg-slate-50">
                                        <Skeleton className="w-full h-64 rounded-lg mix-w-[600px]" />
                                    </div>
                                    <div className="p-6 space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="w-full h-24 rounded-md" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!steps) return null;

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] print:h-auto print:block">
            {/* Project Toolbar */}
            <div className="border-b bg-white sticky top-0 z-40 print:hidden shadow-sm">
                <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
                    {/* Left: Edit/Preview Segmented Control */}
                    <div className="inline-flex items-center rounded-lg border bg-muted p-1">
                        <button
                            onClick={() => setViewMode('edit')}
                            className={cn(
                                "px-6 py-1.5 text-sm font-medium rounded-md transition-colors",
                                viewMode === 'edit'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => setViewMode('preview')}
                            className={cn(
                                "px-6 py-1.5 text-sm font-medium rounded-md transition-colors",
                                viewMode === 'preview'
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Preview
                        </button>
                    </div>

                    {/* Center: Project Title */}
                    <h1 className="text-lg font-bold absolute left-1/2 -translate-x-1/2 truncate max-w-[300px]">
                        {filename}
                    </h1>

                    {/* Right: Action Buttons */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving || isProcessing}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                        <Button variant="outline" size="sm">
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => window.print()}
                            disabled={viewMode !== 'preview'}
                            title={viewMode !== 'preview' ? "Switch to Preview to export PDF" : "Export as PDF"}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export PDF
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden print:overflow-visible print:block print:h-auto relative bg-slate-50">
                {viewMode === 'edit' ? (
                    <div className="w-full h-full relative overflow-y-auto">
                        {/* Left Sidebar: Table of Contents (Floating, Hidden on smaller screens) */}
                        <div className="hidden 2xl:block fixed left-4 top-36 bottom-4 w-[250px] bg-white border rounded-lg shadow-sm overflow-y-auto z-20">
                            <div className="p-4 sticky top-0 bg-white z-10 border-b mb-2">
                                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Table of Contents
                                </h2>
                            </div>
                            <div className="px-2 pb-4 space-y-1">
                                {steps.map((step, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            scrollToStep(index);
                                            handleStepClick(step.timestamp);
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors truncate flex items-center gap-2"
                                    >
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-xs font-medium text-slate-600 shrink-0">
                                            {index + 1}
                                        </span>
                                        <span className="truncate">{step.title || `Step ${index + 1}`}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Main Editor Area */}
                        <div className="w-full min-h-full px-4 py-8 sm:px-8">
                            <div className="max-w-6xl mx-auto space-y-8 pb-32">
                                {steps.map((step, index) => (
                                    <div
                                        key={index}
                                        ref={(el) => { stepRefs.current[index] = el }}
                                        className="scroll-mt-48"
                                    >
                                        <Card className="overflow-hidden shadow-sm border-slate-200">
                                            <CardContent className="p-0">
                                                {/* Card Header with Step Info */}
                                                <div className="flex items-center justify-between p-4 border-b bg-white">
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">
                                                            {index + 1}
                                                        </span>
                                                        <div>
                                                            <h3 className="font-semibold text-base text-slate-900 border-none p-0 focus-visible:ring-0">
                                                                Step {index + 1}
                                                            </h3>
                                                            <span className="text-xs text-muted-foreground font-mono">{step.timestamp}</span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>

                                                {/* Image Area - Inline Editor */}
                                                <div className="bg-slate-50 flex justify-center border-b p-6">
                                                    <div className="w-full relative shadow-sm bg-white rounded-lg p-2">
                                                        {step.image_url ? (
                                                            <ImageMaskEditor
                                                                imageUrl={`http://localhost:8000${step.image_url}`}
                                                                initialMasks={[
                                                                    ...(step.highlight_box ? [{
                                                                        type: 'highlight',
                                                                        label: 'highlight',
                                                                        box_2d: [step.highlight_box.ymin, step.highlight_box.xmin, step.highlight_box.ymax, step.highlight_box.xmax]
                                                                    } as any] : []),
                                                                    ...(step.mask_boxes ? step.mask_boxes.map((m: any) => ({
                                                                        type: 'privacy',
                                                                        label: m.label,
                                                                        box_2d: [m.box.ymin, m.box.xmin, m.box.ymax, m.box.xmax]
                                                                    })) : [])
                                                                ]}
                                                                onUpdate={(newMasks) => handleMaskUpdate(index, newMasks)}
                                                            />
                                                        ) : (
                                                            isProcessing ? (
                                                                <Skeleton className="w-full h-64 rounded-lg" />
                                                            ) : (
                                                                <div className="flex items-center justify-center h-64 text-muted-foreground bg-slate-100 rounded-lg">
                                                                    No Image
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Description Editor */}
                                                <div className="p-6 bg-white">
                                                    <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
                                                        <PenTool className="w-4 h-4" />
                                                        Description
                                                    </div>
                                                    <Textarea
                                                        value={step.description || ''}
                                                        onChange={(e) => handleDescriptionChange(index, e.target.value)}
                                                        placeholder="Describe this step..."
                                                        className="min-h-[100px] resize-none text-base border-slate-200 focus-visible:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors"
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Floating Video Widget (Hidden on Print) */}
                        {isVideoWidgetOpen && videoUrl && (
                            <div className={cn(
                                "fixed bottom-6 right-6 z-50 transition-all duration-300 ease-in-out bg-white shadow-2xl rounded-xl border border-slate-200 overflow-hidden print:hidden",
                                isVideoWidgetExpanded ? "w-[360px]" : "w-[200px]"
                            )}>
                                {/* Widget Header */}
                                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b cursor-move">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        <span className="text-xs font-semibold text-slate-700">Original Video</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setIsVideoWidgetExpanded(!isVideoWidgetExpanded)}
                                            className="p-1 hover:bg-slate-200 rounded text-slate-500"
                                        >
                                            {isVideoWidgetExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                                        </button>
                                        <button
                                            onClick={() => setIsVideoWidgetOpen(false)}
                                            className="p-1 hover:bg-slate-200 rounded text-slate-500"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>

                                {/* Video Player */}
                                <div className={cn(
                                    "bg-slate-900 transition-all duration-300 relative",
                                    isVideoWidgetExpanded ? "aspect-video" : "h-12"
                                )}>
                                    <video
                                        ref={videoRef}
                                        src={videoUrl}
                                        className="w-full h-full"
                                        onTimeUpdate={handleTimeUpdate}
                                        onLoadedMetadata={handleLoadedMetadata}
                                        controls={isVideoWidgetExpanded}
                                    />
                                </div>

                                {/* Progress Bar & Time Display */}
                                {isVideoWidgetExpanded && (
                                    <div className="p-3 bg-white">
                                        <div className="w-full bg-slate-100 rounded-full h-1 mb-2">
                                            <div
                                                className="bg-indigo-600 h-1 rounded-full transition-all"
                                                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                            <span>{formatTime(currentTime)}</span>
                                            <span>{formatTime(duration)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Hidden Re-open button for video widget if closed (Hidden on Print) */}
                        {!isVideoWidgetOpen && (
                            <Button
                                onClick={() => setIsVideoWidgetOpen(true)}
                                className="fixed bottom-6 right-6 z-50 rounded-full w-12 h-12 shadow-lg print:hidden"
                                size="icon"
                            >
                                <Play className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                ) : (
                    /* Preview Mode: Full Screen */
                    <div className="flex-1 overflow-y-auto bg-slate-100/50 print:bg-white print:overflow-visible">
                        <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none">
                            <ManualPreview markdown={generateMarkdown()} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
