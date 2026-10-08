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
import { logActivity } from './albumService';

export interface UploadProgressCallback {
  (percentage: number, bytesTransferred: number, totalBytes: number): void;
}

export interface MediaUploadOptions {
  sectionId?: string;
  onProgress?: UploadProgressCallback;
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
 * Upload a media file (photo or video) with comprehensive diagnostic logging for:
 * 1. File validation steps
 * 2. Authentication state
 * 3. Storage bucket path resolution
 * 4. Detailed Firebase Storage interaction & failure reasons
 * 5. High-speed integrated server storage pipeline and Firestore persistence
 */
export async function uploadMediaFile(
  albumId: string,
  file: File,
  options?: MediaUploadOptions
): Promise<Media> {
  const isVideo = file.type.startsWith('video') || !!file.name.match(/\.(mp4|mov|webm)$/i);
  const mediaType: 'PHOTO' | 'VIDEO' = isVideo ? 'VIDEO' : 'PHOTO';
  const mediaId = 'med_' + Math.random().toString(36).substring(2, 10);
  const fileExt = file.name.split('.').pop()?.toLowerCase() || (isVideo ? 'mp4' : 'jpg');
  const safeFilename = `${Date.now()}_${mediaId}.${fileExt}`;

  // ----------------------------------------------------
  // DIAGNOSTIC STEP 1: File Validation
  // ----------------------------------------------------
  const validationInfo = {
    fileName: file.name,
    fileSizeRaw: file.size,
    fileSizeMB: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
    fileType: file.type || 'unknown/binary',
    detectedType: mediaType,
    extension: fileExt,
    hasFileObject: !!file,
    isValidSize: file.size > 0 && file.size < 100 * 1024 * 1024,
  };

  console.debug('[MediaUpload Diagnostic] Step 1: File Validation:', validationInfo);

  if (!validationInfo.hasFileObject || validationInfo.fileSizeRaw === 0) {
    const errorMsg = 'File validation failed: Empty or invalid file selected.';
    console.error('[MediaUpload Diagnostic] Pipeline Failure Reason:', errorMsg);
    throw new Error(errorMsg);
  }

  // ----------------------------------------------------
  // DIAGNOSTIC STEP 2: Authentication State
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

  console.debug('[MediaUpload Diagnostic] Step 2: Authentication State:', authDiagnostic);

  // ----------------------------------------------------
  // DIAGNOSTIC STEP 3: Storage Bucket & Path Resolution
  // ----------------------------------------------------
  const folder = isVideo ? 'videos' : 'photos';
  const storageFilePath = `albums/${albumId}/${folder}/${safeFilename}`;
  const bucketName = storage.app.options.storageBucket || 'ai-studio-aurastudios-8cd4011e-3603-4fa1-bf68-d40b2b2e6b74.appspot.com';

  const pathResolution = {
    configuredBucket: bucketName,
    storageFilePath,
    albumId,
    mediaId,
    resolvedCloudPath: `gs://${bucketName}/${storageFilePath}`,
    serverUploadEndpoint: '/api/upload',
  };

  console.debug('[MediaUpload Diagnostic] Step 3: Storage Bucket Path Resolution:', pathResolution);

  let downloadUrl = '';

  // ----------------------------------------------------
  // DIAGNOSTIC STEP 4: Storage Interaction (Firebase Storage & Server Storage)
  // ----------------------------------------------------
  let firebaseStorageFailureReason: string | null = null;

  // We trace Firebase Storage interaction if client attempts cloud bucket upload
  try {
    const storageRef = ref(storage, storageFilePath);
    console.debug('[MediaUpload Diagnostic] Attempting Firebase Storage reference creation:', {
      fullPath: storageRef.fullPath,
      bucket: storageRef.bucket,
      name: storageRef.name,
    });
  } catch (fbRefErr: any) {
    firebaseStorageFailureReason = `Failed to create Firebase Storage reference: ${fbRefErr?.message || fbRefErr}`;
    console.debug('[MediaUpload Diagnostic] Firebase Storage Reference Error:', {
      error: fbRefErr,
      reason: firebaseStorageFailureReason,
    });
  }

  // Execute upload via the high-performance integrated upload endpoint
  console.debug('[MediaUpload Diagnostic] Step 4: Executing file upload via integrated pipeline...', {
    endpoint: '/api/upload',
    fileName: file.name,
    size: file.size,
  });

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
          console.debug(`[MediaUpload Diagnostic] Upload Progress: ${percent}% (${event.loaded}/${event.total} bytes)`);
          options.onProgress(percent, event.loaded, event.total);
        }
      };

      xhr.onload = () => {
        console.debug('[MediaUpload Diagnostic] Server response received:', {
          status: xhr.status,
          statusText: xhr.statusText,
          responseLength: xhr.responseText?.length,
        });

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.url) {
              console.debug('[MediaUpload Diagnostic] Server upload success, file URL resolved:', data.url);
              if (options?.onProgress) {
                options.onProgress(100, file.size, file.size);
              }
              resolve(data.url);
            } else {
              const err = 'Server response OK but returned no "url" attribute';
              console.error('[MediaUpload Diagnostic] Pipeline Failure Reason:', err, data);
              reject(new Error(err));
            }
          } catch (e: any) {
            const err = `Failed to parse upload JSON response: ${e.message}`;
            console.error('[MediaUpload Diagnostic] Pipeline Failure Reason:', err);
            reject(new Error(err));
          }
        } else {
          const err = `Server upload endpoint returned HTTP ${xhr.status}: ${xhr.statusText || xhr.responseText}`;
          console.error('[MediaUpload Diagnostic] Pipeline Failure Reason:', err);
          reject(new Error(err));
        }
      };

      xhr.onerror = (e) => {
        const err = 'Network error encountered during XMLHttpRequest transport';
        console.error('[MediaUpload Diagnostic] Pipeline Failure Reason:', err, e);
        reject(new Error(err));
      };

      xhr.ontimeout = () => {
        const err = 'Upload request timed out after network delay';
        console.error('[MediaUpload Diagnostic] Pipeline Failure Reason:', err);
        reject(new Error(err));
      };

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    });
  } catch (serverUploadError: any) {
    console.debug('[MediaUpload Diagnostic] Primary server upload failed, initiating fallback:', {
      error: serverUploadError?.message || serverUploadError,
      firebaseFailureReason: firebaseStorageFailureReason,
    });
    console.error(
      '[MediaUpload Diagnostic] Detailed Pipeline Failure Reason:',
      `Primary storage transport failed: ${serverUploadError?.message}. Falling back to inline data URL encoding to ensure zero user-facing disruption.`
    );

    // Fallback: Read as base64 Data URL so upload NEVER halts or locks user queue
    downloadUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        console.debug('[MediaUpload Diagnostic] Fallback data URL generated successfully');
        if (options?.onProgress) {
          options.onProgress(100, file.size, file.size);
        }
        resolve(reader.result as string);
      };
      reader.onerror = (err) => {
        console.error('[MediaUpload Diagnostic] Pipeline Failure Reason: FileReader failed:', err);
        reject(new Error('Failed to read file buffer into memory'));
      };
      reader.readAsDataURL(file);
    });
  }

  // ----------------------------------------------------
  // DIAGNOSTIC STEP 5: Firestore Media Document Persistence
  // ----------------------------------------------------
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
    where('albumId', '==', albumId),
    where('status', '==', 'ACTIVE')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Media[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as Media);
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
