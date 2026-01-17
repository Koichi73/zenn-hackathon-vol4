"use client";

import { useState } from "react";
import { VideoUploader } from "@/components/VideoUploader";
import { ManualPreview } from "@/components/ManualPreview";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMarkdown, setResultMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setResultMarkdown(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Assuming backend is proxy-mapped or CORS allowed on localhost:8000
      const response = await fetch("http://localhost:8000/api/process-video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();

      // Convert dummy steps to markdown for MVP verification
      const markdown = generateMarkdownFromSteps(data);
      setResultMarkdown(markdown);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload video");
    } finally {
      setIsProcessing(false);
    }
  };

  const generateMarkdownFromSteps = (data: any) => {
    // This is a temporary formatter for the dummy data
    // Real backend might return markdown directly or we format it here
    let md = `# Video Manual: ${data.filename}\n\n`;
    if (data.steps) {
      data.steps.forEach((step: any, index: number) => {
        md += `## Step ${index + 1}: ${step.title}\n`;
        md += `**Timestamp:** ${step.timestamp}\n\n`;
        md += `${step.description}\n\n`;
        md += `![Step ${index + 1} Image](https://placehold.co/600x400?text=Frame+at+${step.timestamp})\n\n`;
        md += `---\n\n`;
      });
    }
    return md;
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Video to Manual (MVP)
          </h1>
          <p className="text-lg text-gray-600">
            Upload a video to automatically generate a step-by-step guide.
          </p>
        </div>

        <VideoUploader onFileSelect={handleFileSelect} isProcessing={isProcessing} />

        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-gray-600 font-medium">Analyzing video with Gemini...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {resultMarkdown && (
          <ManualPreview markdown={resultMarkdown} />
        )}
      </div>
    </main>
  );
}
