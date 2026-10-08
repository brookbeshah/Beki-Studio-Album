import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Album } from '../../types';
import { Copy, Download, ExternalLink, Check, Sparkles } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { AuraLogo } from '../common/AuraLogo';

interface QRCodeModalProps {
  album: Album | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ album, isOpen, onClose }) => {
  const { success } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [svgDataUrl, setSvgDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'card'>('qr');

  const origin = window.location.origin;
  const albumUrl = album ? `${origin}/a/${album.slug}` : '';

  useEffect(() => {
    if (!isOpen || !album || !albumUrl) return;

    // Generate high-resolution canvas QR for PNG download and display
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        albumUrl,
        {
          width: 512,
          margin: 2,
          color: {
            dark: '#171717',
            light: '#FCFBF8',
          },
          errorCorrectionLevel: 'H',
        },
        (error) => {
          if (error) console.error('QR generation error:', error);
        }
      );
    }

    // Generate SVG string for vector download
    QRCode.toString(
      albumUrl,
      {
        type: 'svg',
        margin: 2,
        color: {
          dark: '#171717',
          light: '#FCFBF8',
        },
        errorCorrectionLevel: 'H',
      },
      (error, svgString) => {
        if (!error && svgString) {
          const blob = new Blob([svgString], { type: 'image/svg+xml' });
          setSvgDataUrl(URL.createObjectURL(blob));
        }
      }
    );
  }, [isOpen, album, albumUrl]);

  if (!album) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(albumUrl);
      setCopied(true);
      success('Album URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      success('Link copied');
    }
  };

  const handleDownloadPNG = () => {
    if (!canvasRef.current) return;
    const pngUrl = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `BEKI_QR_${album.slug.toUpperCase()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    success('QR Code (PNG) downloaded');
  };

  const handleDownloadSVG = () => {
    if (!svgDataUrl) return;
    const a = document.createElement('a');
    a.href = svgDataUrl;
    a.download = `BEKI_QR_${album.slug.toUpperCase()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    success('QR Code (SVG) downloaded');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${album.title}`}
      subtitle="Permanent Scannable QR Code & Guest Experience Card"
      maxWidth="xl"
    >
      <div className="flex flex-col items-center">
        {/* Toggle between QR Only and Print Card Mockup */}
        <div className="flex items-center gap-2 mb-6 border border-[#E8E0D0] p-1 bg-[#F8F6F0] rounded-xs">
          <button
            onClick={() => setActiveTab('qr')}
            className={`px-4 py-1.5 text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-[#171717] text-[#F8F6F0] font-medium shadow-xs'
                : 'text-[#77736B] hover:text-[#171717]'
            }`}
          >
            Scannable QR
          </button>
          <button
            onClick={() => setActiveTab('card')}
            className={`px-4 py-1.5 text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'card'
                ? 'bg-[#171717] text-[#F8F6F0] font-medium shadow-xs'
                : 'text-[#77736B] hover:text-[#171717]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C8A96B]" />
            Print Card Preview
          </button>
        </div>

        {activeTab === 'qr' ? (
          /* Scannable QR Code View */
          <div className="flex flex-col items-center text-center w-full">
            <div className="p-4 bg-[#FCFBF8] border-2 border-[#DCCB9A]/60 rounded-xs shadow-lg mb-4">
              <canvas
                ref={canvasRef}
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xs"
              />
            </div>

            <p className="text-xs uppercase tracking-[0.25em] text-[#C8A96B] font-medium mb-1">
              PERMANENT DESTINATION URL
            </p>
            <div className="flex items-center gap-2 max-w-full px-3 py-1.5 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs font-mono text-[#171717] mb-6 select-all overflow-x-auto">
              <span>{albumUrl}</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full">
              <Button
                variant="primary"
                size="sm"
                onClick={handleCopyLink}
                leftIcon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copied ? 'Copied' : 'Copy Link'}
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={handleDownloadPNG}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Download PNG (High Res)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSVG}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Download SVG (Vector)
              </Button>
              <a
                href={albumUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-2 text-xs tracking-wider uppercase text-[#77736B] hover:text-[#171717]"
              >
                <span>Test Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ) : (
          /* Physical Luxury Card Mockup (for print) */
          <div className="w-full flex flex-col items-center">
            <div className="w-full max-w-sm bg-[#FCFBF8] border border-[#C8A96B]/50 p-6 sm:p-8 rounded-xs shadow-xl text-center flex flex-col items-center relative overflow-hidden mb-6">
              {/* Gold decorative border insets */}
              <div className="absolute inset-2 border border-[#E8E0D0] pointer-events-none" />

              <AuraLogo size="xs" stacked={true} showWordmark={true} className="mb-4" />

              <h4
                className="font-serif text-2xl sm:text-3xl text-[#171717] font-normal tracking-wide mb-1"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {album.title}
              </h4>
              <p className="text-[10px] tracking-[0.25em] uppercase text-[#C8A96B] font-medium mb-3">
                {album.eventType} &bull; {album.eventDate}
              </p>

              <div className="w-12 h-px bg-[#C8A96B]/60 mb-4" />

              <div className="p-2 bg-[#FCFBF8] border border-[#DCCB9A] rounded-xs shadow-xs mb-4">
                <canvas ref={canvasRef} className="w-36 h-36 object-contain" />
              </div>

              <p
                className="font-serif italic text-sm text-[#77736B] max-w-xs mb-2 leading-relaxed"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                "Thank you for celebrating with us. Scan to relive the memories."
              </p>

              <span className="text-[9px] font-mono tracking-wider text-[#A8A49C] uppercase">
                {albumUrl.replace(/^https?:\/\//, '')}
              </span>
            </div>

            <p className="text-xs text-[#77736B] text-center max-w-sm leading-relaxed mb-4">
              Designed for luxury wedding place cards, reception welcome tables, and physical thank-you stationery.
            </p>

            <div className="flex gap-3">
              <Button variant="gold" size="sm" onClick={handleDownloadPNG} leftIcon={<Download className="w-3.5 h-3.5" />}>
                Export Print Asset
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
