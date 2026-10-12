import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { Media, Album, getMediaSource } from '../types';

// In-memory cache for resolved Firebase Storage download URLs
const resolvedUrlCache = new Map<string, string>();

// Client-side persistent cache key prefix
const STORAGE_CACHE_PREFIX = 'bekis_img_cache_v1_';
const MAX_PERSISTENT_CACHE_ENTRIES = 500;

/**
 * Safely reads from sessionStorage / localStorage for browser caching
 */
function getFromBrowserStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage?.getItem(STORAGE_CACHE_PREFIX + key) || null;
  } catch {
    return null;
  }
}

/**
 * Safely writes to sessionStorage / localStorage with aggressive cache retention
 */
function setToBrowserStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage?.setItem(STORAGE_CACHE_PREFIX + key, value);
  } catch {
    // Ignore quota errors in private browsing
  }
}

/**
 * Generates an ultra-lightweight, zero-network SVG placeholder data URI
 * with a luxurious warm ivory palette and subtle geometric shimmer.
 * Prevents layout shift and blank content areas while high-resolution media fetches.
 */
export function getLowResPlaceholder(width = 800, height = 600): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#EFECE4"/>
        <stop offset="50%" stop-color="#F5F2EA"/>
        <stop offset="100%" stop-color="#EBE7DE"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#g)"/>
    <circle cx="${width / 2}" cy="${height / 2}" r="16" fill="#C8A96B" opacity="0.18"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Checks if a string is a Firebase Storage reference path or gs:// URL.
 */
export function isFirebaseStoragePath(pathOrUrl?: string | null): boolean {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return false;
  const trimmed = pathOrUrl.trim();
  if (trimmed.startsWith('gs://')) return true;
  // If it does not start with http://, https://, /, or data:, but contains a folder path like albums/ or media/
  if (
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('/') &&
    !trimmed.startsWith('data:') &&
    !trimmed.startsWith('blob:') &&
    (trimmed.startsWith('albums/') ||
      trimmed.startsWith('media/') ||
      trimmed.startsWith('photos/') ||
      trimmed.startsWith('videos/'))
  ) {
    return true;
  }
  return false;
}

/**
 * Resolves any Firebase Storage path (e.g. gs:// or albums/...) into a full HTTPS download URL
 * using `getDownloadURL` from the Firebase Storage SDK.
 * Incorporates aggressive memory & browser-side caching headers for all image assets.
 */
export async function resolveStorageUrl(pathOrUrl?: string | null): Promise<string> {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return '';
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return '';

  // Already a data URI, local upload path, or blob URL
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Already a full HTTPS URL (Firebase Storage download URL or external CDN)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // 1. Check in-memory cache first (0ms)
  if (resolvedUrlCache.has(trimmed)) {
    return resolvedUrlCache.get(trimmed)!;
  }

  // 2. Check browser persistent cache (sessionStorage)
  const cachedInStorage = getFromBrowserStorage(trimmed);
  if (cachedInStorage) {
    resolvedUrlCache.set(trimmed, cachedInStorage);
    return cachedInStorage;
  }

  // 3. Resolve using getDownloadURL from Firebase Storage SDK
  try {
    const storageRef = trimmed.startsWith('gs://')
      ? ref(storage, trimmed)
      : ref(storage, trimmed);

    const downloadUrl = await getDownloadURL(storageRef);
    if (downloadUrl) {
      resolvedUrlCache.set(trimmed, downloadUrl);
      setToBrowserStorage(trimmed, downloadUrl);
      return downloadUrl;
    }
  } catch (err: any) {
    // Graceful fallback: return original string if resolving fails
    console.debug(`[MediaResolver] Note: Could not resolve Firebase Storage reference "${trimmed}":`, err?.message || err);
  }

  return trimmed;
}

/**
 * Aggressive image prefetching into browser HTTP cache.
 * Ensures subsequent photos and lightbox views load instantaneously across devices.
 */
const prefetchedUrls = new Set<string>();

export function prefetchImage(urlOrPath: string): void {
  if (!urlOrPath || typeof window === 'undefined') return;

  const initiatePrefetch = (url: string) => {
    if (prefetchedUrls.has(url) || url.startsWith('data:')) return;
    prefetchedUrls.add(url);

    // 1. Use HTML link rel=preload if available in head
    try {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    } catch {
      // Fallback to Image() object
    }

    // 2. Preload into image cache
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  };

  if (isFirebaseStoragePath(urlOrPath)) {
    resolveStorageUrl(urlOrPath).then((resolved) => {
      if (resolved) initiatePrefetch(resolved);
    });
  } else {
    initiatePrefetch(urlOrPath);
  }
}

/**
 * Resolves the immediate low-resolution placeholder source for a media item
 * (e.g. thumbnailPath, optimizedPath, or low-res SVG) to enable progressive loading.
 */
export function getMediaThumbnailSource(item: Media): string {
  if (item.thumbnailPath && !isFirebaseStoragePath(item.thumbnailPath)) {
    return item.thumbnailPath;
  }
  if (item.url && !isFirebaseStoragePath(item.url)) {
    return item.url;
  }
  if (item.storagePath && !isFirebaseStoragePath(item.storagePath)) {
    return item.storagePath;
  }
  return getLowResPlaceholder(400, 300);
}

/**
 * Resolves all media sources for a single Media item, ensuring Firebase Storage paths
 * in storagePath, thumbnailPath, and optimizedPath are resolved to valid download URLs.
 */
export async function resolveSingleMedia(item: Media): Promise<Media> {
  let hasChanges = false;
  const updated = { ...item };

  if (isFirebaseStoragePath(updated.storagePath)) {
    const resolved = await resolveStorageUrl(updated.storagePath);
    if (resolved && resolved !== updated.storagePath) {
      updated.storagePath = resolved;
      hasChanges = true;
    }
  }

  if (isFirebaseStoragePath(updated.thumbnailPath)) {
    const resolved = await resolveStorageUrl(updated.thumbnailPath);
    if (resolved && resolved !== updated.thumbnailPath) {
      updated.thumbnailPath = resolved;
      hasChanges = true;
    }
  }

  if (isFirebaseStoragePath(updated.optimizedPath)) {
    const resolved = await resolveStorageUrl(updated.optimizedPath);
    if (resolved && resolved !== updated.optimizedPath) {
      updated.optimizedPath = resolved;
      hasChanges = true;
    }
  }

  return hasChanges ? updated : item;
}

/**
 * Batch-resolves all Media items for an album.
 */
export async function resolveMediaList(mediaList: Media[]): Promise<Media[]> {
  if (!mediaList || mediaList.length === 0) return [];
  return Promise.all(mediaList.map((m) => resolveSingleMedia(m)));
}

/**
 * Resolves the best cover image URL for an album.
 * If the album coverImageUrl is a Firebase Storage path, it resolves it.
 * If coverImageUrl is empty, falls back to the first available photo in the media list.
 */
export async function resolveAlbumCoverUrl(album: Album, mediaList?: Media[]): Promise<string> {
  if (album.coverImageUrl && album.coverImageUrl.trim()) {
    const resolved = await resolveStorageUrl(album.coverImageUrl);
    if (resolved) return resolved;
  }

  // Fallback to first photo in media
  if (mediaList && mediaList.length > 0) {
    const firstPhoto = mediaList.find((m) => m.type !== 'VIDEO') || mediaList[0];
    if (firstPhoto) {
      const src = getMediaSource(firstPhoto);
      if (src) {
        return await resolveStorageUrl(src);
      }
    }
  }

  return '';
}
