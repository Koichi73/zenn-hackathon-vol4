"use client";

import { ManualPreview } from "@/components/ManualPreview";

export default function SharePage() {
    // In a real app, we would fetch the manual data by ID (from params) here.
    const DUMMY_MARKDOWN = `
# Sample Shared Manual

This is a read-only view of a shared manual.

## Step 1: Open the Application
**Timestamp:** 00:05

Open the dashboard and click "New Project".

## Step 2: Configure Settings
**Timestamp:** 00:15

Adjust the settings as needed.
    `;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                            <span className="text-sm font-bold text-primary-foreground">M</span>
                        </div>
                        <span className="text-xl font-semibold text-foreground">Manual AI</span>
                    </div>
                </div>
                <ManualPreview markdown={DUMMY_MARKDOWN} />
            </div>
        </div>
    );
}
