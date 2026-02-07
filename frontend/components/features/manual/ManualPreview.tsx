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
            <div className="relative w-full my-4">
                <img
                    src={cleanSrc}
                    alt={alt}
                    className="w-full h-auto rounded-lg shadow-sm"
                />
                {masks.length > 0 && (
                    <div className="absolute inset-0 pointer-events-none">
                        {masks.map((mask, i) => {
                            if (!mask.box_2d) return null;
                            const [ymin, xmin, ymax, xmax] = mask.box_2d;
                            const isHighlight = mask.type === 'highlight';

                            return (
                                <div
                                    key={i}
                                    className={isHighlight
                                        ? "absolute border-4 border-red-600 bg-transparent"
                                        : "absolute bg-black/80"
                                    }
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
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden border print:shadow-none print:border-none">

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
