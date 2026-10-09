import React from 'react';
import { Menu, Plus, ExternalLink } from 'lucide-react';
import { Button } from '../common/Button';
import { AdminGlobalSearchBar } from './AdminGlobalSearchBar';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  onOpenMobileSidebar: () => void;
  onCreateAlbum?: () => void;
  onPreviewSite?: () => void;
  onNavigateToTab?: (tab: string, options?: { albumId?: string; mediaId?: string; settingSection?: string }) => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  subtitle,
  onOpenMobileSidebar,
  onCreateAlbum,
  onPreviewSite,
  onNavigateToTab,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#F8F6F0]/95 backdrop-blur-md border-b border-[#E8E0D0] px-3 sm:px-8 py-3 sm:py-3.5 flex flex-wrap md:flex-nowrap items-center justify-between gap-3">
      {/* Title & Mobile Toggle */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 text-[#171717] hover:bg-[#EFECE4] rounded-xs cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1
            className="font-serif text-lg sm:text-2xl text-[#171717] font-normal tracking-wide truncate"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-[#77736B] font-light hidden lg:block truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Global Search Bar (Responsive in center/right) */}
      {onNavigateToTab && (
        <div className="order-3 md:order-2 w-full md:w-auto md:flex-1 md:max-w-md lg:max-w-lg md:mx-4">
          <AdminGlobalSearchBar onNavigateToTab={onNavigateToTab} />
        </div>
      )}

      {/* Action Buttons */}
      <div className="order-2 md:order-3 flex items-center gap-2 sm:gap-3 shrink-0 ml-auto md:ml-0">
        {onPreviewSite && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPreviewSite}
            leftIcon={<ExternalLink className="w-3.5 h-3.5 text-[#C8A96B]" />}
            className="hidden sm:inline-flex"
          >
            Live Site
          </Button>
        )}

        {onCreateAlbum && (
          <Button
            variant="gold"
            size="sm"
            onClick={onCreateAlbum}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            <span className="hidden sm:inline">New Album</span>
            <span className="sm:hidden">New</span>
          </Button>
        )}
      </div>
    </header>
  );
};
