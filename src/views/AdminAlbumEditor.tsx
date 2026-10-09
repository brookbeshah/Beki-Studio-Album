import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/common/Button';
import { BulkUploader } from '../components/admin/BulkUploader';
import { Album, AlbumVisibility, DownloadQuality, AlbumTheme } from '../types';
import { createAlbum, generateSlug, updateAlbum } from '../services/albumService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Image as ImageIcon,
  Settings,
  Upload,
  Globe,
  Lock,
} from 'lucide-react';

interface AdminAlbumEditorProps {
  existingAlbum?: Album | null;
  onFinished: (albumId: string) => void;
  onCancel: () => void;
}

export const AdminAlbumEditor: React.FC<AdminAlbumEditorProps> = ({
  existingAlbum,
  onFinished,
  onCancel,
}) => {
  const { user, adminProfile } = useAuth();
  const { success, error } = useToast();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdAlbumId, setCreatedAlbumId] = useState<string>(existingAlbum?.id || '');

  // Step 1: Album Info
  const [title, setTitle] = useState(existingAlbum?.title || '');
  const [slug, setSlug] = useState(existingAlbum?.slug || '');
  const [eventType, setEventType] = useState(existingAlbum?.eventType || 'Wedding Celebration');
  const [eventDate, setEventDate] = useState(existingAlbum?.eventDate || 'September 12, 2026');
  const [location, setLocation] = useState(existingAlbum?.location || 'Addis Ababa');
  const [description, setDescription] = useState(existingAlbum?.description || '');
  const [welcomeMessage, setWelcomeMessage] = useState(
    existingAlbum?.welcomeMessage ||
      'Thank you for celebrating with us. We hope these memories bring the day back to life.'
  );

  // Step 2: Cover Image
  const [coverImageUrl, setCoverImageUrl] = useState(existingAlbum?.coverImageUrl || '');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const handleCoverUpload = async (file: File) => {
    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setCoverImageUrl(data.url);
        success('Cover photo uploaded successfully!');
      } else {
        error('Failed to upload cover photo');
      }
    } catch (e: any) {
      error(e.message || 'Error uploading cover photo');
    } finally {
      setIsUploadingCover(false);
    }
  };

  // Step 4: Settings
  const [visibility, setVisibility] = useState<AlbumVisibility>(existingAlbum?.visibility || 'UNLISTED');
  const [allowDownloads, setAllowDownloads] = useState<boolean>(existingAlbum?.allowDownloads ?? true);
  const [downloadQuality, setDownloadQuality] = useState<DownloadQuality>(existingAlbum?.downloadQuality || 'HIGH');
  const [theme, setTheme] = useState<AlbumTheme>(existingAlbum?.theme || 'default');

  // Auto-generate slug when title changes unless editing
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!existingAlbum) {
      setSlug(generateSlug(val));
    }
  };

  const steps = [
    { number: 1, label: 'Information' },
    { number: 2, label: 'Cover Image' },
    { number: 3, label: 'Media Upload' },
    { number: 4, label: 'Settings' },
    { number: 5, label: 'Review & Publish' },
  ];

  const handleCreateOrSave = async (publish: boolean = false) => {
    if (!title.trim()) {
      error('Please provide an album title.');
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const actor = {
        id: user?.uid || 'admin',
        name: adminProfile?.name || 'Administrator',
        email: adminProfile?.email || 'admin@bekisstudio.com',
      };

      const payload = {
        title: title.trim(),
        slug: slug.trim() || generateSlug(title),
        eventType,
        eventDate,
        location,
        description,
        welcomeMessage,
        coverImageUrl: coverImageUrl || undefined,
        visibility,
        allowDownloads,
        downloadQuality,
        theme,
        status: publish ? ('PUBLISHED' as const) : ('DRAFT' as const),
      };

      if (createdAlbumId) {
        await updateAlbum(createdAlbumId, payload, actor);
        success(publish ? 'Album published successfully!' : 'Album details updated.');
        onFinished(createdAlbumId);
      } else {
        const created = await createAlbum(payload, actor);
        setCreatedAlbumId(created.id);
        success(publish ? 'Album created and published!' : 'Album draft created.');
        onFinished(created.id);
      }
    } catch (err: any) {
      error('Failed to save album');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sampleCovers = [
    {
      label: 'Luxury Romantic Bride & Groom',
      url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80',
    },
    {
      label: 'Editorial Evening Vows',
      url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1600&q=80',
    },
    {
      label: 'Golden Hour Embrace',
      url: 'https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&w=1600&q=80',
    },
    {
      label: 'Fine Art Bridal Portrait',
      url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1600&q=80',
    },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
      {/* Back Button */}
      <div className="flex items-center justify-between border-b border-[#E8E0D0] pb-4">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#77736B] hover:text-[#171717] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancel & Return</span>
        </button>

        <span className="text-xs uppercase tracking-[0.25em] text-[#C8A96B] font-medium">
          {existingAlbum ? 'Edit Story Collection' : 'New Story Collection'}
        </span>
      </div>

      {/* Workflow Stepper */}
      <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-4 rounded-xs shadow-xs">
        <div className="flex items-center justify-between overflow-x-auto gap-2">
          {steps.map((st) => (
            <button
              key={st.number}
              onClick={() => setCurrentStep(st.number)}
              className={`flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wider rounded-xs transition-colors shrink-0 cursor-pointer ${
                currentStep === st.number
                  ? 'bg-[#171717] text-[#F8F6F0] font-medium shadow-2xs'
                  : currentStep > st.number
                  ? 'text-emerald-700 font-medium'
                  : 'text-[#77736B] hover:text-[#171717]'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentStep === st.number
                    ? 'bg-[#C8A96B] text-[#171717]'
                    : currentStep > st.number
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-[#EFECE4] text-[#77736B]'
                }`}
              >
                {currentStep > st.number ? <Check className="w-3 h-3" /> : st.number}
              </span>
              <span>{st.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-6 sm:p-10 rounded-xs shadow-xs">
        {/* STEP 1: Album Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-2xl text-[#171717] font-normal">
                Album Information
              </h3>
              <p className="text-xs text-[#77736B] mt-1 font-light">
                Define the couple or event name, event date, and guest welcome message.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                  Album Title (e.g. Couple Names) *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Dawit & Selam"
                  className="w-full px-4 py-2.5 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-sm text-[#171717] focus:outline-none focus:border-[#C8A96B]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                  Permanent URL Slug *
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2.5 bg-[#EFECE4] border border-r-0 border-[#E8E0D0] text-xs text-[#77736B] font-mono">
                    /a/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="dawit-selam"
                    className="w-full px-3 py-2.5 bg-[#F8F6F0] border border-[#E8E0D0] rounded-r-xs text-sm text-[#171717] font-mono focus:outline-none focus:border-[#C8A96B]"
                  />
                </div>
                <span className="text-[10px] text-[#A8A49C] mt-1 block">
                  Must be unique. This URL is encoded directly into physical QR codes.
                </span>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                  Event Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-sm text-[#171717] focus:outline-none focus:border-[#C8A96B]"
                >
                  <option value="Wedding Celebration">Wedding Celebration</option>
                  <option value="Wedding Ceremony & Reception">Wedding Ceremony & Reception</option>
                  <option value="Engagement">Engagement</option>
                  <option value="Anniversary">Anniversary</option>
                  <option value="Gala Celebration">Gala Celebration</option>
                  <option value="Private Dinner">Private Dinner</option>
                  <option value="Special Event">Special Event</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                  Event Date
                </label>
                <input
                  type="text"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  placeholder="September 12, 2026"
                  className="w-full px-4 py-2.5 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-sm text-[#171717] focus:outline-none focus:border-[#C8A96B]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                  Location / Venue
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Addis Ababa / Grand Ballroom"
                  className="w-full px-4 py-2.5 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-sm text-[#171717] focus:outline-none focus:border-[#C8A96B]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                  Guest Welcome Message
                </label>
                <textarea
                  rows={3}
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="Thank you for celebrating with us. We hope these memories bring the day back to life."
                  className="w-full px-4 py-2.5 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-sm text-[#171717] focus:outline-none focus:border-[#C8A96B]"
                />
                <span className="text-[10px] text-[#A8A49C] mt-1 block">
                  Displayed prominently on the mobile guest hero cover screen.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Cover Image */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-2xl text-[#171717] font-normal">
                Album Cover Photograph
              </h3>
              <p className="text-xs text-[#77736B] mt-1 font-light">
                Choose the hero photograph guests will see the moment they scan the QR code.
              </p>
            </div>

            {/* Direct Upload from Computer */}
            <div className="bg-[#FCFBF8] border-2 border-dashed border-[#E8E0D0] hover:border-[#C8A96B] p-6 rounded-xs text-center transition-all">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleCoverUpload(file);
                    e.target.value = '';
                  }
                }}
              />
              <ImageIcon className="w-8 h-8 text-[#C8A96B] mx-auto mb-2 opacity-80" />
              <p className="font-serif text-lg text-[#171717] mb-1">
                Upload Cover Photograph from Computer
              </p>
              <p className="text-xs text-[#77736B] font-light mb-4">
                High-resolution JPEG, PNG, or WebP. Uploaded directly to your verified studio storage.
              </p>
              <Button
                variant="gold"
                size="sm"
                onClick={() => coverInputRef.current?.click()}
                isLoading={isUploadingCover}
                leftIcon={<Upload className="w-3.5 h-3.5" />}
              >
                {isUploadingCover ? 'Uploading Cover...' : 'Choose Photo from Computer'}
              </Button>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                Or Enter Cover Image URL
              </label>
              <input
                type="text"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-4 py-2.5 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-sm text-[#171717] focus:outline-none focus:border-[#C8A96B]"
              />
            </div>

            {/* Presets */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#77736B] mb-2 font-medium">
                Select from Curated Luxury Editorial Portraits:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {sampleCovers.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => setCoverImageUrl(s.url)}
                    className={`relative aspect-4/3 rounded-xs overflow-hidden border-2 cursor-pointer transition-all ${
                      coverImageUrl === s.url
                        ? 'border-[#C8A96B] ring-2 ring-[#C8A96B]/30 scale-[1.02]'
                        : 'border-[#E8E0D0] hover:border-[#C8A96B]'
                    }`}
                  >
                    <img src={s.url} alt={s.label} className="w-full h-full object-cover" />
                    {coverImageUrl === s.url && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#C8A96B] text-[#171717] rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview of Selected Cover */}
            {coverImageUrl && (
              <div className="pt-4 border-t border-[#E8E0D0]">
                <span className="text-xs uppercase tracking-wider text-[#77736B] block mb-2">
                  Live Cover Preview:
                </span>
                <div className="relative aspect-21/9 max-w-full rounded-xs overflow-hidden border border-[#E8E0D0]">
                  <img src={coverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-center p-4">
                    <h4 className="font-serif text-3xl sm:text-4xl text-white font-normal">
                      {title || 'Collection Title'}
                    </h4>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Media Upload */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-2xl text-[#171717] font-normal">
                Media Ingestion
              </h3>
              <p className="text-xs text-[#77736B] mt-1 font-light">
                You can upload photos and videos right now, or proceed and upload later.
              </p>
            </div>

            {createdAlbumId ? (
              <BulkUploader albumId={createdAlbumId} />
            ) : (
              <div className="bg-[#F8F6F0] border border-[#E8E0D0] p-8 text-center rounded-xs">
                <Upload className="w-10 h-10 text-[#C8A96B] mx-auto mb-3" />
                <p className="font-serif text-xl text-[#171717] mb-1 font-normal">
                  Ready to upload files
                </p>
                <p className="text-xs text-[#77736B] max-w-md mx-auto mb-6">
                  Save the album information first, or continue directly to settings. Uploading is also available anytime from the album management console.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep(4)}
                >
                  Continue to Settings
                </Button>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Settings */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-2xl text-[#171717] font-normal">
                Album Privacy & Delivery Settings
              </h3>
              <p className="text-xs text-[#77736B] mt-1 font-light">
                Configure download permissions and guest access visibility.
              </p>
            </div>

            <div className="space-y-4">
              {/* Visibility */}
              <div className="border border-[#E8E0D0] p-4 rounded-xs bg-[#F8F6F0]">
                <label className="block text-xs uppercase tracking-wider text-[#171717] mb-2 font-semibold">
                  Album Visibility
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setVisibility('UNLISTED')}
                    className={`p-3 border rounded-xs cursor-pointer transition-all ${
                      visibility === 'UNLISTED'
                        ? 'border-[#C8A96B] bg-white shadow-2xs'
                        : 'border-[#E8E0D0] hover:border-[#C8A96B]/50'
                    }`}
                  >
                    <p className="font-semibold text-xs text-[#171717]">Unlisted (Recommended)</p>
                    <p className="text-[11px] text-[#77736B] mt-0.5">
                      Accessible only via the QR code or direct link. Not indexed publicly.
                    </p>
                  </div>

                  <div
                    onClick={() => setVisibility('PUBLIC')}
                    className={`p-3 border rounded-xs cursor-pointer transition-all ${
                      visibility === 'PUBLIC'
                        ? 'border-[#C8A96B] bg-white shadow-2xs'
                        : 'border-[#E8E0D0] hover:border-[#C8A96B]/50'
                    }`}
                  >
                    <p className="font-semibold text-xs text-[#171717]">Public</p>
                    <p className="text-[11px] text-[#77736B] mt-0.5">
                      Visible in public portfolio showcases and search listings.
                    </p>
                  </div>

                  <div
                    onClick={() => setVisibility('PRIVATE')}
                    className={`p-3 border rounded-xs cursor-pointer transition-all ${
                      visibility === 'PRIVATE'
                        ? 'border-[#C8A96B] bg-white shadow-2xs'
                        : 'border-[#E8E0D0] hover:border-[#C8A96B]/50'
                    }`}
                  >
                    <p className="font-semibold text-xs text-[#171717]">Private</p>
                    <p className="text-[11px] text-[#77736B] mt-0.5">
                      Restricted to studio administrators only.
                    </p>
                  </div>
                </div>
              </div>

              {/* Downloads */}
              <div className="border border-[#E8E0D0] p-4 rounded-xs bg-[#F8F6F0] flex items-center justify-between">
                <div>
                  <p className="font-semibold text-xs text-[#171717]">Allow Guest Downloads</p>
                  <p className="text-[11px] text-[#77736B]">
                    Enable guests to download high-resolution photos and video reels from the viewer.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={allowDownloads}
                  onChange={(e) => setAllowDownloads(e.target.checked)}
                  className="w-4 h-4 text-[#C8A96B] rounded-xs cursor-pointer"
                />
              </div>

              {/* Download Quality */}
              {allowDownloads && (
                <div className="border border-[#E8E0D0] p-4 rounded-xs bg-[#F8F6F0]">
                  <label className="block text-xs uppercase tracking-wider text-[#171717] mb-2 font-semibold">
                    Download Quality
                  </label>
                  <select
                    value={downloadQuality}
                    onChange={(e) => setDownloadQuality(e.target.value as DownloadQuality)}
                    className="w-full px-4 py-2 bg-white border border-[#E8E0D0] rounded-xs text-xs text-[#171717]"
                  >
                    <option value="HIGH">High Definition (Print Safe)</option>
                    <option value="ORIGINAL">Original Camera Raw / Uncompressed</option>
                    <option value="WEB">Web Optimized (Fast Mobile Download)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: Review & Publish */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-serif text-2xl text-[#171717] font-normal">
                Review Collection Details
              </h3>
              <p className="text-xs text-[#77736B] mt-1 font-light">
                Verify all metadata before publishing or saving this collection.
              </p>
            </div>

            <div className="bg-[#F8F6F0] border border-[#E8E0D0] p-6 rounded-xs space-y-4 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E8E0D0]">
                <span className="text-[#77736B] uppercase tracking-wider">Title</span>
                <span className="font-serif text-base text-[#171717] font-semibold">{title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E8E0D0]">
                <span className="text-[#77736B] uppercase tracking-wider">Destination URL</span>
                <span className="font-mono text-[#C8A96B]">/a/{slug}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E8E0D0]">
                <span className="text-[#77736B] uppercase tracking-wider">Event Details</span>
                <span>{eventType} &bull; {eventDate} &bull; {location}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E8E0D0]">
                <span className="text-[#77736B] uppercase tracking-wider">Visibility</span>
                <span className="font-semibold">{visibility}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#77736B] uppercase tracking-wider">Downloads</span>
                <span>{allowDownloads ? `Enabled (${downloadQuality})` : 'Disabled'}</span>
              </div>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200 text-amber-900 rounded-xs text-xs flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#C8A96B] shrink-0" />
              <span>
                Publishing this album immediately activates the permanent QR code link and makes the memories accessible to guests.
              </span>
            </div>
          </div>
        )}

        {/* Stepper Navigation Buttons */}
        <div className="mt-8 pt-6 border-t border-[#E8E0D0] flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1 || isSubmitting}
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < 5 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1))}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Next Step
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreateOrSave(false)}
                  isLoading={isSubmitting}
                >
                  Save as Draft
                </Button>
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => handleCreateOrSave(true)}
                  isLoading={isSubmitting}
                  leftIcon={<Globe className="w-3.5 h-3.5" />}
                >
                  Publish Album
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
