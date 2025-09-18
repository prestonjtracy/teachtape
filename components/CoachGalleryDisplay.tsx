'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface CoachGalleryDisplayProps {
  coachId: string;
  coachName?: string;
}

export default function CoachGalleryDisplay({ coachId, coachName }: CoachGalleryDisplayProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  // Load gallery images
  useEffect(() => {
    loadGallery();
  }, [coachId]);

  const loadGallery = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/coach-gallery?coachId=${coachId}`);
      const data = await response.json();
      
      if (data.success && data.images.length > 0) {
        setImages(data.images);
      } else {
        setImages([]);
      }
    } catch (error) {
      console.error('Error loading gallery:', error);
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle thumbnail click
  const handleThumbnailClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  // Handle lightbox
  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
    setShowLightbox(true);
  };

  const closeLightbox = () => {
    setShowLightbox(false);
  };

  // Keyboard navigation for lightbox
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!showLightbox) return;
    
    switch (e.key) {
      case 'Escape':
        closeLightbox();
        break;
      case 'ArrowLeft':
        setSelectedImageIndex(prev => 
          prev > 0 ? prev - 1 : images.length - 1
        );
        break;
      case 'ArrowRight':
        setSelectedImageIndex(prev => 
          prev < images.length - 1 ? prev + 1 : 0
        );
        break;
    }
  }, [showLightbox, images.length]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (showLightbox) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showLightbox]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mb-12">
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
          <div className="p-8">
            <div className="animate-pulse">
              <div className="aspect-video bg-gray-200 rounded-lg mb-4"></div>
              <div className="flex gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if no images
  if (images.length === 0) {
    return null;
  }

  const currentImage = images[selectedImageIndex];
  const getAltText = (image: GalleryImage) => {
    if (image.caption) return image.caption;
    return coachName ? `${coachName} photo` : 'Coach photo';
  };

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mb-12">
        <div className="rounded-xl bg-white shadow-lg hover:shadow-xl ring-1 ring-black/5 overflow-hidden transition-shadow duration-300">
          {/* Hero Image */}
          <div className="relative">
            <div className="aspect-video relative bg-gray-100 cursor-pointer" onClick={() => openLightbox(selectedImageIndex)}>
              <Image
                src={currentImage.image_url}
                alt={getAltText(currentImage)}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 1024px"
                priority
              />
              
              {/* Lightbox indicator */}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-gray-700 p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Image counter */}
              <div className="absolute top-4 left-4 bg-ttOrange text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                {selectedImageIndex + 1} of {images.length}
              </div>

              {/* Navigation arrows for hero image */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleThumbnailClick(selectedImageIndex > 0 ? selectedImageIndex - 1 : images.length - 1);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/60 shadow-lg"
                    aria-label="Previous image"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleThumbnailClick(selectedImageIndex < images.length - 1 ? selectedImageIndex + 1 : 0);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/60 shadow-lg"
                    aria-label="Next image"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Caption */}
            {currentImage.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6">
                <p className="text-white text-lg font-medium leading-relaxed drop-shadow-lg">{currentImage.caption}</p>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="p-6">
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => handleThumbnailClick(index)}
                    className={`flex-shrink-0 relative aspect-square w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-110 cursor-pointer ${
                      index === selectedImageIndex 
                        ? 'border-ttOrange shadow-lg ring-2 ring-ttOrange ring-offset-2' 
                        : 'border-gray-200 hover:border-ttOrange/50 hover:shadow-md'
                    }`}
                  >
                    <Image
                      src={image.image_url}
                      alt={getAltText(image)}
                      fill
                      className="object-cover"
                      sizes="64px"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {showLightbox && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-3 z-10 bg-black/30 rounded-full hover:bg-black/50 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/50"
            aria-label="Close lightbox"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image */}
          <div className="relative w-full h-full flex items-center justify-center p-8">
            <div className="relative max-w-full max-h-full">
              <Image
                src={currentImage.image_url}
                alt={getAltText(currentImage)}
                width={1200}
                height={800}
                className="max-w-full max-h-full object-contain"
                priority
              />
            </div>

            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImageIndex(prev => 
                    prev > 0 ? prev - 1 : images.length - 1
                  )}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-4 rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/60 shadow-xl"
                  aria-label="Previous image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setSelectedImageIndex(prev => 
                    prev < images.length - 1 ? prev + 1 : 0
                  )}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-4 rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/60 shadow-xl"
                  aria-label="Next image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Image info */}
            <div className="absolute bottom-4 left-4 text-white">
              <div className="bg-black/70 backdrop-blur-sm px-4 py-3 rounded-lg shadow-xl border border-white/10">
                <div className="text-sm opacity-90 font-medium">
                  {selectedImageIndex + 1} of {images.length}
                </div>
                {currentImage.caption && (
                  <div className="mt-2 text-lg font-medium leading-relaxed">{currentImage.caption}</div>
                )}
              </div>
            </div>

            {/* Keyboard hints */}
            <div className="absolute bottom-4 right-4 text-white text-sm">
              <div className="bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border border-white/10">
                <span className="hidden sm:inline opacity-90">← → Navigate • </span>
                <span className="opacity-90 font-medium">ESC Close</span>
              </div>
            </div>
          </div>

          {/* Click outside to close */}
          <div 
            className="absolute inset-0 -z-10" 
            onClick={closeLightbox}
          />
        </div>
      )}
    </>
  );
}