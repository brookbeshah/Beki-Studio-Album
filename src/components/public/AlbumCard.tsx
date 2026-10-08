import React from 'react';
import { Album } from '../../types';
import { useI18n } from '../../context/LanguageContext';
import { ArrowRight, MapPin, Calendar, Sparkles } from 'lucide-react';

interface AlbumCardProps {
  album: Album;
  onOpen: (slug: string) => void;
  className?: string;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({ album, onOpen, className = '' }) => {
  const { t, formatDate, formatEventType } = useI18n();

  return (
    <article
      onClick={() => onOpen(album.slug)}
      className={`group relative bg-[#FCFBF8] border border-[#E8E0D0] hover:border-[#C8A96B] transition-all duration-300 rounded-xs overflow-hidden flex flex-col cursor-pointer shadow-xs hover:shadow-lg ${className}`}
    >
      {/* Cover Image Container */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-[#2A2826]">
        {album.coverImageUrl ? (
          <img
            src={album.coverImageUrl}
            alt={album.title}
            loading="lazy"
            className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 filter brightness-[0.93] contrast-[1.02]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#F8F6F0] text-[#A8A49C]">
            <Sparkles className="w-8 h-8 text-[#C8A96B]/50" />
          </div>
        )}

        {/* Soft Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-80 group-hover:opacity-70 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span className="px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.25em] font-semibold bg-[#171717]/80 text-[#DCCB9A] backdrop-blur-xs border border-[#C8A96B]/30">
            {formatEventType(album.eventType)}
          </span>

          {album.featured && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold bg-[#C8A96B] text-[#171717] shadow-sm">
              <Sparkles className="w-3 h-3 text-[#171717]" />
              <span className="hidden sm:inline">{t('browse.featuredBadge')}</span>
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
            {album.eventDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#C8A96B]/80" />
                <span>{formatDate(album.eventDate)}</span>
              </span>
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

        {/* Action Link with Gold Accent */}
        <div className="pt-3 border-t border-[#E8E0D0]/60 flex items-center justify-between text-xs font-medium uppercase tracking-widest text-[#171717] group-hover:text-[#8C6D2C]">
          <span>{t('browse.viewAlbum')}</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#C8A96B] transform group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </article>
  );
};
