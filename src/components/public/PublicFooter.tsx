import React from 'react';
import { AuraLogo } from '../common/AuraLogo';
import { useI18n } from '../../context/LanguageContext';

interface PublicFooterProps {
  onAdminTrigger?: () => void;
  onNavigate?: (path: string) => void;
  customFooter?: string;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({
  onAdminTrigger,
  onNavigate,
  customFooter,
}) => {
  const { t } = useI18n();

  return (
    <footer className="w-full bg-[#FCFBF8] border-t border-[#E8E0D0] py-16 px-4 mt-20">
      <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
        {/* Understated Beki's Studio branding with hidden 5-click admin entry */}
        <AuraLogo
          size="md"
          stacked={true}
          showWordmark={true}
          onAdminTrigger={onAdminTrigger}
          className="mb-4"
        />

        <p
          className="font-serif italic text-base sm:text-lg text-[#77736B] tracking-wide max-w-md mb-6"
          style={{ fontFamily: "'Cormorant Garamond', 'Noto Serif Ethiopic', Georgia, serif" }}
        >
          {customFooter || t('footer.tagline') || 'Memories, beautifully preserved.'}
        </p>

        {/* Minimal fine gold divider */}
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#C8A96B] to-transparent mb-8" />

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#77736B] tracking-wider uppercase">
          {onNavigate && (
            <>
              <button
                onClick={() => onNavigate('/')}
                className="hover:text-[#171717] transition-colors cursor-pointer"
              >
                {t('common.appName') || "Beki's Studio"}
              </button>
              <span className="text-[#DCCB9A]">•</span>
              <button
                onClick={() => onNavigate('/albums')}
                className="hover:text-[#171717] transition-colors cursor-pointer"
              >
                {t('common.browseAlbums') || 'Browse Albums'}
              </button>
              <span className="text-[#DCCB9A]">•</span>
              <button
                onClick={() => onNavigate('/privacy')}
                className="hover:text-[#171717] transition-colors cursor-pointer"
              >
                {t('common.privacy') || 'Privacy'}
              </button>
              <span className="text-[#DCCB9A]">•</span>
              <button
                onClick={() => onNavigate('/terms')}
                className="hover:text-[#171717] transition-colors cursor-pointer"
              >
                {t('common.terms') || 'Terms'}
              </button>
            </>
          )}
        </div>

        <p className="text-[11px] text-[#A8A49C] mt-8 tracking-widest uppercase">
          &copy; {new Date().getFullYear()} {t('common.appName') || "BEKI'S STUDIO"}. {t('footer.rights') || 'ALL RIGHTS RESERVED.'}
        </p>
      </div>
    </footer>
  );
};
