"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Save, Share2, Download, Trash2, MousePointerClick, Cast as MaskIcon, Eye, FileText } from 'lucide-react';
import { useVideo } from "@/components/providers/VideoProvider";
import { ManualPreview } from "@/components/ManualPreview";
import { ImageMaskEditor } from "@/components/ImageMaskEditor";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

export function EditorView() {
    const { steps, filename, updateStep, reset } = useVideo();
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
    const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

    // Local state for mask editing dialog
    const [isMaskDialogOpen, setIsMaskDialogOpen] = useState(false);
    const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

    if (!steps) return null;

    const getStep = (index: number) => steps[index];

    const handleDescriptionChange = (index: number, description: string) => {
        const step = getStep(index);
        updateStep(index, { ...step, description });
    };

    const handleMaskUpdate = (stepIndex: number, newMasks: any[]) => {
        const step = getStep(stepIndex);
        updateStep(stepIndex, { ...step, privacy_masks: newMasks });
    };

    const openMaskEditor = (index: number) => {
        setEditingStepIndex(index);
        setIsMaskDialogOpen(true);
    };

    const generateMarkdown = () => {
        let md = `# Video Manual: ${filename}\n\n`;

        steps.forEach((step: any, index: number) => {
            md += `## Step ${index + 1}: ${step.title}\n`;
            md += `**Timestamp:** ${step.timestamp}\n\n`;
            md += `${step.description}\n\n`;

            if (step.image_url) {
                const fullImageUrl = `http://localhost:8000${step.image_url}`;

                // Encode masks into the URL for the preview renderer
                let imageUrlForMarkdown = fullImageUrl;
                if (step.privacy_masks && step.privacy_masks.length > 0) {
                    const masksJson = JSON.stringify(step.privacy_masks);
                    const encodedMasks = encodeURIComponent(masksJson);
                    imageUrlForMarkdown = `${fullImageUrl}?masks=${encodedMasks}`;
                }

                md += `![Step ${index + 1} Image](${imageUrlForMarkdown})\n`;

                // Add note about masked areas if present
                if (step.privacy_masks && step.privacy_masks.length > 0) {
                    md += `\n> [!NOTE]\n> This image contains ${step.privacy_masks.length} masked area(s) for privacy.\n`;
                }
                md += `\n`;
            }

            md += `---\n\n`;
        });
        return md;
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] print:h-auto print:block">
            {/* Subtract header height. Header is in page.tsx layout */}

            {/* Project Toolbar */}
            <div className="border-b bg-white sticky top-0 z-40 print:hidden">
                <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
                    {/* Left: Edit/Preview Segmented Control */}
                    <div className="inline-flex items-center rounded-lg border bg-muted p-1">
                        <button
                            onClick={() => setViewMode('edit')}
                            className={`px-6 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'edit'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`px-6 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'preview'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
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
                        <Button variant="ghost" size="sm" onClick={reset}>
                            Reset
                        </Button>
                        <Button size="sm" onClick={() => window.print()}>
                            <Download className="w-4 h-4 mr-2" />
                            Export PDF
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden print:overflow-visible print:block print:h-auto">
                {viewMode === 'edit' ? (
                    <>
                        {/* Edit Mode: Split View - Hidden in Print */}
                        <div className="print:hidden w-full h-full flex">
                            {/* Left Column: Step Editor */}
                            <div className="w-1/2 border-r bg-muted/30 overflow-y-auto">
                                <div className="p-6 space-y-4">
                                    {steps.map((step, index) => (
                                        <Card key={index} className="overflow-hidden">
                                            <CardContent className="p-4 space-y-3">
                                                {/* Step Number */}
                                                <div className="flex items-center justify-between">
                                                    <h3 className="font-semibold text-base">Step {index + 1}: {step.title}</h3>
                                                    <span className="text-xs text-muted-foreground font-mono">{step.timestamp}</span>
                                                </div>

                                                {/* Image Thumbnail */}
                                                <div className="w-full relative aspect-video bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                                                    {step.image_url ? (
                                                        <img
                                                            src={`http://localhost:8000${step.image_url}`}
                                                            alt={`Step ${index + 1}`}
                                                            className="object-contain w-full h-full"
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">No Image</span>
                                                    )}
                                                </div>

                                                {/* Mask Button */}
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant={step.privacy_masks && step.privacy_masks.length > 0 ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => openMaskEditor(index)}
                                                        className="flex-1"
                                                        disabled={!step.image_url}
                                                    >
                                                        <MaskIcon className="w-4 h-4 mr-2" />
                                                        {step.privacy_masks && step.privacy_masks.length > 0
                                                            ? `Edit Masks (${step.privacy_masks.length})`
                                                            : "Mask Image"
                                                        }
                                                    </Button>
                                                </div>

                                                {/* Textarea for Description */}
                                                <Textarea
                                                    value={step.description}
                                                    onChange={(e) => handleDescriptionChange(index, e.target.value)}
                                                    placeholder="Enter step instruction..."
                                                    className="min-h-[80px] resize-none"
                                                />
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            {/* Right Column: Preview / Video Substitute */}
                            <div className="w-1/2 bg-background flex flex-col overflow-y-auto">
                                <div className="p-8">
                                    <div className="mb-4 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                                        <p className="font-semibold">Note about Video Playback</p>
                                        <p>Video playback is currently unavailable as the uploaded file is processed efficiently. Please use the static images on the left to review steps.</p>
                                    </div>

                                    <h2 className="text-xl font-bold mb-4">Live Preview</h2>
                                    <div className="border rounded-lg shadow-sm">
                                        <ManualPreview markdown={generateMarkdown()} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Print-only Full Preview when in Edit Mode */}
                        <div className="hidden print:block">
                            <ManualPreview markdown={generateMarkdown()} />
                        </div>
                    </>
                ) : (
                    /* Preview Mode: Full Screen */
                    <div className="flex-1 overflow-y-auto bg-muted/30 print:bg-white print:overflow-visible">
                        <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none">
                            <ManualPreview markdown={generateMarkdown()} />
                        </div>
                    </div>
                )}
            </div>

            {/* Mask Editor Dialog */}
            <Dialog open={isMaskDialogOpen} onOpenChange={setIsMaskDialogOpen}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 print:hidden">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>Edit Privacy Masks - Step {(editingStepIndex ?? 0) + 1}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 p-6 pt-2 overflow-hidden bg-gray-50 flex flex-col">
                        {editingStepIndex !== null && steps[editingStepIndex]?.image_url && (
                            <ImageMaskEditor
                                imageUrl={`http://localhost:8000${steps[editingStepIndex].image_url}`}
                                initialMasks={steps[editingStepIndex].privacy_masks || []}
                                onUpdate={(newMasks) => handleMaskUpdate(editingStepIndex, newMasks)}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
