import React, { useState, useEffect, useRef } from 'react';
import { StudioContentService, StudioContentData } from '../services/studioContentService';
import { useAutoSlider } from '../hooks/useAutoSlider';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import {
  Sparkles,
  Upload,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Palette,
  Image as ImageIcon,
  Save,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export const AdminStudioContent: React.FC = () => {
  const { user, adminProfile } = useAuth();
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<'hero' | 'gallery' | 'branding'>('hero');
  const [content, setContent] = useState<StudioContentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // Uploading state
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [isUploadingBrowse, setIsUploadingBrowse] = useState(false);
  const [replacingHeroIdx, setReplacingHeroIdx] = useState<number | null>(null);
  const [replacingBrowseIdx, setReplacingBrowseIdx] = useState<number | null>(null);

  // Direct URL Input state
  const [heroUrlInput, setHeroUrlInput] = useState('');
  const [browseUrlInput, setBrowseUrlInput] = useState('');

  // Branding inputs
  const [brandingForm, setBrandingForm] = useState({
    heroHeadline: '',
    heroSubtitle: '',
    heroBadge: '',
    studioName: '',
  });

  const heroFileInputRef = useRef<HTMLInputElement | null>(null);
  const browseFileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceHeroFileRef = useRef<HTMLInputElement | null>(null);
  const replaceBrowseFileRef = useRef<HTMLInputElement | null>(null);

  // Load content & subscribe to live changes
  useEffect(() => {
    setIsLoading(true);
    StudioContentService.getStudioContent()
      .then((data) => {
        setContent(data);
        setBrandingForm({
          heroHeadline: data.branding.heroHeadline,
          heroSubtitle: data.branding.heroSubtitle,
          heroBadge: data.branding.heroBadge,
          studioName: data.branding.studioName,
        });
      })
      .finally(() => setIsLoading(false));

    const unsubscribe = StudioContentService.subscribeStudioContent((data) => {
      setContent(data);
      setBrandingForm({
        heroHeadline: data.branding.heroHeadline,
        heroSubtitle: data.branding.heroSubtitle,
        heroBadge: data.branding.heroBadge,
        studioName: data.branding.studioName,
      });
    });

    return () => unsubscribe();
  }, []);

  const heroImages = content?.heroImages || [];
  const browsePhotos = content?.browsePhotos || [];

  // Live Auto-Slider previews
  const heroSlider = useAutoSlider({
    totalSlides: heroImages.length,
    intervalMs: 4000,
  });

  const browseSlider = useAutoSlider({
    totalSlides: browsePhotos.length,
    intervalMs: 3500,
  });

  // ----------------------------------------------------------------
  // HERO IMAGE ACTIONS (Simple: No description required)
  // ----------------------------------------------------------------
  const handleUploadHeroFile = async (file: File) => {
    setIsUploadingHero(true);
    try {
      const url = await StudioContentService.uploadAsset(file);
      await StudioContentService.addHeroImage(url);
      success('Hero image uploaded and live on Welcome Page!');
    } catch (err: any) {
      error(err.message || 'Failed to upload hero image');
    } finally {
      setIsUploadingHero(false);
    }
  };

  const handleAddHeroUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroUrlInput.trim()) return;
    try {
      await StudioContentService.addHeroImage(heroUrlInput.trim());
      setHeroUrlInput('');
      success('Hero image added and live on Welcome Page!');
    } catch (err: any) {
      error(err.message || 'Failed to add image');
    }
  };

  const handleReplaceHeroFile = async (index: number, file: File) => {
    try {
      const url = await StudioContentService.uploadAsset(file);
      await StudioContentService.updateHeroImage(index, url);
      success(`Hero image #${index + 1} updated!`);
    } catch (err: any) {
      error(err.message || 'Failed to replace image');
    } finally {
      setReplacingHeroIdx(null);
    }
  };

  const handleDeleteHero = async (index: number) => {
    if (heroImages.length <= 1) {
      error('Please keep at least one hero image for the welcome page.');
      return;
    }
    try {
      await StudioContentService.removeHeroImage(index);
      success('Hero image removed.');
    } catch (err: any) {
      error('Failed to remove image');
    }
  };

  const handleMoveHero = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= heroImages.length) return;
    const reordered = [...heroImages];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;
    try {
      await StudioContentService.reorderHeroImages(reordered);
      success('Hero image order updated.');
    } catch {
      error('Failed to reorder');
    }
  };

  // ----------------------------------------------------------------
  // BROWSE PHOTO ACTIONS (Simple: No description required)
  // ----------------------------------------------------------------
  const handleUploadBrowseFile = async (file: File) => {
    setIsUploadingBrowse(true);
    try {
      const url = await StudioContentService.uploadAsset(file);
      await StudioContentService.addBrowsePhoto(url);
      success('Browse photo uploaded and added to the welcome page sliding carousel!');
    } catch (err: any) {
      error(err.message || 'Failed to upload photo');
    } finally {
      setIsUploadingBrowse(false);
    }
  };

  const handleAddBrowseUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!browseUrlInput.trim()) return;
    try {
      await StudioContentService.addBrowsePhoto(browseUrlInput.trim());
      setBrowseUrlInput('');
      success('Browse photo added and live in carousel!');
    } catch (err: any) {
      error(err.message || 'Failed to add photo');
    }
  };

  const handleReplaceBrowseFile = async (index: number, file: File) => {
    try {
      const url = await StudioContentService.uploadAsset(file);
      await StudioContentService.updateBrowsePhoto(index, url);
      success(`Browse photo #${index + 1} updated!`);
    } catch (err: any) {
      error(err.message || 'Failed to replace photo');
    } finally {
      setReplacingBrowseIdx(null);
    }
  };

  const handleDeleteBrowse = async (index: number) => {
    if (browsePhotos.length <= 1) {
      error('Please keep at least one photograph in the browse showcase.');
      return;
    }
    try {
      await StudioContentService.removeBrowsePhoto(index);
      success('Browse photograph removed.');
    } catch {
      error('Failed to remove photo');
    }
  };

  // ----------------------------------------------------------------
  // BRANDING ACTIONS
  // ----------------------------------------------------------------
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBranding(true);
    try {
      await StudioContentService.updateBranding(brandingForm);
      success('Welcome page headlines and branding updated!');
    } catch {
      error('Failed to save branding');
    } finally {
      setIsSavingBranding(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-[#E8E0D0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.3em] text-[#C8A96B] font-medium">
            Welcome Page Image CMS
          </span>
          <h2
            className="font-serif text-3xl sm:text-4xl text-[#171717] font-normal tracking-wide mt-0.5"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Homepage Assets &amp; Browse Gallery CMS
          </h2>
          <p className="text-xs text-[#77736B] font-light mt-1">
            Direct image control for the welcome page. Simply upload photos &mdash; no descriptions required. Changes appear on the live site instantly.
          </p>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-[#E8E0D0] bg-[#FCFBF8] text-xs text-[#171717] hover:border-[#C8A96B] transition-colors"
        >
          <span>View Live Welcome Page</span>
          <ExternalLink className="w-3.5 h-3.5 text-[#C8A96B]" />
        </a>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8E0D0] pb-px">
        <button
          onClick={() => setActiveTab('hero')}
          className={`px-4 py-2.5 text-xs uppercase tracking-wider font-medium transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'hero'
              ? 'border-[#C8A96B] text-[#171717] bg-[#FCFBF8]'
              : 'border-transparent text-[#77736B] hover:text-[#171717]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#C8A96B]" />
          <span>Hero Slider Images ({heroImages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('gallery')}
          className={`px-4 py-2.5 text-xs uppercase tracking-wider font-medium transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'gallery'
              ? 'border-[#C8A96B] text-[#171717] bg-[#FCFBF8]'
              : 'border-transparent text-[#77736B] hover:text-[#171717]'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 text-[#C8A96B]" />
          <span>Browse Photos Carousel ({browsePhotos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2.5 text-xs uppercase tracking-wider font-medium transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'branding'
              ? 'border-[#C8A96B] text-[#171717] bg-[#FCFBF8]'
              : 'border-transparent text-[#77736B] hover:text-[#171717]'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-[#C8A96B]" />
          <span>Headlines &amp; Brand Copy</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HERO SLIDER IMAGES */}
      {/* ========================================================================= */}
      {activeTab === 'hero' && (
        <div className="space-y-8">
          {/* Live Automatic Slider Preview */}
          <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-6 rounded-xs space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E0D0]">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#C8A96B] font-semibold">
                  Live Viewport Preview
                </span>
                <h3 className="font-serif text-xl text-[#171717] font-normal">
                  Automatic Sliding Hero Animation
                </h3>
              </div>

              <button
                onClick={heroSlider.togglePlay}
                className="px-2.5 py-1 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs text-[#171717] hover:border-[#C8A96B] flex items-center gap-1.5 cursor-pointer"
              >
                {heroSlider.isPlaying ? (
                  <>
                    <Pause className="w-3 h-3 text-[#C8A96B]" /> Pause Auto-Slide
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 text-emerald-600" /> Resume Auto-Slide
                  </>
                )}
              </button>
            </div>

            {/* Slider Showcase Box */}
            {heroImages.length > 0 ? (
              <div
                className="relative aspect-21/9 rounded-xs overflow-hidden border border-[#E8E0D0] bg-[#171717] shadow-sm select-none"
                {...heroSlider.handlers}
              >
                {heroImages.map((src, idx) => (
                  <div
                    key={idx}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                      idx === heroSlider.currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                    }`}
                  >
                    <img
                      src={src}
                      alt={`Hero Slide ${idx + 1}`}
                      className="w-full h-full object-cover object-center filter brightness-[0.88]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-6 text-white font-mono text-xs">
                      Slide {idx + 1} of {heroImages.length}
                    </div>
                  </div>
                ))}

                {/* Navigation arrows */}
                <button
                  onClick={heroSlider.prevSlide}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={heroSlider.nextSlide}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Dot Indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-y-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                  {heroImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => heroSlider.goToSlide(i)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        i === heroSlider.currentIndex ? 'w-6 bg-[#C8A96B]' : 'w-1.5 bg-white/50 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Upload & Management Toolbar */}
          <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-6 rounded-xs space-y-4">
            <h3 className="font-serif text-xl text-[#171717] font-normal">
              Upload New Hero Slide
            </h3>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Hidden file input */}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={heroFileInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    handleUploadHeroFile(f);
                    e.target.value = '';
                  }
                }}
              />

              <Button
                variant="gold"
                size="md"
                onClick={() => heroFileInputRef.current?.click()}
                isLoading={isUploadingHero}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                {isUploadingHero ? 'Uploading...' : 'Upload Image from Computer'}
              </Button>

              <span className="text-xs text-[#77736B] text-center sm:text-left">or add via URL:</span>

              <form onSubmit={handleAddHeroUrl} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={heroUrlInput}
                  onChange={(e) => setHeroUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 px-3 py-2 bg-white border border-[#E8E0D0] rounded-xs text-xs font-mono text-[#171717] focus:border-[#C8A96B] outline-none"
                />
                <Button variant="outline" size="sm" type="submit">
                  Add URL
                </Button>
              </form>
            </div>
          </div>

          {/* Current Hero Images Grid */}
          <div className="space-y-3">
            <h3 className="font-serif text-xl text-[#171717] font-normal">
              Active Hero Images ({heroImages.length})
            </h3>

            {/* Hidden replace file input */}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={replaceHeroFileRef}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && replacingHeroIdx !== null) {
                  handleReplaceHeroFile(replacingHeroIdx, f);
                  e.target.value = '';
                }
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {heroImages.map((src, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-[#E8E0D0] rounded-xs overflow-hidden shadow-2xs group hover:border-[#C8A96B] transition-colors flex flex-col justify-between"
                >
                  <div className="relative aspect-4/3 bg-[#2A2826] overflow-hidden">
                    <img
                      src={src}
                      alt={`Hero ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-mono rounded-2xs">
                      #{idx + 1}
                    </div>
                  </div>

                  <div className="p-3 space-y-2">
                    <p className="text-[10px] font-mono text-[#77736B] truncate">
                      {src.startsWith('/uploads/') ? 'Custom Upload' : src}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E8E0D0]">
                      <button
                        onClick={() => {
                          setReplacingHeroIdx(idx);
                          replaceHeroFileRef.current?.click();
                        }}
                        className="text-[11px] text-[#C8A96B] hover:underline font-medium cursor-pointer"
                      >
                        Replace Image
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMoveHero(idx, 'up')}
                          className="p-1 text-[#77736B] hover:text-[#171717] disabled:opacity-30 cursor-pointer"
                          title="Move left"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === heroImages.length - 1}
                          onClick={() => handleMoveHero(idx, 'down')}
                          className="p-1 text-[#77736B] hover:text-[#171717] disabled:opacity-30 cursor-pointer"
                          title="Move right"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteHero(idx)}
                          className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                          title="Delete slide"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BROWSE PHOTOS CAROUSEL (Simple: Upload & Go) */}
      {/* ========================================================================= */}
      {activeTab === 'gallery' && (
        <div className="space-y-8">
          {/* Live Automatic Slider Preview for Browse Photos */}
          <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-6 rounded-xs space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E0D0]">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#C8A96B] font-semibold">
                  Live Viewport Preview
                </span>
                <h3 className="font-serif text-xl text-[#171717] font-normal">
                  Automatic Sliding Browse Photo Showcase
                </h3>
                <p className="text-xs text-[#77736B] font-light">
                  This multi-card animation loops continuously on the welcome page.
                </p>
              </div>

              <button
                onClick={browseSlider.togglePlay}
                className="px-2.5 py-1 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs text-[#171717] hover:border-[#C8A96B] flex items-center gap-1.5 cursor-pointer"
              >
                {browseSlider.isPlaying ? (
                  <>
                    <Pause className="w-3 h-3 text-[#C8A96B]" /> Pause Auto-Slide
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 text-emerald-600" /> Resume Auto-Slide
                  </>
                )}
              </button>
            </div>

            {/* Slider Showcase Box */}
            {browsePhotos.length > 0 ? (
              <div
                className="relative overflow-hidden p-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs"
                {...browseSlider.handlers}
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((offset) => {
                    const slideIndex = (browseSlider.currentIndex + offset) % browsePhotos.length;
                    const src = browsePhotos[slideIndex];
                    if (!src) return null;

                    return (
                      <div
                        key={slideIndex + offset}
                        className="relative aspect-3/4 rounded-2xs overflow-hidden bg-[#2A2826] border border-[#E8E0D0]"
                      >
                        <img
                          src={src}
                          alt={`Browse ${slideIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mt-3 px-1">
                  <span className="text-[11px] text-[#77736B] font-mono">
                    Photo {browseSlider.currentIndex + 1} of {browsePhotos.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={browseSlider.prevSlide}
                      className="p-1 rounded-xs border border-[#E8E0D0] hover:border-[#C8A96B] bg-white text-[#171717] cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={browseSlider.nextSlide}
                      className="p-1 rounded-xs border border-[#E8E0D0] hover:border-[#C8A96B] bg-white text-[#171717] cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Upload Toolbar */}
          <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-6 rounded-xs space-y-4">
            <h3 className="font-serif text-xl text-[#171717] font-normal">
              Upload New Browse Photograph
            </h3>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={browseFileInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    handleUploadBrowseFile(f);
                    e.target.value = '';
                  }
                }}
              />

              <Button
                variant="gold"
                size="md"
                onClick={() => browseFileInputRef.current?.click()}
                isLoading={isUploadingBrowse}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                {isUploadingBrowse ? 'Uploading...' : 'Upload Photo from Computer'}
              </Button>

              <span className="text-xs text-[#77736B] text-center sm:text-left">or add via URL:</span>

              <form onSubmit={handleAddBrowseUrl} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={browseUrlInput}
                  onChange={(e) => setBrowseUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 bg-white border border-[#E8E0D0] rounded-xs text-xs font-mono text-[#171717] focus:border-[#C8A96B] outline-none"
                />
                <Button variant="outline" size="sm" type="submit">
                  Add URL
                </Button>
              </form>
            </div>
          </div>

          {/* Current Browse Photos Grid */}
          <div className="space-y-3">
            <h3 className="font-serif text-xl text-[#171717] font-normal">
              Active Browse Photos ({browsePhotos.length})
            </h3>

            {/* Hidden replace file input */}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={replaceBrowseFileRef}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && replacingBrowseIdx !== null) {
                  handleReplaceBrowseFile(replacingBrowseIdx, f);
                  e.target.value = '';
                }
              }}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {browsePhotos.map((src, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-[#E8E0D0] rounded-xs overflow-hidden shadow-2xs group hover:border-[#C8A96B] transition-colors flex flex-col justify-between"
                >
                  <div className="relative aspect-3/4 bg-[#2A2826] overflow-hidden">
                    <img
                      src={src}
                      alt={`Browse ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-mono rounded-2xs">
                      #{idx + 1}
                    </div>
                  </div>

                  <div className="p-3 space-y-2">
                    <p className="text-[10px] font-mono text-[#77736B] truncate">
                      {src.startsWith('/uploads/') ? 'Custom Upload' : src}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E8E0D0]">
                      <button
                        onClick={() => {
                          setReplacingBrowseIdx(idx);
                          replaceBrowseFileRef.current?.click();
                        }}
                        className="text-[11px] text-[#C8A96B] hover:underline font-medium cursor-pointer"
                      >
                        Replace
                      </button>

                      <button
                        onClick={() => handleDeleteBrowse(idx)}
                        className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BRANDING & HEADLINES */}
      {/* ========================================================================= */}
      {activeTab === 'branding' && (
        <form
          onSubmit={handleSaveBranding}
          className="bg-[#FCFBF8] border border-[#E8E0D0] p-6 sm:p-8 rounded-xs space-y-6 shadow-xs max-w-3xl"
        >
          <div className="pb-4 border-b border-[#E8E0D0]">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#C8A96B] font-semibold">
              Live Brand Copy
            </span>
            <h3 className="font-serif text-2xl text-[#171717] font-normal">
              Homepage Titles, Badges &amp; Studio Name
            </h3>
            <p className="text-xs text-[#77736B] font-light mt-0.5">
              These typography fields populate the public landing page in real time.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                Studio Brand Name
              </label>
              <input
                type="text"
                value={brandingForm.studioName}
                onChange={(e) => setBrandingForm({ ...brandingForm, studioName: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E8E0D0] rounded-xs text-[#171717] focus:border-[#C8A96B] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                Hero Top Badge Text
              </label>
              <input
                type="text"
                value={brandingForm.heroBadge}
                onChange={(e) => setBrandingForm({ ...brandingForm, heroBadge: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E8E0D0] rounded-xs text-[#171717] focus:border-[#C8A96B] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                Main Hero Headline
              </label>
              <input
                type="text"
                value={brandingForm.heroHeadline}
                onChange={(e) => setBrandingForm({ ...brandingForm, heroHeadline: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E8E0D0] rounded-xs text-[#171717] focus:border-[#C8A96B] outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                Hero Subtitle Paragraph
              </label>
              <textarea
                rows={3}
                value={brandingForm.heroSubtitle}
                onChange={(e) => setBrandingForm({ ...brandingForm, heroSubtitle: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-[#E8E0D0] rounded-xs text-[#171717] focus:border-[#C8A96B] outline-none"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                variant="gold"
                size="sm"
                type="submit"
                isLoading={isSavingBranding}
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                Save Brand Copy
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
