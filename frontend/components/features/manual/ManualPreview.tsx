"use client";

import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CommentSection } from '@/components/features/comments/CommentSection';

interface ManualPreviewProps {
    markdown: string;
    manualId: string;
    readOnly?: boolean;
    showComments?: boolean;
}

export function ManualPreview({ markdown, manualId, readOnly = false, showComments = true }: ManualPreviewProps) {

    const ImageRenderer: Components['img'] = ({ src, alt }) => {
        if (!src || typeof src !== 'string') return null;

        let masks: any[] = [];
        let cleanSrc = src;

        try {
            // Server-side safe URL parsing
            const isBrowser = typeof window !== 'undefined';
            const base = isBrowser ? window.location.origin : 'http://localhost';

            const urlObj = new URL(src, base);
            const masksParam = urlObj.searchParams.get('masks');
            if (masksParam) {
                masks = JSON.parse(decodeURIComponent(masksParam));
                urlObj.searchParams.delete('masks');
                // Only use the new URL if we are in the browser to avoid domain issues during SSR
                if (isBrowser) {
                    cleanSrc = urlObj.toString();
                } else {
                    // During SSR, just strip the masks param manually or keep original
                    cleanSrc = src.split('?')[0];
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
                                        : "absolute bg-black"
                                    }
                                    style={{
                                        top: `${ymin / 10}%`,
                                        left: `${xmin / 10}%`,
                                        width: `${(xmax - xmin) / 10}%`,
                                        height: `${(ymax - ymin) / 10}%`,
                                        printColorAdjust: 'exact',
                                        WebkitPrintColorAdjust: 'exact',
                                    } as React.CSSProperties}
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
        <div className="w-full max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden border print:shadow-none print:border-none">
            <div className="p-8 prose max-w-none">
                {steps.map((stepContent, index) => (
                    <div key={index} className="mb-10 pb-10 border-b last:border-b-0">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                img: ImageRenderer,
                                // Fix hydration error: use div for paragraphs containing images
                                p: ({ node, children }) => {
                                    const hasImage = (node?.children as any[])?.some(
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

                        {/* Comment Section (not allowed inside prose directly without styling reset) */}
                        {showComments && (
                            <div className="not-prose mt-8">
                                <CommentSection manualId={manualId} stepIndex={index} readOnly={readOnly} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
