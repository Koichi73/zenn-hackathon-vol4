"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, Video, Loader2, MessageCircle, Eye, Play, X, MoreHorizontal, Trash2 } from 'lucide-react';
import { useVideo } from "@/components/providers/VideoProvider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getAllUnreadCounts } from "@/api/comment-api";
import { deleteManual } from "@/api/manual-api";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LoadingTips } from "@/components/features/loading/LoadingTips";

const BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

const SAMPLES = [
    {
        id: 'sample-1',
        title: 'Google Analytics Sample',
        gsUrl: `gs://${BUCKET_NAME}/samples/sample1.mov`,
        previewUrl: `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/samples%2Fsample1.mov?alt=media`,
    },
    {
        id: 'sample-2',
        title: 'WordPress Sample',
        gsUrl: `gs://${BUCKET_NAME}/samples/sample2.mov`,
        previewUrl: `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/samples%2Fsample2.mov?alt=media`,
    },
];

export default function DashboardPage() {
    const router = useRouter();
    const { processVideo, processGcsVideo, isProcessing, steps, error, processingStage, uploadProgress, status, manualId, reset } = useVideo();
    const [manuals, setManuals] = useState<any[]>([]);
    const [isLoadingManuals, setIsLoadingManuals] = useState(true);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState<{ [manualId: string]: number }>({});
    const [previewVideo, setPreviewVideo] = useState<string | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [manualToDelete, setManualToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchManuals = async (user: any) => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
            const response = await fetch(`${apiUrl}/manuals`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                console.log("Fetched manuals:", data.manuals); // DEBUG LOG
                setManuals(data.manuals || []);

                // 未読コメント数を取得
                if (data.manuals && data.manuals.length > 0) {
                    const manualIds = data.manuals.map((m: any) => m.id);
                    console.log("Fetching unread counts for manual IDs:", manualIds);
                    try {
                        const counts = await getAllUnreadCounts(manualIds);
                        console.log("Unread counts received:", counts);
                        setUnreadCounts(counts);
                    } catch (err) {
                        console.error("Failed to fetch unread counts:", err);
                    }
                }
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
            setIsUploadOpen(true);
            reset();
            await processVideo(files[0]);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setIsUploadOpen(true);
            reset();
            await processVideo(files[0]);
        }
    };

    const handleSampleSelect = async (sample: typeof SAMPLES[0]) => {
        setIsUploadOpen(true);
        reset();
        await processGcsVideo(sample.gsUrl, sample.title);
    };

    const handleDeleteClick = (manualId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent navigation to editor
        setManualToDelete(manualId);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!manualToDelete) return;

        setIsDeleting(true);
        try {
            await deleteManual(manualToDelete);
            // Refresh the manual list
            const user = auth.currentUser;
            if (user) {
                await fetchManuals(user);
            }
            setDeleteConfirmOpen(false);
            setManualToDelete(null);
        } catch (error) {
            console.error("Failed to delete manual:", error);
            alert("マニュアルの削除に失敗しました。もう一度お試しください。");
        } finally {
            setIsDeleting(false);
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
                                                <div className="mt-4">
                                                    <LoadingTips />
                                                </div>
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

                            {/* Sample Videos Section */}
                            {!isProcessing && (
                                <div className="mt-8">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-px flex-1 bg-border" />
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Try with Samples
                                        </span>
                                        <div className="h-px flex-1 bg-border" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {SAMPLES.map((sample) => (
                                            <div key={sample.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                                                {/* Video Title */}
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                        <Video className="h-4 w-4" />
                                                    </div>
                                                    <p className="text-sm font-semibold text-foreground">
                                                        {sample.title}
                                                    </p>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => setPreviewVideo(sample.previewUrl)}
                                                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-xs font-medium"
                                                    >
                                                        <Play className="h-3.5 w-3.5" />
                                                        Play
                                                    </button>
                                                    <button
                                                        onClick={() => handleSampleSelect(sample)}
                                                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-medium"
                                                    >
                                                        <Upload className="h-3.5 w-3.5" />
                                                        Analyze
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Video Preview Dialog */}
                <Dialog open={!!previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)}>
                    <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-black border-none">
                        <DialogTitle className="sr-only">Sample Video Preview</DialogTitle>
                        <div className="relative pt-[56.25%] w-full">
                            {previewVideo && (
                                <video
                                    src={previewVideo}
                                    controls
                                    autoPlay
                                    className="absolute inset-0 w-full h-full"
                                />
                            )}
                            <button
                                onClick={() => setPreviewVideo(null)}
                                className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* List of Manuals */}
            {isLoadingManuals ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Upload Area Card */}
                    <div
                        className={`
                            border-2 border-dashed rounded-xl p-6 
                            transition-all duration-300 cursor-pointer
                            flex flex-col items-center justify-center text-center
                            min-h-[280px] group relative overflow-hidden
                            ${isDragging
                                ? 'border-primary bg-primary/10 scale-[1.01] shadow-lg'
                                : 'border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40 hover:shadow-sm'}
                        `}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => {
                            reset();
                            setIsUploadOpen(true);
                        }}
                    >
                        {/* subtle gradient background on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="bg-primary/10 p-5 rounded-full mb-5 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                                <Upload className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="font-bold text-xl mb-2 text-foreground group-hover:text-primary transition-colors">
                                Click or Drag to Upload
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-[200px] leading-relaxed">
                                MP4, MOV (Max 500MB)
                            </p>
                        </div>
                    </div>

                    {manuals.map((manual) => {
                        const unreadCount = unreadCounts[manual.id] || 0;

                        return (
                            <div
                                key={manual.id}
                                className="border rounded-lg p-6 bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow cursor-pointer relative"
                                onClick={() => router.push(`/editor/${manual.id}`)}
                            >
                                {/* Three-dot menu */}
                                <div className="absolute top-2 right-2 z-20" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="p-1.5 rounded-md bg-white/80 backdrop-blur-sm shadow-sm outline-none focus-visible:outline-none">
                                                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onClick={(e) => handleDeleteClick(manual.id, e)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                削除
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Unread Badge */}
                                {unreadCount > 0 && (
                                    <div className="absolute top-3 left-3 bg-blue-500 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md z-10">
                                        <MessageCircle className="w-3 h-3" />
                                        <span className="font-medium">{unreadCount}</span>
                                    </div>
                                )}

                                <div className="h-40 bg-muted rounded-md mb-4 flex items-center justify-center text-muted-foreground relative overflow-hidden">
                                    {manual.thumbnail_url ? (
                                        <img src={manual.thumbnail_url} alt={manual.title} className="object-cover w-full h-full select-none" draggable="false" />
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
                                    <div className="flex gap-2">
                                        {/* 解析中/解析失敗 */}
                                        {manual.status !== 'completed' && (
                                            <span className={`text-xs px-2 py-1 rounded-full ${manual.status === 'error'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {manual.status === 'error' ? 'Error' : 'Analyzing'}
                                            </span>
                                        )}

                                        {/* 公開/非公開 */}
                                        {manual.status === 'completed' && (
                                            <span className={`text-xs px-2 py-1 rounded-full ${manual.is_public
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {manual.is_public ? 'Shared' : 'Private'}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {manual.created_at ? new Date(manual.created_at).toLocaleDateString() : ''}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>マニュアルを削除しますか?</DialogTitle>
                        <DialogDescription>
                            この操作は取り消せません。マニュアルとすべての関連データが完全に削除されます。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteConfirmOpen(false)}
                            disabled={isDeleting}
                        >
                            キャンセル
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    削除中...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    削除
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
