"use client";

import { EditorView } from "@/components/views/EditorView";
import { useVideo } from "@/components/providers/VideoProvider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditorPage({ params }: { params: { id: string } }) {
    const { steps } = useVideo();
    const router = useRouter();

    // In a real app, steps would be fetched using ID from params.
    // For now, if no steps in context (e.g. reload on this page), redirect to dashboard.
    useEffect(() => {
        if (!steps) {
            router.replace("/dashboard");
        }
    }, [steps, router]);

    if (!steps) return null; // Or skeleton

    return <EditorView />;
}
