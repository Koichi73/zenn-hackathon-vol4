'use client'

import { Download } from 'lucide-react'

interface SharePageHeaderProps {
    title: string
}

export function SharePageHeader({ title }: SharePageHeaderProps) {
    return (
        <header className="border-b bg-white sticky top-0 z-10">
            <div className="flex items-center justify-between px-6 py-4">
                {/* Left: Empty space for alignment */}
                <div className="w-32" />

                {/* Center: Project Title */}
                <h1 className="text-lg font-bold">
                    {title}
                </h1>

                <div className="flex items-center justify-end w-32">
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                    </button>
                </div>
            </div>
        </header>
    )
}
