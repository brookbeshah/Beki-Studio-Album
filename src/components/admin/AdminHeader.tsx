import React from 'react';
import { Menu, Plus, ExternalLink } from 'lucide-react';
import { Button } from '../common/Button';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  onOpenMobileSidebar: () => void;
  onCreateAlbum?: () => void;
  onPreviewSite?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  subtitle,
  onOpenMobileSidebar,
  onCreateAlbum,
  onPreviewSite,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#F8F6F0]/90 backdrop-blur-md border-b border-[#E8E0D0] px-4 sm:px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger */}
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 text-[#171717] hover:bg-[#EFECE4] rounded-xs cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1
            className="font-serif text-xl sm:text-2xl text-[#171717] font-normal tracking-wide"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-[#77736B] font-light hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
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
