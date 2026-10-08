import React, { useEffect, useState } from 'react';
import { AuraLogo } from '../components/common/AuraLogo';
import { Button } from '../components/common/Button';
import { PublicHeader } from '../components/public/PublicHeader';
import { PublicFooter } from '../components/public/PublicFooter';
import { AlbumCard } from '../components/public/AlbumCard';
import { getPublicAlbums } from '../services/albumService';
import {
  StudioContentService,
  StudioContentData,
} from '../services/studioContentService';
import {
  DEFAULT_APPEARANCE_SETTINGS,
} from '../services/settingsService';
import { useAutoSlider } from '../hooks/useAutoSlider';
import { Album } from '../types';
import { useI18n } from '../context/LanguageContext';
import {
  ArrowRight,
  Search,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Pause,
  Play,
  X,
  Maximize2,
  Images,
  FolderOpen,
} from 'lucide-react';

interface PublicHomeProps {
  onAdminTrigger: () => void;
  onOpenAlbumSlug: (slug: string) => void;
  onNavigate: (path: string) => void;
}

export const PublicHome: React.FC<PublicHomeProps> = ({
  onAdminTrigger,
  onOpenAlbumSlug,
  onNavigate,
}) => {
  const { t } = useI18n();

  // Published albums in Firestore
  const [publicAlbums, setPublicAlbums] = useState<Album[]>([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Studio content from Firestore
  const [studioContent, setStudioContent] = useState<StudioContentData>({
    heroImages: DEFAULT_APPEARANCE_SETTINGS.heroMontageImages,
    browsePhotos: DEFAULT_APPEARANCE_SETTINGS.browsePhotos,
    branding: {
      studioName: "Beki's Studio",
      tagline: 'Preserving the Poetry of Your Most Beautiful Moments.',
      heroBadge: 'Fine Art Wedding & Editorial Photography',
      heroHeadline: 'Preserving the Poetry of Your Most Beautiful Moments.',
      heroSubtitle:
        'A timeless digital sanctuary for weddings, sacred ceremonies, and celebrations. View, cherish, and download photographs in high resolution.',
      primaryAccentColor: '#C8A96B',
    },
    updatedAt: '',
    updatedBy: '',
    updatedByEmail: '',
  });

  // Lightbox preview state
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Subscribe to real-time studio content (unified with Settings Service)
  useEffect(() => {
    StudioContentService.getStudioContent().then((data) => {
      setStudioContent(data);
    });

    const unsubscribe = StudioContentService.subscribeStudioContent((data) => {
      setStudioContent(data);
    });

    return () => unsubscribe();
  }, []);

  // Fetch published albums
  useEffect(() => {
    setIsLoadingAlbums(true);
    getPublicAlbums({ search: searchQuery, eventType: selectedFilter })
      .then((list) => {
        setPublicAlbums(list);
      })
      .catch((err) => {
        console.warn('Could not load public albums:', err);
      })
      .finally(() => {
        setIsLoadingAlbums(false);
      });
  }, [searchQuery, selectedFilter]);

  // Active hero images
  const heroImages = studioContent.heroImages || [];
  const heroSlider = useAutoSlider({
    totalSlides: heroImages.length,
    intervalMs: 4600,
    autoPlay: true,
    pauseOnHover: true,
  });

  // Active browse photos
  const browsePhotos = studioContent.browsePhotos || [];
  const browseSlider = useAutoSlider({
    totalSlides: browsePhotos.length,
    intervalMs: 3600,
    autoPlay: true,
    pauseOnHover: true,
  });

  const filterOptions = [
    { id: 'all', label: t('browse.filterAll') },
    { id: 'wedding', label: t('browse.filterWeddings') },
    { id: 'engagement', label: t('browse.filterEngagements') },
    { id: 'celebration', label: t('browse.filterCelebrations') },
    { id: 'event', label: t('browse.filterEvents') },
  ];

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col justify-between selection:bg-[#C8A96B]/20">
      {/* Public Header */}
      <PublicHeader
        onAdminTrigger={onAdminTrigger}
        onNavigate={onNavigate}
        currentPath="/"
      />

      <main className="flex-1">
        {/* ========================================================= */}
        {/* HERO SECTION WITH AUTOMATIC SLIDING ANIMATIONS */}
        {/* ========================================================= */}
        <section className="relative px-4 sm:px-6 pt-12 sm:pt-20 pb-16 sm:pb-24 max-w-6xl mx-auto text-center flex flex-col items-center">
          {/* Brand Emblem */}
          <div className="mb-6">
            <AuraLogo
              size="lg"
              stacked={true}
              showWordmark={true}
              onAdminTrigger={onAdminTrigger}
            />
          </div>

          {/* Platform Category Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-[#DCCB9A]/60 bg-[#FCFBF8] text-[11px] uppercase tracking-[0.3em] text-[#8C6D2C] mb-6 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#C8A96B]" />
            <span>{studioContent.branding.heroBadge || t('hero.badge')}</span>
          </div>

          {/* Primary Headline */}
          <h1
            className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-[#171717] font-normal tracking-[0.02em] leading-[1.06] max-w-5xl mb-6"
            style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif" }}
          >
            {studioContent.branding.heroHeadline || t('hero.tagline')}
          </h1>

          {/* Subtitle / Philosophy */}
          <p className="text-sm sm:text-lg md:text-xl text-[#77736B] font-light max-w-2xl leading-relaxed mb-10">
            {studioContent.branding.heroSubtitle || t('hero.subtitle')}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
            <Button
              variant="gold"
              size="lg"
              onClick={() => {
                const el = document.getElementById('browse-gallery');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Browse Photo Gallery
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const el = document.getElementById('browse-albums');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              View Client Albums
            </Button>
          </div>

          {/* ========================================================= */}
          {/* AUTOMATIC SLIDING HERO PRESENTATION */}
          {/* ========================================================= */}
          <div className="w-full max-w-5xl space-y-4">
            {heroImages.length > 0 && (
              <div
                className="relative aspect-16/9 sm:aspect-21/9 rounded-xs overflow-hidden border border-[#E8E0D0] bg-[#171717] shadow-lg group select-none"
                {...heroSlider.handlers}
              >
                {/* Slides Layer */}
                {heroImages.map((src, idx) => {
                  const isActive = idx === heroSlider.currentIndex;
                  return (
                    <div
                      key={idx}
                      className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                        isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                      }`}
                    >
                      <img
                        src={src}
                        alt={`Hero Slide ${idx + 1}`}
                        className={`w-full h-full object-cover object-center filter brightness-[0.9] transition-transform duration-7000 ease-out ${
                          isActive ? 'scale-105' : 'scale-100'
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end p-6 sm:p-10 text-white font-mono text-xs">
                        Slide {idx + 1} of {heroImages.length}
                      </div>
                    </div>
                  );
                })}

                {/* Arrow Controls */}
                <button
                  onClick={heroSlider.prevSlide}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                  aria-label="Previous Slide"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={heroSlider.nextSlide}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                  aria-label="Next Slide"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Bottom Bar: Dots & Play/Pause */}
                <div className="absolute bottom-4 right-6 z-20 flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    {heroImages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => heroSlider.goToSlide(i)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          i === heroSlider.currentIndex
                            ? 'w-6 bg-[#C8A96B]'
                            : 'w-1.5 bg-white/40 hover:bg-white/80'
                        }`}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={heroSlider.togglePlay}
                    className="p-1 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white transition-colors cursor-pointer"
                    title={heroSlider.isPlaying ? 'Pause slideshow' : 'Play slideshow'}
                  >
                    {heroSlider.isPlaying ? (
                      <Pause className="w-3.5 h-3.5 text-[#C8A96B]" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Synchronized Multi-Image Montage Preview (Click to jump slide) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-2 bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs shadow-xs">
              {heroImages.slice(0, 4).map((src, i) => {
                const isSelected = i === heroSlider.currentIndex;
                return (
                  <div
                    key={i}
                    onClick={() => heroSlider.goToSlide(i)}
                    className={`relative aspect-4/3 overflow-hidden rounded-2xs cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? 'ring-2 ring-[#C8A96B] scale-[1.02] shadow-sm'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={src}
                      alt={`Hero Montage ${i + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2">
                      <span className="text-[10px] text-white font-mono">#{i + 1}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION: BROWSE PHOTOS (AUTOMATIC SLIDING CAROUSEL) */}
        {/* ========================================================= */}
        <section
          id="browse-gallery"
          className="py-20 sm:py-28 px-4 sm:px-6 bg-[#FCFBF8] border-y border-[#E8E0D0]/80"
        >
          <div className="max-w-6xl mx-auto space-y-12">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-[11px] uppercase tracking-[0.3em] text-[#C8A96B] font-semibold block mb-2">
                Editorial Showcase
              </span>
              <h2
                className="font-serif text-3xl sm:text-5xl text-[#171717] font-normal tracking-wide mb-3"
                style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif" }}
              >
                Browse Curated Photography
              </h2>
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#C8A96B] to-transparent mx-auto mb-4" />
              <p className="text-xs sm:text-sm text-[#77736B] font-light leading-relaxed">
                Explore fine art highlights across wedding vows, ceremony portraits, and celebration moments.
              </p>
            </div>

            {/* AUTOMATIC SLIDING CAROUSEL OF PHOTOS */}
            {browsePhotos.length > 0 ? (
              <div
                className="relative bg-white border border-[#E8E0D0] p-3 sm:p-5 rounded-xs shadow-xs"
                {...browseSlider.handlers}
              >
                {/* Multi-Card Slide Window */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {[0, 1, 2, 3].map((offset) => {
                    const idx = (browseSlider.currentIndex + offset) % browsePhotos.length;
                    const src = browsePhotos[idx];
                    if (!src) return null;

                    return (
                      <div
                        key={idx + offset}
                        onClick={() => setPreviewPhotoUrl(src)}
                        className="group relative aspect-3/4 rounded-2xs overflow-hidden bg-[#2A2826] cursor-pointer shadow-2xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                      >
                        <img
                          src={src}
                          alt={`Curated highlight ${idx + 1}`}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-106 filter brightness-[0.95]"
                        />

                        {/* Expand Icon */}
                        <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Maximize2 className="w-3 h-3" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Slide Nav Controls */}
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#E8E0D0]/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#77736B]">
                      Photograph {browseSlider.currentIndex + 1} of {browsePhotos.length}
                    </span>
                    <button
                      onClick={browseSlider.togglePlay}
                      className="text-[11px] text-[#C8A96B] hover:text-[#8C6D2C] cursor-pointer"
                    >
                      {browseSlider.isPlaying ? 'Auto-slide active' : 'Paused'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={browseSlider.prevSlide}
                      className="p-1.5 rounded-xs border border-[#E8E0D0] hover:border-[#C8A96B] bg-[#FCFBF8] text-[#171717] transition-colors cursor-pointer"
                      title="Previous photograph"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={browseSlider.nextSlide}
                      className="p-1.5 rounded-xs border border-[#E8E0D0] hover:border-[#C8A96B] bg-[#FCFBF8] text-[#171717] transition-colors cursor-pointer"
                      title="Next photograph"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* ========================================================= */}
        {/* BROWSE CLIENT ALBUMS SECTION (REAL FIRESTORE DATA) */}
        {/* ========================================================= */}
        <section
          id="browse-albums"
          className="py-20 sm:py-28 px-4 sm:px-6 bg-[#F8F6F0]"
        >
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-[11px] uppercase tracking-[0.3em] text-[#C8A96B] font-semibold block mb-2">
                {t('browse.badge')}
              </span>
              <h2
                className="font-serif text-3xl sm:text-5xl text-[#171717] font-normal tracking-wide mb-3"
                style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif" }}
              >
                {t('browse.title')}
              </h2>
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#C8A96B] to-transparent mx-auto mb-4" />
              <p className="text-xs sm:text-sm text-[#77736B] font-light leading-relaxed">
                {t('browse.description')}
              </p>
            </div>

            {/* Search Box & Category Filters */}
            <div className="space-y-4 mb-10">
              <div className="relative max-w-xl mx-auto">
                <Search className="w-4 h-4 text-[#77736B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('browse.searchPlaceholder')}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-[#E8E0D0] focus:border-[#C8A96B] focus:ring-1 focus:ring-[#C8A96B] rounded-xs text-xs sm:text-sm text-[#171717] placeholder-[#A8A49C] shadow-2xs outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 px-1 scrollbar-none">
                {filterOptions.map((f) => {
                  const active = selectedFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFilter(f.id)}
                      className={`px-4 py-1.5 rounded-full text-xs tracking-wider uppercase whitespace-nowrap transition-all duration-200 cursor-pointer ${
                        active
                          ? 'bg-[#171717] text-[#F8F6F0] font-medium shadow-xs border border-[#171717]'
                          : 'bg-white text-[#77736B] hover:text-[#171717] border border-[#E8E0D0] hover:border-[#C8A96B]'
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Albums Grid */}
            {isLoadingAlbums ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="bg-white border border-[#E8E0D0] rounded-xs p-4 animate-pulse space-y-4"
                  >
                    <div className="aspect-4/3 bg-[#EFECE4] rounded-xs" />
                    <div className="h-6 bg-[#EFECE4] rounded-xs w-3/4" />
                    <div className="h-4 bg-[#EFECE4] rounded-xs w-1/2" />
                  </div>
                ))}
              </div>
            ) : publicAlbums.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {publicAlbums.map((album) => (
                  <AlbumCard
                    key={album.id}
                    album={album}
                    onOpen={onOpenAlbumSlug}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white border border-[#E8E0D0] rounded-xs p-8 max-w-md mx-auto shadow-2xs">
                <FolderOpen className="w-8 h-8 text-[#C8A96B] mx-auto mb-3 opacity-60" />
                <h3
                  className="font-serif text-xl text-[#171717] mb-2"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  {searchQuery || selectedFilter !== 'all' ? t('browse.noAlbums') : 'Live Collections Sanctuary'}
                </h3>
                <p className="text-xs text-[#77736B] font-light mb-6">
                  {searchQuery || selectedFilter !== 'all'
                    ? 'No collections matched your search criteria.'
                    : 'Client collections are published per event. Guests can access private collections via direct link or QR card.'}
                </p>
                {searchQuery || selectedFilter !== 'all' ? (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedFilter('all');
                    }}
                    className="px-4 py-2 bg-[#171717] text-[#F8F6F0] text-xs uppercase tracking-widest rounded-xs hover:bg-[#2A2826] transition-colors cursor-pointer"
                  >
                    Reset Filters
                  </button>
                ) : null}
              </div>
            )}

            {/* Link to Full Catalog */}
            <div className="mt-12 text-center">
              <Button
                variant="outline"
                size="md"
                onClick={() => onNavigate('/albums')}
                rightIcon={<ChevronRight className="w-4 h-4 text-[#C8A96B]" />}
              >
                {t('browse.viewAll')}
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* FULLSCREEN PHOTO LIGHTBOX MODAL */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <button
            onClick={() => setPreviewPhotoUrl(null)}
            className="absolute top-4 right-4 z-50 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Close Preview"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewPhotoUrl}
              alt="High resolution showcase preview"
              className="max-h-[80vh] w-auto object-contain rounded-2xs shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}

      {/* Public Footer */}
      <PublicFooter
        onAdminTrigger={onAdminTrigger}
        onNavigate={onNavigate}
      />
    </div>
  );
};
