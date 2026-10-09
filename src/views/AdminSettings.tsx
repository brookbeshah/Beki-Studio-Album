import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getAppearanceSettings,
  updateAppearanceSettings,
  subscribeAppearanceSettings,
  uploadShowcaseImage,
  AppearanceSettings,
  DEFAULT_APPEARANCE_SETTINGS,
} from '../services/settingsService';
import { testFirebaseConnection } from '../firebase';
import { purgeAllDemoData } from '../services/albumService';
import { Button } from '../components/common/Button';
import {
  Palette,
  Sliders,
  Database,
  Save,
  Upload,
  Sparkles,
  Trash2,
  CheckCircle2,
  Plus,
  MoveUp,
  MoveDown,
  Eye,
  Check,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const { user, adminProfile, isSuperAdmin } = useAuth();
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<'appearance' | 'defaults' | 'database'>('appearance');

  // Appearance & Showcase State
  const [appearance, setAppearance] = useState<AppearanceSettings>(DEFAULT_APPEARANCE_SETTINGS);
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);
  const [uploadingHeroSlot, setUploadingHeroSlot] = useState<number | null>(null);
  const [uploadingBrowseSlot, setUploadingBrowseSlot] = useState<number | null>(null);

  // Platform Defaults State
  const [defaultDownloads, setDefaultDownloads] = useState(true);
  const [defaultVisibility, setDefaultVisibility] = useState<'PUBLIC' | 'UNLISTED'>('UNLISTED');
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);

  // Database Operations State
  const [isClearingDemo, setIsClearingDemo] = useState(false);
  const [connStatus, setConnStatus] = useState<string | null>(null);
  const [isTestingConn, setIsTestingConn] = useState(false);

  const heroFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const browseFileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Curated presets for instant picking
  const curatedShowcasePresets = [
    {
      title: 'Romantic Sunset Veil',
      url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=85',
    },
    {
      title: 'Grand Ballroom Confetti',
      url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1800&q=85',
    },
    {
      title: 'Lakeside Reception Mist',
      url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1800&q=85',
    },
    {
      title: 'Grand Chandeliers Toast',
      url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1800&q=85',
    },
    {
      title: 'Bridal Editorial Portrait',
      url: 'https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Lakeside Aerial Vows',
      url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'First Dance Radiance',
      url: 'https://images.unsplash.com/photo-1519225424988-662584e0374e?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Luxury Floral Table Setting',
      url: 'https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=1200&q=80',
    },
  ];

  // Subscribe to live appearance settings
  useEffect(() => {
    getAppearanceSettings().then((data) => {
      setAppearance(data);
    });

    const unsubscribe = subscribeAppearanceSettings((data) => {
      setAppearance(data);
    });

    return () => unsubscribe();
  }, []);

  const actorContext = {
    id: user?.uid || 'admin',
    name: adminProfile?.name || 'Administrator',
    email: adminProfile?.email || 'admin@bekisstudio.com',
  };

  // ----------------------------------------------------------------
  // HERO IMAGE ACTIONS
  // ----------------------------------------------------------------
  const handleHeroImageChange = async (index: number, newUrl: string) => {
    const updated = [...appearance.heroMontageImages];
    updated[index] = newUrl;
    setAppearance((prev) => ({ ...prev, heroMontageImages: updated }));
    try {
      await updateAppearanceSettings({ heroMontageImages: updated }, actorContext);
    } catch (err: any) {
      console.warn('Auto-save error:', err);
    }
  };

  const handleHeroFileUpload = async (index: number, file: File) => {
    setUploadingHeroSlot(index);
    try {
      const uploadedUrl = await uploadShowcaseImage(file);
      await handleHeroImageChange(index, uploadedUrl);
      success(`Hero image #${index + 1} uploaded and live on Welcome Page!`);
    } catch (err: any) {
      console.error('[Hero Upload Error]', err);
      error(err.message || 'Failed to upload hero image');
    } finally {
      setUploadingHeroSlot(null);
    }
  };

  const handleAddHeroSlot = async () => {
    const newUrl = curatedShowcasePresets[appearance.heroMontageImages.length % curatedShowcasePresets.length].url;
    const updated = [...appearance.heroMontageImages, newUrl];
    setAppearance((prev) => ({ ...prev, heroMontageImages: updated }));
    await updateAppearanceSettings({ heroMontageImages: updated }, actorContext);
    success('Added new Hero Showcase slot.');
  };

  const handleDeleteHeroSlot = async (index: number) => {
    if (appearance.heroMontageImages.length <= 1) {
      error('Keep at least one hero image for the welcome page slider.');
      return;
    }
    const updated = appearance.heroMontageImages.filter((_, i) => i !== index);
    setAppearance((prev) => ({ ...prev, heroMontageImages: updated }));
    await updateAppearanceSettings({ heroMontageImages: updated }, actorContext);
    success('Hero showcase image removed.');
  };

  const handleMoveHeroSlot = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= appearance.heroMontageImages.length) return;
    const updated = [...appearance.heroMontageImages];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setAppearance((prev) => ({ ...prev, heroMontageImages: updated }));
    await updateAppearanceSettings({ heroMontageImages: updated }, actorContext);
    success('Hero order updated.');
  };

  // ----------------------------------------------------------------
  // BROWSE PHOTO ACTIONS
  // ----------------------------------------------------------------
  const handleBrowseImageChange = async (index: number, newUrl: string) => {
    const updated = [...appearance.browsePhotos];
    updated[index] = newUrl;
    setAppearance((prev) => ({ ...prev, browsePhotos: updated }));
    try {
      await updateAppearanceSettings({ browsePhotos: updated }, actorContext);
    } catch (err: any) {
      console.warn('Auto-save error:', err);
    }
  };

  const handleBrowseFileUpload = async (index: number, file: File) => {
    setUploadingBrowseSlot(index);
    try {
      const uploadedUrl = await uploadShowcaseImage(file);
      await handleBrowseImageChange(index, uploadedUrl);
      success(`Browse photo #${index + 1} uploaded and live on Welcome Page!`);
    } catch (err: any) {
      console.error('[Browse Upload Error]', err);
      error(err.message || 'Failed to upload browse photo');
    } finally {
      setUploadingBrowseSlot(null);
    }
  };

  const handleAddBrowseSlot = async () => {
    const newUrl = curatedShowcasePresets[appearance.browsePhotos.length % curatedShowcasePresets.length].url;
    const updated = [...appearance.browsePhotos, newUrl];
    setAppearance((prev) => ({ ...prev, browsePhotos: updated }));
    await updateAppearanceSettings({ browsePhotos: updated }, actorContext);
    success('Added new Browse Photo slot.');
  };

  const handleDeleteBrowseSlot = async (index: number) => {
    if (appearance.browsePhotos.length <= 1) {
      error('Keep at least one photograph in the browse showcase.');
      return;
    }
    const updated = appearance.browsePhotos.filter((_, i) => i !== index);
    setAppearance((prev) => ({ ...prev, browsePhotos: updated }));
    await updateAppearanceSettings({ browsePhotos: updated }, actorContext);
    success('Browse photograph removed.');
  };

  // ----------------------------------------------------------------
  // SAVE ALL SETTINGS
  // ----------------------------------------------------------------
  const handleSaveAllAppearance = async () => {
    setIsSavingAppearance(true);
    try {
      await updateAppearanceSettings(appearance, actorContext);
      success('All homepage images, typography, and styling saved and live on Welcome Page!');
    } catch (err: any) {
      error('Failed to save settings: ' + err.message);
    } finally {
      setIsSavingAppearance(false);
    }
  };

  const handleSaveDefaults = async () => {
    setIsSavingDefaults(true);
    try {
      success('Platform defaults updated successfully.');
    } finally {
      setIsSavingDefaults(false);
    }
  };

  // ----------------------------------------------------------------
  // DATABASE PURGE ACTIONS
  // ----------------------------------------------------------------
  const handlePurgeDemoData = async () => {
    if (!isSuperAdmin) {
      error('Only Super Administrators can purge demo data');
      return;
    }
    setIsClearingDemo(true);
    try {
      const removedCount = await purgeAllDemoData();
      if (removedCount > 0) {
        success(`Cleaned ${removedCount} demo records. Database is 100% operation-ready!`);
      } else {
        info('Zero demo records found. The database is already clean and operation-ready.');
      }
    } catch (err: any) {
      error('Failed to purge demo data: ' + err.message);
    } finally {
      setIsClearingDemo(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    info('Testing Firestore enterprise connection...');
    try {
      const ok = await testFirebaseConnection();
      if (ok) {
        setConnStatus('Connected to Google Firestore enterprise instance. Realtime subscriptions active.');
        success('Firestore connection verified operational.');
      } else {
        setConnStatus('Could not establish handshake with database.');
        error('Firestore connection check failed.');
      }
    } catch (err: any) {
      setConnStatus('Connection error: ' + err.message);
      error('Connection check failed');
    } finally {
      setIsTestingConn(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-[#E8E0D0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.3em] text-[#C8A96B] font-medium">
            Platform Management
          </span>
          <h2
            className="font-serif text-3xl sm:text-4xl text-[#171717] font-normal tracking-wide mt-0.5"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            System Settings & Live CMS
          </h2>
          <p className="text-xs text-[#77736B] font-light mt-1">
            Manage live welcome page images, automatic slider photography, brand typography, and database state.
          </p>
        </div>

        {activeTab === 'appearance' && (
          <Button
            variant="gold"
            size="sm"
            onClick={handleSaveAllAppearance}
            isLoading={isSavingAppearance}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Save All Changes
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8E0D0] pb-px">
        <button
          onClick={() => setActiveTab('appearance')}
          className={`px-4 py-2.5 text-xs uppercase tracking-wider font-medium transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'appearance'
              ? 'border-[#C8A96B] text-[#171717] bg-[#FCFBF8]'
              : 'border-transparent text-[#77736B] hover:text-[#171717]'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-[#C8A96B]" />
          <span>Live Welcome Page Images & CMS</span>
        </button>

        <button
          onClick={() => setActiveTab('defaults')}
          className={`px-4 py-2.5 text-xs uppercase tracking-wider font-medium transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'defaults'
              ? 'border-[#C8A96B] text-[#171717] bg-[#FCFBF8]'
              : 'border-transparent text-[#77736B] hover:text-[#171717]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-[#C8A96B]" />
          <span>Platform Defaults</span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-2.5 text-xs uppercase tracking-wider font-medium transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'database'
              ? 'border-[#C8A96B] text-[#171717] bg-[#FCFBF8]'
              : 'border-transparent text-[#77736B] hover:text-[#171717]'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-[#C8A96B]" />
          <span>Database & Clean Operation</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LIVE IMAGES & SHOWCASE CMS */}
      {/* ========================================================================= */}
      {activeTab === 'appearance' && (
        <div className="space-y-10">
          {/* Section A: Hero Slides Images */}
          <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-6 sm:p-8 rounded-xs space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E8E0D0] gap-2">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#C8A96B] font-semibold">
                  Hero Section
                </span>
                <h3 className="font-serif text-2xl text-[#171717] font-normal">
                  Hero Slider & Montage Images ({appearance.heroMontageImages.length})
                </h3>
                <p className="text-xs text-[#77736B] font-light mt-0.5">
                  These high-resolution photographs automatically transition on the welcome page hero section.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleAddHeroSlot}
                leftIcon={<Plus className="w-3.5 h-3.5 text-[#C8A96B]" />}
              >
                Add Hero Image Slot
              </Button>
            </div>

            {/* Grid of Live Hero Image Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {appearance.heroMontageImages.map((currentUrl, slotIdx) => {
                const isUploadingThis = uploadingHeroSlot === slotIdx;
                return (
                  <div
                    key={slotIdx}
                    className="p-4 bg-white border border-[#E8E0D0] rounded-xs space-y-4 shadow-2xs hover:border-[#C8A96B] transition-colors"
                  >
                    {/* Header with Slot # and Order controls */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase text-[#C8A96B] font-semibold">
                        Hero Slide #{slotIdx + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          disabled={slotIdx === 0}
                          onClick={() => handleMoveHeroSlot(slotIdx, 'up')}
                          className="p-1 text-[#77736B] hover:text-[#171717] disabled:opacity-30 cursor-pointer"
                          title="Move up"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={slotIdx === appearance.heroMontageImages.length - 1}
                          onClick={() => handleMoveHeroSlot(slotIdx, 'down')}
                          className="p-1 text-[#77736B] hover:text-[#171717] disabled:opacity-30 cursor-pointer"
                          title="Move down"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteHeroSlot(slotIdx)}
                          className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                          title="Delete slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Live Image Preview Thumbnail */}
                    <div className="relative aspect-16/9 bg-[#2A2826] rounded-xs overflow-hidden border border-[#E8E0D0]">
                      <img
                        src={currentUrl}
                        alt={`Hero Slide ${slotIdx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[9px] uppercase tracking-wider rounded-2xs font-mono">
                        Live Preview
                      </div>
                    </div>

                    {/* Actions: Upload from Computer */}
                    <div className="space-y-2.5">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={(el) => {
                          heroFileInputRefs.current[slotIdx] = el;
                        }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleHeroFileUpload(slotIdx, file);
                            e.target.value = '';
                          }
                        }}
                      />

                      <Button
                        variant="gold"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => heroFileInputRefs.current[slotIdx]?.click()}
                        isLoading={isUploadingThis}
                        leftIcon={<Upload className="w-3.5 h-3.5" />}
                      >
                        {isUploadingThis ? 'Uploading...' : 'Upload Image from Computer'}
                      </Button>

                      {/* Direct URL Input */}
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#77736B] mb-0.5">
                          Or Paste Image URL:
                        </label>
                        <input
                          type="text"
                          value={currentUrl}
                          onChange={(e) => handleHeroImageChange(slotIdx, e.target.value)}
                          placeholder="https://... or /uploads/..."
                          className="w-full px-2.5 py-1.5 bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs text-[11px] text-[#171717] font-mono focus:outline-none focus:border-[#C8A96B]"
                        />
                      </div>

                      {/* Preset Picker */}
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#77736B] mb-0.5">
                          Or Choose Curated Preset:
                        </label>
                        <select
                          className="w-full px-2 py-1 bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs text-[11px] text-[#171717] focus:outline-none focus:border-[#C8A96B]"
                          onChange={(e) => {
                            if (e.target.value) {
                              handleHeroImageChange(slotIdx, e.target.value);
                            }
                          }}
                          value=""
                        >
                          <option value="">Select Curated Preset...</option>
                          {curatedShowcasePresets.map((preset, pIdx) => (
                            <option key={pIdx} value={preset.url}>
                              {preset.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B: Browse Gallery Photos (The Photos in the Browse Photo Section) */}
          <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-6 sm:p-8 rounded-xs space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E8E0D0] gap-2">
              <div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#C8A96B] font-semibold">
                  Browse Photo Showcase
                </span>
                <h3 className="font-serif text-2xl text-[#171717] font-normal">
                  Browse Gallery Collection ({appearance.browsePhotos.length})
                </h3>
                <p className="text-xs text-[#77736B] font-light mt-0.5">
                  These photos power the automatic multi-card sliding animation in the welcome page Browse section.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleAddBrowseSlot}
                leftIcon={<Plus className="w-3.5 h-3.5 text-[#C8A96B]" />}
              >
                Add Browse Photo Slot
              </Button>
            </div>

            {/* Grid of Browse Photos */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {appearance.browsePhotos.map((currentUrl, bIdx) => {
                const isUploadingThis = uploadingBrowseSlot === bIdx;
                return (
                  <div
                    key={bIdx}
                    className="p-3 bg-white border border-[#E8E0D0] rounded-xs space-y-3 shadow-2xs hover:border-[#C8A96B] transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-[#C8A96B] font-semibold">
                          Photo #{bIdx + 1}
                        </span>
                        <button
                          onClick={() => handleDeleteBrowseSlot(bIdx)}
                          className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                          title="Delete photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Live Thumbnail */}
                      <div className="relative aspect-3/4 bg-[#2A2826] rounded-2xs overflow-hidden border border-[#E8E0D0] mb-2">
                        <img
                          src={currentUrl}
                          alt={`Browse Photo ${bIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={(el) => {
                          browseFileInputRefs.current[bIdx] = el;
                        }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleBrowseFileUpload(bIdx, file);
                            e.target.value = '';
                          }
                        }}
                      />

                      <Button
                        variant="gold"
                        size="sm"
                        className="w-full text-[11px] py-1.5"
                        onClick={() => browseFileInputRefs.current[bIdx]?.click()}
                        isLoading={isUploadingThis}
                        leftIcon={<Upload className="w-3 h-3" />}
                      >
                        {isUploadingThis ? 'Uploading...' : 'Upload Photo'}
                      </Button>

                      <input
                        type="text"
                        value={currentUrl}
                        onChange={(e) => handleBrowseImageChange(bIdx, e.target.value)}
                        placeholder="https://..."
                        className="w-full px-2 py-1 bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs text-[10px] font-mono text-[#171717] focus:outline-none focus:border-[#C8A96B]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section C: Live Brand Copywriting */}
          <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-6 sm:p-8 rounded-xs space-y-4 shadow-xs">
            <h3 className="font-serif text-xl text-[#171717] font-normal pb-3 border-b border-[#E8E0D0]">
              Welcome Page Headlines & Typography
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                  Main Hero Headline
                </label>
                <input
                  type="text"
                  value={appearance.brandTagline || ''}
                  onChange={(e) => setAppearance({ ...appearance, brandTagline: e.target.value })}
                  placeholder="Preserving the Poetry of Your Most Beautiful Moments."
                  className="w-full px-3 py-2 bg-white border border-[#E8E0D0] rounded-xs text-[#171717] focus:border-[#C8A96B] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                  Hero Subtitle Paragraph
                </label>
                <textarea
                  rows={2}
                  value={appearance.brandSubtitle || ''}
                  onChange={(e) => setAppearance({ ...appearance, brandSubtitle: e.target.value })}
                  placeholder="A timeless digital sanctuary for weddings, sacred ceremonies, and celebrations."
                  className="w-full px-3 py-2 bg-white border border-[#E8E0D0] rounded-xs text-[#171717] focus:border-[#C8A96B] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                    Top Pill Category Badge
                  </label>
                  <input
                    type="text"
                    value={appearance.badgeText || ''}
                    onChange={(e) => setAppearance({ ...appearance, badgeText: e.target.value })}
                    placeholder="Fine Art Wedding & Editorial Photography"
                    className="w-full px-3 py-2 bg-white border border-[#E8E0D0] rounded-xs text-[#171717] focus:border-[#C8A96B] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                    Studio Brand Name
                  </label>
                  <input
                    type="text"
                    value={appearance.studioName || ''}
                    onChange={(e) => setAppearance({ ...appearance, studioName: e.target.value })}
                    placeholder="Beki's Studio"
                    className="w-full px-3 py-2 bg-white border border-[#E8E0D0] rounded-xs text-[#171717] focus:border-[#C8A96B] outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="gold"
                  size="sm"
                  onClick={handleSaveAllAppearance}
                  isLoading={isSavingAppearance}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                >
                  Save All Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PLATFORM DEFAULTS */}
      {/* ========================================================================= */}
      {activeTab === 'defaults' && (
        <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-6 sm:p-8 rounded-xs space-y-6 text-xs shadow-xs">
          <h3 className="font-serif text-xl text-[#171717] font-normal pb-3 border-b border-[#E8E0D0] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#C8A96B]" />
            New Album Default Policies
          </h3>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white border border-[#E8E0D0] rounded-xs">
              <div>
                <p className="font-medium text-[#171717]">Default Allow Downloads</p>
                <p className="text-[11px] text-[#77736B]">New albums default to allowing guests to download high-resolution photos</p>
              </div>
              <input
                type="checkbox"
                checked={defaultDownloads}
                onChange={(e) => setDefaultDownloads(e.target.checked)}
                className="w-4 h-4 text-[#C8A96B] rounded-xs cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-white border border-[#E8E0D0] rounded-xs">
              <div>
                <p className="font-medium text-[#171717]">Default Visibility</p>
                <p className="text-[11px] text-[#77736B]">Default privacy state when creating a new album</p>
              </div>
              <select
                value={defaultVisibility}
                onChange={(e) => setDefaultVisibility(e.target.value as any)}
                className="px-3 py-1.5 bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs text-[#171717] text-xs focus:border-[#C8A96B] outline-none"
              >
                <option value="UNLISTED">Unlisted (Private Direct Link)</option>
                <option value="PUBLIC">Public (Visible in Showcase Catalog)</option>
              </select>
            </div>

            <Button
              variant="gold"
              size="sm"
              onClick={handleSaveDefaults}
              isLoading={isSavingDefaults}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Save Platform Defaults
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DATABASE & CLEAN OPERATION */}
      {/* ========================================================================= */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-6 sm:p-8 rounded-xs space-y-6 text-xs shadow-xs">
            <h3 className="font-serif text-xl text-[#171717] font-normal pb-3 border-b border-[#E8E0D0] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#C8A96B]" />
              Database Health & Clean Production State
            </h3>

            <div className="space-y-4">
              <p className="text-xs text-[#77736B] leading-relaxed">
                Ensure zero demo artifacts remain in your system. This purge utility completely removes any legacy test or demo collections and ensures the platform is 100% operation-ready for production.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {isSuperAdmin && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handlePurgeDemoData}
                    isLoading={isClearingDemo}
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Purge All Demo Collections
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  isLoading={isTestingConn}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5 text-[#C8A96B]" />}
                >
                  Test DB Connection
                </Button>
              </div>

              {connStatus && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{connStatus}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
