import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
} from 'firebase/storage';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  getDocs,
  getDoc,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import { storage, db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Media, Album } from '../types';
import { logActivity, clearAlbumCache } from './albumService';
import { compressImageFile, compressImageIfNeeded, CompressionDiagnostic } from '../utils/imageUtils';

export { compressImageFile, compressImageIfNeeded };
export type { CompressionDiagnostic };

export interface UploadProgressCallback {
  (percentage: number, bytesTransferred: number, totalBytes: number): void;
}

export interface MediaUploadOptions {
  sectionId?: string;
  onProgress?: UploadProgressCallback;
  onStageChange?: (stage: 'PREPARING' | 'COMPRESSING' | 'UPLOADING' | 'SAVING') => void;
  onDiagnostic?: (diagnostic: CompressionDiagnostic) => void;
  existingStorageUrl?: string;
  existingMediaId?: string;
  actor?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ActiveUploadControl {
  task: UploadTask;
  cancel: () => void;
}

const isDebugEnabled = typeof window !== 'undefined' && (
  (import.meta as any).env?.VITE_ENABLE_UPLOAD_DEBUG === 'true' ||
  (import.meta as any).env?.DEV === true
);

/**
 * Validate an external image/media URL for safety, protocol, and structure.
 */
export function validateImageUrl(rawUrl: string): { valid: boolean; normalized: string; error?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, normalized: '', error: 'Image URL is required' };
  }
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, normalized: '', error: 'Image URL cannot be empty' };
  }
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('blob:')
  ) {
    return { valid: false, normalized: '', error: 'Unsafe or unsupported URL scheme detected' };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, normalized: '', error: 'URL must begin with http:// or https://' };
    }
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return { valid: false, normalized: '', error: 'URL domain hostname is invalid' };
    }
    return { valid: true, normalized: parsed.toString() };
  } catch {
    return { valid: false, normalized: '', error: 'Malformed URL format' };
  }
}

/**
 * Add an image or video directly to an album using an external HTTP/HTTPS URL.
 * Instant operation with zero upload delay, saved into Firestore under the unified Media model.
 */
export async function addMediaFromUrl(options: {
  albumId: string;
  url: string;
  altText?: string;
  caption?: string;
  sectionId?: string;
  actor?: { id: string; name: string; email: string };
  isVideo?: boolean;
}): Promise<Media> {
  const { albumId, url, isVideo = false } = options;
  const validation = validateImageUrl(url);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid media URL');
  }

  const mediaType: 'PHOTO' | 'VIDEO' = isVideo || !!url.match(/\.(mp4|mov|webm)(\?.*)?$/i) ? 'VIDEO' : 'PHOTO';
  const mediaId = 'med_url_' + Math.random().toString(36).substring(2, 10);
  const normalizedUrl = validation.normalized;

  const actor = options.actor || {
    id: auth.currentUser?.uid || 'admin',
    name: auth.currentUser?.displayName || 'Administrator',
    email: auth.currentUser?.email || 'admin@bekisstudio.com',
  };

  const rawFilename = normalizedUrl.split('/').pop()?.split('?')[0] || (mediaType === 'VIDEO' ? 'video.mp4' : 'photo.jpg');

  const newMedia: Media = {
    id: mediaId,
    albumId,
    type: mediaType,
    sourceType: 'URL',
    url: normalizedUrl,
    originalFileName: rawFilename,
    storagePath: normalizedUrl,
    thumbnailPath: normalizedUrl,
    optimizedPath: normalizedUrl,
    mimeType: mediaType === 'VIDEO' ? 'video/mp4' : 'image/jpeg',
    fileSize: 0,
    sortOrder: Date.now(),
    sectionId: options.sectionId || '',
    uploadedBy: actor.id,
    uploadedByEmail: actor.email,
    uploadedAt: new Date().toISOString(),
    processingStatus: 'READY',
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    altText: options.altText || options.caption || rawFilename.replace(/[-_]/g, ' '),
  };

  try {
    await setDoc(doc(db, 'media', mediaId), newMedia);

    // Update Album counters and cover photo if missing
    const albumRef = doc(db, 'albums', albumId);
    const albumSnap = await getDoc(albumRef);
    if (albumSnap.exists()) {
      const albumData = albumSnap.data() as Album;
      const isVid = mediaType === 'VIDEO';
      const currentPhotoCount = albumData.photoCount || 0;
      const currentVideoCount = albumData.videoCount || 0;
      const currentMediaCount = albumData.mediaCount || 0;

      const updates: Partial<Album> = {
        mediaCount: currentMediaCount + 1,
        photoCount: isVid ? currentPhotoCount : currentPhotoCount + 1,
        videoCount: isVid ? currentVideoCount + 1 : currentVideoCount,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id,
        updatedByEmail: actor.email,
      };

      if (!albumData.coverImageUrl && !isVid) {
        updates.coverImageUrl = normalizedUrl;
        updates.coverMediaId = mediaId;
      }

      await updateDoc(albumRef, updates);
    }

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'MEDIA_UPLOADED',
      targetType: 'media',
      targetId: mediaId,
      details: `Added ${mediaType.toLowerCase()} from external URL to album ${albumId}`,
    }).catch(() => {});

    return newMedia;
  } catch (firestoreError: any) {
    console.error('[Add Media From URL Error]', firestoreError);
    handleFirestoreError(firestoreError, OperationType.CREATE, `media/${mediaId}`);
  }
}

/**
 * Batch add multiple images or videos from a list of URLs with high performance.
 */
export async function addMultipleMediaFromUrls(options: {
  albumId: string;
  urls: string[];
  altTextPrefix?: string;
  sectionId?: string;
  actor?: { id: string; name: string; email: string };
}): Promise<Media[]> {
  const { albumId, urls, altTextPrefix = '', sectionId = '' } = options;
  const actor = options.actor || {
    id: auth.currentUser?.uid || 'admin',
    name: auth.currentUser?.displayName || 'Administrator',
    email: auth.currentUser?.email || 'admin@bekisstudio.com',
  };

  const addedMedia: Media[] = [];
  let photoAdded = 0;
  let videoAdded = 0;

  for (let i = 0; i < urls.length; i++) {
    const rawUrl = urls[i].trim();
    if (!rawUrl) continue;
    const validation = validateImageUrl(rawUrl);
    if (!validation.valid) continue;

    const isVideo = !!rawUrl.match(/\.(mp4|mov|webm)(\?.*)?$/i);
    const mediaType: 'PHOTO' | 'VIDEO' = isVideo ? 'VIDEO' : 'PHOTO';
    const mediaId = 'med_url_' + Math.random().toString(36).substring(2, 10);
    const normalizedUrl = validation.normalized;
    const rawFilename = normalizedUrl.split('/').pop()?.split('?')[0] || (isVideo ? 'video.mp4' : 'photo.jpg');

    const newMedia: Media = {
      id: mediaId,
      albumId,
      type: mediaType,
      sourceType: 'URL',
      url: normalizedUrl,
      originalFileName: rawFilename,
      storagePath: normalizedUrl,
      thumbnailPath: normalizedUrl,
      optimizedPath: normalizedUrl,
      mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
      fileSize: 0,
      sortOrder: Date.now() + i,
      sectionId,
      uploadedBy: actor.id,
      uploadedByEmail: actor.email,
      uploadedAt: new Date().toISOString(),
      processingStatus: 'READY',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      altText: altTextPrefix ? `${altTextPrefix} ${i + 1}` : rawFilename.replace(/[-_]/g, ' '),
    };

    await setDoc(doc(db, 'media', mediaId), newMedia);
    addedMedia.push(newMedia);
    if (isVideo) videoAdded++;
    else photoAdded++;
  }

  if (addedMedia.length > 0) {
    const albumRef = doc(db, 'albums', albumId);
    const albumSnap = await getDoc(albumRef);
    if (albumSnap.exists()) {
      const albumData = albumSnap.data() as Album;
      const updates: Partial<Album> = {
        mediaCount: (albumData.mediaCount || 0) + addedMedia.length,
        photoCount: (albumData.photoCount || 0) + photoAdded,
        videoCount: (albumData.videoCount || 0) + videoAdded,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id,
        updatedByEmail: actor.email,
      };

      if (!albumData.coverImageUrl && photoAdded > 0) {
        const firstPhoto = addedMedia.find((m) => m.type === 'PHOTO');
        if (firstPhoto) {
          updates.coverImageUrl = firstPhoto.storagePath;
          updates.coverMediaId = firstPhoto.id;
        }
      }

      await updateDoc(albumRef, updates);
    }
  }

  return addedMedia;
}

/**
 * Upload a media file (photo or video) with comprehensive diagnostic logging for:
 * 1. File validation steps
 * 2. Authentication state
 * 3. Storage bucket path resolution
 * 4. Detailed Firebase Storage interaction & failure reasons
 * 5. High-speed integrated server storage pipeline and Firestore persistence
 */
export async function uploadMediaFile(
  albumId: string,
  rawFile: File,
  options?: MediaUploadOptions
): Promise<Media> {
  const isVideo = rawFile.type.startsWith('video') || !!rawFile.name.match(/\.(mp4|mov|webm)$/i);
  const mediaType: 'PHOTO' | 'VIDEO' = isVideo ? 'VIDEO' : 'PHOTO';
  const mediaId = options?.existingMediaId || ('med_' + Math.random().toString(36).substring(2, 10));

  let file = rawFile;
  let downloadUrl = options?.existingStorageUrl || '';

  // ----------------------------------------------------
  // DIAGNOSTIC STEP 1: File Validation
  // ----------------------------------------------------
  options?.onStageChange?.('PREPARING');

  const validationInfo = {
    fileName: rawFile.name,
    fileSizeRaw: rawFile.size,
    fileSizeMB: (rawFile.size / (1024 * 1024)).toFixed(2) + ' MB',
    fileType: rawFile.type || 'unknown/binary',
    detectedType: mediaType,
    hasFileObject: !!rawFile,
    isValidSize: rawFile.size > 0 && rawFile.size < 100 * 1024 * 1024,
  };

  console.debug('[MediaUpload Diagnostic] Step 1: File Validation:', validationInfo);

  if (!validationInfo.hasFileObject || validationInfo.fileSizeRaw === 0) {
    const errorMsg = 'File validation failed: Empty or invalid file selected.';
    console.error('[MediaUpload Diagnostic] Pipeline Failure Reason:', errorMsg);
    throw new Error(errorMsg);
  }

  // ----------------------------------------------------
  // DIAGNOSTIC STEP 2: Client-side Image Compression (Local raster photos > 1.5 MiB only)
  // ----------------------------------------------------
  if (!isVideo && !downloadUrl) {
    options?.onStageChange?.('COMPRESSING');
    const compressionResult = await compressImageFile(rawFile);
    file = compressionResult.file;
    if (options?.onDiagnostic) {
      options.onDiagnostic(compressionResult.diagnostic);
    }
    console.debug('[MediaUpload Diagnostic] Step 2: Image Compression Result:', compressionResult.diagnostic);
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || (isVideo ? 'mp4' : 'jpg');
  const safeFilename = `${Date.now()}_${mediaId}.${fileExt}`;

  // ----------------------------------------------------
  // DIAGNOSTIC STEP 3: Authentication State
  // ----------------------------------------------------
  const currentUser = auth.currentUser;
  const actor = options?.actor || {
    id: currentUser?.uid || 'admin',
    name: currentUser?.displayName || 'Administrator',
    email: currentUser?.email || 'admin@bekisstudio.com',
  };

  const authDiagnostic = {
    isSignedIn: !!currentUser,
    uid: currentUser?.uid || null,
    email: currentUser?.email || null,
    isAnonymous: currentUser?.isAnonymous ?? false,
    emailVerified: currentUser?.emailVerified ?? false,
    actorContext: actor,
  };

  console.debug('[MediaUpload Diagnostic] Step 3: Authentication State:', authDiagnostic);

  // ----------------------------------------------------
  // DIAGNOSTIC STEP 4: Storage Upload (Skipped if recovering existingStorageUrl)
  // ----------------------------------------------------
  if (!downloadUrl) {
    options?.onStageChange?.('UPLOADING');
    const folder = isVideo ? 'videos' : 'photos';
    const storageFilePath = `albums/${albumId}/${folder}/${safeFilename}`;
    const bucketName = storage.app.options.storageBucket || 'ai-studio-aurastudios-8cd4011e-3603-4fa1-bf68-d40b2b2e6b74.appspot.com';

    let firebaseStorageFailureReason: string | null = null;
    try {
      const storageRef = ref(storage, storageFilePath);
      console.debug('[MediaUpload Diagnostic] Attempting Firebase Storage reference creation:', {
        fullPath: storageRef.fullPath,
        bucket: storageRef.bucket,
        name: storageRef.name,
      });
    } catch (fbRefErr: any) {
      firebaseStorageFailureReason = `Failed to create Firebase Storage reference: ${fbRefErr?.message || fbRefErr}`;
    }

    try {
      downloadUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('albumId', albumId);
        formData.append('mediaId', mediaId);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && options?.onProgress) {
            const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
            options.onProgress(percent, event.loaded, event.total);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (data.url) {
                if (options?.onProgress) {
                  options.onProgress(100, file.size, file.size);
                }
                resolve(data.url);
              } else {
                reject(new Error('Server response OK but returned no "url" attribute'));
              }
            } catch (e: any) {
              reject(new Error(`Failed to parse upload JSON response: ${e.message}`));
            }
          } else {
            reject(new Error(`Server upload endpoint returned HTTP ${xhr.status}: ${xhr.statusText || xhr.responseText}`));
          }
        };

        xhr.onerror = (e) => reject(new Error('Network error encountered during XMLHttpRequest transport'));
        xhr.ontimeout = () => reject(new Error('Upload request timed out after network delay'));

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });
    } catch (serverUploadError: any) {
      console.warn('[MediaUpload Diagnostic] Primary multipart upload failed, attempting fallback to base64 upload:', serverUploadError);
      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const b64Res = await fetch('/api/upload/base64', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: base64Data,
            filename: file.name,
            mimeType: file.type || 'image/jpeg',
          }),
        });

        if (b64Res.ok) {
          const b64Json = await b64Res.json();
          if (b64Json.url) {
            downloadUrl = b64Json.url;
          } else {
            throw new Error('Base64 upload returned no url');
          }
        } else {
          throw new Error(`Base64 upload failed with status ${b64Res.status}`);
        }
      } catch (fallbackError: any) {
        throw new Error(`Upload failed: ${serverUploadError?.message || 'Network error'}. Fallback also failed: ${fallbackError?.message}`);
      }
    }
  }

  // ----------------------------------------------------
  // DIAGNOSTIC STEP 5: Firestore Media Document Persistence
  // ----------------------------------------------------
  options?.onStageChange?.('SAVING');
  const newMedia: Media = {
    id: mediaId,
    albumId,
    type: mediaType,
    sourceType: 'UPLOAD',
    originalFileName: file.name,
    storagePath: downloadUrl,
    thumbnailPath: downloadUrl,
    optimizedPath: downloadUrl,
    mimeType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
    fileSize: file.size,
    sortOrder: Date.now(),
    sectionId: options?.sectionId || '',
    uploadedBy: actor.id,
    uploadedByEmail: actor.email,
    uploadedAt: new Date().toISOString(),
    processingStatus: 'READY',
    status: 'ACTIVE',
    visibility: 'PUBLIC',
    altText: `${file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')} memory`,
  };

  console.debug('[MediaUpload Diagnostic] Step 5: Persisting Firestore media doc:', {
    docPath: `media/${mediaId}`,
    mediaId,
    albumId,
    type: mediaType,
    fileSize: file.size,
  });

  try {
    await setDoc(doc(db, 'media', mediaId), newMedia);
    console.debug('[MediaUpload Diagnostic] Firestore media document created:', mediaId);

    // Update Album counters and cover photo in Firestore
    const albumRef = doc(db, 'albums', albumId);
    const albumSnap = await getDoc(albumRef);
    if (albumSnap.exists()) {
      const albumData = albumSnap.data() as Album;
      const currentPhotoCount = albumData.photoCount || 0;
      const currentVideoCount = albumData.videoCount || 0;
      const currentMediaCount = albumData.mediaCount || 0;

      const updates: Partial<Album> = {
        mediaCount: currentMediaCount + 1,
        photoCount: isVideo ? currentPhotoCount : currentPhotoCount + 1,
        videoCount: isVideo ? currentVideoCount + 1 : currentVideoCount,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id,
        updatedByEmail: actor.email,
      };

      if (!albumData.coverImageUrl && !isVideo) {
        updates.coverImageUrl = downloadUrl;
        updates.coverMediaId = mediaId;
        console.debug('[MediaUpload Diagnostic] Setting newly uploaded photo as album cover:', downloadUrl);
      }

      await updateDoc(albumRef, updates);
      console.debug('[MediaUpload Diagnostic] Album counters updated successfully');
    }

    clearAlbumCache();

    // Audit activity log
    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'MEDIA_UPLOADED',
      targetType: 'media',
      targetId: mediaId,
      details: `Uploaded ${mediaType.toLowerCase()} "${file.name}" to album ${albumId}`,
    }).catch(() => {});

    console.debug('[MediaUpload Diagnostic] Upload Pipeline Finished Successfully:', {
      mediaId,
      downloadUrl: downloadUrl.substring(0, 80) + (downloadUrl.length > 80 ? '...' : ''),
      albumId,
    });

    return newMedia;
  } catch (firestoreError: any) {
    console.error('[MediaUpload Diagnostic] Pipeline Failure Reason: Firestore write failed:', firestoreError);
    if (downloadUrl && firestoreError && typeof firestoreError === 'object') {
      firestoreError.storageUrl = downloadUrl;
      firestoreError.mediaId = mediaId;
    }
    handleFirestoreError(firestoreError, OperationType.CREATE, `media/${mediaId}`);
  }
}

/**
 * Real-time listener for an album's media collection.
 */
export function subscribeAlbumMedia(
  albumId: string,
  callback: (media: Media[]) => void
): () => void {
  const mediaRef = collection(db, 'media');
  const q = query(
    mediaRef,
    where('albumId', '==', albumId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Media[] = [];
      snapshot.forEach((d) => {
        const item = d.data() as Media;
        if (item.status !== 'DELETED') {
          list.push({ ...item, id: d.id });
        }
      });
      list.sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));
      callback(list);
    },
    (err) => {
      console.warn('[Firestore Media Listener Warning]:', err.message);
    }
  );
}

/**
 * Delete a media item from Firestore and remove storage file.
 */
export async function deleteMediaItem(
  mediaId: string,
  albumId: string,
  actor: { id: string; name: string; email: string }
): Promise<void> {
  try {
    // 1. Fetch media doc to inspect storagePath
    const mediaDocRef = doc(db, 'media', mediaId);
    const mediaSnap = await getDoc(mediaDocRef);
    const mediaData = mediaSnap.exists() ? (mediaSnap.data() as Media) : null;

    // 2. Delete Firestore record
    await deleteDoc(mediaDocRef);

    // 3. Attempt to delete storage file if path exists
    if (mediaData?.storagePath && mediaData.storagePath.startsWith('/uploads/')) {
      try {
        const filename = mediaData.storagePath.split('/').pop();
        if (filename) {
          await fetch(`/api/upload/${filename}`, { method: 'DELETE' }).catch(() => {});
        }
      } catch (e) {
        console.warn('Could not delete local upload file:', e);
      }
    } else if (mediaData?.storagePath && mediaData.storagePath.includes('firebasestorage.googleapis.com')) {
      try {
        const fileRef = ref(storage, mediaData.storagePath);
        await deleteObject(fileRef);
      } catch (stErr) {
        console.warn('Could not delete storage file or already removed:', stErr);
      }
    }

    // 4. Update album counts and reset cover image if needed
    const albumRef = doc(db, 'albums', albumId);
    const albumSnap = await getDoc(albumRef);
    if (albumSnap.exists()) {
      const albumData = albumSnap.data() as Album;
      const isVideo = mediaData?.type === 'VIDEO';

      const updates: Partial<Album> = {
        mediaCount: Math.max(0, (albumData.mediaCount || 1) - 1),
        photoCount: isVideo ? albumData.photoCount : Math.max(0, (albumData.photoCount || 1) - 1),
        videoCount: isVideo ? Math.max(0, (albumData.videoCount || 1) - 1) : albumData.videoCount,
        updatedAt: new Date().toISOString(),
      };

      // If deleted item was the cover image, pick another photo or clear
      if (albumData.coverMediaId === mediaId || albumData.coverImageUrl === mediaData?.storagePath) {
        updates.coverMediaId = '';
        updates.coverImageUrl = '';
      }

      await updateDoc(albumRef, updates);
    }

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'MEDIA_DELETED',
      targetType: 'media',
      targetId: mediaId,
      details: `Deleted media ${mediaId} from album ${albumId}`,
    }).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `media/${mediaId}`);
  }
}
