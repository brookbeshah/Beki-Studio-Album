import React, { useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export interface LightboxItem {
  id: string;
  url: string;
  altText?: string;
  caption?: string;
}

interface ImageLightboxProps {
  items: LightboxItem[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  items,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
}) => {
  const touchStartXRef = useRef<number | null>(null);

  const total = items.length;
  const currentItem = items[currentIndex];

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (total > 1) {
          onNavigate((currentIndex - 1 + total) % total);
        }
      } else if (e.key === 'ArrowRight') {
        if (total > 1) {
          onNavigate((currentIndex + 1) % total);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, currentIndex, total, onClose, onNavigate]);

  if (!isOpen || !currentItem) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartXRef.current;
    if (diff > 50 && total > 1) {
      onNavigate((currentIndex - 1 + total) % total);
    } else if (diff < -50 && total > 1) {
      onNavigate((currentIndex + 1) % total);
    }
    touchStartXRef.current = null;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-[#171717]/95 backdrop-blur-md flex flex-col justify-between select-none animate-fadeIn"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="w-full flex items-center justify-between px-6 py-4 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="font-serif text-sm tracking-widest text-[#DCCB9A]">
            Beki's Studio
          </span>
          <span className="text-[#77736B]">•</span>
          <span className="text-xs font-mono tracking-wider text-[#A8A49C]">
            {currentIndex + 1} / {total}
          </span>
        </div>

        <button
          onClick={onClose}
          aria-label="Close viewer"
          className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Image Area */}
      <div
        className="relative flex-1 flex items-center justify-center p-4 sm:p-8"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Previous Button */}
        {total > 1 && (
          <button
            onClick={() => onNavigate((currentIndex - 1 + total) % total)}
            aria-label="Previous image"
            className="absolute left-2 sm:left-6 z-20 p-3 text-white/70 hover:text-white bg-black/40 hover:bg-black/70 rounded-full backdrop-blur-xs transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* The Image */}
        <div className="max-w-5xl max-h-[82vh] flex flex-col items-center justify-center">
          <img
            src={currentItem.url}
            alt={currentItem.altText || currentItem.caption || `Gallery photograph ${currentIndex + 1}`}
            className="max-h-[75vh] w-auto max-w-full object-contain rounded-xs shadow-2xl filter brightness-[0.98] contrast-[1.02]"
          />

          {/* Caption */}
          {(currentItem.caption || currentItem.altText) && (
            <p className="mt-3 text-xs sm:text-sm text-center text-[#E8E0D0] font-light max-w-xl px-4 italic font-serif">
              {currentItem.caption || currentItem.altText}
            </p>
          )}
        </div>

        {/* Next Button */}
        {total > 1 && (
          <button
            onClick={() => onNavigate((currentIndex + 1) % total)}
            aria-label="Next image"
            className="absolute right-2 sm:right-6 z-20 p-3 text-white/70 hover:text-white bg-black/40 hover:bg-black/70 rounded-full backdrop-blur-xs transition-colors cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Bar: Touch/Keyboard Hint */}
      <div className="w-full text-center pb-4 text-[11px] text-[#77736B] tracking-wider uppercase">
        <span className="hidden sm:inline">Use arrow keys to navigate &bull; Esc to exit</span>
        <span className="sm:hidden">Swipe left or right to browse</span>
      </div>
    </div>
  );
};
