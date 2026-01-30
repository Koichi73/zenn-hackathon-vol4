"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, uploadBytesResumable } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

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
  processingStage: 'idle' | 'uploading' | 'analyzing' | 'completed';
  uploadProgress: number;
  status: string; // "analyzing_structure", "extracting_images", "analyzing_details", "completed", "error"
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
  const [processingStage, setProcessingStage] = useState<'idle' | 'uploading' | 'analyzing' | 'completed'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [manualId, setManualId] = useState<string | null>(null);

  // Firestore Listener for Real-time Updates
  React.useEffect(() => {
    if (!manualId) return;

    console.log("Setting up Firestore listener for:", manualId);
    const user_id = "test-user-001"; // Fixed for now
    const docRef = doc(db, "users", user_id, "manuals", manualId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("Firestore Update:", data.status);
        setStatus(data.status); // Expose status

        // Update Steps
        if (data.steps && Array.isArray(data.steps)) {
          setSteps(data.steps as Step[]);
        }

        // Handle Processing State
        if (data.status === "completed") {
          setIsProcessing(false);
          setProcessingStage('completed');
        } else if (data.status === "error") {
          setError("Analysis failed. Please try again.");
          setIsProcessing(false);
          setProcessingStage('idle');
        } else {
          // analyzing_structure, extracting_images, analyzing_details
          setIsProcessing(true);
          setProcessingStage('analyzing');
        }

      } else {
        console.log("No such document!");
      }
    }, (err) => {
      console.error("Firestore Error:", err);
      setError("Failed to sync with server.");
    });

    return () => unsubscribe();
  }, [manualId]);

  const processVideo = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setSteps(null);
    setFilename(file.name);
    setVideoFile(file);
    // manualId set to null to clear previous listener
    setManualId(null);

    // Local preview
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    try {
      // 1. Generate ID
      const newManualId = crypto.randomUUID();

      // 2. Upload to Firebase Storage
      // Fixed path structure requested by user: manuals/{manual_id}/video.mp4
      const storagePath = `manuals/${newManualId}/video.mp4`;
      const storageRef = ref(storage, storagePath);

      console.log("Uploading to:", storagePath);
      setProcessingStage('uploading');

      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload is ' + progress + '% done');
            setUploadProgress(progress);
          },
          (error) => {
            reject(error);
          },
          () => {
            resolve();
          }
        );
      });

      // 3. Construct GS URL
      const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      const gsUrl = `gs://${bucketName}/${storagePath}`;
      console.log("Uploaded. GS URL:", gsUrl);

      setProcessingStage('analyzing'); // Upload done, API call next

      // 4. Call Backend
      const title = file.name.replace(/\.[^/.]+$/, "");

      const response = await fetch("http://localhost:8000/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          manual_id: newManualId,
          video_url: gsUrl,
          title: title
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.status === "accepted" && data.manual_id) {
        console.log("Analysis started, Job ID:", data.manual_id);
        setManualId(data.manual_id);
        // Listener will pick up from here
      } else {
        throw new Error("Invalid server response");
      }

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to upload video");
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
    setProcessingStage('idle');
    setUploadProgress(0);
    setStatus("");
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
        processingStage,
        uploadProgress,
        status,
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
