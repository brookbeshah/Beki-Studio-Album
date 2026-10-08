import React, { useState, useEffect, useRef } from 'react';
import {
  HeroSlide,
  HomepageGalleryItem,
  BrandingConfig,
  subscribeHeroSlides,
  subscribeHomepageGallery,
  subscribeBranding,
  addHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
  reorderHeroSlides,
  setHeroSlideActive,
  addGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  reorderGalleryImages,
  setGalleryImageActive,
  updateBranding,
  uploadStudioAsset,
  DEFAULT_BRANDING,
} from '../services/studioContentService';
import { Button } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Upload,
  ExternalLink,
  Save,
  Check,
  Image as ImageIcon,
  Sliders,
  Palette,
  Layers,
  Code,
  Globe,
  Film,
} from 'lucide-react';

interface AdminWebsiteContentProps {
  onPreviewSite: () => void;
}

export const AdminWebsiteContent: React.FC<AdminWebsiteContentProps> = ({
  onPreviewSite,
}) => {
  const { user, adminProfile, isSuperAdmin } = useAuth();
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<'hero' | 'gallery' | 'branding'>('hero');

  // Hero slides state
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [showAddSlide, setShowAddSlide] = useState(false);
  const [slideFile, setSlideFile] = useState<File | null>(null);
  const [slideHeadline, setSlideHeadline] = useState('');
  const [slideSubtitle, setSlideSubtitle] = useState('');
  const [slideCtaLabel, setSlideCtaLabel] = useState('Browse Albums');
  const [slideCtaLink, setSlideCtaLink] = useState('/albums');
  const [slideAltText, setSlideAltText] = useState('');
  const [isUploadingSlide, setIsUploadingSlide] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState<HeroSlide | null>(null);

  // Gallery state
  const [galleryItems, setGalleryItems] = useState<HomepageGalleryItem[]>([]);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [galleryUploadProgress, setGalleryUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<HomepageGalleryItem | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Branding state
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // Subscriptions on mount
  useEffect(() => {
    const unsubHero = subscribeHeroSlides((slides) => {
      setHeroSlides(slides);
    }, false);

    const unsubGallery = subscribeHomepageGallery((items) => {
      setGalleryItems(items);
    }, false);

    const unsubBranding = subscribeBranding((b) => {
      setBranding(b);
    });

    return () => {
      unsubHero();
      unsubGallery();
      unsubBranding();
    };
  }, []);

  const actor = {
    id: user?.uid || 'admin',
    name: adminProfile?.name || 'Administrator',
    email: adminProfile?.email || 'admin@bekisstudio.com',
  };

  // ----------------------------------------------------
  // HERO SLIDE HANDLERS
  // ----------------------------------------------------

  const handleCreateHeroSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slideFile) {
      error('Please select an image file for the hero slide');
      return;
    }

    setIsUploadingSlide(true);
    try {
      const downloadUrl = await uploadStudioAsset(slideFile, 'hero');
      await addHeroSlide(
        {
          storagePath: downloadUrl,
          downloadUrl,
          headline: slideHeadline.trim() || undefined,
          subtitle: slideSubtitle.trim() || undefined,
          ctaLabel: slideCtaLabel.trim() || undefined,
          ctaLink: slideCtaLink.trim() || undefined,
          altText: slideAltText.trim() || undefined,
          active: true,
          sortOrder: heroSlides.length,
        },
        actor
      );

      success('Hero slide created and published to slider!');
      setShowAddSlide(false);
      setSlideFile(null);
      setSlideHeadline('');
      setSlideSubtitle('');
      setSlideAltText('');
    } catch (err: any) {
      error(err.message || 'Failed to upload hero slide');
    } finally {
      setIsUploadingSlide(false);
    }
  };

  const handleToggleSlideActive = async (slide: HeroSlide) => {
    try {
      await setHeroSlideActive(slide.id, !slide.active, actor);
      success(slide.active ? 'Hero slide hidden from public rotation' : 'Hero slide activated in rotation');
    } catch (err: any) {
      error('Failed to update slide status');
    }
  };

  const handleMoveSlide = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= heroSlides.length) return;

    const reordered = [...heroSlides];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const orderedIds = reordered.map((s) => s.id);
    await reorderHeroSlides(orderedIds, actor);
  };

  const handleConfirmDeleteSlide = async () => {
    if (!slideToDelete) return;
    try {
      await deleteHeroSlide(slideToDelete.id, slideToDelete.storagePath, actor);
      success('Hero slide removed');
      setSlideToDelete(null);
    } catch (err: any) {
      error('Failed to delete slide');
    }
  };

  // ----------------------------------------------------
  // GALLERY HANDLERS
  // ----------------------------------------------------

  const handleGalleryFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploadingGallery(true);
    setGalleryUploadProgress({ current: 0, total: files.length });

    let completed = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const downloadUrl = await uploadStudioAsset(file, 'gallery');
        await addGalleryImage(
          {
            storagePath: downloadUrl,
            downloadUrl,
            altText: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
            active: true,
            sortOrder: galleryItems.length + i,
          },
          actor
        );
        completed++;
        setGalleryUploadProgress({ current: completed, total: files.length });
      } catch (err) {
        console.error('Gallery file upload failed:', file.name, err);
      }
    }

    setIsUploadingGallery(false);
    setGalleryUploadProgress(null);
    success(`Uploaded ${completed} images to homepage gallery!`);
  };

  const handleToggleGalleryActive = async (item: HomepageGalleryItem) => {
    try {
      await setGalleryImageActive(item.id, !item.active, actor);
      success(item.active ? 'Image hidden from homepage' : 'Image displayed on homepage');
    } catch (err) {
      error('Failed to toggle image visibility');
    }
  };

  const handleMoveGallery = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= galleryItems.length) return;

    const reordered = [...galleryItems];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const orderedIds = reordered.map((g) => g.id);
    await reorderGalleryImages(orderedIds, actor);
  };

  const handleConfirmDeleteGalleryItem = async () => {
    if (!itemToDelete) return;
    try {
      await deleteGalleryImage(itemToDelete.id, itemToDelete.storagePath, actor);
      success('Gallery image deleted');
      setItemToDelete(null);
    } catch (err) {
      error('Failed to delete image');
    }
  };

  // ----------------------------------------------------
  // BRANDING HANDLER
  // ----------------------------------------------------

  const handleSaveBranding = async () => {
    setIsSavingBranding(true);
    try {
      await updateBranding(branding, actor);
      success('Branding and visual tokens saved!');
    } catch (err) {
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
            Studio Content & Appearance
          </span>
          <h2
            className="font-serif text-3xl sm:text-4xl text-[#171717] font-normal tracking-wide mt-0.5"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Website Content & CMS
          </h2>
          <p className="text-xs text-[#77736B] font-light mt-1">
            Centrally manage homepage hero slides, editorial gallery photos, and global branding assets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreviewSite}
            leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
          >
            Preview Live Website
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8E0D0] pb-px">
        <button
          onClick={() => setActiveTab('hero')}
          className={`px-4 py-2 text-xs uppercase tracking-wider font-medium transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'hero'
              ? 'border-[#C8A96B] text-[#171717] bg-[#FCFBF8]'
              : 'border-transparent text-[#77736B] hover:text-[#171717]'
          }`}
        >
          <Film className="w-3.5 h-3.5 text-[#C8A96B]" />
          <span>Hero Slides ({heroSlides.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('gallery')}
          className={`px-4 py-2 text-xs uppercase tracking-wider font-medium transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'gallery'
              ? 'border-[#C8A96B] text-[#171717] bg-[#FCFBF8]'
              : 'border-transparent text-[#77736B] hover:text-[#171717]'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 text-[#C8A96B]" />
          <span>Homepage Gallery ({galleryItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('branding')}
          className={`px-4 py-2 text-xs uppercase tracking-wider font-medium transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'branding'
              ? 'border-[#C8A96B] text-[#171717] bg-[#FCFBF8]'
              : 'border-transparent text-[#77736B] hover:text-[#171717]'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-[#C8A96B]" />
          <span>Branding & Design Tokens</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: HERO SLIDER MANAGEMENT */}
      {/* ========================================================= */}
      {activeTab === 'hero' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs">
            <div>
              <h3 className="font-serif text-xl text-[#171717]">
                Automatic Hero Slider CMS
              </h3>
              <p className="text-xs text-[#77736B] font-light">
                Slides rotate automatically every 5 seconds. Users can pause on hover or touch, and navigate manually.
              </p>
            </div>

            <Button
              variant="gold"
              size="sm"
              onClick={() => setShowAddSlide(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Hero Slide
            </Button>
          </div>

          {/* Add Slide Modal / Form */}
          {showAddSlide && (
            <form
              onSubmit={handleCreateHeroSlide}
              className="bg-[#FCFBF8] border-2 border-[#C8A96B]/50 p-6 rounded-xs space-y-4 shadow-sm"
            >
              <h4 className="font-serif text-lg text-[#171717]">New Hero Slide</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* File picker */}
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                    Hero Slide Image File *
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                    onChange={(e) => setSlideFile(e.target.files?.[0] || null)}
                    className="w-full text-xs p-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs file:mr-3 file:py-1 file:px-3 file:rounded-xs file:border-0 file:bg-[#171717] file:text-white file:text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                    Headline (Optional)
                  </label>
                  <input
                    type="text"
                    value={slideHeadline}
                    onChange={(e) => setSlideHeadline(e.target.value)}
                    placeholder="e.g. Memories, beautifully preserved."
                    className="w-full px-3 py-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs text-[#171717]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                    Subtitle (Optional)
                  </label>
                  <input
                    type="text"
                    value={slideSubtitle}
                    onChange={(e) => setSlideSubtitle(e.target.value)}
                    placeholder="A timeless digital heirloom for weddings..."
                    className="w-full px-3 py-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs text-[#171717]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                    Call To Action Button Label
                  </label>
                  <input
                    type="text"
                    value={slideCtaLabel}
                    onChange={(e) => setSlideCtaLabel(e.target.value)}
                    placeholder="Browse Albums"
                    className="w-full px-3 py-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs text-[#171717]"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                    CTA Button Link
                  </label>
                  <input
                    type="text"
                    value={slideCtaLink}
                    onChange={(e) => setSlideCtaLink(e.target.value)}
                    placeholder="/albums"
                    className="w-full px-3 py-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs text-[#171717]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setShowAddSlide(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="gold"
                  size="sm"
                  type="submit"
                  isLoading={isUploadingSlide}
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                >
                  Upload & Save Slide
                </Button>
              </div>
            </form>
          )}

          {/* Slides List */}
          {heroSlides.length === 0 ? (
            <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-12 text-center rounded-xs">
              <Film className="w-10 h-10 text-[#C8A96B] mx-auto mb-3 opacity-60" />
              <h4 className="font-serif text-xl text-[#171717]">No Hero Slides Added</h4>
              <p className="text-xs text-[#77736B] font-light max-w-md mx-auto mt-1 mb-4">
                The homepage currently displays the default brand typography. Click above to upload your first hero slide.
              </p>
              <Button variant="gold" size="sm" onClick={() => setShowAddSlide(true)}>
                Add Hero Slide
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {heroSlides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`bg-[#FCFBF8] border rounded-xs p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                    slide.active ? 'border-[#E8E0D0]' : 'border-[#E8E0D0]/50 opacity-60 bg-[#F5F2EB]'
                  }`}
                >
                  {/* Left: Thumbnail & Order */}
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <button
                        onClick={() => handleMoveSlide(index, 'up')}
                        disabled={index === 0}
                        aria-label="Move slide up"
                        className="p-1 text-[#77736B] hover:text-[#171717] disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono text-xs font-semibold text-[#8C6D2C]">
                        #{index + 1}
                      </span>
                      <button
                        onClick={() => handleMoveSlide(index, 'down')}
                        disabled={index === heroSlides.length - 1}
                        aria-label="Move slide down"
                        className="p-1 text-[#77736B] hover:text-[#171717] disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="w-24 h-16 bg-[#2A2826] rounded-xs overflow-hidden shrink-0 border border-[#E8E0D0]">
                      <img
                        src={slide.downloadUrl}
                        alt={slide.altText || 'Hero thumbnail'}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div>
                      <h4 className="font-serif text-base text-[#171717]">
                        {slide.headline || 'Brand Slide'}
                      </h4>
                      {slide.subtitle && (
                        <p className="text-xs text-[#77736B] line-clamp-1">{slide.subtitle}</p>
                      )}
                      <span className="text-[10px] font-mono text-[#8C6D2C]">
                        {slide.active ? 'Active in slider' : 'Hidden from rotation'}
                      </span>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleToggleSlideActive(slide)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-xs border cursor-pointer transition-colors ${
                        slide.active
                          ? 'border-[#E8E0D0] text-[#77736B] hover:text-[#171717] bg-[#FCFBF8]'
                          : 'border-emerald-300 text-emerald-800 bg-emerald-50'
                      }`}
                    >
                      {slide.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{slide.active ? 'Hide' : 'Activate'}</span>
                    </button>

                    <button
                      onClick={() => setSlideToDelete(slide)}
                      aria-label="Delete slide"
                      className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xs cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: HOMEPAGE GALLERY MANAGEMENT */}
      {/* ========================================================= */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs">
            <div>
              <h3 className="font-serif text-xl text-[#171717]">
                Editorial Homepage Gallery ({galleryItems.length} Photographs)
              </h3>
              <p className="text-xs text-[#77736B] font-light">
                Visitors can click any photo to open the luxury lightbox viewer with next/previous controls and mobile gestures.
              </p>
            </div>

            <div>
              <input
                ref={galleryInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  handleGalleryFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <Button
                variant="gold"
                size="sm"
                onClick={() => galleryInputRef.current?.click()}
                isLoading={isUploadingGallery}
                leftIcon={<Upload className="w-3.5 h-3.5" />}
              >
                {isUploadingGallery
                  ? `Uploading ${galleryUploadProgress?.current}/${galleryUploadProgress?.total}...`
                  : 'Upload Gallery Photos'}
              </Button>
            </div>
          </div>

          {galleryItems.length === 0 ? (
            <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-12 text-center rounded-xs">
              <ImageIcon className="w-10 h-10 text-[#C8A96B] mx-auto mb-3 opacity-60" />
              <h4 className="font-serif text-xl text-[#171717]">No Gallery Photographs Added</h4>
              <p className="text-xs text-[#77736B] font-light max-w-md mx-auto mt-1 mb-4">
                Upload your curated editorial photographs to appear on the homepage.
              </p>
              <Button variant="gold" size="sm" onClick={() => galleryInputRef.current?.click()}>
                Upload Photographs
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {galleryItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`relative aspect-3/4 rounded-xs overflow-hidden border group bg-[#2A2826] flex flex-col justify-between ${
                    item.active ? 'border-[#E8E0D0]' : 'border-red-300 opacity-60'
                  }`}
                >
                  <img
                    src={item.downloadUrl}
                    alt={item.altText || 'Gallery item'}
                    className="w-full h-full object-cover"
                  />

                  {/* Order Tag */}
                  <span className="absolute top-2 left-2 z-10 px-1.5 py-0.5 bg-black/70 text-white rounded-2xs text-[10px] font-mono">
                    #{index + 1}
                  </span>

                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 z-20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveGallery(index, 'up')}
                          disabled={index === 0}
                          aria-label="Move earlier"
                          className="p-1 bg-white/20 hover:bg-white/40 text-white rounded-2xs disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMoveGallery(index, 'down')}
                          disabled={index === galleryItems.length - 1}
                          aria-label="Move later"
                          className="p-1 bg-white/20 hover:bg-white/40 text-white rounded-2xs disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => setItemToDelete(item)}
                        aria-label="Delete image"
                        className="p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-2xs cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleToggleGalleryActive(item)}
                        className={`px-2 py-0.5 rounded-2xs text-[10px] uppercase tracking-wider font-semibold cursor-pointer ${
                          item.active
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {item.active ? 'Visible' : 'Hidden'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: BRANDING & DESIGN TOKENS */}
      {/* ========================================================= */}
      {activeTab === 'branding' && (
        <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-6 sm:p-8 rounded-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#E8E0D0]">
            <div>
              <h3 className="font-serif text-2xl text-[#171717]">
                Global Branding & Aesthetics
              </h3>
              <p className="text-xs text-[#77736B] font-light mt-0.5">
                Configure brand naming, typography accents, and custom CSS design tokens.
              </p>
            </div>

            <Button
              variant="gold"
              size="sm"
              onClick={handleSaveBranding}
              isLoading={isSavingBranding}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Save Branding
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                Studio Brand Name
              </label>
              <input
                type="text"
                value={branding.brandName}
                onChange={(e) => setBranding({ ...branding, brandName: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs text-[#171717]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                Badge Slogan
              </label>
              <input
                type="text"
                value={branding.badgeText}
                onChange={(e) => setBranding({ ...branding, badgeText: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs text-[#171717]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                Primary Brand Tagline
              </label>
              <input
                type="text"
                value={branding.tagline}
                onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs text-[#171717]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                Philosophy / Subtitle
              </label>
              <textarea
                rows={2}
                value={branding.subtitle}
                onChange={(e) => setBranding({ ...branding, subtitle: e.target.value })}
                className="w-full px-3 py-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs text-[#171717]"
              />
            </div>

            {/* Accent Color */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                Primary Gold Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={branding.primaryGold || '#C8A96B'}
                  onChange={(e) => setBranding({ ...branding, primaryGold: e.target.value })}
                  className="w-10 h-10 rounded-xs border border-[#E8E0D0] cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.primaryGold}
                  onChange={(e) => setBranding({ ...branding, primaryGold: e.target.value })}
                  className="flex-1 px-3 py-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs font-mono uppercase text-[#171717]"
                />
              </div>
            </div>

            {/* Theme Mode */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                Theme Preset
              </label>
              <select
                value={branding.themeMode}
                onChange={(e) => setBranding({ ...branding, themeMode: e.target.value as any })}
                className="w-full px-3 py-2.5 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs text-[#171717]"
              >
                <option value="classic-gold">Classic Gold (Ivory & Warm Gold)</option>
                <option value="minimal-noir">Minimal Noir (High-Contrast Charcoal)</option>
                <option value="warm-editorial">Warm Editorial (Champagne & Sand)</option>
                <option value="royal-amber">Royal Amber (Ethiopian Bronze Gold)</option>
              </select>
            </div>

            {/* Custom CSS */}
            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-[#C8A96B]" />
                <span>Custom CSS Rules (Injected Globally)</span>
              </label>
              <textarea
                rows={5}
                value={branding.customCss || ''}
                onChange={(e) => setBranding({ ...branding, customCss: e.target.value })}
                placeholder="/* e.g. .font-serif { font-family: 'Cormorant Garamond', serif !important; } */"
                className="w-full p-3 bg-[#171717] text-[#F8F6F0] font-mono text-xs rounded-xs border border-[#2A2826]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Hero Slide Confirmation Dialog */}
      {slideToDelete && (
        <ConfirmDialog
          isOpen={!!slideToDelete}
          onClose={() => setSlideToDelete(null)}
          onConfirm={handleConfirmDeleteSlide}
          title="Delete Hero Slide?"
          description="This slide will be permanently removed from the automatic hero rotation."
          confirmLabel="Delete Slide"
          isDestructive={true}
        />
      )}

      {/* Delete Gallery Item Confirmation Dialog */}
      {itemToDelete && (
        <ConfirmDialog
          isOpen={!!itemToDelete}
          onClose={() => setItemToDelete(null)}
          onConfirm={handleConfirmDeleteGalleryItem}
          title="Delete Gallery Photograph?"
          description="This photograph will be permanently removed from the homepage gallery."
          confirmLabel="Delete Photograph"
          isDestructive={true}
        />
      )}
    </div>
  );
};
