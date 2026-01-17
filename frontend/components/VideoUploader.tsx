import React, { useState, useCallback } from 'react';
import { Upload, FileVideo, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoUploaderProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export function VideoUploader({ onFileSelect, isProcessing }: VideoUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        setSelectedFile(file);
        onFileSelect(file);
      } else {
         alert("Please upload a video file");
      }
    }
  }, [onFileSelect]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setSelectedFile(file);
        onFileSelect(file);
    }
  }, [onFileSelect]);

  const clearFile = () => {
      setSelectedFile(null);
      // Logic to clear in parent if needed, but for MVP simple is okay
  };

  return (
    <div className="w-full max-w-xl mx-auto mb-8">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:bg-gray-50",
          isProcessing && "opacity-50 pointer-events-none"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleChange}
          accept="video/*"
          disabled={isProcessing}
        />
        
        {selectedFile ? (
            <div className="flex items-center justify-center gap-4">
                <FileVideo className="w-8 h-8 text-blue-500" />
                <div className="text-left">
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                 {/* Clear button could go here but skipping for MVP simple flow */}
            </div>
        ) : (
            <div className="space-y-2">
                <Upload className="w-10 h-10 mx-auto text-gray-400" />
                <p className="text-lg font-medium text-gray-700">Drop your video here</p>
                <p className="text-sm text-gray-500">or click to browse (MP4, MOV)</p>
            </div>
        )}
      </div>
    </div>
  );
}
