import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { resolveStorageUrl, getLowResPlaceholder, prefetchImage, isFirebaseStoragePath } from '../utils/mediaResolver';

// Global session memory cache of loaded & decoded image URLs
// Eliminates re-downloading, layout shift, and loading flashes across component re-renders
const globalLoadedCache = new Set<string>();
const globalFailedCache = new Set<string>();

export interface UseOptimizedImageOptions {
  src?: string | null;
  lowResSrc?: string | null;
  fallbackSrc?: string;
  prefetch?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
}

export interface UseOptimizedImageResult {
  currentSrc: string;
  isLoading: boolean;
  isLoaded: boolean;
  isLowRes: boolean;
  hasError: boolean;
  resolvedHighResSrc: string;
  retry: () => void;
  prefetchNext: (urls: (string | undefined | null)[]) => void;
}

/**
 * Memoized hook that implements a progressive-loading strategy:
 * - Renders a low-resolution placeholder immediately (0ms).
 * - Resolves Firebase Storage URLs with `getDownloadURL` and aggressive caching headers.
 * - Decodes high-resolution images in background, transitioning seamlessly.
 * - Handles loading states, prefetching, and fallback placeholders.
 */
export function useOptimizedImage({
  src,
  lowResSrc,
  fallbackSrc,
  prefetch = false,
  fetchPriority = 'auto',
}: UseOptimizedImageOptions): UseOptimizedImageResult {
  // Compute initial synchronous placeholder
  const initialPlaceholder = useMemo(() => {
    if (src && globalLoadedCache.has(src)) {
      return src;
    }
    if (lowResSrc && !isFirebaseStoragePath(lowResSrc)) {
      return lowResSrc;
    }
    return getLowResPlaceholder(600, 450);
  }, [src, lowResSrc]);

  const alreadyCached = Boolean(src && globalLoadedCache.has(src));

  const [currentSrc, setCurrentSrc] = useState<string>(initialPlaceholder);
  const [resolvedHighRes, setResolvedHighRes] = useState<string>(() => (alreadyCached && src ? src : ''));
  const [isLoading, setIsLoading] = useState<boolean>(!alreadyCached);
  const [isLoaded, setIsLoaded] = useState<boolean>(alreadyCached);
  const [isLowRes, setIsLowRes] = useState<boolean>(!alreadyCached);
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryCounter, setRetryCounter] = useState<number>(0);

  const activeMountRef = useRef<boolean>(true);

  // Sync state if source changes
  useEffect(() => {
    activeMountRef.current = true;
    let cancelled = false;

    if (!src && !lowResSrc) {
      setCurrentSrc(fallbackSrc || getLowResPlaceholder(600, 450));
      setIsLoading(false);
      setIsLoaded(false);
      setIsLowRes(false);
      return;
    }

    // If high-res already cached in memory, show immediately
    if (src && globalLoadedCache.has(src)) {
      setCurrentSrc(src);
      setResolvedHighRes(src);
      setIsLoading(false);
      setIsLoaded(true);
      setIsLowRes(false);
      setHasError(false);
      return;
    }

    const loadProgressive = async () => {
      setIsLoading(true);
      setHasError(false);

      // 1. Immediately establish low-res source if available
      let resolvedLow = lowResSrc || '';
      if (lowResSrc && isFirebaseStoragePath(lowResSrc)) {
        try {
          resolvedLow = await resolveStorageUrl(lowResSrc);
        } catch {
          resolvedLow = lowResSrc;
        }
      }

      if (cancelled) return;

      if (resolvedLow) {
        setCurrentSrc(resolvedLow);
        setIsLowRes(true);
      } else {
        setCurrentSrc(getLowResPlaceholder(600, 450));
        setIsLowRes(true);
      }

      // 2. Resolve high-resolution source (handles Firebase Storage paths & getDownloadURL)
      const targetSrc = src || lowResSrc || '';
      if (!targetSrc) {
        setIsLoading(false);
        return;
      }

      let highResUrl = targetSrc;
      if (isFirebaseStoragePath(targetSrc)) {
        try {
          highResUrl = await resolveStorageUrl(targetSrc);
        } catch (err) {
          console.debug('[useOptimizedImage] Storage URL resolution fallback:', err);
        }
      }

      if (cancelled) return;
      setResolvedHighRes(highResUrl);

      // 3. Preload & decode high-resolution image in background
      const img = new Image();
      if (fetchPriority) {
        img.fetchPriority = fetchPriority;
      }
      img.decoding = 'async';

      const handleSuccess = () => {
        if (cancelled) return;
        globalLoadedCache.add(highResUrl);
        setCurrentSrc(highResUrl);
        setIsLoaded(true);
        setIsLoading(false);
        setIsLowRes(false);
        setHasError(false);
      };

      const handleFailure = () => {
        if (cancelled) return;
        globalFailedCache.add(highResUrl);
        // If high-res fails, fall back to low-res or fallbackSrc
        if (resolvedLow && resolvedLow !== highResUrl) {
          setCurrentSrc(resolvedLow);
          setIsLoaded(true);
          setIsLoading(false);
          setIsLowRes(true);
        } else if (fallbackSrc) {
          setCurrentSrc(fallbackSrc);
          setIsLoaded(true);
          setIsLoading(false);
          setIsLowRes(false);
        } else {
          setHasError(true);
          setIsLoading(false);
        }
      };

      img.onload = () => {
        if ('decode' in img) {
          img.decode().then(handleSuccess).catch(handleSuccess);
        } else {
          handleSuccess();
        }
      };
      img.onerror = handleFailure;
      img.src = highResUrl;
    };

    loadProgressive();

    return () => {
      cancelled = true;
    };
  }, [src, lowResSrc, fallbackSrc, fetchPriority, retryCounter]);

  // Aggressive background prefetch of adjacent assets
  const prefetchNext = useCallback((urls: (string | undefined | null)[]) => {
    urls.forEach((u) => {
      if (u) prefetchImage(u);
    });
  }, []);

  const retry = useCallback(() => {
    setRetryCounter((c) => c + 1);
  }, []);

  return {
    currentSrc,
    isLoading,
    isLoaded,
    isLowRes,
    hasError,
    resolvedHighResSrc: resolvedHighRes,
    retry,
    prefetchNext,
  };
}

export default useOptimizedImage;
