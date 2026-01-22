"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, Video, Loader2 } from 'lucide-react';
import { useVideo } from "@/components/providers/VideoProvider";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

export default function DashboardPage() {
    const router = useRouter();
    const { processVideo, isProcessing, steps, error } = useVideo();
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Redirect to editor when steps are available (and we are in upload flow)
    useEffect(() => {
        if (steps && !isProcessing && isUploadOpen) {
            setIsUploadOpen(false);
            // Use a specific ID or just 'new' for now since we don't have persistence
            router.push("/editor/new");
        }
    }, [steps, isProcessing, isUploadOpen, router]);

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
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Video
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Upload Video</DialogTitle>
                        </DialogHeader>

                        <div className="mt-4">
                            {/* Error Alert */}
                            {error && (
                                <div className="mb-4 bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
                                    {error}
                                </div>
                            )}

                            {/* Drag & Drop Zone */}
                            <label
                                htmlFor="video-upload"
                                className={`
                                    flex flex-col items-center justify-center
                                    w-full h-[300px]
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

                                <div className="flex flex-col items-center gap-4 px-6 py-8">
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                            <div className="text-center space-y-2">
                                                <h3 className="font-semibold text-foreground">
                                                    Analyzing video...
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Generating manual...
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="bg-primary/10 p-4 rounded-full">
                                                <Upload className="w-8 h-8 text-primary" />
                                            </div>
                                            <div className="text-center space-y-1">
                                                <p className="font-semibold">Click or Drag to Upload</p>
                                                <p className="text-xs text-muted-foreground">MP4, MOV (Max 500MB)</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </label>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Empty State or List of Manuals */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Placeholder items for visual check */}
                <div className="border rounded-lg p-6 bg-card text-card-foreground shadow-sm">
                    <div className="h-40 bg-muted rounded-md mb-4 flex items-center justify-center text-muted-foreground">
                        Thumbnail
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Welcome to Manual AI</h3>
                    <p className="text-sm text-muted-foreground">This is a placeholder manual to demonstrate the layout.</p>
                </div>
            </div>
        </div>
    );
}
