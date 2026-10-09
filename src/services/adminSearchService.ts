import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Album, Media } from '../types';
import { getAlbums } from './albumService';

export interface AdminSearchResultItem {
  id: string;
  type: 'album' | 'media' | 'setting';
  title: string;
  subtitle: string;
  thumbnailUrl?: string;
  url: string;
  badge?: string;
  category: 'Albums' | 'Media' | 'Settings';
  action: {
    tab: string;
    albumId?: string;
    mediaId?: string;
    settingSection?: string;
  };
}

export interface AdminSettingsOption {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  tab: string;
  settingSection?: string;
}

export const ADMIN_SETTINGS_INDEX: AdminSettingsOption[] = [
  {
    id: 'setting-general',
    title: 'Studio Identity & General Settings',
    description: 'Platform name, contact emails, phone numbers, and address',
    keywords: ['studio', 'name', 'email', 'phone', 'address', 'contact', 'general', 'identity'],
    tab: 'settings',
    settingSection: 'general',
  },
  {
    id: 'setting-appearance',
    title: 'Hero Showcase & Visual Appearance',
    description: 'Hero montage photo slots, brand tagline, headline, and browse photos',
    keywords: ['appearance', 'hero', 'montage', 'welcome', 'banner', 'photos', 'headline', 'tagline', 'look'],
    tab: 'settings',
    settingSection: 'appearance',
  },
  {
    id: 'setting-cms-content',
    title: 'Homepage & Assets CMS',
    description: 'Customize homepage narrative, heritage text, experience stats, and hero banner photos',
    keywords: ['cms', 'homepage', 'content', 'hero', 'heritage', 'experience', 'stats', 'welcome page'],
    tab: 'content',
  },
  {
    id: 'setting-defaults',
    title: 'Album Defaults & Client Downloads',
    description: 'Default privacy, watermark, guest download rules, and download quality settings',
    keywords: ['defaults', 'downloads', 'quality', 'privacy', 'watermark', 'resolution', 'permissions'],
    tab: 'settings',
    settingSection: 'defaults',
  },
  {
    id: 'setting-security',
    title: 'Storage & Security Rules',
    description: 'Allowed upload formats, max file sizes, storage retention, and audit logs',
    keywords: ['security', 'rules', 'file size', 'storage', 'retention', 'access', 'limits'],
    tab: 'settings',
    settingSection: 'security',
  },
  {
    id: 'setting-staff',
    title: 'Staff, Roles & Permissions',
    description: 'Manage admin accounts, assign roles (Super Admin, Editor, Viewer), and invite staff',
    keywords: ['staff', 'team', 'roles', 'permissions', 'admin', 'editor', 'invite', 'users'],
    tab: 'admins',
  },
  {
    id: 'setting-activity',
    title: 'Activity & Audit Log',
    description: 'Inspect administrative actions, timestamps, actor accounts, and event logs',
    keywords: ['activity', 'audit', 'logs', 'history', 'actions', 'events', 'timestamps'],
    tab: 'activity',
  },
  {
    id: 'setting-new-album',
    title: 'Create New Album / Event',
    description: 'Initiate a new client wedding, engagement, or commercial gallery',
    keywords: ['new', 'create', 'album', 'event', 'wedding', 'gallery', 'add'],
    tab: 'album-new',
  },
  {
    id: 'setting-media-library',
    title: 'Global Media Library & Add by URL',
    description: 'Browse all photos, videos, and batch add media via URL links',
    keywords: ['media', 'photos', 'videos', 'library', 'batch', 'url', 'upload'],
    tab: 'media',
  },
];

/**
 * Searches across Albums, Media, and Settings with fast indexing and local filtering.
 */
export async function searchAdminEverything(rawQuery: string): Promise<{
  albums: AdminSearchResultItem[];
  media: AdminSearchResultItem[];
  settings: AdminSearchResultItem[];
}> {
  const queryText = (rawQuery || '').trim().toLowerCase();
  if (!queryText) {
    return { albums: [], media: [], settings: [] };
  }

  // 1. Search Settings & Admin Tools (Instant client filter)
  const matchedSettings: AdminSearchResultItem[] = ADMIN_SETTINGS_INDEX
    .filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(queryText);
      const matchDesc = item.description.toLowerCase().includes(queryText);
      const matchKeyword = item.keywords.some((k) => k.toLowerCase().includes(queryText));
      return matchTitle || matchDesc || matchKeyword;
    })
    .map((item) => ({
      id: item.id,
      type: 'setting',
      title: item.title,
      subtitle: item.description,
      url: `/studio/${item.tab}`,
      category: 'Settings',
      action: {
        tab: item.tab,
        settingSection: item.settingSection,
      },
    }));

  // 2. Search Albums
  let matchedAlbums: AdminSearchResultItem[] = [];
  try {
    const allAlbums = await getAlbums();
    matchedAlbums = allAlbums
      .filter((a) => {
        const titleMatch = (a.title || '').toLowerCase().includes(queryText);
        const slugMatch = (a.slug || '').toLowerCase().includes(queryText);
        const locMatch = (a.location || '').toLowerCase().includes(queryText);
        const typeMatch = (a.eventType || '').toLowerCase().includes(queryText);
        const clientMatch =
          (a.clientNames && a.clientNames.some((c) => c.toLowerCase().includes(queryText))) || false;
        return titleMatch || slugMatch || locMatch || typeMatch || clientMatch;
      })
      .slice(0, 8)
      .map((a) => ({
        id: a.id,
        type: 'album',
        title: a.title,
        subtitle: `${a.eventType || 'Event'} • ${a.photoCount || 0} photos • ${a.location || 'Addis Ababa'}`,
        thumbnailUrl: a.coverImageUrl,
        url: `/studio/albums/${a.id}`,
        badge: a.status,
        category: 'Albums',
        action: {
          tab: 'album-detail',
          albumId: a.id,
        },
      }));
  } catch (err) {
    console.warn('[AdminSearch] Failed to search albums:', err);
  }

  // 3. Search Media
  let matchedMedia: AdminSearchResultItem[] = [];
  try {
    const mediaRef = collection(db, 'media');
    // Fetch recent active media up to 100 items for responsive client searching
    const mediaQuery = query(mediaRef, where('status', '==', 'ACTIVE'), limit(120));
    const mediaSnap = await getDocs(mediaQuery);

    const mediaList: Media[] = [];
    mediaSnap.forEach((d) => mediaList.push(d.data() as Media));

    matchedMedia = mediaList
      .filter((m) => {
        const fileMatch = (m.originalFileName || '').toLowerCase().includes(queryText);
        const altMatch = (m.altText || '').toLowerCase().includes(queryText);
        const albumMatch = (m.albumId || '').toLowerCase().includes(queryText);
        const secMatch = (m.sectionId || '').toLowerCase().includes(queryText);
        return fileMatch || altMatch || albumMatch || secMatch;
      })
      .slice(0, 8)
      .map((m) => ({
        id: m.id,
        type: 'media',
        title: m.altText || m.originalFileName || 'Media Item',
        subtitle: `${m.type} • Album: ${m.albumId}`,
        thumbnailUrl: m.thumbnailPath || m.storagePath,
        url: `/studio/albums/${m.albumId}`,
        badge: m.type,
        category: 'Media',
        action: {
          tab: 'album-detail',
          albumId: m.albumId,
          mediaId: m.id,
        },
      }));
  } catch (err) {
    console.warn('[AdminSearch] Failed to search media:', err);
  }

  return {
    albums: matchedAlbums,
    media: matchedMedia,
    settings: matchedSettings,
  };
}
