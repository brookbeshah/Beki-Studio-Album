import React, { useState, useEffect } from 'react';
import { Media, AlbumSection, getMediaSource } from '../../types';
import { useI18n } from '../../context/LanguageContext';
import { Play, Image as ImageIcon } from 'lucide-react';

interface PublicGalleryProps {
  media: Media[];
  sections: AlbumSection[];
  onMediaClick: (index: number) => void;
}

const GalleryPhotoItem: React.FC<{
  item: Media;
  index: number;
  onClick: () => void;
}> = ({ item, index, onClick }) => {
  const isVideo = item.type === 'VIDEO';
  const primarySrc = getMediaSource(item);
  const [currentSrc, setCurrentSrc] = useState<string>(primarySrc);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Eager load first 6 photos above the fold for instant appearance on all devices
  const isAboveTheFold = index < 6;

  // Keep currentSrc in sync whenever item data changes
  useEffect(() => {
    const src = getMediaSource(item);
    setCurrentSrc(src);
    setHasError(false);
  }, [item.id, item.storagePath, item.optimizedPath, item.thumbnailPath, item.url]);

  const handleImageError = () => {
    // If current source failed, cascade through alternatives smoothly
    if (currentSrc !== item.optimizedPath && item.optimizedPath) {
      setCurrentSrc(item.optimizedPath);
    } else if (currentSrc !== item.storagePath && item.storagePath) {
      setCurrentSrc(item.storagePath);
    } else if (currentSrc !== item.url && item.url) {
      setCurrentSrc(item.url);
    } else if (currentSrc !== item.thumbnailPath && item.thumbnailPath) {
      setCurrentSrc(item.thumbnailPath);
    } else {
      setHasError(true);
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative break-inside-avoid overflow-hidden bg-[#EFECE4] rounded-xs cursor-pointer shadow-xs hover:shadow-xl transition-all duration-500 border border-[#E8E0D0]/60 min-h-[180px]"
    >
      {/* Warm Luxury Shimmer Placeholder while loading */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#EFECE4] via-[#F8F6F0] to-[#EFECE4] animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border border-[#DCCB9A]/40 flex items-center justify-center opacity-40">
            <div className="w-3 h-3 rounded-full bg-[#C8A96B]/30" />
          </div>
        </div>
      )}

      {/* Error Fallback */}
      {hasError ? (
        <div className="w-full aspect-4/3 flex flex-col items-center justify-center bg-[#EFECE4] text-[#A8A49C] p-4 text-center">
          <ImageIcon className="w-8 h-8 text-[#C8A96B]/50 mb-2" />
          <span className="text-[10px] uppercase tracking-wider text-[#77736B] truncate max-w-full">
            {item.altText || item.originalFileName || 'Memory'}
          </span>
        </div>
      ) : (
        <img
          src={currentSrc}
          alt={item.altText || item.originalFileName || 'Wedding memory'}
          loading={isAboveTheFold ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={isAboveTheFold ? 'high' : 'auto'}
          ref={(node) => {
            if (node && node.complete && node.naturalWidth > 0 && !isLoaded) {
              setIsLoaded(true);
            }
          }}
          onLoad={() => setIsLoaded(true)}
          onError={handleImageError}
          className={`w-full h-auto object-cover transition-opacity duration-500 ease-out group-hover:scale-[1.03] ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Video Play Indicator */}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
          <div className="w-12 h-12 rounded-full bg-[#171717]/80 backdrop-blur-xs border border-[#C8A96B] flex items-center justify-center text-[#F8F6F0] shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 ml-0.5 fill-current text-[#C8A96B]" />
          </div>
        </div>
      )}

      {/* Subtle Hover Veil with Details */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
        <span className="text-[11px] text-[#F8F6F0] tracking-wider uppercase font-light truncate">
          {item.altText || item.originalFileName}
        </span>
      </div>
    </div>
  );
};

export const PublicGallery: React.FC<PublicGalleryProps> = ({
  media,
  sections,
  onMediaClick,
}) => {
  const { t } = useI18n();
  const [selectedSectionId, setSelectedSectionId] = useState<string>('all');

  const filteredMedia =
    selectedSectionId === 'all'
      ? media
      : media.filter((m) => m.sectionId === selectedSectionId);

  return (
    <section id="memories-gallery" className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-16">
      {/* Editorial Section Header */}
      <div className="text-center mb-12">
        <h2
          className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#171717] font-normal tracking-wide mb-3"
          style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif" }}
        >
          {t('album.allMemories')}
        </h2>
        <div className="w-12 h-px bg-[#C8A96B] mx-auto mb-6" />

        {/* Section Filters (if album has defined sections) */}
        {sections.length > 0 && (
          <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap max-w-3xl mx-auto px-2">
            <button
              onClick={() => setSelectedSectionId('all')}
              className={`px-4 py-2 rounded-xs text-xs tracking-widest uppercase transition-all duration-200 cursor-pointer ${
                selectedSectionId === 'all'
                  ? 'bg-[#171717] text-[#F8F6F0] font-medium border border-[#171717]'
                  : 'text-[#77736B] hover:text-[#171717] bg-[#FCFBF8] border border-[#E8E0D0] hover:border-[#C8A96B]'
              }`}
            >
              {t('browse.filterAll')} ({media.length})
            </button>

            {sections.map((sec) => {
              const count = media.filter((m) => m.sectionId === sec.id).length;
              return (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`px-4 py-2 rounded-xs text-xs tracking-widest uppercase transition-all duration-200 cursor-pointer ${
                    selectedSectionId === sec.id
                      ? 'bg-[#171717] text-[#F8F6F0] font-medium border border-[#171717]'
                      : 'text-[#77736B] hover:text-[#171717] bg-[#FCFBF8] border border-[#E8E0D0] hover:border-[#C8A96B]'
                  }`}
                >
                  {sec.title} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      {filteredMedia.length === 0 ? (
        <div className="text-center py-20 px-4">
          <p className="font-serif text-xl text-[#77736B] italic">
            {t('album.noPhotos') || 'No memories uploaded in this section yet.'}
          </p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-6 space-y-4 sm:space-y-6">
          {filteredMedia.map((item, index) => {
            const originalIndex = media.findIndex((m) => m.id === item.id);
            return (
              <GalleryPhotoItem
                key={item.id}
                item={item}
                index={index}
                onClick={() => onMediaClick(originalIndex >= 0 ? originalIndex : index)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};
