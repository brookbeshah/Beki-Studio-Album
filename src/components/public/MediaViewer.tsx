import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Media, getMediaSource } from '../../types';
import { X, ChevronLeft, ChevronRight, Download, Maximize2, Minimize2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../context/LanguageContext';
import { resolveStorageUrl } from '../../utils/mediaResolver';
import { useOptimizedImage } from '../../hooks/useOptimizedImage';

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
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [videoError, setVideoError] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const currentMedia = media[currentIndex];
  const isVideo = currentMedia?.type === 'VIDEO';

  // Photo source resolution using progressive loading hook
  const photoHighRes = !isVideo && currentMedia
    ? currentMedia.optimizedPath || currentMedia.storagePath || currentMedia.url || ''
    : '';
  const photoLowRes = !isVideo && currentMedia
    ? currentMedia.thumbnailPath || currentMedia.optimizedPath || currentMedia.storagePath || currentMedia.url || ''
    : '';

  const {
    currentSrc: photoCurrentSrc,
    isLoaded: photoIsLoaded,
    isLowRes: photoIsLowRes,
    hasError: photoHasError,
    resolvedHighResSrc,
    prefetchNext,
  } = useOptimizedImage({
    src: photoHighRes,
    lowResSrc: photoLowRes,
    fetchPriority: 'high',
  });

  // Resolve video URL if needed
  useEffect(() => {
    let active = true;
    if (!currentMedia || !isVideo) {
      setVideoSrc('');
      setVideoError(false);
      return;
    }

    const initSrc = getMediaSource(currentMedia);
    setVideoSrc(initSrc);
    setVideoError(false);

    const target = currentMedia.storagePath || currentMedia.url || initSrc;
    if (target) {
      resolveStorageUrl(target).then((resolved) => {
        if (active && resolved) {
          setVideoSrc(resolved);
        }
      });
    }

    return () => {
      active = false;
    };
  }, [currentMedia, isVideo]);

  // Aggressive prefetching of adjacent photographs (previous and next)
  useEffect(() => {
    if (!isOpen || media.length <= 1) return;
    const nextIdx = (currentIndex + 1) % media.length;
    const prevIdx = (currentIndex - 1 + media.length) % media.length;

    const adjacentTargets = [
      media[nextIdx]?.optimizedPath || media[nextIdx]?.storagePath || media[nextIdx]?.url,
      media[prevIdx]?.optimizedPath || media[prevIdx]?.storagePath || media[prevIdx]?.url,
    ].filter(Boolean);

    prefetchNext(adjacentTargets);
  }, [currentIndex, isOpen, media, prefetchNext]);

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
      onNavigate(media.length - 1); // Loop back
    }
  }, [currentIndex, media.length, onNavigate]);

  // Touch Swipe for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !currentMedia) return null;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const handleDownload = async () => {
    try {
      info(t('viewer.downloadStarting') || 'Starting download...');
      const downloadSrc = isVideo
        ? videoSrc || getMediaSource(currentMedia)
        : resolvedHighResSrc || photoCurrentSrc || getMediaSource(currentMedia);

      const response = await fetch(downloadSrc);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = currentMedia.originalFileName || `bekis-memory-${currentMedia.id}.${isVideo ? 'mp4' : 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.warn('Direct blob download failed, falling back to window location:', e);
      const downloadSrc = isVideo ? videoSrc : (resolvedHighResSrc || photoCurrentSrc);
      if (downloadSrc) {
        const link = document.createElement('a');
        link.href = downloadSrc;
        link.download = currentMedia.originalFileName || `memory-${currentMedia.id}`;
        link.target = '_blank';
        link.click();
      }
    }
  };

  const hasMediaError = isVideo ? videoError : photoHasError;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0E0E0E]/95 backdrop-blur-md flex flex-col justify-between selection:bg-transparent"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Bar with metadata and controls */}
      <div
        className={`w-full px-4 sm:px-8 py-4 flex items-center justify-between text-[#F8F6F0] z-20 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.25em] text-[#C8A96B] font-light">
            {currentIndex + 1} / {media.length}
          </span>
          <span className="font-serif text-sm sm:text-base text-[#F8F6F0]/90 font-light truncate max-w-xs sm:max-w-md">
            {currentMedia.altText || currentMedia.originalFileName || 'Photograph'}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {allowDownloads && (
            <button
              onClick={handleDownload}
              className="p-2 sm:p-2.5 rounded-full text-[#F8F6F0]/80 hover:text-[#FFFFFF] hover:bg-white/10 transition-colors cursor-pointer"
              title={t('viewer.downloadOriginal') || 'Download'}
              aria-label="Download photograph"
            >
              <Download className="w-5 h-5 text-[#C8A96B]" />
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="hidden sm:inline-flex p-2.5 rounded-full text-[#F8F6F0]/80 hover:text-[#FFFFFF] hover:bg-white/10 transition-colors cursor-pointer"
            title="Toggle fullscreen"
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
        {hasMediaError ? (
          <div className="flex flex-col items-center justify-center text-[#A8A49C] p-8 text-center bg-white/5 rounded-xs border border-white/10">
            <ImageIcon className="w-12 h-12 text-[#C8A96B]/60 mb-3" />
            <span className="text-sm uppercase tracking-wider text-[#F8F6F0]/80">
              {currentMedia.altText || currentMedia.originalFileName || 'Memory'}
            </span>
          </div>
        ) : isVideo ? (
          <div
            className="relative max-w-5xl max-h-[82vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={videoSrc}
              controls
              autoPlay
              playsInline
              onError={() => setVideoError(true)}
              className="max-h-[80vh] max-w-full rounded-xs shadow-2xl object-contain border border-[#C8A96B]/30"
            />
          </div>
        ) : (
          /* Progressive High-Resolution Photo Display */
          <img
            src={photoCurrentSrc}
            alt={currentMedia.altText || 'Wedding photograph'}
            decoding="async"
            fetchPriority="high"
            className={`max-h-[84vh] max-w-full object-contain rounded-xs shadow-2xl transition-all duration-500 drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] ${
              photoIsLowRes ? 'filter blur-[6px] scale-[1.01]' : 'filter blur-0 scale-100'
            }`}
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

export default MediaViewer;
