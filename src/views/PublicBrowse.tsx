import React, { useState, useEffect } from 'react';
import { Album } from '../types';
import { getPublicAlbums } from '../services/albumService';
import { PublicHeader } from '../components/public/PublicHeader';
import { PublicFooter } from '../components/public/PublicFooter';
import { AlbumCard } from '../components/public/AlbumCard';
import { useI18n } from '../context/LanguageContext';
import { Search, Filter, Sparkles, ArrowLeft, X, RefreshCw } from 'lucide-react';

interface PublicBrowseProps {
  onAdminTrigger?: () => void;
  onOpenAlbumSlug: (slug: string) => void;
  onNavigate: (path: string) => void;
}

export const PublicBrowse: React.FC<PublicBrowseProps> = ({
  onAdminTrigger,
  onOpenAlbumSlug,
  onNavigate,
}) => {
  const { t } = useI18n();

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('all');

  // Query status
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from URL search parameters on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      const type = params.get('type');
      if (q) {
        setSearchQuery(q);
        setDebouncedSearch(q);
      }
      if (type) {
        setSelectedEventType(type);
      }
    }
  }, []);

  // Debounce search query input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Synchronize URL query parameters with active search & filter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (debouncedSearch.trim()) {
        url.searchParams.set('q', debouncedSearch.trim());
      } else {
        url.searchParams.delete('q');
      }

      if (selectedEventType && selectedEventType !== 'all') {
        url.searchParams.set('type', selectedEventType);
      } else {
        url.searchParams.delete('type');
      }

      window.history.replaceState({}, '', url.toString());
    }
  }, [debouncedSearch, selectedEventType]);

  // Query Firestore database dynamically for only PUBLISHED and PUBLIC albums
  useEffect(() => {
    setIsLoading(true);
    getPublicAlbums({
      search: debouncedSearch.trim(),
      eventType: selectedEventType,
    })
      .then((data) => {
        const publicOnly = data.filter(
          (a) => a.visibility !== 'PRIVATE' && a.status !== 'ARCHIVED'
        );
        setAlbums(publicOnly);
      })
      .catch((err) => {
        console.warn('Error fetching published public collections:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [debouncedSearch, selectedEventType]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedEventType('all');
  };

  const eventTypeOptions = [
    { id: 'all', label: t('browse.allEvents') || t('browse.filterAll') || 'All Events' },
    { id: 'wedding', label: t('eventTypes.wedding') || t('event.wedding') || 'Wedding' },
    { id: 'engagement', label: t('eventTypes.engagement') || t('event.engagement') || 'Engagement' },
    { id: 'birthday', label: t('eventTypes.birthday') || t('event.birthday') || 'Birthday' },
    { id: 'corporate', label: t('eventTypes.corporate') || t('event.corporate') || 'Corporate Event' },
    { id: 'graduation', label: t('eventTypes.graduation') || 'Graduation' },
    { id: 'babyshower', label: t('eventTypes.babyShower') || 'Baby Shower' },
    { id: 'concert', label: t('eventTypes.concert') || 'Concert' },
    { id: 'celebration', label: t('eventTypes.celebration') || t('event.celebration') || 'Celebration' },
    { id: 'other', label: t('eventTypes.other') || t('event.other') || 'Other' },
  ];

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col justify-between selection:bg-[#C8A96B]/20">
      <PublicHeader
        onAdminTrigger={onAdminTrigger}
        onNavigate={onNavigate}
        currentPath="/albums"
      />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 w-full">
        {/* Back Link */}
        <button
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#77736B] hover:text-[#171717] mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('common.home') || t('nav.home') || 'Home'}</span>
        </button>

        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#DCCB9A]/60 bg-[#FCFBF8] text-[10px] uppercase tracking-[0.25em] text-[#8C6D2C] mb-4 shadow-2xs">
            <Sparkles className="w-3 h-3 text-[#C8A96B]" />
            <span>{t('browse.badge') || 'Public Collections'}</span>
          </div>

          <h1
            className="font-serif text-3xl sm:text-5xl text-[#171717] font-normal tracking-wide mb-3"
            style={{ fontFamily: "'Cormorant Garamond', 'Noto Serif Ethiopic', 'Playfair Display', serif" }}
          >
            {t('browse.title') || 'Browse Albums'}
          </h1>

          <p className="text-xs sm:text-sm text-[#77736B] font-light leading-relaxed">
            {t('browse.description') || 'Explore beautiful memories from weddings, celebrations and unforgettable events.'}
          </p>
        </div>

        {/* Search & Event Type Dropdown Toolbar */}
        <div className="max-w-3xl mx-auto mb-10 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Debounced Search Bar */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#77736B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('browse.searchPlaceholder') || 'Search by couple, event, location or album...'}
                className="w-full pl-11 pr-10 py-3 bg-[#FCFBF8] border border-[#E8E0D0] focus:border-[#C8A96B] focus:ring-1 focus:ring-[#C8A96B] rounded-xs text-xs sm:text-sm text-[#171717] placeholder-[#A8A49C] shadow-2xs outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A8A49C] hover:text-[#171717] p-1 cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Event Type Dropdown Filter */}
            <div className="relative sm:w-56">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#77736B]">
                <Filter className="w-3.5 h-3.5 text-[#C8A96B]" />
              </div>
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="w-full appearance-none pl-9 pr-9 py-3 bg-[#FCFBF8] border border-[#E8E0D0] focus:border-[#C8A96B] focus:ring-1 focus:ring-[#C8A96B] rounded-xs text-xs sm:text-sm text-[#171717] shadow-2xs outline-none cursor-pointer transition-all font-light"
              >
                {eventTypeOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#77736B]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Quick Filter Chips (for rapid tactile filtering) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 px-0.5 scrollbar-none">
            {eventTypeOptions.slice(0, 6).map((opt) => {
              const active = selectedEventType === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedEventType(opt.id)}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] tracking-wider uppercase whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    active
                      ? 'bg-[#171717] text-[#F8F6F0] font-medium shadow-xs border border-[#171717]'
                      : 'bg-[#FCFBF8] text-[#77736B] hover:text-[#171717] border border-[#E8E0D0] hover:border-[#C8A96B]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Counter & Active Filters Display */}
        {!isLoading && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-[#E8E0D0]/60 gap-2 text-xs text-[#77736B] tracking-wider uppercase">
            <span>
              {t('browse.resultsCount', { count: albums.length }) || `Found ${albums.length} public collections`}
            </span>
            {(debouncedSearch || selectedEventType !== 'all') && (
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 text-[11px] text-[#C8A96B] hover:text-[#8C6D2C] uppercase tracking-wider cursor-pointer font-medium transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{t('browse.clearFilters') || 'Clear Filters'}</span>
              </button>
            )}
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs p-4 animate-pulse space-y-4"
              >
                <div className="aspect-4/3 bg-[#EFECE4] rounded-xs" />
                <div className="h-5 bg-[#EFECE4] rounded-xs w-3/4" />
                <div className="h-4 bg-[#EFECE4] rounded-xs w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Album Grid */}
        {!isLoading && albums.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onOpen={onOpenAlbumSlug}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && albums.length === 0 && (
          <div className="text-center py-16 bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs p-8 max-w-md mx-auto shadow-xs">
            <Filter className="w-8 h-8 text-[#C8A96B] mx-auto mb-3 opacity-60" />
            <h3
              className="font-serif text-xl sm:text-2xl text-[#171717] mb-2 font-normal"
              style={{ fontFamily: "'Cormorant Garamond', 'Noto Serif Ethiopic', Georgia, serif" }}
            >
              {t('browse.noResults') || t('browse.noAlbums') || 'No albums found.'}
            </h3>
            <p className="text-xs sm:text-sm text-[#77736B] font-light mb-6">
              {t('browse.noResultsDescription') || 'Try a different search or event type.'}
            </p>
            <button
              onClick={handleClearFilters}
              className="px-5 py-2.5 bg-[#171717] text-[#F8F6F0] text-xs uppercase tracking-widest rounded-xs hover:bg-[#2A2826] transition-colors cursor-pointer border border-[#171717] shadow-xs"
            >
              {t('browse.clearFilters') || 'Clear Filters'}
            </button>
          </div>
        )}
      </main>

      <PublicFooter
        onAdminTrigger={onAdminTrigger}
        onNavigate={onNavigate}
      />
    </div>
  );
};
