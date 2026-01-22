"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface Step {
  title: string;
  description: string;
  timestamp: string;
  image_url: string | null;
  privacy_masks?: any[];
  masks?: any[];
  [key: string]: any;
}

interface VideoContextType {
  steps: Step[] | null;
  filename: string;
  isProcessing: boolean;
  error: string | null;
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

  const processVideo = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setSteps(null);
    setFilename(file.name);

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
      setSteps(data.steps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload video");
      // For dev/testing without backend connection, could uncomment below:
      // setSteps(DUMMY_STEPS); 
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
  };

  return (
    <VideoContext.Provider
      value={{
        steps,
        filename,
        isProcessing,
        error,
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
