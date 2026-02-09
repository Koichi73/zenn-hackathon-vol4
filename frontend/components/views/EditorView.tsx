"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Cast as MaskIcon, X, ChevronRight, PenTool, Save, Share2, Loader2, Check } from 'lucide-react';
import { useVideo } from "@/components/providers/VideoProvider";
import { ManualPreview } from "@/components/features/manual/ManualPreview";
import { ImageMaskEditor } from "@/components/features/editor/ImageMaskEditor";
import { Input } from '@/components/ui/input';
import { cn } from "@/lib/utils";
import { saveManual } from "@/api/manual-api";
import { ShareDialog } from "@/components/features/share/ShareDialog";
import { CommentSidebar } from "@/components/features/comments/CommentSidebar";
import { markManualAsRead } from "@/api/comment-api";

export function EditorView() {
    const { steps, filename, title, setTitle, updateStep, reset, isProcessing, manualId, setManualId } = useVideo();
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [isDirty, setIsDirty] = useState(false);
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

    // Prevent closing tab with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const handleSave = async () => {
        if (!manualId || !steps) return;

        setIsSaving(true);
        setSaveStatus('idle');

        try {
            await saveManual(manualId, title || filename, steps);
            setSaveStatus('success');
            setIsDirty(false);

            // Reset success status after 2 seconds
            setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
        } catch (error) {
            console.error("Save error:", error);
            setSaveStatus('error');
            alert("保存に失敗しました: " + (error instanceof Error ? error.message : "不明なエラー"));
        } finally {
            setIsSaving(false);
        }
    };

    const handleShareClick = async () => {
        if (!manualId) {
            alert("共有機能を使う前に、まず保存してください。");
            return;
        }

        if (!steps || steps.length === 0) {
            alert("手順書のデータが不足しています。");
            return;
        }

        if (isDirty) {
            setIsSaving(true);
            try {
                await saveManual(manualId, title || filename, steps);
                setSaveStatus('success');
                setIsDirty(false);
                setIsShareDialogOpen(true);
            } catch (error) {
                console.error("Save error:", error);
                alert("保存に失敗しました。共有できません。");
            } finally {
                setIsSaving(false);
            }
        } else {
            setIsShareDialogOpen(true);
        }
    };

    const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

    const getStep = (index: number) => steps ? steps[index] : null;

    const handleDescriptionChange = (index: number, description: string) => {
        const step = getStep(index);
        if (step) {
            updateStep(index, { ...step, description });
            setIsDirty(true);
            setSaveStatus('idle');
        }
    };

    const handleTitleChange = (index: number, newTitle: string) => {
        const step = getStep(index);
        if (step) {
            updateStep(index, { ...step, title: newTitle });
            setIsDirty(true);
            setSaveStatus('idle');
        }
    };


    const handleMaskUpdate = (stepIndex: number, newMasks: any[]) => {
        const step = getStep(stepIndex);
        if (!step) return;

        const highlightMasks = newMasks.filter(m => m.type === 'highlight').map(m => ({
            ymin: m.box_2d[0],
            xmin: m.box_2d[1],
            ymax: m.box_2d[2],
            xmax: m.box_2d[3]
        }));

        const privacyMasks = newMasks.filter(m => m.type === 'privacy' || !m.type).map(m => ({
            label: m.label || 'privacy',
            box: {
                ymin: m.box_2d[0],
                xmin: m.box_2d[1],
                ymax: m.box_2d[2],
                xmax: m.box_2d[3]
            }
        }));

        updateStep(stepIndex, {
            ...step,
            highlight_boxes: highlightMasks,
            mask_boxes: privacyMasks
        });
        setIsDirty(true);
        setSaveStatus('idle');
    };

    const scrollToStep = (index: number) => {
        stepRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const generateMarkdown = () => {
        if (!steps) return '';
        let md = `# ${filename}\n\n`;

        steps.forEach((step: any, index: number) => {
            md += `## Step ${index + 1}: ${step.title}\n`;
            md += `${step.description}\n\n`;

            if (step.image_url) {
                const isAbsolute = step.image_url.startsWith("http");
                const fullImageUrl = isAbsolute ? step.image_url : `http://localhost:8000${step.image_url}`;

                let imageUrlForMarkdown = fullImageUrl;
                // Type definition for custom mask object
                type VideoMask = {
                    type: 'highlight' | 'privacy';
                    label: string;
                    box_2d: number[];
                };
                const combinedMasks: VideoMask[] = [];
                if (step.highlight_boxes) {
                    step.highlight_boxes.forEach((box: any) => {
                        combinedMasks.push({
                            type: 'highlight',
                            label: 'highlight',
                            box_2d: [box.ymin, box.xmin, box.ymax, box.xmax]
                        });
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
                md += `\n`;
            }

            md += `---\n\n`;
        });
        return md;
    };

    if (!steps && isProcessing) {
        return (
            <div className="flex flex-col h-[calc(100vh-64px)]">
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
                    <div className="flex-1 flex justify-start">
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
                    </div>

                    {/* Center: Project Title */}
                    <div className="w-[400px] flex justify-center px-4 pointer-events-none">
                        <Input
                            value={title || ''}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                setIsDirty(true);
                                setSaveStatus('idle');
                            }}
                            className="text-center font-bold !text-xl h-9 border-transparent hover:border-input focus:border-input bg-transparent px-2 shadow-none w-full pointer-events-auto"
                            placeholder={filename}
                        />
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex-1 flex justify-end items-center gap-2">
                        <Button
                            variant={isDirty ? "default" : "secondary"}
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving || (!isDirty && saveStatus !== 'success')}
                            className={cn(
                                "transition-all min-w-[100px]",
                                isDirty ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md border-indigo-200" : "text-slate-500",
                                saveStatus === 'success' && "bg-green-600 hover:bg-green-700 text-white"
                            )}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : saveStatus === 'success' ? (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Saved!
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save
                                </>
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleShareClick}
                            disabled={isSaving}
                            className={isSaving ? "opacity-50 cursor-not-allowed" : ""}
                        >
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
                        {/* Main Editor Area */}
                        <div className="w-full min-h-full px-4 py-8 sm:px-8">
                            <div className="max-w-6xl mx-auto space-y-8 pb-32">
                                {steps.map((step, index) => (
                                    <div
                                        key={index}
                                        ref={(el) => { stepRefs.current[index] = el }}
                                        className="scroll-mt-48"
                                    >
                                        <Card className="overflow-hidden shadow-sm border-slate-200 py-0">
                                            <CardContent className="p-0">
                                                {/* Card Header with Step Info */}
                                                <div className="flex items-center justify-between p-4 border-b bg-white">
                                                    <div className="flex items-center gap-3 w-full">
                                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex-shrink-0">
                                                            {index + 1}
                                                        </span>
                                                        <div className="flex-1 w-full min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                {/* <span className="text-lg font-medium text-slate-500 whitespace-nowrap">
                                                                    Step {index + 1}
                                                                </span> */}
                                                                <Input
                                                                    value={step.title || ''}
                                                                    onChange={(e) => handleTitleChange(index, e.target.value)}
                                                                    className="font-semibold !text-xl text-slate-900 border-transparent hover:border-slate-200 focus:border-indigo-500 px-2 h-10 w-full bg-transparent"
                                                                    placeholder="Step Title"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Image Area - Inline Editor */}
                                                <div className="bg-slate-50 flex justify-center border-b p-6">
                                                    <div className="w-full relative shadow-sm bg-white rounded-lg p-2">
                                                        {step.image_url ? (
                                                            <ImageMaskEditor
                                                                imageUrl={step.image_url?.startsWith("http") ? step.image_url : `http://localhost:8000${step.image_url}`}
                                                                initialMasks={[
                                                                    ...(step.highlight_boxes ? step.highlight_boxes.map((box: any) => ({
                                                                        type: 'highlight',
                                                                        label: 'highlight',
                                                                        box_2d: [box.ymin, box.xmin, box.ymax, box.xmax]
                                                                    } as any)) : []
                                                                    ),
                                                                    ...(step.mask_boxes ? step.mask_boxes.map((m: any) => ({
                                                                        type: 'privacy',
                                                                        label: m.label,
                                                                        box_2d: [m.box.ymin, m.box.xmin, m.box.ymax, m.box.xmax]
                                                                    } as any)) : [])
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

                                                <div className="p-6 bg-white">
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

                        {/* Right Sidebar: Comments */}
                        {manualId && (
                            <CommentSidebar
                                manualId={manualId}
                                steps={steps}
                                onStepClick={(stepIndex) => scrollToStep(stepIndex)}
                            />
                        )}
                    </div>
                ) : (
                    /* Preview Mode: Full Screen */
                    <div className="flex-1 overflow-y-auto bg-slate-100/50 print:bg-white print:overflow-visible">
                        <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none">
                            <ManualPreview markdown={generateMarkdown()} manualId={manualId || ''} readOnly={true} showComments={false} />
                        </div>
                    </div>
                )}
            </div>
            <ShareDialog
                manualId={manualId || ""}
                isOpen={isShareDialogOpen}
                onOpenChange={setIsShareDialogOpen}
            />
        </div>
    );
}
