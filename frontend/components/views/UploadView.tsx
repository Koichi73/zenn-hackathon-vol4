"use client";

import React, { useState } from "react";
import { Upload, Video, Loader2 } from 'lucide-react';
import { useVideo } from "@/components/providers/VideoProvider";
import { Progress } from "@/components/ui/progress";

export function UploadView() {
    const { processVideo, isProcessing, error, processingStage, uploadProgress } = useVideo();
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await processVideo(files[0]);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            await processVideo(files[0]);
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-4xl space-y-4">
                {/* Error Alert */}
                {error && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
                        {error}
                    </div>
                )}

                {/* Drag & Drop Zone */}
                <label
                    htmlFor="video-upload"
                    className={`
            flex flex-col items-center justify-center
            w-full h-[500px]
            border-2 border-dashed rounded-xl
            cursor-pointer
            transition-all duration-200
            ${isDragging
                            ? 'border-primary bg-primary/5 scale-[1.02]'
                            : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50'
                        }
            ${isProcessing ? 'pointer-events-none opacity-50' : ''}
          `}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        id="video-upload"
                        type="file"
                        accept="video/mp4,video/quicktime,.mov"
                        className="hidden"
                        onChange={handleFileSelect}
                        disabled={isProcessing}
                    />

                    <div className="flex flex-col items-center gap-6 px-6 py-12 w-full max-w-md mx-auto">
                        {processingStage === 'uploading' ? (
                            <div className="w-full space-y-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm text-foreground">
                                        <span className="font-medium">Uploading video...</span>
                                        <span className="font-medium">{Math.round(uploadProgress)}%</span>
                                    </div>
                                    <Progress value={uploadProgress} className="h-2" />
                                </div>
                                <p className="text-sm text-muted-foreground text-center">
                                    Please wait while we upload your recording to our secure servers.
                                </p>
                            </div>
                        ) : processingStage === 'analyzing' ? (
                            <>
                                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                                <div className="text-center space-y-2">
                                    <h2 className="text-2xl font-semibold text-foreground">
                                        Analyzing video...
                                    </h2>
                                    <p className="text-muted-foreground">
                                        Gemini is extracting steps and generating your manual.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" />
                                    <div className="relative bg-primary/10 p-6 rounded-full">
                                        <div className="bg-primary/20 p-4 rounded-full">
                                            <Upload className="w-12 h-12 text-primary" />
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center space-y-2">
                                    <h2 className="text-2xl font-semibold text-foreground">
                                        Drop your screen recording here
                                    </h2>
                                    <p className="text-muted-foreground">
                                        or click to browse (MP4, MOV)
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Video className="w-4 h-4" />
                                    <span>Maximum file size: 500MB</span>
                                </div>
                            </>
                        )}
                    </div>
                </label>

                {!isProcessing && (
                    <div className="mt-8 text-center">
                        <p className="text-sm text-muted-foreground">
                            Your video will be processed automatically to create an interactive manual
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
