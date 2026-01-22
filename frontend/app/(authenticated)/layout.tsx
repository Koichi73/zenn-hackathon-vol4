"use client";

import { GlobalHeader } from "@/components/GlobalHeader";

export default function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <GlobalHeader />
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}
