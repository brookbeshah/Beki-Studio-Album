import React from 'react';
import { AuraLogo } from '../common/AuraLogo';
import { LanguageSelector } from '../common/LanguageSelector';
import { Share2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../context/LanguageContext';

interface PublicHeaderProps {
  onAdminTrigger?: () => void;
  albumTitle?: string;
  allowShare?: boolean;
  onNavigate?: (path: string) => void;
  currentPath?: string;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  onAdminTrigger,
  albumTitle,
  allowShare = false,
  onNavigate,
  currentPath = '/',
}) => {
  const { success } = useToast();
  const { t } = useI18n();

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: albumTitle ? `${albumTitle} | Beki's Studio` : "Beki's Studio",
          text: `Relive the memories with Beki's Studio`,
          url,
        });
      } catch {
        await copyToClipboard(url);
      }
    } else {
      await copyToClipboard(url);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      success(t('album.shareSuccess'));
    } catch {
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      success(t('album.shareSuccess'));
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#F8F6F0]/90 border-b border-[#E8E0D0]/70 transition-all duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand Emblem with 5-click hidden admin access */}
        <div className="flex items-center">
          <AuraLogo
            size="sm"
            stacked={false}
            showWordmark={true}
            onAdminTrigger={onAdminTrigger}
          />
        </div>

        {/* Minimal Navigation Links (Desktop) */}
        {onNavigate && (
          <nav className="hidden md:flex items-center gap-8 text-xs tracking-widest uppercase font-medium">
            <button
              onClick={() => onNavigate('/')}
              className={`transition-colors cursor-pointer ${
                currentPath === '/'
                  ? 'text-[#171717] font-semibold border-b-2 border-[#C8A96B] pb-0.5'
                  : 'text-[#77736B] hover:text-[#171717]'
              }`}
            >
              {t('nav.home')}
            </button>
            <button
              onClick={() => onNavigate('/albums')}
              className={`transition-colors cursor-pointer ${
                currentPath === '/albums'
                  ? 'text-[#171717] font-semibold border-b-2 border-[#C8A96B] pb-0.5'
                  : 'text-[#77736B] hover:text-[#171717]'
              }`}
            >
              {t('nav.browse')}
            </button>
            <button
              onClick={() => {
                if (currentPath !== '/') {
                  onNavigate('/');
                  setTimeout(() => {
                    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                  }, 150);
                } else {
                  document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="text-[#77736B] hover:text-[#171717] transition-colors cursor-pointer"
            >
              {t('nav.about')}
            </button>
          </nav>
        )}

        {/* Header Right Actions: Language Selector + Share */}
        <div className="flex items-center gap-3">
          <LanguageSelector compact={false} />

          {allowShare && (
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs text-xs uppercase tracking-wider text-[#77736B] hover:text-[#171717] hover:bg-[#EFECE4] transition-colors cursor-pointer border border-[#E8E0D0]"
              aria-label={t('album.share')}
            >
              <Share2 className="w-3.5 h-3.5 text-[#C8A96B]" />
              <span className="hidden sm:inline">{t('album.share')}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
