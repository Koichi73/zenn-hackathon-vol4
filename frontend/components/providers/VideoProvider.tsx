"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface Step {
  title: string;
  description: string;
  timestamp: string;
  image_url: string | null;
  highlight_box?: {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  };
  mask_boxes?: Array<{
    label: string;
    box: {
      ymin: number;
      xmin: number;
      ymax: number;
      xmax: number;
    };
  }>;
  [key: string]: any;
}

interface VideoContextType {
  steps: Step[] | null;
  filename: string;
  isProcessing: boolean;
  error: string | null;
  videoUrl: string | null;
  videoFile: File | null;
  manualId: string | null;
  setManualId: (id: string | null) => void;
  processVideo: (file: File) => Promise<void>;
  updateStep: (index: number, updatedStep: Step) => void;
  reset: () => void;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: { children: ReactNode }) {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [filename, setFilename] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [manualId, setManualId] = useState<string | null>(null);

  const processVideo = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setSteps(null);
    setFilename(file.name);
    setVideoFile(file);
    setManualId(null);

    // ローカルプレビューURL作成
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Use process-video-stream for SSE
      const response = await fetch("http://localhost:8000/api/process-video-stream", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("ReadableStream not supported in this browser.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Loop to read stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode chunk and add to buffer
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process lines in buffer
        const lines = buffer.split("\n\n"); // SSE events are separated by double newline
        // Keep the last partial line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("data: ")) continue;

          const jsonStr = trimmedLine.replace("data: ", "");
          try {
            const data = JSON.parse(jsonStr);
            console.log("SSE Event:", data);

            if (data.type === "init") {
              // Initialize steps structure
              setSteps(data.steps);
            } else if (data.type === "update") {
              // Update specific step
              setSteps((prevSteps) => {
                if (!prevSteps) return prevSteps;
                const newSteps = [...prevSteps];
                // Merge existing step data with new details
                newSteps[data.index] = {
                  ...newSteps[data.index],
                  ...data.step
                };
                return newSteps;
              });
            } else if (data.type === "complete") {
              console.log("Processing complete");
            } else if (data.type === "error") {
              setError(data.message || "Unknown error during streaming");
            }
          } catch (e) {
            console.error("Error parsing SSE JSON:", e);
          }
        }
      }

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to upload video");
    } finally {
      setIsProcessing(false);
    }
  };

  const updateStep = (index: number, updatedStep: Step) => {
    if (!steps) return;
    const newSteps = [...steps];
    newSteps[index] = updatedStep;
    setSteps(newSteps);
  };

  const reset = () => {
    setSteps(null);
    setFilename("");
    setError(null);
    setVideoFile(null);
    setManualId(null);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(null);
  };

  return (
    <VideoContext.Provider
      value={{
        steps,
        filename,
        isProcessing,
        error,
        videoUrl,
        videoFile,
        manualId,
        setManualId,
        processVideo,
        updateStep,
        reset,
      }}
    >
      {children}
    </VideoContext.Provider>
  );
}

export function useVideo() {
  const context = useContext(VideoContext);
  if (context === undefined) {
    throw new Error("useVideo must be used within a VideoProvider");
  }
  return context;
}
