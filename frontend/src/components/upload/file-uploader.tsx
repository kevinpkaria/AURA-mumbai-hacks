"use client";

import * as React from "react";
import { Upload, File, X, CheckCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface FileUploaderProps {
    onUploadComplete?: (files: File[], data?: any) => void;
}

export function FileUploader({ onUploadComplete }: FileUploaderProps) {
    const [isDragging, setIsDragging] = React.useState(false);
    const [files, setFiles] = React.useState<File[]>([]);
    const [uploading, setUploading] = React.useState(false);
    const [progress, setProgress] = React.useState(0);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const newFiles = Array.from(e.dataTransfer.files);
            setFiles((prev) => [...prev, ...newFiles]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFiles((prev) => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploading(true);
        setProgress(10);

        try {
            const result = await api.uploadDocument(files[0]);
            setProgress(100);

            if (onUploadComplete) onUploadComplete(files, result);

            setTimeout(() => {
                setFiles([]);
                setProgress(0);
                setUploading(false);
            }, 1000);

        } catch (error: any) {
            console.error("Upload Error:", error);
            setUploading(false);
            alert(error.message || "Failed to upload and analyze document.");
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div
                className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                    isDragging
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-primary/50"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-input")?.click()}
            >
                <input
                    id="file-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    multiple
                    onChange={handleFileSelect}
                />
                <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-2">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted-foreground">
                        <strong>JPG, PNG, GIF, WebP</strong> supported
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Medical reports, lab results, prescriptions
                    </p>
                </div>
            </div>

            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 space-y-2"
                    >
                        {files.map((file, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <File className="h-4 w-4 text-primary flex-shrink-0" />
                                    <span className="text-sm truncate">{file.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeFile(i);
                                    }}
                                    className="text-muted-foreground hover:text-destructive"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </motion.div>
                        ))}

                        <div className="pt-2">
                            {uploading ? (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Analyzing Document with AI...
                                    </div>
                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-500"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <Button onClick={handleUpload} className="w-full">
                                    Upload & Analyze
                                </Button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
