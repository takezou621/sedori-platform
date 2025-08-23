'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui';

interface ProductImageGalleryProps {
  images: string[];
  primaryImage?: string;
  productName: string;
  selectedIndex: number;
  onImageSelect: (index: number) => void;
}

export function ProductImageGallery({ 
  images, 
  primaryImage, 
  productName, 
  selectedIndex, 
  onImageSelect 
}: ProductImageGalleryProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });

  // Combine primary image with other images, ensuring no duplicates
  const allImages = primaryImage 
    ? [primaryImage, ...images.filter(img => img !== primaryImage)]
    : images.length > 0 
      ? images 
      : ['/placeholder-product.jpg'];

  const currentImage = allImages[selectedIndex] || allImages[0];

  const handlePrevious = () => {
    const newIndex = selectedIndex === 0 ? allImages.length - 1 : selectedIndex - 1;
    onImageSelect(newIndex);
  };

  const handleNext = () => {
    const newIndex = selectedIndex === allImages.length - 1 ? 0 : selectedIndex + 1;
    onImageSelect(newIndex);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setZoomPosition({ x, y });
  };

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      <div className="relative aspect-square overflow-hidden rounded-lg bg-secondary-100 group">
        <motion.div
          className="relative h-full w-full cursor-zoom-in"
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
        >
          <Image
            src={currentImage}
            alt={productName}
            fill
            className={`object-cover transition-transform duration-300 ${
              isZoomed ? 'scale-150' : 'scale-100'
            }`}
            style={
              isZoomed
                ? {
                    transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                  }
                : {}
            }
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </motion.div>

        {/* Navigation Arrows */}
        {allImages.length > 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white"
              onClick={handlePrevious}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white"
              onClick={handleNext}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Zoom Indicator */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/80 rounded-full p-2">
            <MagnifyingGlassIcon className="h-5 w-5 text-secondary-600" />
          </div>
        </div>

        {/* Image Counter */}
        {allImages.length > 1 && (
          <div className="absolute bottom-4 left-4">
            <div className="bg-black/50 text-white text-sm px-2 py-1 rounded">
              {selectedIndex + 1} / {allImages.length}
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail Navigation */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {allImages.map((image, index) => (
            <motion.button
              key={`${image}-${index}`}
              className={`relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                index === selectedIndex
                  ? 'border-primary-500 ring-2 ring-primary-200'
                  : 'border-secondary-200 hover:border-secondary-300'
              }`}
              onClick={() => onImageSelect(index)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Image
                src={image}
                alt={`${productName} view ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
              {index === selectedIndex && (
                <motion.div
                  className="absolute inset-0 bg-primary-500/20"
                  layoutId="selectedThumbnail"
                />
              )}
            </motion.button>
          ))}
        </div>
      )}

      {/* Full Screen Modal */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={() => setIsZoomed(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-4xl max-h-4xl w-full h-full m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={currentImage}
                alt={productName}
                fill
                className="object-contain"
                sizes="100vw"
              />
              <Button
                variant="outline"
                className="absolute top-4 right-4 bg-white"
                onClick={() => setIsZoomed(false)}
              >
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}