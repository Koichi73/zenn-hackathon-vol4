import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ManualPreviewProps {
    markdown: string;
}

export function ManualPreview({ markdown }: ManualPreviewProps) {
    return (
        <div className="w-full max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden border">
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                <h2 className="font-semibold text-gray-700">Generated Manual</h2>
                <button
                    onClick={() => navigator.clipboard.writeText(markdown)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                >
                    Copy Markdown
                </button>
            </div>
            <div className="p-8 prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {markdown}
                </ReactMarkdown>
            </div>
        </div>
    );
}
