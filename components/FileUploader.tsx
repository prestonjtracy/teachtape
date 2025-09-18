'use client';

import { useState, useRef } from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
  dragText?: string;
  helpText?: string;
}

export default function FileUploader({
  onFileSelect,
  accept = "image/jpeg,image/png,image/webp",
  maxSize = 5 * 1024 * 1024, // 5MB
  disabled = false,
  loading = false,
  className = "",
  children,
  dragText = "Drop your image here, or click to browse",
  helpText = "JPG, PNG or WebP. Max 5MB."
}: FileUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File) => {
    const allowedTypes = accept.split(',').map(type => type.trim());
    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type must be ${allowedTypes.join(', ')}`);
    }
    if (file.size > maxSize) {
      throw new Error(`File size must be less than ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        validateFile(file);
        onFileSelect(file);
      } catch (error) {
        console.error('File validation error:', error);
      }
    }
    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (disabled || loading) return;
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      try {
        validateFile(file);
        onFileSelect(file);
      } catch (error) {
        console.error('File validation error:', error);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !loading) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const isInteractive = !disabled && !loading;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        disabled={disabled || loading}
        className="hidden"
      />
      
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center 
          transition-all duration-200 
          ${dragOver
            ? 'border-ttOrange bg-ttOrange/5 shadow-md scale-[1.02]'
            : 'border-gray-300 hover:border-ttOrange/50 hover:bg-gray-50'
          } 
          ${isInteractive 
            ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-ttOrange focus:ring-offset-2' 
            : 'opacity-50 cursor-not-allowed'
          }
          ${className}
        `}
        onClick={() => isInteractive && fileInputRef.current?.click()}
        tabIndex={isInteractive ? 0 : -1}
        role="button"
        aria-label="Upload file"
        onKeyDown={(e) => {
          if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        {children || (
          <div className="flex flex-col items-center gap-3">
            {loading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ttOrange"></div>
            ) : (
              <div className={`p-2 rounded-full transition-colors duration-200 ${
                dragOver ? 'bg-ttOrange/20' : 'bg-gray-100'
              }`}>
                <svg
                  className={`w-6 h-6 transition-colors duration-200 ${
                    dragOver ? 'text-ttOrange' : 'text-gray-400'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-neutral-text mb-1">
                {loading ? 'Uploading...' : dragText}
              </p>
              <p className="text-xs text-neutral-text-secondary">
                {helpText}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}