"use client";

import React, { useState } from 'react';
import { ImageMaskEditor } from './ImageMaskEditor';
import { ManualPreview } from './ManualPreview';
import { Eye, FileText } from 'lucide-react';

interface ManualEditorProps {
    initialSteps: any[];
    backendUrl: string;
    filename: string;
}

export function ManualEditor({ initialSteps, backendUrl, filename }: ManualEditorProps) {
    const [steps, setSteps] = useState(initialSteps);
    const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

    const handleMaskUpdate = (stepIndex: number, newMasks: any[]) => {
        const newSteps = [...steps];
        newSteps[stepIndex] = {
            ...newSteps[stepIndex],
            privacy_masks: newMasks
        };
        setSteps(newSteps);
    };

    const generateMarkdown = () => {
        let md = `# Video Manual: ${filename}\n\n`;

        steps.forEach((step: any, index: number) => {
            md += `## Step ${index + 1}: ${step.title}\n`;
            md += `**Timestamp:** ${step.timestamp}\n\n`;
            md += `${step.description}\n\n`;

            if (step.image_url) {
                const fullImageUrl = `${backendUrl}${step.image_url}`;

                // Encode masks into the URL for the preview renderer
                let imageUrlForMarkdown = fullImageUrl;
                if (step.privacy_masks && step.privacy_masks.length > 0) {
                    const masksJson = JSON.stringify(step.privacy_masks);
                    const encodedMasks = encodeURIComponent(masksJson);
                    imageUrlForMarkdown = `${fullImageUrl}?masks=${encodedMasks}`;
                }

                md += `![Step ${index + 1} Image](${imageUrlForMarkdown})\n`;

                // Add note about masked areas if present
                if (step.privacy_masks && step.privacy_masks.length > 0) {
                    md += `\n> [!NOTE]\n> This image contains ${step.privacy_masks.length} masked area(s) for privacy.\n`;
                }
                md += `\n`;
            }

            md += `---\n\n`;
        });
        return md;
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex space-x-2">
                    <button
                        onClick={() => setViewMode('edit')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${viewMode === 'edit'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Editor
                    </button>
                    <button
                        onClick={() => setViewMode('preview')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${viewMode === 'preview'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <Eye className="w-4 h-4" />
                        Preview Result
                    </button>
                </div>
            </div>

            {viewMode === 'edit' ? (
                <div className="space-y-12">
                    {steps.map((step, index) => (
                        <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
                                        Step {index + 1}
                                    </span>
                                    <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                                    <p className="text-sm text-gray-500 font-mono mt-1">Timestamp: {step.timestamp}</p>
                                </div>
                            </div>

                            <p className="text-gray-700 mb-6 leading-relaxed">{step.description}</p>

                            {step.image_url && (
                                <div className="mt-4">
                                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Privacy Masks</h4>
                                    <ImageMaskEditor
                                        imageUrl={`${backendUrl}${step.image_url}`}
                                        initialMasks={step.privacy_masks || []}
                                        onUpdate={(newMasks) => handleMaskUpdate(index, newMasks)}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <ManualPreview markdown={generateMarkdown()} />
            )}
        </div>
    );
}
