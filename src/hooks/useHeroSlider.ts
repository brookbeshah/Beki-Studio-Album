import { useState, useEffect, useRef, useCallback } from 'react';
import { HeroSlide } from '../services/studioContentService';

interface UseHeroSliderOptions {
  interval?: number;
  autoPlay?: boolean;
}

export function useHeroSlider(
  slides: HeroSlide[],
  options: UseHeroSliderOptions = {}
) {
  const { interval = 5000, autoPlay = true } = options;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  const totalSlides = slides.length;

  // Clamp active index if slides count changes
  useEffect(() => {
    if (activeIndex >= totalSlides && totalSlides > 0) {
      setActiveIndex(0);
    }
  }, [totalSlides, activeIndex]);

  const goTo = useCallback(
    (index: number) => {
      if (totalSlides === 0) return;
      const target = (index + totalSlides) % totalSlides;
      setActiveIndex(target);
    },
    [totalSlides]
  );

  const next = useCallback(() => {
    if (totalSlides <= 1) return;
    setActiveIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const previous = useCallback(() => {
    if (totalSlides <= 1) return;
    setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Check prefers-reduced-motion
  const prefersReducedMotionRef = useRef(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      prefersReducedMotionRef.current = mediaQuery.matches;

      const listener = (e: MediaQueryListEvent) => {
        prefersReducedMotionRef.current = e.matches;
      };
      mediaQuery.addEventListener?.('change', listener);
      return () => mediaQuery.removeEventListener?.('change', listener);
    }
  }, []);

  // Autoplay ticker
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (
      autoPlay &&
      !isPaused &&
      !prefersReducedMotionRef.current &&
      totalSlides > 1
    ) {
      timerRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % totalSlides);
      }, interval);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [autoPlay, isPaused, totalSlides, interval]);

  // Touch gesture handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    pause();
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    resume();
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartXRef.current;
    const swipeThreshold = 40;

    if (diff > swipeThreshold) {
      previous();
    } else if (diff < -swipeThreshold) {
      next();
    }
    touchStartXRef.current = null;
  };

  const currentSlide = slides[activeIndex] || null;

  return {
    activeIndex,
    currentSlide,
    totalSlides,
    goTo,
    next,
    previous,
    pause,
    resume,
    isPaused,
    sliderHandlers: {
      onMouseEnter: pause,
      onMouseLeave: resume,
      onFocus: pause,
      onBlur: resume,
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
    },
  };
}
