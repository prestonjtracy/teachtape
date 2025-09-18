'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

interface GalleryImage {
  id: string;
  coach_id: string;
  image_url: string;
  caption: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

interface CoachGalleryProps {
  coachId: string;
}

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default function CoachGallery({ coachId }: CoachGalleryProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionValue, setCaptionValue] = useState('');
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Load gallery images
  useEffect(() => {
    loadGallery();
  }, [coachId]);

  const loadGallery = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/coach-gallery?coachId=${coachId}`);
      const data = await response.json();
      
      if (data.success) {
        setImages(data.images);
      } else {
        throw new Error(data.error || 'Failed to load gallery');
      }
    } catch (error: any) {
      console.error('Error loading gallery:', error);
      setError('Failed to load gallery');
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('File type must be JPG, PNG, or WebP');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size must be less than 5MB');
    }
    if (images.length >= MAX_IMAGES) {
      throw new Error('Max 5 photos allowed');
    }
  };

  const uploadImage = async (file: File, caption?: string) => {
    try {
      setUploading(true);
      setError('');
      
      validateFile(file);

      const formData = new FormData();
      formData.append('file', file);
      if (caption) {
        formData.append('caption', caption);
      }

      const response = await fetch('/api/coach-gallery/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        setImages(prev => [...prev, data.image].sort((a, b) => a.position - b.position));
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
      const response = await fetch(`/api/coach-gallery/${imageId}/delete`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        setImages(prev => prev.filter(img => img.id !== imageId));
      } else {
        throw new Error(data.error || 'Delete failed');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const updateCaption = async (imageId: string, newCaption: string) => {
    try {
      const response = await fetch(`/api/coach-gallery/${imageId}/caption`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caption: newCaption }),
      });

      const data = await response.json();
      
      if (data.success) {
        setImages(prev => prev.map(img => 
          img.id === imageId ? data.image : img
        ));
        setEditingCaption(null);
      } else {
        throw new Error(data.error || 'Failed to update caption');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const reorderImages = async (newOrder: string[]) => {
    try {
      const response = await fetch('/api/coach-gallery/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderedIds: newOrder }),
      });

      const data = await response.json();
      
      if (data.success) {
        setImages(data.images);
      } else {
        throw new Error(data.error || 'Reorder failed');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  // File input handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
    // Reset the input so the same file can be selected again if needed
    if (e.target) {
      e.target.value = '';
    }
  };

  // Drag and drop handlers for file upload
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  // Drag and drop handlers for reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleReorderDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedItem === null || draggedItem === dropIndex) return;
    
    const newImages = [...images];
    const draggedImage = newImages[draggedItem];
    
    // Remove dragged item and insert at new position
    newImages.splice(draggedItem, 1);
    newImages.splice(dropIndex, 0, draggedImage);
    
    // Update positions and reorder
    const orderedIds = newImages.map(img => img.id);
    reorderImages(orderedIds);
  };

  const handleReorderDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const startEditingCaption = (image: GalleryImage) => {
    setEditingCaption(image.id);
    setCaptionValue(image.caption || '');
  };

  const saveCaption = (imageId: string) => {
    updateCaption(imageId, captionValue.trim());
  };

  const cancelEditingCaption = () => {
    setEditingCaption(null);
    setCaptionValue('');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
        <h3 className="text-lg font-semibold text-[#123C7A] mb-4">Gallery</h3>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ttOrange"></div>
        </div>
      </div>
    );
  }

  const canUpload = images.length < MAX_IMAGES && !uploading;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[#123C7A]">Gallery</h3>
        <span className="text-sm text-neutral-text-secondary">
          {images.length} of {MAX_IMAGES} photos
        </span>
      </div>

      {/* Upload Area */}
      {canUpload && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 mb-6 ${
            dragOver
              ? 'border-ttOrange bg-ttOrange/5'
              : 'border-gray-300 hover:border-gray-400'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ttOrange"></div>
            ) : (
              <svg
                className={`w-8 h-8 ${dragOver ? 'text-ttOrange' : 'text-gray-400'}`}
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
            )}
            <p className="text-sm font-medium text-neutral-text">
              {uploading ? 'Uploading...' : 'Drop your image here, or click to browse'}
            </p>
            <p className="text-xs text-neutral-text-secondary">
              JPG, PNG or WebP. Max 5MB.
            </p>
          </div>
        </div>
      )}

      {/* Max photos reached message */}
      {!canUpload && !uploading && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center mb-6">
          <p className="text-sm text-neutral-text-secondary">Max 5 photos</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Gallery Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={`group relative bg-gray-50 rounded-xl overflow-hidden cursor-move border-2 border-transparent hover:border-ttOrange/30 transition-all duration-200 ${
                draggedItem === index ? 'opacity-50 scale-95' : ''
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleReorderDrop(e, index)}
              onDragOver={handleReorderDragOver}
            >
              {/* Image */}
              <div className="aspect-square relative">
                <Image
                  src={image.image_url}
                  alt={image.caption || 'Gallery image'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                
                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                    <button
                      onClick={() => startEditingCaption(image)}
                      className="p-2 bg-white/90 hover:bg-white rounded-full transition-colors"
                      title="Edit caption"
                    >
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteImage(image.id)}
                      className="p-2 bg-red-500/90 hover:bg-red-500 text-white rounded-full transition-colors"
                      title="Delete image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Position indicator */}
                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  {index + 1}
                </div>

                {/* Drag handle */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/60 text-white p-1 rounded">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Caption */}
              <div className="p-3">
                {editingCaption === image.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={captionValue}
                      onChange={(e) => setCaptionValue(e.target.value)}
                      maxLength={500}
                      placeholder="Add a caption..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-ttOrange focus:border-ttOrange"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveCaption(image.id);
                        if (e.key === 'Escape') cancelEditingCaption();
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveCaption(image.id)}
                        className="px-3 py-1 bg-ttOrange text-white text-xs rounded hover:bg-ttOrange/90 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditingCaption}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p 
                    className="text-sm text-neutral-text cursor-pointer hover:text-ttOrange transition-colors"
                    onClick={() => startEditingCaption(image)}
                  >
                    {image.caption || 'Click to add caption...'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {images.length === 0 && !uploading && (
        <div className="text-center py-8">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-neutral-text-secondary mb-2">No photos in your gallery yet</p>
          <p className="text-sm text-neutral-text-secondary">Upload up to 5 photos to showcase your coaching</p>
        </div>
      )}
    </div>
  );
}