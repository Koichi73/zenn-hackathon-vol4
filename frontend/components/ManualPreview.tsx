"use client";

import React, { useState } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Printer } from 'lucide-react';

interface ManualPreviewProps {
    markdown: string;
}

export function ManualPreview({ markdown }: ManualPreviewProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(markdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePrint = () => {
        window.print();
    };

    const ImageRenderer: Components['img'] = ({ src, alt }) => {
        if (!src || typeof src !== 'string') return null;

        let masks: any[] = [];
        let cleanSrc = src;

        try {
            const urlObj = new URL(src, window.location.origin); // Handle relative URLs
            const masksParam = urlObj.searchParams.get('masks');
            if (masksParam) {
                masks = JSON.parse(decodeURIComponent(masksParam));
                urlObj.searchParams.delete('masks');
                cleanSrc = urlObj.toString();
            }
        } catch (e) {
            console.error("Failed to parse masks from URL", e);
        }

        return (
            <span className="relative inline-block max-w-full">
                <img src={cleanSrc} alt={alt} className="max-w-full h-auto rounded-lg shadow-sm" />
                {masks.map((mask, i) => {
                    if (!mask.box_2d) return null;
                    const [ymin, xmin, ymax, xmax] = mask.box_2d;
                    const isHighlight = mask.type === 'highlight';

                    return (
                        <span
                            key={i}
                            className={`absolute ${isHighlight
                                ? "border-4 border-red-600 bg-transparent"
                                : "bg-black/80" // Privacy mask: dark, no border
                                }`}
                            style={{
                                top: `${ymin / 10}%`,
                                left: `${xmin / 10}%`,
                                width: `${(xmax - xmin) / 10}%`,
                                height: `${(ymax - ymin) / 10}%`,
                            }}
                            title={mask.label || (isHighlight ? "Button Highlight" : "Privacy Mask")}
                        />
                    );
                })}
            </span>
        );
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden border print:shadow-none print:border-none">
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center print:hidden">
                <h2 className="font-semibold text-gray-700">Generated Manual</h2>
            </div>
            <div className="p-8 prose max-w-none">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        img: ImageRenderer
                    }}
                >
                    {markdown}
                </ReactMarkdown>
            </div>
        </div>
    );
}
