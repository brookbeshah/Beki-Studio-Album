import React from 'react';
import { PublicHeader } from '../components/public/PublicHeader';
import { PublicFooter } from '../components/public/PublicFooter';
import { Button } from '../components/common/Button';
import { ArrowLeft } from 'lucide-react';

interface LegalPageProps {
  type: 'privacy' | 'terms';
  onGoHome: () => void;
  onAdminTrigger?: () => void;
  onNavigate?: (path: string) => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({
  type,
  onGoHome,
  onAdminTrigger,
  onNavigate,
}) => {
  const isPrivacy = type === 'privacy';

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col justify-between">
      <PublicHeader onAdminTrigger={onAdminTrigger} allowShare={false} />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <button
          onClick={onGoHome}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#77736B] hover:text-[#171717] mb-8 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return Home</span>
        </button>

        <span className="text-[11px] uppercase tracking-[0.3em] text-[#C8A96B] font-semibold block mb-2">
          Beki's Studio Legal
        </span>

        <h1
          className="font-serif text-3xl sm:text-5xl text-[#171717] font-normal tracking-wide mb-6"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
        </h1>

        <div className="w-16 h-px bg-gradient-to-r from-[#C8A96B] to-transparent mb-8" />

        <div className="prose prose-stone text-xs sm:text-sm text-[#77736B] leading-relaxed space-y-6 font-light">
          {isPrivacy ? (
            <>
              <p>
                Beki's Studio ("we", "us", or "our") respects the privacy of our clients and event guests.
                This Privacy Policy outlines how your event memories and visual data are safeguarded.
              </p>
              <h3 className="font-serif text-lg text-[#171717] font-normal">Guest Access & Privacy</h3>
              <p>
                Guests scanning physical event QR cards are granted direct, read-only access to published albums.
                We do not require guest account registration, password creation, or personal email collection for viewing event galleries.
              </p>
              <h3 className="font-serif text-lg text-[#171717] font-normal">Unlisted Collections</h3>
              <p>
                Weddings and private celebrations are designated as Unlisted by default, ensuring they are not indexed by public search engines or listed in public catalogs.
              </p>
              <h3 className="font-serif text-lg text-[#171717] font-normal">Contact Information</h3>
              <p>
                For inquiries regarding image rights or memory removal, contact support@bekisstudio.com.
              </p>
            </>
          ) : (
            <>
              <p>
                Welcome to Beki's Studio. By accessing our platform or viewing memory collections, you agree to these Terms of Service.
              </p>
              <h3 className="font-serif text-lg text-[#171717] font-normal">Intellectual Property & Media Ownership</h3>
              <p>
                Photographs and videos hosted on Beki's Studio remain the intellectual property of the respective couples and clients.
              </p>
              <h3 className="font-serif text-lg text-[#171717] font-normal">Permitted Usage</h3>
              <p>
                Guests may view and, where enabled by the album administrator, download personal commemorative copies of event memories for non-commercial personal use.
              </p>
              <h3 className="font-serif text-lg text-[#171717] font-normal">Platform Integrity</h3>
              <p>
                Unauthorized automated scraping, reverse engineering, or disruption of Beki's Studio infrastructure is strictly prohibited.
              </p>
            </>
          )}
        </div>
      </main>

      <PublicFooter onAdminTrigger={onAdminTrigger} onNavigate={onNavigate} />
    </div>
  );
};
