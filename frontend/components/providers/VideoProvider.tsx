"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytesResumable } from "firebase/storage";
import { db, storage, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

interface Step {
  title: string;
  description: string;
  timestamp: string;
  image_url: string | null;
  highlight_boxes?: Array<{
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
  }>;
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
  title: string;
  setTitle: (title: string) => void;
  steps: Step[] | null;
  filename: string;
  isProcessing: boolean;
  processingStage: 'idle' | 'uploading' | 'analyzing' | 'completed';
  uploadProgress: number;
  status: string; // "analyzing_structure", "extracting_images", "analyzing_details", "completed", "error"
  error: string | null;
  manualId: string | null;
  videoUrl: string | null;
  setManualId: (id: string | null) => void;
  processVideo: (file: File) => Promise<void>;
  processGcsVideo: (gsUrl: string, title: string) => Promise<void>;
  updateStep: (index: number, updatedStep: Step) => void;
  reset: () => void;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: { children: ReactNode }) {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [title, setTitle] = useState("");
  const [filename, setFilename] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<'idle' | 'uploading' | 'analyzing' | 'completed'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [manualId, setManualId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listener for Real-time Updates
  React.useEffect(() => {
    if (!manualId || !currentUser) return;

    console.log("Setting up Firestore listener for:", manualId);
    const user_id = currentUser.uid;
    const docRef = doc(db, "users", user_id, "manuals", manualId);

    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("Firestore Update:", data.status);
        setStatus(data.status); // Expose status

        if (data.title) {
          setTitle(data.title);
        }

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
  }, [manualId, currentUser]);

  const processVideo = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setSteps(null);
    setFilename(file.name);
    // manualId set to null to clear previous listener
    setManualId(null);

    // Local preview (Not stored in state anymore as widget is removed)
    // const url = URL.createObjectURL(file);

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
      setTitle(title);

      const token = await auth.currentUser?.getIdToken();

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${apiUrl}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
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

  // GCSから直接動画を処理
  // サンプル用の関数
  const processGcsVideo = async (gsUrl: string, title: string) => {
    setIsProcessing(true);
    setError(null);
    setSteps(null);
    setFilename(gsUrl.split('/').pop() || "");
    setManualId(null);

    try {
      // 1. ID生成
      const newManualId = crypto.randomUUID();

      setProcessingStage('analyzing');

      // 2. API呼び出し
      setTitle(title);

      const token = await auth.currentUser?.getIdToken();

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${apiUrl}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
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

      // 3. firestore listenerを開始
      const data = await response.json();
      if (data.status === "accepted" && data.manual_id) {
        console.log("Analysis started for GCS video, Job ID:", data.manual_id);
        setManualId(data.manual_id);
      } else {
        throw new Error("Invalid server response");
      }

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to process GCS video");
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
    setTitle("");
    setFilename("");
    setError(null);
    setIsProcessing(false);
    setProcessingStage('idle');
    setUploadProgress(0);
    setStatus("");
    setManualId(null);
  };

  return (
    <VideoContext.Provider
      value={{
        title,
        setTitle,
        steps,
        filename,
        isProcessing,
        processingStage,
        uploadProgress,
        status,
        error,
        manualId,
        videoUrl,
        setManualId,
        processVideo,
        processGcsVideo,
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
