'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import FileUploader from '@/components/FileUploader';

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

export default function CoachGallery({ coachId }: CoachGalleryProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionValue, setCaptionValue] = useState('');
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

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

  const uploadImage = async (file: File, caption?: string) => {
    try {
      setUploading(true);
      setError('');

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
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 hover:shadow-2xl transition-all duration-300 hover:translate-y-[-2px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[#123C7A]">Gallery</h3>
        <span className="text-sm text-neutral-text-secondary bg-gray-100 px-3 py-1 rounded-full">
          {images.length} of {MAX_IMAGES} photos
        </span>
      </div>

      {/* Upload Area */}
      {canUpload && (
        <div className="mb-6">
          <FileUploader
            onFileSelect={(file) => uploadImage(file)}
            loading={uploading}
            className="hover:shadow-lg transition-all duration-300"
          />
        </div>
      )}

      {/* Max photos reached message */}
      {!canUpload && !uploading && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4 text-center mb-6 shadow-sm">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-orange-700">Max 5 photos reached</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6 shadow-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={`group relative bg-white rounded-xl overflow-hidden cursor-move border-2 shadow-sm hover:shadow-lg transition-all duration-300 ${
                draggedItem === index 
                  ? 'opacity-50 scale-95 rotate-2 shadow-2xl border-ttOrange' 
                  : 'border-transparent hover:border-ttOrange/30 hover:scale-[1.02]'
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                  <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 flex gap-3">
                    <button
                      onClick={() => startEditingCaption(image)}
                      className="p-3 bg-white/95 hover:bg-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ttOrange focus:ring-offset-2"
                      title="Edit caption"
                    >
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteImage(image.id)}
                      className="p-3 bg-red-500/95 hover:bg-red-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                      title="Delete image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Position indicator */}
                <div className="absolute top-3 left-3 bg-ttOrange text-white text-xs font-semibold px-2 py-1 rounded-full shadow-md">
                  {index + 1}
                </div>

                {/* Drag handle */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:scale-110">
                  <div className="bg-white/90 backdrop-blur-sm text-gray-700 p-2 rounded-full shadow-lg">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Caption */}
              <div className="p-4 bg-white">
                {editingCaption === image.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={captionValue}
                      onChange={(e) => setCaptionValue(e.target.value)}
                      maxLength={500}
                      placeholder="Add a caption..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-ttOrange focus:border-ttOrange shadow-sm transition-all duration-200 hover:shadow-md"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveCaption(image.id);
                        if (e.key === 'Escape') cancelEditingCaption();
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveCaption(image.id)}
                        className="px-4 py-2 bg-ttOrange text-white text-sm rounded-md hover:bg-ttOrange/90 shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ttOrange focus:ring-offset-1"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditingCaption}
                        className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p 
                    className="text-sm text-neutral-text cursor-pointer hover:text-ttOrange transition-all duration-200 hover:bg-ttOrange/5 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-ttOrange focus:ring-offset-1"
                    onClick={() => startEditingCaption(image)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        startEditingCaption(image);
                      }
                    }}
                  >
                    {image.caption || (
                      <span className="text-neutral-text-secondary italic">
                        Click to add caption...
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {images.length === 0 && !uploading && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-ttOrange/20 to-ttBlue/20 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-neutral-text mb-2">No photos in your gallery yet</h4>
          <p className="text-sm text-neutral-text-secondary">Upload up to 5 photos to showcase your coaching</p>
        </div>
      )}
    </div>
  );
}