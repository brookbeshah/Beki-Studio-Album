import React from 'react';
import { AuraLogo } from '../common/AuraLogo';
import { Button } from '../common/Button';

interface NotFoundProps {
  onGoHome: () => void;
  onAdminTrigger?: () => void;
}

export const NotFound: React.FC<NotFoundProps> = ({ onGoHome, onAdminTrigger }) => {
  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col justify-between items-center text-center px-4 py-12">
      <div className="w-full flex justify-center pt-4">
        <AuraLogo size="sm" showWordmark={true} onAdminTrigger={onAdminTrigger} />
      </div>

      <div className="max-w-md mx-auto my-auto py-12">
        <span className="text-xs uppercase tracking-[0.3em] text-[#C8A96B] font-medium block mb-4">
          Collection Not Found
        </span>

        <h1
          className="font-serif text-3xl sm:text-5xl text-[#171717] font-normal tracking-wide mb-4"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          We couldn't find this album.
        </h1>

        <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#C8A96B] to-transparent mx-auto mb-6" />

        <p className="text-sm sm:text-base text-[#77736B] font-light leading-relaxed mb-8">
          Please check the QR code or album link and try again. The collection may be private,
          unpublished, or moved.
        </p>

        <Button variant="primary" onClick={onGoHome} size="md">
          Return to Beki's Studio
        </Button>
      </div>

      <div className="pb-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#77736B]">
          Beki's Studio &bull; Memories, beautifully preserved
        </p>
      </div>
    </div>
  );
};
