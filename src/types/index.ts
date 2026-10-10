export type AlbumStatus = 'DRAFT' | 'UPLOADING' | 'READY' | 'PUBLISHED' | 'ARCHIVED';
export type AlbumVisibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
export type DownloadQuality = 'WEB' | 'HIGH' | 'ORIGINAL';
export type AlbumTheme = 'default' | 'editorial' | 'dark' | 'romantic';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN';
export type AdminStatus = 'ACTIVE' | 'INACTIVE';

export type MediaType = 'PHOTO' | 'VIDEO';
export type MediaProcessingStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';
export type MediaStatus = 'ACTIVE' | 'DELETED';

export interface AdminPermissions {
  createAlbums: boolean;
  editAlbums: boolean;
  uploadMedia: boolean;
  editMedia: boolean;
  deleteMedia: boolean;
  reorderMedia: boolean;
  publishAlbums: boolean;
  unpublishAlbums: boolean;
  generateQRCode: boolean;
  viewAlbums: boolean;
}

export const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = {
  createAlbums: true,
  editAlbums: true,
  uploadMedia: true,
  editMedia: true,
  deleteMedia: true,
  reorderMedia: true,
  publishAlbums: true,
  unpublishAlbums: true,
  generateQRCode: true,
  viewAlbums: true,
};

export const SUPER_ADMIN_PERMISSIONS: AdminPermissions = {
  createAlbums: true,
  editAlbums: true,
  uploadMedia: true,
  editMedia: true,
  deleteMedia: true,
  reorderMedia: true,
  publishAlbums: true,
  unpublishAlbums: true,
  generateQRCode: true,
  viewAlbums: true,
};

export interface Album {
  id: string;
  title: string;
  slug: string;
  coupleName?: string;
  eventType: string; // "Wedding", "Gala", etc.
  eventDate: string; // ISO date or formatted
  location: string;
  description?: string;
  welcomeMessage?: string;
  coverMediaId?: string;
  coverImageUrl?: string;
  status: AlbumStatus;
  visibility: AlbumVisibility;
  allowDownloads: boolean;
  downloadQuality: DownloadQuality;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  createdBy: string;
  createdByEmail?: string;
  updatedBy?: string;
  updatedByEmail?: string;
  theme: AlbumTheme;
  customLogo?: string;
  customFooter?: string;
  featured?: boolean;
  mediaCount: number;
  photoCount: number;
  videoCount: number;
}

export type MediaSourceType = 'UPLOAD' | 'URL';

export interface Media {
  id: string;
  albumId: string;
  type: MediaType;
  sourceType?: MediaSourceType;
  url?: string;
  originalFileName: string;
  storagePath: string; // Cloud storage path, remote URL, or local path
  thumbnailPath?: string;
  optimizedPath?: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  duration?: number;
  sortOrder: number;
  sectionId?: string;
  uploadedBy: string;
  uploadedByEmail?: string;
  uploadedAt: string;
  processingStatus: MediaProcessingStatus;
  status: MediaStatus;
  visibility: 'PUBLIC' | 'PRIVATE';
  altText?: string;
  metadata?: Record<string, any>;
}

/**
 * Universal media source resolver.
 * Handles both UPLOAD (storagePath) and URL (remote external URL) seamlessly.
 */
export function getMediaSource(media?: Partial<Media> | null): string {
  if (!media) return '';
  if (media.sourceType === 'URL' && media.url) return media.url;
  // If the media item has an ID and raw data URI, prefer the high-speed static uploaded file
  if (media.id && media.storagePath?.startsWith('data:image/')) {
    return `/uploads/${media.id}.jpg`;
  }
  return media.optimizedPath || media.storagePath || media.url || media.thumbnailPath || '';
}

export interface AlbumSection {
  id: string;
  albumId: string;
  title: string;
  description?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Administrator {
  id: string;
  name: string;
  email: string;
  normalizedEmail: string;
  photoURL?: string;
  role: UserRole;
  status: AdminStatus;
  permissions: AdminPermissions;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  createdBy?: string;
  lastLoginProvider?: string;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  actorRole?: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  timestamp: string;
  details?: string;
}

export interface StudioSetting {
  id: string;
  platformName: string;
  superAdminEmail: string;
  defaultVisibility: AlbumVisibility;
  defaultAllowDownloads: boolean;
  defaultDownloadQuality: DownloadQuality;
  defaultTheme: AlbumTheme;
  updatedAt: string;
}
