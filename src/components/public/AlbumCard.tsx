import React from 'react';
import { Album } from '../../types';
import { useI18n } from '../../context/LanguageContext';
import { ArrowRight, MapPin, Calendar, Sparkles } from 'lucide-react';
import { useOptimizedImage } from '../../hooks/useOptimizedImage';

interface AlbumCardProps {
  album: Album;
  onOpen: (slug: string) => void;
  className?: string;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({ album, onOpen, className = '' }) => {
  const { t, formatDate, formatEventType } = useI18n();

  // Progressive image resolution for cover
  const {
    currentSrc,
    isLoading,
    isLoaded,
    isLowRes,
    hasError,
  } = useOptimizedImage({
    src: album.coverImageUrl || null,
    lowResSrc: album.coverImageUrl || null,
    fetchPriority: 'auto',
  });

  return (
    <article
      onClick={() => onOpen(album.slug || album.id)}
      className={`group relative bg-[#FCFBF8] border border-[#E8E0D0] hover:border-[#C8A96B] transition-all duration-300 rounded-xs overflow-hidden flex flex-col cursor-pointer shadow-xs hover:shadow-lg ${className}`}
    >
      {/* Cover Image Container */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-[#2A2826]">
        {currentSrc && !hasError ? (
          <>
            {isLoading && !isLoaded && (
              <div className="absolute inset-0 bg-[#35322F] animate-pulse flex items-center justify-center z-10 pointer-events-none">
                <Sparkles className="w-6 h-6 text-[#C8A96B]/30 animate-spin" />
              </div>
            )}
            <img
              src={currentSrc}
              alt={album.title}
              loading="lazy"
              decoding="async"
              className={`w-full h-full object-cover object-center transition-all duration-700 ease-out group-hover:scale-105 filter brightness-[0.93] contrast-[1.02] ${
                isLowRes ? 'filter blur-[4px] scale-[1.02]' : 'filter blur-0 scale-100'
              }`}
            />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#2A2826] text-[#A8A49C] p-4 text-center">
            <Sparkles className="w-8 h-8 text-[#C8A96B]/60 mb-2" />
            <span className="font-serif text-sm text-[#DCCB9A]/80 tracking-widest uppercase">
              {album.title}
            </span>
          </div>
        )}

        {/* Soft Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-80 group-hover:opacity-70 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          <span className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.25em] font-semibold bg-[#171717]/80 text-[#DCCB9A] backdrop-blur-xs border border-[#C8A96B]/30">
            {formatEventType(album.eventType)}
          </span>

          {album.featured && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold bg-[#C8A96B] text-[#171717] shadow-sm">
              <Sparkles className="w-3 h-3 text-[#171717]" />
              <span className="hidden sm:inline">{t('browse.featuredBadge') || 'Featured'}</span>
            </span>
          )}
        </div>
      </div>

      {/* Editorial Card Body */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Couple / Event Title */}
          <h3
            className="font-serif text-xl sm:text-2xl text-[#171717] font-normal tracking-wide group-hover:text-[#8C6D2C] transition-colors leading-tight"
            style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif" }}
          >
            {album.title}
          </h3>

          {/* Minimal Meta: Date & Location */}
          <div className="mt-2.5 flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-[#77736B] font-light">
            {album.eventDate && <span>{formatDate(album.eventDate)}</span>}
            {album.eventDate && album.location && (
              <span className="text-[#C8A96B]">•</span>
            )}
            {album.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#C8A96B]/80" />
                <span className="truncate max-w-[160px]">{album.location}</span>
              </span>
            )}
          </div>

          {/* Description Snippet if present */}
          {album.description && (
            <p className="mt-2.5 text-xs text-[#77736B] line-clamp-2 font-light leading-relaxed">
              {album.description}
            </p>
          )}
        </div>

        {/* View Album Action */}
        <div className="pt-2 border-t border-[#E8E0D0]/50 flex items-center justify-between text-xs tracking-widest uppercase font-medium text-[#171717] group-hover:text-[#8C6D2C]">
          <span>{t('album.viewMemories') || 'View Memories'}</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </article>
  );
};

export default AlbumCard;
