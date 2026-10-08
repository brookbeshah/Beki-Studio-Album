import React from 'react';
import { Album } from '../../types';
import { useI18n } from '../../context/LanguageContext';
import { ArrowDown } from 'lucide-react';

interface HeroProps {
  album: Album;
  onViewMemories: () => void;
}

export const Hero: React.FC<HeroProps> = ({ album, onViewMemories }) => {
  const { formatDate, formatEventType } = useI18n();
  return (
    <section className="relative w-full min-h-[92vh] sm:min-h-screen flex flex-col justify-between items-center text-center px-4 sm:px-6 pt-12 pb-16 overflow-hidden bg-[#F8F6F0]">
      {/* Background Cover Image with subtle luxury overlay */}
      {album.coverImageUrl && (
        <div className="absolute inset-0 z-0">
          <img
            src={album.coverImageUrl}
            alt={album.title}
            className="w-full h-full object-cover object-center scale-[1.02] filter brightness-[0.88] contrast-[1.02] transition-transform duration-1000 ease-out"
          />
          {/* Multi-layered luxury gradient: warm ivory blend at top & bottom */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#171717]/60 via-[#171717]/30 to-[#171717]/85" />
          <div className="absolute inset-0 bg-[#F8F6F0]/10 mix-blend-overlay" />
        </div>
      )}

      {/* Top subtle brand accent */}
      <div className="relative z-10 pt-4">
        <span className="text-[11px] sm:text-xs tracking-[0.35em] uppercase text-[#F8F6F0]/80 font-light">
          BEKI'S STUDIO MEMORIES
        </span>
      </div>

      {/* Center Editorial Typography */}
      <div className="relative z-10 max-w-3xl mx-auto py-8 flex flex-col items-center">
        {/* Event Type */}
        <span className="text-xs sm:text-sm tracking-[0.3em] uppercase text-[#DCCB9A] font-medium mb-3">
          {formatEventType(album.eventType)}
        </span>

        {/* Primary Couple / Event Title */}
        <h1
          className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-[#FFFFFF] font-normal tracking-[0.03em] leading-[1.05] drop-shadow-md mb-6"
          style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif" }}
        >
          {album.title}
        </h1>

        {/* Subtle Gold Divider */}
        <div className="w-20 h-px bg-gradient-to-r from-transparent via-[#C8A96B] to-transparent mb-6" />

        {/* Event Date & Location */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base text-[#F8F6F0]/90 font-light tracking-wider mb-8">
          {album.eventDate && <span>{formatDate(album.eventDate)}</span>}
          {album.eventDate && album.location && (
            <span className="text-[#C8A96B]">•</span>
          )}
          {album.location && <span>{album.location}</span>}
        </div>

        {/* Welcome Message */}
        {album.welcomeMessage && (
          <p
            className="font-serif italic text-base sm:text-xl text-[#F8F6F0]/85 max-w-xl font-light leading-relaxed mb-10 px-4"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            "{album.welcomeMessage}"
          </p>
        )}

        {/* VIEW MEMORIES CTA */}
        <button
          onClick={onViewMemories}
          className="group inline-flex items-center gap-3 px-8 py-3.5 bg-[#F8F6F0]/95 hover:bg-[#FFFFFF] text-[#171717] rounded-xs text-xs sm:text-sm tracking-[0.25em] uppercase font-medium shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-[0.98] border border-[#C8A96B]/50 cursor-pointer"
        >
          <span>View Memories</span>
          <ArrowDown className="w-4 h-4 text-[#C8A96B] transition-transform duration-300 group-hover:translate-y-1" />
        </button>
      </div>

      {/* Bottom hint */}
      <div className="relative z-10 pb-2">
        <span className="text-[10px] tracking-[0.2em] uppercase text-[#F8F6F0]/50">
          Scroll to explore {album.photoCount || album.mediaCount || ''} photographs
        </span>
      </div>
    </section>
  );
};
