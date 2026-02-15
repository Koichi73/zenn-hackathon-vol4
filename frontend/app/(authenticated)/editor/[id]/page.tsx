"use client";

import { EditorView } from "@/components/views/EditorView";
import { useVideo } from "@/components/providers/VideoProvider";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function EditorPage() {
    const params = useParams();
    const id = params?.id as string;
    const { steps, setManualId, manualId, status, error } = useVideo();
    const router = useRouter();

    useEffect(() => {
        if (status === "error") {
            console.log("Analysis error detected. Redirecting to dashboard...");
            const timer = setTimeout(() => {
                router.push("/dashboard");
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [status, router]);

    useEffect(() => {
        // Set manualId from URL params to trigger Firestore listener in context
        if (id && id !== manualId) {
            setManualId(id);
        }
    }, [id, manualId, setManualId]);

    if (!steps) {
        return (
            <div className="flex flex-col h-[calc(100vh-64px)] items-center justify-center p-4">
                <div className="text-center space-y-4 max-w-md">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <h3 className="text-lg font-semibold">Loading manual...</h3>

                    {/* Debug Info / Status */}
                    <div className="text-sm text-muted-foreground bg-slate-100 p-4 rounded text-left space-y-1">
                        <p><strong>Status:</strong> {status || "Initializing..."}</p>
                        <p><strong>Manual ID (URL):</strong> {id}</p>
                        <p><strong>Context ID:</strong> {manualId || "None"}</p>
                        {error && <p className="text-red-500 font-bold">Error: {error}</p>}
                    </div>

                    <p className="text-xs text-slate-400">
                        Please wait. If this persists, verify your connection or try refreshing.
                    </p>
                </div>
            </div>
        );
    }

    return <EditorView />;
}
