"use client";

import React, { useState } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CommentSection } from '@/components/features/comments/CommentSection';

interface ManualPreviewProps {
    markdown: string;
    manualId: string;
    readOnly?: boolean;
}

export function ManualPreview({ markdown, manualId, readOnly = false }: ManualPreviewProps) {

    const ImageRenderer: Components['img'] = ({ src, alt }) => {
        if (!src || typeof src !== 'string') return null;

        let masks: any[] = [];
        let cleanSrc = src;

        try {
            // Check if window is defined (client-side only)
            if (typeof window !== 'undefined') {
                const urlObj = new URL(src, window.location.origin); // Handle relative URLs
                const masksParam = urlObj.searchParams.get('masks');
                if (masksParam) {
                    masks = JSON.parse(decodeURIComponent(masksParam));
                    urlObj.searchParams.delete('masks');
                    cleanSrc = urlObj.toString();
                }
            }
        } catch (e) {
            console.error("Failed to parse masks from URL", e);
        }

        return (
            <div className="relative w-full my-4">
                <img
                    src={cleanSrc}
                    alt={alt}
                    className="w-full h-auto rounded-md shadow-sm"
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

    // Split markdown by horizontal rules to get individual steps
    const steps = markdown.split('---\n\n').filter(step => step.trim());

    return (
        <div className="bg-white rounded-lg border p-8 shadow-sm">
            <div className="prose max-w-none">
                {steps.map((stepContent, index) => (
                    <div key={index} className="mb-10 pb-10 border-b last:border-b-0">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                img: ImageRenderer,
                                // Fix hydration error: use div for paragraphs containing images
                                p: ({ node, children }) => {
                                    // Check if paragraph contains an image
                                    const hasImage = node?.children?.some(
                                        (child: any) => child.tagName === 'img'
                                    );

                                    if (hasImage) {
                                        return <div className="my-4">{children}</div>;
                                    }

                                    return <p>{children}</p>;
                                }
                            }}
                        >
                            {stepContent}
                        </ReactMarkdown>

                        {/* Comment Section */}
                        <div className="not-prose">
                            <CommentSection manualId={manualId} stepIndex={index} readOnly={readOnly} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
