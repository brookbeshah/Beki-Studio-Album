import React, { useEffect, useState } from 'react';
import { Album, Media, AlbumSection, getMediaSource } from '../types';
import { getAlbumBySlug, getAlbumMedia, getAlbumSections } from '../services/albumService';
import { subscribeAlbumMedia } from '../services/mediaService';
import { auth } from '../firebase';
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
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);

  // Viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    let unsubMedia: (() => void) | null = null;

    const fetchAlbum = async () => {
      setIsLoading(true);
      setIsNotFound(false);

      try {
        let alb = await getAlbumBySlug(slug);

        if (!isMounted) return;

        if (!alb || alb.status === 'ARCHIVED') {
          setIsNotFound(true);
          setIsLoading(false);
          return;
        }

        setAlbum(alb);

        const [mList, sList] = await Promise.all([
          getAlbumMedia(alb.id),
          getAlbumSections(alb.id),
        ]);

        if (isMounted) {
          setMedia(mList);
          setSections(sList);
          setIsLoading(false);
        }

        // Real-time synchronization: photos uploaded by admin appear immediately for live visitors
        unsubMedia = subscribeAlbumMedia(alb.id, (freshList) => {
          if (isMounted) {
            setMedia(freshList);
          }
        });
      } catch (err) {
        console.error('Error fetching album:', err);
        if (isMounted) {
          setIsNotFound(true);
          setIsLoading(false);
        }
      }
    };

    fetchAlbum();

    return () => {
      isMounted = false;
      if (unsubMedia) unsubMedia();
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F6F0] flex flex-col justify-center items-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#DCCB9A] border-t-[#C8A96B] rounded-full animate-spin mx-auto" />
          <p className="font-serif text-lg text-[#171717] tracking-widest uppercase">
            BEKI'S STUDIO
          </p>
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#77736B]">
            {t('album.openingMemories')}
          </span>
        </div>
      </div>
    );
  }

  if (isNotFound || !album) {
    return <NotFound onGoHome={onGoHome} onAdminTrigger={onAdminTrigger} />;
  }

  // Cover fallback if album.coverImageUrl is empty
  const heroCoverUrl = album.coverImageUrl || (media.length > 0 ? getMediaSource(media[0]) : '');
  const albumWithCover = { ...album, coverImageUrl: heroCoverUrl };

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
        <Hero album={albumWithCover} onViewMemories={handleViewMemories} />

        {/* Photography & Video Gallery */}
        <PublicGallery
          media={media}
          sections={sections}
          onMediaClick={handleMediaClick}
        />
      </main>

      {/* Fullscreen Editorial Media Viewer */}
      <MediaViewer
        media={media}
        currentIndex={currentMediaIndex}
        isOpen={viewerOpen}
        allowDownloads={album.allowDownloads}
        onClose={() => setViewerOpen(false)}
        onNavigate={(idx) => setCurrentMediaIndex(idx)}
      />

      {/* Minimal Footer */}
      <PublicFooter
        onAdminTrigger={onAdminTrigger}
        onNavigate={onNavigate}
        customFooter={album.customFooter}
      />
    </div>
  );
};
