import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import {
  Album,
  Media,
  AlbumSection,
  Administrator,
  ActivityLog,
  AlbumStatus,
  AlbumVisibility,
  AdminPermissions,
  DEFAULT_ADMIN_PERMISSIONS,
} from '../types';

// Convert title to URL-safe slug
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ----------------------------------------------------
// STATIC DEMO DATA & PUBLIC COLLECTIONS
// ----------------------------------------------------

export function getStaticPublicAlbums(): Album[] {
  return [
    {
      id: 'alb_abe_lia',
      title: 'Abe & Lia',
      slug: 'abe-lia',
      eventType: 'Wedding Celebration',
      eventDate: '2026-09-12',
      location: 'Addis Ababa',
      description: 'An intimate, timeless celebration of love, heritage, and joy.',
      welcomeMessage:
        'Thank you for celebrating with us. We hope these memories bring the day back to life.',
      coverMediaId: 'med_01',
      coverImageUrl:
        'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=85',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      featured: true,
      allowDownloads: true,
      downloadQuality: 'HIGH',
      createdAt: '2026-09-12T10:00:00.000Z',
      updatedAt: '2026-09-12T10:00:00.000Z',
      publishedAt: '2026-09-12T10:00:00.000Z',
      createdBy: 'system_demo',
      createdByEmail: 'primeonebrokerageinc@gmail.com',
      theme: 'default',
      mediaCount: 11,
      photoCount: 10,
      videoCount: 1,
    },
    {
      id: 'alb_daniel_hana',
      title: 'Daniel & Hana',
      slug: 'daniel-hana',
      eventType: 'Wedding Celebration',
      eventDate: '2026-10-04',
      location: 'Entoto Park, Addis Ababa',
      description: 'A radiant mountain-side celebration enveloped in sunset hues and traditional elegance.',
      welcomeMessage:
        'Welcome to our wedding gallery. Thank you for walking this blessed journey with us.',
      coverMediaId: 'med_dh_01',
      coverImageUrl:
        'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=80',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      featured: true,
      allowDownloads: true,
      downloadQuality: 'HIGH',
      createdAt: '2026-10-04T10:00:00.000Z',
      updatedAt: '2026-10-04T10:00:00.000Z',
      publishedAt: '2026-10-04T10:00:00.000Z',
      createdBy: 'system_demo',
      createdByEmail: 'primeonebrokerageinc@gmail.com',
      theme: 'editorial',
      mediaCount: 8,
      photoCount: 8,
      videoCount: 0,
    },
    {
      id: 'alb_michael_ruth',
      title: 'Michael & Ruth',
      slug: 'michael-ruth',
      eventType: 'Engagement Celebration',
      eventDate: '2026-10-18',
      location: 'Bishoftu Lake View',
      description: 'An enchanting lakeside promise of love, laughter, and family blessings.',
      welcomeMessage:
        'Relive the magic of our engagement evening by the serene waters of Bishoftu.',
      coverMediaId: 'med_mr_01',
      coverImageUrl:
        'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      featured: false,
      allowDownloads: true,
      downloadQuality: 'HIGH',
      createdAt: '2026-10-18T10:00:00.000Z',
      updatedAt: '2026-10-18T10:00:00.000Z',
      publishedAt: '2026-10-18T10:00:00.000Z',
      createdBy: 'system_demo',
      createdByEmail: 'primeonebrokerageinc@gmail.com',
      theme: 'romantic',
      mediaCount: 6,
      photoCount: 6,
      videoCount: 0,
    },
    {
      id: 'alb_samuel_betty',
      title: 'Samuel & Betty',
      slug: 'samuel-betty',
      eventType: 'Wedding Celebration',
      eventDate: '2026-11-02',
      location: 'Sheraton Grand Ballroom',
      description: 'A grand metropolitan celebration filled with music, chandeliers, and endless joy.',
      welcomeMessage:
        'Heartfelt thanks to all our family and friends who honored our sacred union.',
      coverMediaId: 'med_sb_01',
      coverImageUrl:
        'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1400&q=80',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      featured: false,
      allowDownloads: true,
      downloadQuality: 'HIGH',
      createdAt: '2026-11-02T10:00:00.000Z',
      updatedAt: '2026-11-02T10:00:00.000Z',
      publishedAt: '2026-11-02T10:00:00.000Z',
      createdBy: 'system_demo',
      createdByEmail: 'primeonebrokerageinc@gmail.com',
      theme: 'default',
      mediaCount: 7,
      photoCount: 7,
      videoCount: 0,
    },
  ];
}

export function getStaticDemoAlbum(): Album {
  return getStaticPublicAlbums()[0];
}

export function getStaticDemoSections(): AlbumSection[] {
  return [
    { id: 'sec_prep', albumId: 'alb_abe_lia', title: 'Getting Ready', sortOrder: 0, createdAt: '', updatedAt: '' },
    { id: 'sec_ceremony', albumId: 'alb_abe_lia', title: 'Ceremony', sortOrder: 1, createdAt: '', updatedAt: '' },
    { id: 'sec_portraits', albumId: 'alb_abe_lia', title: 'Portraits', sortOrder: 2, createdAt: '', updatedAt: '' },
    { id: 'sec_family', albumId: 'alb_abe_lia', title: 'Family', sortOrder: 3, createdAt: '', updatedAt: '' },
    { id: 'sec_reception', albumId: 'alb_abe_lia', title: 'Reception', sortOrder: 4, createdAt: '', updatedAt: '' },
    { id: 'sec_celebration', albumId: 'alb_abe_lia', title: 'Celebration', sortOrder: 5, createdAt: '', updatedAt: '' },
  ];
}

export function getStaticDemoMedia(): Media[] {
  return [
    {
      id: 'med_01',
      albumId: 'alb_abe_lia',
      type: 'PHOTO',
      originalFileName: 'the_first_look.jpg',
      storagePath: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80',
      thumbnailPath: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
      optimizedPath: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80',
      mimeType: 'image/jpeg',
      fileSize: 4200000,
      sortOrder: 0,
      sectionId: 'sec_portraits',
      uploadedBy: 'system_demo',
      uploadedAt: '2026-09-12T10:00:00.000Z',
      processingStatus: 'READY',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      altText: 'The First Look - Abe & Lia',
    },
    {
      id: 'med_02',
      albumId: 'alb_abe_lia',
      type: 'PHOTO',
      originalFileName: 'bridal_portrait.jpg',
      storagePath: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80',
      thumbnailPath: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=600&q=80',
      optimizedPath: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80',
      mimeType: 'image/jpeg',
      fileSize: 3800000,
      sortOrder: 1,
      sectionId: 'sec_prep',
      uploadedBy: 'system_demo',
      uploadedAt: '2026-09-12T10:05:00.000Z',
      processingStatus: 'READY',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      altText: 'Bridal Portrait - Abe & Lia',
    },
    {
      id: 'med_03',
      albumId: 'alb_abe_lia',
      type: 'PHOTO',
      originalFileName: 'exchange_of_vows.jpg',
      storagePath: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=80',
      thumbnailPath: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80',
      optimizedPath: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=80',
      mimeType: 'image/jpeg',
      fileSize: 4500000,
      sortOrder: 2,
      sectionId: 'sec_ceremony',
      uploadedBy: 'system_demo',
      uploadedAt: '2026-09-12T10:10:00.000Z',
      processingStatus: 'READY',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      altText: 'Exchange of Vows - Abe & Lia',
    },
    {
      id: 'med_04',
      albumId: 'alb_abe_lia',
      type: 'PHOTO',
      originalFileName: 'heirloom_rings.jpg',
      storagePath: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1200&q=80',
      thumbnailPath: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=600&q=80',
      optimizedPath: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1200&q=80',
      mimeType: 'image/jpeg',
      fileSize: 3100000,
      sortOrder: 3,
      sectionId: 'sec_ceremony',
      uploadedBy: 'system_demo',
      uploadedAt: '2026-09-12T10:15:00.000Z',
      processingStatus: 'READY',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      altText: 'Heirloom Rings & Vows',
    },
    {
      id: 'med_05',
      albumId: 'alb_abe_lia',
      type: 'PHOTO',
      originalFileName: 'golden_hour_walk.jpg',
      storagePath: 'https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&w=1400&q=80',
      thumbnailPath: 'https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&w=600&q=80',
      optimizedPath: 'https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&w=1400&q=80',
      mimeType: 'image/jpeg',
      fileSize: 4900000,
      sortOrder: 4,
      sectionId: 'sec_portraits',
      uploadedBy: 'system_demo',
      uploadedAt: '2026-09-12T10:20:00.000Z',
      processingStatus: 'READY',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      altText: 'Golden Hour Walk',
    },
    {
      id: 'med_06',
      albumId: 'alb_abe_lia',
      type: 'PHOTO',
      originalFileName: 'celebration_dinner.jpg',
      storagePath: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1400&q=80',
      thumbnailPath: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=600&q=80',
      optimizedPath: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1400&q=80',
      mimeType: 'image/jpeg',
      fileSize: 4100000,
      sortOrder: 5,
      sectionId: 'sec_reception',
      uploadedBy: 'system_demo',
      uploadedAt: '2026-09-12T10:25:00.000Z',
      processingStatus: 'READY',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      altText: 'Celebration Dinner',
    },
    {
      id: 'med_07',
      albumId: 'alb_abe_lia',
      type: 'PHOTO',
      originalFileName: 'first_dance.jpg',
      storagePath: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=1400&q=80',
      thumbnailPath: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=600&q=80',
      optimizedPath: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=1400&q=80',
      mimeType: 'image/jpeg',
      fileSize: 4300000,
      sortOrder: 6,
      sectionId: 'sec_reception',
      uploadedBy: 'system_demo',
      uploadedAt: '2026-09-12T10:30:00.000Z',
      processingStatus: 'READY',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      altText: 'First Dance Under Chandeliers',
    },
    {
      id: 'med_08',
      albumId: 'alb_abe_lia',
      type: 'PHOTO',
      originalFileName: 'family_embrace.jpg',
      storagePath: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1400&q=80',
      thumbnailPath: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=600&q=80',
      optimizedPath: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1400&q=80',
      mimeType: 'image/jpeg',
      fileSize: 4400000,
      sortOrder: 7,
      sectionId: 'sec_family',
      uploadedBy: 'system_demo',
      uploadedAt: '2026-09-12T10:35:00.000Z',
      processingStatus: 'READY',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      altText: 'Family Embrace',
    },
    {
      id: 'med_09',
      albumId: 'alb_abe_lia',
      type: 'PHOTO',
      originalFileName: 'champagne_toast.jpg',
      storagePath: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=80',
      thumbnailPath: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=600&q=80',
      optimizedPath: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=80',
      mimeType: 'image/jpeg',
      fileSize: 3900000,
      sortOrder: 8,
      sectionId: 'sec_celebration',
      uploadedBy: 'system_demo',
      uploadedAt: '2026-09-12T10:40:00.000Z',
      processingStatus: 'READY',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      altText: 'Champagne Fountain',
    },
    {
      id: 'med_10',
      albumId: 'alb_abe_lia',
      type: 'PHOTO',
      originalFileName: 'midnight_sendoff.jpg',
      storagePath: 'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1400&q=80',
      thumbnailPath: 'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=600&q=80',
      optimizedPath: 'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1400&q=80',
      mimeType: 'image/jpeg',
      fileSize: 4600000,
      sortOrder: 9,
      sectionId: 'sec_celebration',
      uploadedBy: 'system_demo',
      uploadedAt: '2026-09-12T10:45:00.000Z',
      processingStatus: 'READY',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      altText: 'Midnight Sendoff Under Sparklers',
    },
    {
      id: 'med_11',
      albumId: 'alb_abe_lia',
      type: 'VIDEO',
      originalFileName: 'ceremony_highlights.mp4',
      storagePath: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnailPath: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=600&q=80',
      optimizedPath: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      mimeType: 'video/mp4',
      fileSize: 18450000,
      sortOrder: 10,
      sectionId: 'sec_ceremony',
      uploadedBy: 'system_demo',
      uploadedAt: '2026-09-12T10:50:00.000Z',
      processingStatus: 'READY',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      altText: 'Ceremony Cinematic Reel',
    },
  ];
}

// ----------------------------------------------------
// ALBUMS SERVICE
// ----------------------------------------------------

// ----------------------------------------------------
// PUBLIC DISCOVERY ALBUMS SERVICE
// ----------------------------------------------------

export async function getPublicAlbums(options?: {
  search?: string;
  eventType?: string;
  featuredOnly?: boolean;
}): Promise<Album[]> {
  try {
    const albumsRef = collection(db, 'albums');
    // STRICT PRIVACY ENFORCEMENT: ONLY status == 'PUBLISHED' and visibility == 'PUBLIC'
    const q = query(
      albumsRef,
      where('status', '==', 'PUBLISHED'),
      where('visibility', '==', 'PUBLIC')
    );

    const snapshot = await getDocs(q);
    let list: Album[] = [];
    snapshot.forEach((doc) => {
      list.push({ ...(doc.data() as Album), id: doc.id });
    });

    // Sort by creation date descending
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Filter by featured if requested
    if (options?.featuredOnly) {
      list = list.filter((a) => a.featured === true);
    }

    // Filter by event type
    if (options?.eventType && options.eventType.toLowerCase() !== 'all') {
      const et = options.eventType.toLowerCase().trim();
      list = list.filter((a) => {
        const itemType = (a.eventType || '').toLowerCase();
        if (et === 'wedding') return itemType.includes('wedding');
        if (et === 'engagement') return itemType.includes('engagement') || itemType.includes('kaadhimmannaa');
        if (et === 'birthday') return itemType.includes('birthday');
        if (et === 'corporate') return itemType.includes('corporate');
        if (et === 'graduation') return itemType.includes('graduation');
        if (et === 'babyshower' || et === 'baby') return itemType.includes('baby') || itemType.includes('shower');
        if (et === 'concert') return itemType.includes('concert');
        if (et === 'celebration') return itemType.includes('celebration') || itemType.includes('gala') || itemType.includes('anniversary');
        return itemType.includes(et);
      });
    }

    // Filter by search query (couple, title, location, eventType, description)
    if (options?.search) {
      const s = options.search.toLowerCase().trim();
      list = list.filter((a) => {
        const titleMatch = (a.title || '').toLowerCase().includes(s);
        const slugMatch = (a.slug || '').toLowerCase().includes(s);
        const locMatch = (a.location || '').toLowerCase().includes(s);
        const eventMatch = (a.eventType || '').toLowerCase().includes(s);
        const descMatch = (a.description || '').toLowerCase().includes(s);
        const coupleMatch = (a.coupleName || '').toLowerCase().includes(s);
        return titleMatch || slugMatch || locMatch || eventMatch || descMatch || coupleMatch;
      });
    }

    return list;
  } catch (error) {
    console.warn('Error fetching public albums from Firestore, returning static public collections:', error);
    let list = [...getStaticPublicAlbums()];
    if (options?.featuredOnly) {
      list = list.filter((a) => a.featured === true);
    }
    if (options?.eventType && options.eventType.toLowerCase() !== 'all') {
      const et = options.eventType.toLowerCase().trim();
      list = list.filter((a) => {
        const itemType = (a.eventType || '').toLowerCase();
        if (et === 'wedding') return itemType.includes('wedding');
        if (et === 'engagement') return itemType.includes('engagement') || itemType.includes('kaadhimmannaa');
        if (et === 'birthday') return itemType.includes('birthday');
        if (et === 'corporate') return itemType.includes('corporate');
        if (et === 'graduation') return itemType.includes('graduation');
        if (et === 'babyshower' || et === 'baby') return itemType.includes('baby') || itemType.includes('shower');
        if (et === 'concert') return itemType.includes('concert');
        if (et === 'celebration') return itemType.includes('celebration') || itemType.includes('gala') || itemType.includes('anniversary');
        return itemType.includes(et);
      });
    }
    if (options?.search) {
      const s = options.search.toLowerCase().trim();
      list = list.filter((a) => {
        const titleMatch = (a.title || '').toLowerCase().includes(s);
        const slugMatch = (a.slug || '').toLowerCase().includes(s);
        const locMatch = (a.location || '').toLowerCase().includes(s);
        const eventMatch = (a.eventType || '').toLowerCase().includes(s);
        const descMatch = (a.description || '').toLowerCase().includes(s);
        const coupleMatch = (a.coupleName || '').toLowerCase().includes(s);
        return titleMatch || slugMatch || locMatch || eventMatch || descMatch || coupleMatch;
      });
    }
    return list;
  }
}

export async function toggleAlbumFeatured(
  albumId: string,
  featured: boolean,
  actor: { id: string; name: string; email: string }
): Promise<void> {
  try {
    const docRef = doc(db, 'albums', albumId);
    await updateDoc(docRef, {
      featured,
      updatedAt: new Date().toISOString(),
      updatedBy: actor.id,
      updatedByEmail: actor.email,
    });

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: featured ? 'ALBUM_FEATURED' : 'ALBUM_UNFEATURED',
      targetType: 'album',
      targetId: albumId,
      details: `${featured ? 'Featured' : 'Unfeatured'} album in public discovery`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `albums/${albumId}`);
  }
}

export async function getAlbums(options?: {
  status?: AlbumStatus;
  visibility?: AlbumVisibility;
  search?: string;
}): Promise<Album[]> {
  try {
    const albumsRef = collection(db, 'albums');
    let q;

    if (auth.currentUser) {
      if (options?.status) {
        q = query(albumsRef, where('status', '==', options.status));
      } else {
        q = albumsRef;
      }
    } else {
      q = query(albumsRef, where('status', '==', 'PUBLISHED'));
    }

    const snapshot = await getDocs(q);

    let list: Album[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as Album;
      list.push({ ...data, id: doc.id });
    });

    if (list.length === 0 && !auth.currentUser) {
      list = [...getStaticPublicAlbums()];
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (options?.status) {
      list = list.filter((a) => a.status === options.status);
    }
    if (options?.visibility) {
      list = list.filter((a) => a.visibility === options.visibility);
    }
    if (options?.search) {
      const s = options.search.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(s) ||
          a.slug.toLowerCase().includes(s) ||
          a.location.toLowerCase().includes(s) ||
          a.eventType.toLowerCase().includes(s)
      );
    }

    return list;
  } catch (error) {
    if (!auth.currentUser) {
      return getStaticPublicAlbums();
    }
    handleFirestoreError(error, OperationType.LIST, 'albums');
  }
}

/**
 * Real-time listener for the albums collection in Admin Studio.
 */
export function subscribeAlbums(
  callback: (albums: Album[]) => void
): () => void {
  const albumsRef = collection(db, 'albums');
  return onSnapshot(
    albumsRef,
    (snapshot) => {
      const list: Album[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Album;
        list.push({ ...data, id: doc.id });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    },
    (err) => {
      console.warn('[Firestore Albums Listener Warning]:', err.message);
    }
  );
}

export async function getAlbumBySlug(slug: string): Promise<Album | null> {
  try {
    const albumsRef = collection(db, 'albums');
    let q;
    if (auth.currentUser) {
      q = query(albumsRef, where('slug', '==', slug), limit(1));
    } else {
      // Direct get allowed for published albums (PUBLIC or UNLISTED)
      q = query(albumsRef, where('slug', '==', slug), where('status', '==', 'PUBLISHED'), limit(1));
    }

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }
    return { ...(snapshot.docs[0].data() as Album), id: snapshot.docs[0].id };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `albums?slug=${slug}`);
  }
}

export async function getAlbumById(id: string): Promise<Album | null> {
  try {
    const docRef = doc(db, 'albums', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { ...(snap.data() as Album), id: snap.id };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `albums/${id}`);
  }
}

export async function createAlbum(
  albumData: Partial<Album>,
  actor: { id: string; name: string; email: string }
): Promise<Album> {
  try {
    const albumId = albumData.id || 'alb_' + Math.random().toString(36).substring(2, 10);
    let slug = albumData.slug || generateSlug(albumData.title || 'untitled-event');

    const existingWithSlug = await getAlbumBySlug(slug);
    if (existingWithSlug && existingWithSlug.id !== albumId) {
      slug = `${slug}-${Math.floor(Math.random() * 899 + 100)}`;
    }

    const newAlbum: Album = {
      id: albumId,
      title: albumData.title || 'Untitled Celebration',
      slug,
      eventType: albumData.eventType || 'Wedding',
      eventDate: albumData.eventDate || new Date().toISOString().split('T')[0],
      location: albumData.location || '',
      description: albumData.description || '',
      welcomeMessage:
        albumData.welcomeMessage ||
        'Thank you for celebrating with us. We hope these memories bring the day back to life.',
      coverMediaId: albumData.coverMediaId || '',
      coverImageUrl: albumData.coverImageUrl || '',
      status: albumData.status || 'DRAFT',
      visibility: albumData.visibility || 'UNLISTED',
      allowDownloads: albumData.allowDownloads ?? true,
      downloadQuality: albumData.downloadQuality || 'HIGH',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: albumData.status === 'PUBLISHED' ? new Date().toISOString() : undefined,
      createdBy: actor.id,
      createdByEmail: actor.email,
      theme: albumData.theme || 'default',
      customLogo: albumData.customLogo || '',
      customFooter: albumData.customFooter || '',
      mediaCount: 0,
      photoCount: 0,
      videoCount: 0,
    };

    await setDoc(doc(db, 'albums', albumId), newAlbum);

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'ALBUM_CREATED',
      targetType: 'album',
      targetId: albumId,
      details: `Created album "${newAlbum.title}" (${newAlbum.slug})`,
    });

    return newAlbum;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'albums');
  }
}

export async function updateAlbum(
  albumId: string,
  updates: Partial<Album>,
  actor: { id: string; name: string; email: string }
): Promise<void> {
  try {
    const docRef = doc(db, 'albums', albumId);
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: actor.id,
      updatedByEmail: actor.email,
    };

    if (updates.status === 'PUBLISHED' && !updates.publishedAt) {
      payload.publishedAt = new Date().toISOString();
    }

    await updateDoc(docRef, payload);

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: updates.status === 'PUBLISHED' ? 'ALBUM_PUBLISHED' : 'ALBUM_UPDATED',
      targetType: 'album',
      targetId: albumId,
      details: updates.title ? `Updated album "${updates.title}"` : `Updated album ${albumId}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `albums/${albumId}`);
  }
}

export async function deleteAlbum(
  albumId: string,
  actor: { id: string; name: string; email: string }
): Promise<void> {
  try {
    const mediaList = await getAlbumMedia(albumId);
    const batch = writeBatch(db);

    for (const m of mediaList) {
      batch.delete(doc(db, 'media', m.id));
    }
    batch.delete(doc(db, 'albums', albumId));

    await batch.commit();

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'ALBUM_DELETED',
      targetType: 'album',
      targetId: albumId,
      details: `Deleted album ${albumId} and ${mediaList.length} media items`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `albums/${albumId}`);
  }
}

// ----------------------------------------------------
// MEDIA SERVICE
// ----------------------------------------------------

export async function getAlbumMedia(albumId: string, sectionId?: string): Promise<Media[]> {
  try {
    const mediaRef = collection(db, 'media');
    const q = query(
      mediaRef,
      where('albumId', '==', albumId),
      where('status', '==', 'ACTIVE')
    );
    const snap = await getDocs(q);

    let list: Media[] = [];
    snap.forEach((d) => {
      const data = d.data() as Media;
      list.push({ ...data, id: d.id });
    });

    if (list.length === 0) {
      if (
        albumId === 'alb_abe_lia' ||
        albumId === 'alb_daniel_hana' ||
        albumId === 'alb_michael_ruth' ||
        albumId === 'alb_samuel_betty'
      ) {
        list = getStaticDemoMedia().map((m) => ({ ...m, albumId }));
      }
    }

    list.sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));

    if (sectionId) {
      list = list.filter((m) => m.sectionId === sectionId);
    }

    return list;
  } catch (error) {
    if (
      albumId === 'alb_abe_lia' ||
      albumId === 'alb_daniel_hana' ||
      albumId === 'alb_michael_ruth' ||
      albumId === 'alb_samuel_betty'
    ) {
      return getStaticDemoMedia().map((m) => ({ ...m, albumId }));
    }
    console.warn('[Firestore Media Query Warning]:', error);
    return [];
  }
}

export async function createMediaItem(
  mediaData: Partial<Media>,
  actor: { id: string; name: string; email: string }
): Promise<Media> {
  try {
    const mediaId = mediaData.id || 'med_' + Math.random().toString(36).substring(2, 10);
    const newMedia: Media = {
      id: mediaId,
      albumId: mediaData.albumId!,
      type: mediaData.type || 'PHOTO',
      originalFileName: mediaData.originalFileName || 'image.jpg',
      storagePath: mediaData.storagePath || '',
      thumbnailPath: mediaData.thumbnailPath || mediaData.storagePath || '',
      optimizedPath: mediaData.optimizedPath || mediaData.storagePath || '',
      mimeType: mediaData.mimeType || 'image/jpeg',
      fileSize: mediaData.fileSize || 0,
      width: mediaData.width,
      height: mediaData.height,
      duration: mediaData.duration,
      sortOrder: mediaData.sortOrder ?? 0,
      sectionId: mediaData.sectionId || '',
      uploadedBy: actor.id,
      uploadedByEmail: actor.email,
      uploadedAt: new Date().toISOString(),
      processingStatus: mediaData.processingStatus || 'READY',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      altText: mediaData.altText || `${newMediaTitle(mediaData.originalFileName)} memory`,
    };

    await setDoc(doc(db, 'media', mediaId), newMedia);

    const album = await getAlbumById(newMedia.albumId);
    if (album && album.id !== 'alb_abe_lia') {
      const isVideo = newMedia.type === 'VIDEO';
      await updateDoc(doc(db, 'albums', newMedia.albumId), {
        mediaCount: (album.mediaCount || 0) + 1,
        photoCount: isVideo ? album.photoCount : (album.photoCount || 0) + 1,
        videoCount: isVideo ? (album.videoCount || 0) + 1 : album.videoCount,
        coverImageUrl: album.coverImageUrl || newMedia.storagePath,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id,
        updatedByEmail: actor.email,
      });
    }

    return newMedia;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'media');
  }
}

function newMediaTitle(filename?: string): string {
  if (!filename) return "Beki's Studio";
  return filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
}

export async function deleteMediaItem(
  mediaId: string,
  albumId: string,
  actor: { id: string; name: string; email: string }
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'media', mediaId));

    const album = await getAlbumById(albumId);
    if (album && album.id !== 'alb_abe_lia') {
      await updateDoc(doc(db, 'albums', albumId), {
        mediaCount: Math.max(0, (album.mediaCount || 1) - 1),
        photoCount: Math.max(0, (album.photoCount || 1) - 1),
        updatedAt: new Date().toISOString(),
      });
    }

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'MEDIA_DELETED',
      targetType: 'media',
      targetId: mediaId,
      details: `Deleted media ${mediaId} from album ${albumId}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `media/${mediaId}`);
  }
}

export async function deleteMultipleMedia(
  mediaIds: string[],
  albumId: string,
  actor: { id: string; name: string; email: string }
): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const id of mediaIds) {
      batch.delete(doc(db, 'media', id));
    }
    await batch.commit();

    const remaining = await getAlbumMedia(albumId);
    const photos = remaining.filter((m) => m.type === 'PHOTO').length;
    const videos = remaining.filter((m) => m.type === 'VIDEO').length;

    if (albumId !== 'alb_abe_lia') {
      await updateDoc(doc(db, 'albums', albumId), {
        mediaCount: remaining.length,
        photoCount: photos,
        videoCount: videos,
        updatedAt: new Date().toISOString(),
      });
    }

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      action: 'MEDIA_DELETED',
      targetType: 'media',
      targetId: albumId,
      details: `Bulk deleted ${mediaIds.length} items from album`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'media');
  }
}

// ----------------------------------------------------
// SECTIONS SERVICE
// ----------------------------------------------------

export async function getAlbumSections(albumId: string): Promise<AlbumSection[]> {
  try {
    const secRef = collection(db, 'albumSections');
    const q = query(secRef, where('albumId', '==', albumId));
    const snap = await getDocs(q);

    let list: AlbumSection[] = [];
    snap.forEach((d) => list.push(d.data() as AlbumSection));

    if (list.length === 0 && (albumId === 'alb_abe_lia' || albumId.includes('abe_lia'))) {
      list = getStaticDemoSections();
    }

    list.sort((a, b) => a.sortOrder - b.sortOrder);
    return list;
  } catch (error) {
    if (albumId === 'alb_abe_lia' || albumId.includes('abe_lia')) {
      return getStaticDemoSections();
    }
    handleFirestoreError(error, OperationType.LIST, `albumSections?albumId=${albumId}`);
  }
}

export async function createAlbumSection(
  albumId: string,
  title: string,
  description?: string
): Promise<AlbumSection> {
  try {
    const id = 'sec_' + Math.random().toString(36).substring(2, 9);
    const existing = await getAlbumSections(albumId);

    const section: AlbumSection = {
      id,
      albumId,
      title,
      description: description || '',
      sortOrder: existing.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'albumSections', id), section);
    return section;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'albumSections');
  }
}

// ----------------------------------------------------
// ADMINISTRATORS SERVICE
// ----------------------------------------------------

export async function getAdministrators(): Promise<Administrator[]> {
  try {
    const ref = collection(db, 'administrators');
    const snap = await getDocs(ref);
    let list: Administrator[] = [];
    snap.forEach((d) => list.push(d.data() as Administrator));

    list.sort((a, b) => (a.role === 'SUPER_ADMIN' ? -1 : b.role === 'SUPER_ADMIN' ? 1 : 0));
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'administrators');
  }
}

export async function createAdministrator(
  data: {
    name: string;
    email: string;
    permissions?: AdminPermissions;
  },
  actor: { id: string; name: string; email: string }
): Promise<Administrator> {
  try {
    const normalizedEmail = data.email.trim().toLowerCase();
    const id = 'adm_' + Math.random().toString(36).substring(2, 10);

    const newAdmin: Administrator = {
      id,
      name: data.name.trim(),
      email: data.email.trim(),
      normalizedEmail,
      role: 'ADMIN', // ONLY ADMIN can be created, NEVER Super Admin
      status: 'ACTIVE',
      permissions: data.permissions || DEFAULT_ADMIN_PERMISSIONS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: actor.email,
    };

    await setDoc(doc(db, 'administrators', id), newAdmin);

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: 'SUPER_ADMIN',
      action: 'ADMIN_CREATED',
      targetType: 'administrator',
      targetId: id,
      details: `Authorized administrator ${newAdmin.email} with custom permissions`,
    });

    return newAdmin;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'administrators');
  }
}

export async function updateAdministrator(
  adminId: string,
  updates: Partial<Administrator>,
  actor: { id: string; name: string; email: string }
): Promise<void> {
  try {
    // Prohibit modifying Super Admin or promoting to Super Admin
    if (updates.role === 'SUPER_ADMIN') {
      delete updates.role;
    }

    const payload: Partial<Administrator> = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (updates.email) {
      payload.normalizedEmail = updates.email.trim().toLowerCase();
    }

    await updateDoc(doc(db, 'administrators', adminId), payload);

    await logActivity({
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      actorRole: 'SUPER_ADMIN',
      action: 'ADMIN_UPDATED',
      targetType: 'administrator',
      targetId: adminId,
      details: `Updated permissions/status for administrator ${adminId}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `administrators/${adminId}`);
  }
}

export async function deleteAdministrator(
  adminId: string,
  actor: { id: string; name: string; email: string }
): Promise<void> {
  try {
    const adminDoc = await getDoc(doc(db, 'administrators', adminId));
    if (adminDoc.exists()) {
      const data = adminDoc.data() as Administrator;
      if (data.role === 'SUPER_ADMIN') {
        throw new Error('The Super Admin account cannot be deleted.');
      }

      await deleteDoc(doc(db, 'administrators', adminId));

      await logActivity({
        actorId: actor.id,
        actorName: actor.name,
        actorEmail: actor.email,
        actorRole: 'SUPER_ADMIN',
        action: 'ADMIN_REMOVED',
        targetType: 'administrator',
        targetId: adminId,
        details: `Revoked authorization for administrator ${data.email}`,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `administrators/${adminId}`);
  }
}

// ----------------------------------------------------
// ACTIVITY LOGS
// ----------------------------------------------------

export async function logActivity(entry: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<void> {
  try {
    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const log: ActivityLog = {
      ...entry,
      id: logId,
      timestamp: new Date().toISOString(),
    };
    await setDoc(doc(db, 'activityLogs', logId), log);
  } catch (error) {
    console.warn('Could not record activity log:', error);
  }
}

export async function getActivityLogs(count: number = 30): Promise<ActivityLog[]> {
  try {
    const ref = collection(db, 'activityLogs');
    const snap = await getDocs(ref);
    let list: ActivityLog[] = [];
    snap.forEach((d) => list.push(d.data() as ActivityLog));
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list.slice(0, count);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'activityLogs');
  }
}

// ----------------------------------------------------
// METRICS / STATS
// ----------------------------------------------------

export async function getDashboardStats() {
  const albums = await getAlbums();
  const activeAlbums = albums.filter((a) => a.status === 'PUBLISHED' || a.status === 'READY').length;
  const publishedAlbums = albums.filter((a) => a.status === 'PUBLISHED').length;

  let totalPhotos = 0;
  let totalVideos = 0;

  albums.forEach((a) => {
    totalPhotos += a.photoCount || 0;
    totalVideos += a.videoCount || 0;
  });

  return {
    totalAlbums: albums.length,
    activeAlbums,
    publishedAlbums,
    totalPhotos,
    totalVideos,
    pendingUploads: 0,
    recentAlbums: albums.slice(0, 5),
  };
}

// ----------------------------------------------------
// DEMO SEED DATA ("Abe & Lia" Wedding Celebration)
// ----------------------------------------------------

export async function seedDemoAlbumIfEmpty(): Promise<boolean> {
  try {
    const albums = await getAlbums();
    if (albums.some((a) => a.id === 'alb_abe_lia')) {
      return false;
    }

    const demo = getStaticDemoAlbum();
    const demoSections = getStaticDemoSections();
    const demoMedia = getStaticDemoMedia();

    const batch = writeBatch(db);
    batch.set(doc(db, 'albums', demo.id), demo);

    demoSections.forEach((sec) => {
      batch.set(doc(db, 'albumSections', sec.id), sec);
    });

    demoMedia.forEach((m) => {
      batch.set(doc(db, 'media', m.id), m);
    });

    batch.set(doc(db, 'settings', 'platform'), {
      id: 'platform',
      platformName: "Beki's Studio",
      superAdminEmail: 'primeonebrokerageinc@gmail.com',
      defaultVisibility: 'UNLISTED',
      defaultAllowDownloads: true,
      defaultDownloadQuality: 'HIGH',
      defaultTheme: 'default',
      updatedAt: new Date().toISOString(),
    });

    await batch.commit();
    return true;
  } catch (error) {
    console.error('Failed to seed demo album:', error);
    return false;
  }
}

/**
 * Cleanly purge any demo data (Abe & Lia, system_demo) from Firestore
 * ensuring the database is 100% operation-ready for production.
 */
export async function purgeAllDemoData(): Promise<number> {
  let count = 0;
  try {
    const albumsRef = collection(db, 'albums');
    const snap = await getDocs(albumsRef);
    for (const d of snap.docs) {
      const data = d.data() as Album;
      if (
        d.id === 'alb_abe_lia' ||
        data.slug === 'abe-lia' ||
        data.createdBy === 'system_demo' ||
        (data.title && data.title.toLowerCase().includes('abe & lia'))
      ) {
        await deleteDoc(doc(db, 'albums', d.id));
        count++;
      }
    }

    // Also purge demo media
    const mediaRef = collection(db, 'media');
    const mediaSnap = await getDocs(mediaRef);
    for (const m of mediaSnap.docs) {
      const data = m.data();
      if (data.albumId === 'alb_abe_lia' || data.uploadedBy === 'system_demo') {
        await deleteDoc(doc(db, 'media', m.id));
        count++;
      }
    }
  } catch (err) {
    console.warn('Error during purgeAllDemoData:', err);
  }
  return count;
}

