import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { logActivity } from './albumService';

export interface AppearanceSettings {
  heroMontageImages: string[];
  browsePhotos: string[];
  brandTagline?: string;
  brandSubtitle?: string;
  badgeText?: string;
  studioName?: string;
  primaryColor?: string;
  themeMode?: 'classic-gold' | 'minimal-noir' | 'warm-editorial' | 'royal-amber';
  customCss?: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByEmail?: string;
}

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  heroMontageImages: [
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=85',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1800&q=85',
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1800&q=85',
    'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1800&q=85',
  ],
  browsePhotos: [
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1519225424988-662584e0374e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=1200&q=80',
  ],
  brandTagline: 'Preserving the Poetry of Your Most Beautiful Moments.',
  brandSubtitle:
    'A timeless digital sanctuary for weddings, sacred ceremonies, and celebrations. View, cherish, and download photographs in high resolution.',
  badgeText: 'Fine Art Wedding & Editorial Photography',
  studioName: "Beki's Studio",
  primaryColor: '#C8A96B',
  themeMode: 'classic-gold',
  customCss: '',
};

const SETTINGS_DOC = 'appearance';

/**
 * Get current platform appearance and homepage showcase settings.
 */
export async function getAppearanceSettings(): Promise<AppearanceSettings> {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', SETTINGS_DOC));
    if (settingsDoc.exists()) {
      const data = settingsDoc.data() as Partial<AppearanceSettings>;
      return {
        ...DEFAULT_APPEARANCE_SETTINGS,
        ...data,
        heroMontageImages:
          data.heroMontageImages && data.heroMontageImages.length > 0
            ? data.heroMontageImages
            : DEFAULT_APPEARANCE_SETTINGS.heroMontageImages,
        browsePhotos:
          data.browsePhotos && data.browsePhotos.length > 0
            ? data.browsePhotos
            : DEFAULT_APPEARANCE_SETTINGS.browsePhotos,
      };
    }
  } catch (error) {
    console.warn('[Settings Service] Error reading appearance settings, using defaults:', error);
  }
  return DEFAULT_APPEARANCE_SETTINGS;
}

/**
 * Subscribe to real-time updates for platform appearance & homepage settings.
 */
export function subscribeAppearanceSettings(
  callback: (settings: AppearanceSettings) => void
): () => void {
  const settingsRef = doc(db, 'settings', SETTINGS_DOC);
  return onSnapshot(
    settingsRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<AppearanceSettings>;
        callback({
          ...DEFAULT_APPEARANCE_SETTINGS,
          ...data,
          heroMontageImages:
            data.heroMontageImages && data.heroMontageImages.length > 0
              ? data.heroMontageImages
              : DEFAULT_APPEARANCE_SETTINGS.heroMontageImages,
          browsePhotos:
            data.browsePhotos && data.browsePhotos.length > 0
              ? data.browsePhotos
              : DEFAULT_APPEARANCE_SETTINGS.browsePhotos,
        });
      } else {
        callback(DEFAULT_APPEARANCE_SETTINGS);
      }
    },
    (err) => {
      console.warn('[Settings Service] Snapshot listener error, using defaults:', err.message);
      callback(DEFAULT_APPEARANCE_SETTINGS);
    }
  );
}

/**
 * Persist appearance & homepage showcase settings to Firestore.
 */
export async function updateAppearanceSettings(
  settings: Partial<AppearanceSettings>,
  actor?: { id: string; name: string; email: string }
): Promise<AppearanceSettings> {
  const current = await getAppearanceSettings();
  const currentActor = actor || {
    id: auth.currentUser?.uid || 'admin',
    name: auth.currentUser?.displayName || 'Administrator',
    email: auth.currentUser?.email || 'admin@bekisstudio.com',
  };

  const updated: AppearanceSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy: currentActor.id,
    updatedByEmail: currentActor.email,
  };

  try {
    await setDoc(doc(db, 'settings', SETTINGS_DOC), updated, { merge: true });

    await logActivity({
      actorId: currentActor.id,
      actorName: currentActor.name,
      actorEmail: currentActor.email,
      action: 'SETTINGS_UPDATED',
      targetType: 'system',
      targetId: SETTINGS_DOC,
      details: 'Updated platform appearance, theme, and homepage showcase imagery',
    }).catch(() => {});

    return updated;
  } catch (error) {
    console.error('[Settings Service] Error saving appearance settings:', error);
    handleFirestoreError(error, OperationType.UPDATE, `settings/${SETTINGS_DOC}`);
  }
}

/**
 * Upload a showcase or theme image directly to server storage.
 */
export async function uploadShowcaseImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Upload failed with status ${res.status}`);
  }

  const data = await res.json();
  if (!data.url) {
    throw new Error('Upload succeeded but server did not return a URL');
  }

  return data.url;
}
