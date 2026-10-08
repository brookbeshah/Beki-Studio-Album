import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseAutoSliderOptions {
  totalSlides: number;
  intervalMs?: number;
  autoPlay?: boolean;
  pauseOnHover?: boolean;
}

export interface UseAutoSliderReturn {
  currentIndex: number;
  nextSlide: () => void;
  prevSlide: () => void;
  goToSlide: (index: number) => void;
  isPlaying: boolean;
  togglePlay: () => void;
  handlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
}

/**
 * Custom hook to power smooth, high-performance automatic sliding animations.
 */
export function useAutoSlider({
  totalSlides,
  intervalMs = 4500,
  autoPlay = true,
  pauseOnHover = true,
}: UseAutoSliderOptions): UseAutoSliderReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const isHoveredRef = useRef(false);
  const touchStartXRef = useRef<number | null>(null);

  // Clamp index if totalSlides changes
  useEffect(() => {
    if (totalSlides <= 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= totalSlides) {
      setCurrentIndex(0);
    }
  }, [totalSlides, currentIndex]);

  const nextSlide = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    if (totalSlides <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = useCallback(
    (index: number) => {
      if (totalSlides <= 0) return;
      const valid = Math.max(0, Math.min(index, totalSlides - 1));
      setCurrentIndex(valid);
    },
    [totalSlides]
  );

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Automatic timer with window visibility checking
  useEffect(() => {
    if (!isPlaying || totalSlides <= 1) return;

    const timer = setInterval(() => {
      if (pauseOnHover && isHoveredRef.current) return;
      if (document.hidden) return;
      nextSlide();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, totalSlides, intervalMs, pauseOnHover, nextSlide]);

  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover) {
      isHoveredRef.current = true;
    }
  }, [pauseOnHover]);

  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover) {
      isHoveredRef.current = false;
    }
  }, [pauseOnHover]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartXRef.current === null) return;
      const touchEndX = e.changedTouches[0].clientX;
      const deltaX = touchStartXRef.current - touchEndX;

      // Minimum swipe distance threshold
      if (Math.abs(deltaX) > 40) {
        if (deltaX > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
      touchStartXRef.current = null;
    },
    [nextSlide, prevSlide]
  );

  return {
    currentIndex,
    nextSlide,
    prevSlide,
    goToSlide,
    isPlaying,
    togglePlay,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
    },
  };
}
