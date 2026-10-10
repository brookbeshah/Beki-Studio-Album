import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Media, getMediaSource } from '../../types';
import { X, ChevronLeft, ChevronRight, Download, Maximize2, Minimize2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../context/LanguageContext';

interface MediaViewerProps {
  media: Media[];
  currentIndex: number;
  isOpen: boolean;
  allowDownloads: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  media,
  currentIndex,
  isOpen,
  allowDownloads,
  onClose,
  onNavigate,
}) => {
  const { info } = useToast();
  const { t } = useI18n();
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const currentMedia = media[currentIndex];

  const handleNext = useCallback(() => {
    if (currentIndex < media.length - 1) {
      onNavigate(currentIndex + 1);
    } else {
      onNavigate(0); // Loop back
    }
  }, [currentIndex, media.length, onNavigate]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    } else {
      onNavigate(media.length - 1); // Loop to end
    }
  }, [currentIndex, media.length, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev]);

  // Mobile Touch Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;
    const diff = touchStartXRef.current - touchEndXRef.current;
    const minSwipeDistance = 50;

    if (diff > minSwipeDistance) {
      handleNext(); // Swiped left
    } else if (diff < -minSwipeDistance) {
      handlePrev(); // Swiped right
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  const handleDownload = async () => {
    if (!currentMedia) return;
    try {
      info(t('viewer.preparingDownload'));
      const response = await fetch(currentMedia.storagePath);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = currentMedia.originalFileName || `bekis-studio-memory-${currentIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // Direct window download fallback
      const link = document.createElement('a');
      link.href = currentMedia.storagePath;
      link.download = currentMedia.originalFileName;
      link.target = '_blank';
      link.click();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!isOpen || !currentMedia) return null;

  const isVideo = currentMedia.type === 'VIDEO';

  return (
    <div
      className="fixed inset-0 z-50 bg-[#121212]/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Bar with Counter and Actions */}
      <div
        className={`w-full flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 z-20 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Media Counter */}
        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm tracking-[0.25em] uppercase text-[#F8F6F0]/80 font-light">
            {currentIndex + 1} <span className="text-[#C8A96B] mx-1">/</span> {media.length}
          </span>
          {currentMedia.altText && (
            <span className="hidden md:inline text-xs text-[#A8A49C] tracking-wider truncate max-w-sm pl-3 border-l border-white/20 font-light">
              {currentMedia.altText}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {allowDownloads && (
            <button
              onClick={handleDownload}
              className="p-2 sm:p-2.5 rounded-full text-[#F8F6F0]/80 hover:text-[#FFFFFF] hover:bg-white/10 transition-colors cursor-pointer"
              title="Download memory"
              aria-label="Download media"
            >
              <Download className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="hidden sm:inline-flex p-2 sm:p-2.5 rounded-full text-[#F8F6F0]/80 hover:text-[#FFFFFF] hover:bg-white/10 transition-colors cursor-pointer"
            title="Fullscreen"
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-full text-[#F8F6F0]/80 hover:text-[#FFFFFF] hover:bg-white/10 transition-colors cursor-pointer"
            title="Close viewer"
            aria-label="Close viewer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Viewport Content */}
      <div
        className="flex-1 relative flex items-center justify-center p-2 sm:p-8 overflow-hidden"
        onClick={() => setControlsVisible((prev) => !prev)}
      >
        {isVideo ? (
          <div className="relative max-w-5xl max-h-[82vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <video
              src={getMediaSource(currentMedia)}
              controls
              autoPlay
              playsInline
              className="max-h-[80vh] max-w-full rounded-xs shadow-2xl object-contain border border-[#C8A96B]/30"
            />
          </div>
        ) : (
          <img
            src={getMediaSource(currentMedia)}
            alt={currentMedia.altText || 'Wedding photograph'}
            decoding="async"
            fetchPriority="high"
            className="max-h-[84vh] max-w-full object-contain rounded-xs shadow-2xl transition-all duration-300 drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
          />
        )}
      </div>

      {/* Navigation Arrows (Desktop and Tablet) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handlePrev();
        }}
        className={`hidden sm:flex absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 hover:border-[#C8A96B] items-center justify-center text-[#F8F6F0] transition-all cursor-pointer z-20 group ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-label="Previous photograph"
      >
        <ChevronLeft className="w-6 h-6 transition-transform group-hover:-translate-x-0.5 text-[#F8F6F0] group-hover:text-[#C8A96B]" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleNext();
        }}
        className={`hidden sm:flex absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 hover:border-[#C8A96B] items-center justify-center text-[#F8F6F0] transition-all cursor-pointer z-20 group ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-label="Next photograph"
      >
        <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-0.5 text-[#F8F6F0] group-hover:text-[#C8A96B]" />
      </button>

      {/* Bottom Hint for mobile */}
      <div
        className={`w-full py-4 text-center z-20 sm:hidden transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <span className="text-[10px] tracking-widest uppercase text-white/50 font-light">
          {t('viewer.swipeHint') || 'Swipe left or right to browse'}
        </span>
      </div>
    </div>
  );
};
