import React, { useEffect, useState, useMemo } from 'react';
import { Album, Media, AlbumSection, getMediaSource } from '../types';
import { getAlbumBySlug, getAlbumMedia, getAlbumSections } from '../services/albumService';
import { subscribeAlbumMedia } from '../services/mediaService';
import { resolveMediaList, resolveAlbumCoverUrl } from '../utils/mediaResolver';
import { PublicHeader } from '../components/public/PublicHeader';
import { Hero } from '../components/public/Hero';
import { PublicGallery } from '../components/public/PublicGallery';
import { MediaViewer } from '../components/public/MediaViewer';
import { PublicFooter } from '../components/public/PublicFooter';
import { NotFound } from '../components/public/NotFound';
import { useI18n } from '../context/LanguageContext';

interface PublicAlbumViewProps {
  slug: string;
  onAdminTrigger?: () => void;
  onGoHome: () => void;
  onNavigate?: (path: string) => void;
}

export const PublicAlbumView: React.FC<PublicAlbumViewProps> = ({
  slug,
  onAdminTrigger,
  onGoHome,
  onNavigate,
}) => {
  const { t } = useI18n();
  const [album, setAlbum] = useState<Album | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [sections, setSections] = useState<AlbumSection[]>([]);
  const [resolvedCoverUrl, setResolvedCoverUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  // Fullscreen Viewer state
  const [viewerOpen, setViewerOpen] = useState<boolean>(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    let unsubMedia: (() => void) | null = null;

    const loadPublicAlbumData = async () => {
      setIsLoading(true);
      setIsNotFound(false);

      try {
        // 1. Fetch album record by slug (or fallback by ID)
        // Public route: NO authentication check or user requirement
        const alb = await getAlbumBySlug(slug);

        if (!isMounted) return;

        if (!alb || alb.status === 'ARCHIVED') {
          setIsNotFound(true);
          setIsLoading(false);
          return;
        }

        setAlbum(alb);

        // 2. Concurrently fetch media list and sections
        const [rawMediaList, rawSections] = await Promise.all([
          getAlbumMedia(alb.id).catch((err) => {
            console.warn('[PublicAlbumView] Non-fatal media fetch fallback:', err);
            return [] as Media[];
          }),
          getAlbumSections(alb.id).catch((err) => {
            console.warn('[PublicAlbumView] Non-fatal sections fetch fallback:', err);
            return [] as AlbumSection[];
          }),
        ]);

        if (!isMounted) return;

        // 3. Progressive Loading: Display raw media & sections immediately so low-resolution
        // placeholders and initial UI render with zero blocking!
        setMedia(rawMediaList);
        setSections(rawSections);
        setIsLoading(false);

        // 4. Asynchronously resolve Firebase Storage download URLs in the background
        const [resolvedMedia, cover] = await Promise.all([
          resolveMediaList(rawMediaList),
          resolveAlbumCoverUrl(alb, rawMediaList),
        ]);

        if (isMounted) {
          setMedia(resolvedMedia);
          if (cover) {
            setResolvedCoverUrl(cover);
          }
        }

        // 5. Real-time synchronization: photos uploaded by admin appear immediately for live visitors
        unsubMedia = subscribeAlbumMedia(alb.id, async (freshList) => {
          if (!isMounted) return;
          // Render immediate list first
          setMedia(freshList);
          // Then resolve any storage references
          const freshResolved = await resolveMediaList(freshList);
          if (isMounted) {
            setMedia(freshResolved);
            // Refresh cover if not yet established
            if (!cover) {
              const updatedCover = await resolveAlbumCoverUrl(alb, freshResolved);
              if (isMounted && updatedCover) {
                setResolvedCoverUrl(updatedCover);
              }
            }
          }
        });
      } catch (err) {
        console.error('[PublicAlbumView Error]:', err);
        if (isMounted) {
          setIsNotFound(true);
          setIsLoading(false);
        }
      }
    };

    loadPublicAlbumData();

    return () => {
      isMounted = false;
      if (unsubMedia) {
        unsubMedia();
      }
    };
  }, [slug]);

  const handleViewMemories = () => {
    const el = document.getElementById('memories-gallery');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleMediaClick = (index: number) => {
    setCurrentMediaIndex(index);
    setViewerOpen(true);
  };

  // Prepare album data with fully resolved cover image URL
  const albumWithResolvedCover = useMemo(() => {
    if (!album) return null;
    const cover =
      resolvedCoverUrl ||
      album.coverImageUrl ||
      (media.length > 0 ? getMediaSource(media[0]) : '');
    return {
      ...album,
      coverImageUrl: cover,
    };
  }, [album, resolvedCoverUrl, media]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F6F0] flex flex-col justify-center items-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#DCCB9A] border-t-[#C8A96B] rounded-full animate-spin mx-auto" />
          <p
            className="font-serif text-lg text-[#171717] tracking-widest uppercase font-light"
            style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif" }}
          >
            BEKI'S STUDIO
          </p>
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#77736B]">
            {t('album.openingMemories') || 'Opening memories...'}
          </span>
        </div>
      </div>
    );
  }

  if (isNotFound || !album || !albumWithResolvedCover) {
    return <NotFound onGoHome={onGoHome} onAdminTrigger={onAdminTrigger} />;
  }

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col justify-between selection:bg-[#C8A96B]/20">
      {/* Public Header with invisible 5-click logo trigger & language selector */}
      <PublicHeader
        albumTitle={album.title}
        onAdminTrigger={onAdminTrigger}
        onNavigate={onNavigate}
        allowShare={true}
      />

      <main className="flex-1">
        {/* Editorial Cover Hero */}
        <Hero
          album={albumWithResolvedCover}
          onViewMemories={handleViewMemories}
        />

        {/* Photography & Video Gallery with progressive loading */}
        <PublicGallery
          media={media}
          sections={sections}
          onMediaClick={handleMediaClick}
        />
      </main>

      {/* Fullscreen Editorial Media Viewer with prefetching */}
      <MediaViewer
        media={media}
        currentIndex={currentMediaIndex}
        isOpen={viewerOpen}
        allowDownloads={album.allowDownloads}
        onClose={() => setViewerOpen(false)}
        onNavigate={(idx) => setCurrentMediaIndex(idx)}
      />

      {/* Minimal Luxury Footer */}
      <PublicFooter
        onAdminTrigger={onAdminTrigger}
        onNavigate={onNavigate}
        customFooter={album.customFooter}
      />
    </div>
  );
};
export default PublicAlbumView;
