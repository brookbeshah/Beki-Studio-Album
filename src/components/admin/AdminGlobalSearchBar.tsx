import React, { useState, useEffect, useRef, useId } from 'react';
import {
  Search,
  X,
  Loader2,
  Images,
  Image as ImageIcon,
  Film,
  Settings as SettingsIcon,
  Sliders,
  ChevronRight,
  ExternalLink,
  Command,
} from 'lucide-react';
import { searchAdminEverything, AdminSearchResultItem } from '../../services/adminSearchService';

interface AdminGlobalSearchBarProps {
  onNavigateToTab: (tab: string, options?: { albumId?: string; mediaId?: string; settingSection?: string }) => void;
  className?: string;
}

export const AdminGlobalSearchBar: React.FC<AdminGlobalSearchBarProps> = ({
  onNavigateToTab,
  className = '',
}) => {
  const [queryText, setQueryText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    albums: AdminSearchResultItem[];
    media: AdminSearchResultItem[];
    settings: AdminSearchResultItem[];
  }>({ albums: [], media: [], settings: [] });

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  // Combine items for keyboard navigation
  const allItems: AdminSearchResultItem[] = [
    ...results.albums,
    ...results.media,
    ...results.settings,
  ];

  // Shortcut key: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!queryText.trim()) {
      setResults({ albums: [], media: [], settings: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await searchAdminEverything(queryText);
        setResults(res);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => clearTimeout(timeout);
  }, [queryText]);

  const handleSelect = (item: AdminSearchResultItem) => {
    setIsOpen(false);
    setQueryText('');
    onNavigateToTab(item.action.tab, {
      albumId: item.action.albumId,
      mediaId: item.action.mediaId,
      settingSection: item.action.settingSection,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!isOpen || allItems.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        handleSelect(allItems[selectedIndex]);
      }
    }
  };

  const hasAnyResults =
    results.albums.length > 0 || results.media.length > 0 || results.settings.length > 0;

  return (
    <div className={`relative ${className}`}>
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <label htmlFor={inputId} className="sr-only">
          Search albums, media, and settings
        </label>
        <div className="absolute left-3 text-[#A8A297] pointer-events-none flex items-center">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#C8A96B]" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        <input
          id={inputId}
          ref={inputRef}
          type="text"
          value={queryText}
          onChange={(e) => {
            setQueryText(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search albums, media, settings... (⌘K)"
          className="w-full pl-9 pr-16 py-1.5 sm:py-2 text-xs sm:text-sm bg-white/80 hover:bg-white focus:bg-white border border-[#E8E0D0] focus:border-[#C8A96B] rounded-xs shadow-xs focus:outline-hidden transition-all text-[#171717] placeholder-[#A8A297]"
        />

        <div className="absolute right-2 flex items-center gap-1">
          {queryText ? (
            <button
              type="button"
              onClick={() => {
                setQueryText('');
                setResults({ albums: [], media: [], settings: [] });
                inputRef.current?.focus();
              }}
              className="p-1 text-[#A8A297] hover:text-[#171717] cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-[#A8A297] bg-[#F4F1EA] border border-[#E8E0D0] rounded-xs">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown Results Palette */}
      {isOpen && queryText.trim().length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full mt-1.5 max-h-[460px] overflow-y-auto bg-white border border-[#E8E0D0] shadow-xl rounded-xs z-50 divide-y divide-[#F4F1EA]"
          style={{ minWidth: '320px' }}
        >
          {isLoading && allItems.length === 0 ? (
            <div className="p-6 text-center text-[#77736B] text-xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#C8A96B]" />
              Searching studio library...
            </div>
          ) : !hasAnyResults ? (
            <div className="p-6 text-center text-[#77736B] text-xs">
              No albums, media, or settings matching &quot;<span className="text-[#171717] font-medium">{queryText}</span>&quot;
            </div>
          ) : (
            <>
              {/* ALBUMS SECTION */}
              {results.albums.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#999285] flex items-center gap-1.5">
                    <Images className="w-3 h-3 text-[#C8A96B]" />
                    Albums ({results.albums.length})
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {results.albums.map((item) => {
                      const itemGlobalIdx = allItems.findIndex((x) => x.id === item.id);
                      const isSelected = itemGlobalIdx === selectedIndex;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIndex(itemGlobalIdx)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xs cursor-pointer text-xs transition-colors ${
                            isSelected ? 'bg-[#F9F7F2] text-[#171717]' : 'text-[#444] hover:bg-[#FAF8F5]'
                          }`}
                        >
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt=""
                              className="w-8 h-8 rounded-xs object-cover border border-[#E8E0D0] shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-xs bg-[#F4F1EA] flex items-center justify-center text-[#A8A297] shrink-0">
                              <Images className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-[#171717] truncate">{item.title}</div>
                            <div className="text-[11px] text-[#888] truncate">{item.subtitle}</div>
                          </div>
                          {item.badge && (
                            <span className="text-[9px] px-1.5 py-0.5 border border-[#E8E0D0] rounded-xs font-mono uppercase bg-white text-[#666]">
                              {item.badge}
                            </span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-[#C8A96B] shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MEDIA SECTION */}
              {results.media.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#999285] flex items-center gap-1.5">
                    <ImageIcon className="w-3 h-3 text-[#C8A96B]" />
                    Media Items ({results.media.length})
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {results.media.map((item) => {
                      const itemGlobalIdx = allItems.findIndex((x) => x.id === item.id);
                      const isSelected = itemGlobalIdx === selectedIndex;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIndex(itemGlobalIdx)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xs cursor-pointer text-xs transition-colors ${
                            isSelected ? 'bg-[#F9F7F2] text-[#171717]' : 'text-[#444] hover:bg-[#FAF8F5]'
                          }`}
                        >
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt=""
                              className="w-8 h-8 rounded-xs object-cover border border-[#E8E0D0] shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-xs bg-[#F4F1EA] flex items-center justify-center text-[#A8A297] shrink-0">
                              <Film className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-[#171717] truncate">{item.title}</div>
                            <div className="text-[11px] text-[#888] truncate">{item.subtitle}</div>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 border border-[#E8E0D0] rounded-xs font-mono uppercase bg-white text-[#666]">
                            {item.badge}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#C8A96B] shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SETTINGS SECTION */}
              {results.settings.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#999285] flex items-center gap-1.5">
                    <Sliders className="w-3 h-3 text-[#C8A96B]" />
                    Settings &amp; Tools ({results.settings.length})
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {results.settings.map((item) => {
                      const itemGlobalIdx = allItems.findIndex((x) => x.id === item.id);
                      const isSelected = itemGlobalIdx === selectedIndex;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIndex(itemGlobalIdx)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xs cursor-pointer text-xs transition-colors ${
                            isSelected ? 'bg-[#F9F7F2] text-[#171717]' : 'text-[#444] hover:bg-[#FAF8F5]'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-xs bg-[#F4F1EA] border border-[#E8E0D0] flex items-center justify-center text-[#C8A96B] shrink-0">
                            <SettingsIcon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-[#171717] truncate">{item.title}</div>
                            <div className="text-[11px] text-[#888] truncate">{item.subtitle}</div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-[#C8A96B] shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer hint */}
              <div className="p-2 bg-[#FBF9F5] text-[10px] text-[#999285] flex items-center justify-between">
                <span>Navigate with <kbd className="font-mono bg-white px-1 border border-[#E8E0D0] rounded-xs">↑</kbd> <kbd className="font-mono bg-white px-1 border border-[#E8E0D0] rounded-xs">↓</kbd></span>
                <span>Press <kbd className="font-mono bg-white px-1 border border-[#E8E0D0] rounded-xs">↵ Enter</kbd> to open</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
