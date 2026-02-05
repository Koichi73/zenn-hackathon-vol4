"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, Video, Loader2 } from 'lucide-react';
import { useVideo } from "@/components/providers/VideoProvider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

export default function DashboardPage() {
    const router = useRouter();
    const { processVideo, isProcessing, steps, error, processingStage, uploadProgress, status, manualId, reset } = useVideo();
    const [manuals, setManuals] = useState<any[]>([]);
    const [isLoadingManuals, setIsLoadingManuals] = useState(true);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const fetchManuals = async (user: any) => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const response = await fetch("http://localhost:8000/api/manuals", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("Fetched manuals:", data.manuals); // DEBUG LOG
                setManuals(data.manuals || []);
            } else {
                console.error("Failed to fetch manuals");
            }
        } catch (error) {
            console.error("Error fetching manuals:", error);
        } finally {
            setIsLoadingManuals(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                fetchManuals(user);
            } else {
                // Handle not logged in if necessary, effectively mostly handled by middleware/layout
                setIsLoadingManuals(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // Redirect to editor when frame extraction is complete (or manual is done/loaded)
    useEffect(() => {
        // "analyzing_details" means frame extraction (Phase 2) is done and we are analyzing individual images
        if (isUploadOpen && (status === "analyzing_details" || status === "completed") && manualId) {
            setIsUploadOpen(false);
            router.push(`/editor/${manualId}`);
        }
    }, [status, isUploadOpen, router, manualId]);

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
                <Dialog open={isUploadOpen} onOpenChange={(open) => {
                    if (open) reset();
                    setIsUploadOpen(open);
                }}>
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

                                <div className="flex flex-col items-center gap-4 px-6 py-8 w-full max-w-sm mx-auto">
                                    {processingStage === 'uploading' ? (
                                        <div className="w-full space-y-4">
                                            <div className="flex items-center justify-between text-sm text-foreground">
                                                <span>Uploading video...</span>
                                                <span>{Math.round(uploadProgress)}%</span>
                                            </div>
                                            <Progress value={uploadProgress} className="h-2" />
                                            <p className="text-xs text-muted-foreground text-center">
                                                Please wait while we upload your recording
                                            </p>
                                        </div>
                                    ) : processingStage === 'analyzing' ? (
                                        <>
                                            <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                            <div className="text-center space-y-2">
                                                <h3 className="font-semibold text-foreground">
                                                    Analyzing video...
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Extracting frames and structure...
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

            {/* List of Manuals */}
            {isLoadingManuals ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : manuals.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No manuals found. Upload a video to create one!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {manuals.map((manual) => (
                        <div
                            key={manual.id}
                            className="border rounded-lg p-6 bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => router.push(`/editor/${manual.id}`)}
                        >
                            <div className="h-40 bg-muted rounded-md mb-4 flex items-center justify-center text-muted-foreground relative overflow-hidden">
                                {manual.thumbnail_url ? (
                                    <img src={manual.thumbnail_url} alt={manual.title} className="object-cover w-full h-full" />
                                ) : (
                                    <Video className="h-12 w-12 opacity-20" />
                                )}
                                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                    {manual.step_count || 0} Steps
                                </div>
                            </div>
                            <h3 className="font-semibold text-lg mb-1 truncate" title={manual.title}>
                                {manual.title || "Untitled Manual"}
                            </h3>
                            <div className="flex justify-between items-center mt-4">
                                <span className={`text-xs px-2 py-1 rounded-full ${manual.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    manual.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {manual.status || 'Unknown'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {manual.created_at ? new Date(manual.created_at).toLocaleDateString() : ''}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
