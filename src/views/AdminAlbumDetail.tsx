import React, { useEffect, useState, useRef } from 'react';
import { Album, Media, AlbumSection, ActivityLog, AlbumStatus, getMediaSource } from '../types';
import {
  getAlbumById,
  getAlbumMedia,
  getAlbumSections,
  createAlbumSection,
  deleteMultipleMedia,
  updateAlbum,
} from '../services/albumService';
import { deleteMediaItem, subscribeAlbumMedia, validateImageUrl } from '../services/mediaService';
import { Button } from '../components/common/Button';
import { StatusBadge, VisibilityBadge } from '../components/common/Badge';
import { BulkUploader } from '../components/admin/BulkUploader';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ArrowLeft,
  QrCode,
  ExternalLink,
  Upload,
  Globe,
  Trash2,
  Play,
  Check,
  Plus,
  Eye,
  Settings as SettingsIcon,
  Image as ImageIcon,
  Layers,
  Sparkles,
} from 'lucide-react';

interface AdminAlbumDetailProps {
  albumId: string;
  onBack: () => void;
  onShowQR: (album: Album) => void;
  onPreviewPublic: (slug: string) => void;
}

export const AdminAlbumDetail: React.FC<AdminAlbumDetailProps> = ({
  albumId,
  onBack,
  onShowQR,
  onPreviewPublic,
}) => {
  const { user, adminProfile } = useAuth();
  const { success, error, info } = useToast();

  const [album, setAlbum] = useState<Album | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [sections, setSections] = useState<AlbumSection[]>([]);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'gallery' | 'videos' | 'upload' | 'sections' | 'settings'
  >('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Bulk Media Selection
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [mediaToDelete, setMediaToDelete] = useState<Media | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);

  // New Section Form
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);

  // Cover image upload & URL
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [isSettingCoverUrl, setIsSettingCoverUrl] = useState(false);
  const [coverModalTab, setCoverModalTab] = useState<'upload' | 'url' | 'album'>('upload');

  const handleUploadCover = async (file: File) => {
    if (!album) return;
    setIsUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('albumId', album.id);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        const actor = {
          id: user?.uid || 'admin',
          name: adminProfile?.name || 'Administrator',
          email: adminProfile?.email || 'admin@bekisstudio.com',
        };
        await updateAlbum(album.id, { coverImageUrl: data.url }, actor);
        setAlbum((prev) => (prev ? { ...prev, coverImageUrl: data.url } : prev));
        success('Album cover photograph updated!');
        setShowCoverModal(false);
      } else {
        error('Failed to upload cover photograph');
      }
    } catch (e: any) {
      error(e.message || 'Error uploading cover');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSetCoverFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!album || !coverUrlInput.trim() || isSettingCoverUrl) return;
    setIsSettingCoverUrl(true);
    try {
      const validation = validateImageUrl(coverUrlInput.trim());
      if (!validation.valid) {
        error(validation.error || 'Invalid image URL');
        setIsSettingCoverUrl(false);
        return;
      }
      const actor = {
        id: user?.uid || 'admin',
        name: adminProfile?.name || 'Administrator',
        email: adminProfile?.email || 'admin@bekisstudio.com',
      };
      await updateAlbum(album.id, { coverImageUrl: validation.normalized }, actor);
      setAlbum((prev) => (prev ? { ...prev, coverImageUrl: validation.normalized } : prev));
      success('Album cover updated from URL!');
      setShowCoverModal(false);
      setCoverUrlInput('');
    } catch (e: any) {
      error(e.message || 'Failed to update cover');
    } finally {
      setIsSettingCoverUrl(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const alb = await getAlbumById(albumId);
      if (alb) {
        setAlbum(alb);
        const [mList, sList] = await Promise.all([
          getAlbumMedia(alb.id),
          getAlbumSections(alb.id),
        ]);
        setMedia(mList);
        setSections(sList);
      }
    } catch (err) {
      console.error('Error loading album details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeAlbumMedia(albumId, (realtimeMedia) => {
      setMedia(realtimeMedia);
    });
    return () => unsubscribe();
  }, [albumId]);

  const handleTogglePublish = async () => {
    if (!album) return;
    const newStatus: AlbumStatus = album.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      const actor = {
        id: user?.uid || 'admin',
        name: adminProfile?.name || 'Administrator',
        email: adminProfile?.email || 'admin@bekisstudio.com',
      };
      await updateAlbum(album.id, { status: newStatus }, actor);
      setAlbum({ ...album, status: newStatus });
      success(newStatus === 'PUBLISHED' ? 'Album published!' : 'Album set to draft');
    } catch {
      error('Failed to change publish status');
    }
  };

  const handleSetCover = async (mediaItem: Media) => {
    if (!album) return;
    try {
      const actor = {
        id: user?.uid || 'admin',
        name: adminProfile?.name || 'Administrator',
        email: adminProfile?.email || 'admin@bekisstudio.com',
      };
      await updateAlbum(album.id, { coverImageUrl: mediaItem.storagePath }, actor);
      setAlbum({ ...album, coverImageUrl: mediaItem.storagePath });
      success('Cover photograph updated');
    } catch {
      error('Failed to update cover');
    }
  };

  const handleDeleteSingleMedia = async () => {
    if (!mediaToDelete || !album) return;
    setIsDeletingMedia(true);
    try {
      const actor = {
        id: user?.uid || 'admin',
        name: adminProfile?.name || 'Administrator',
        email: adminProfile?.email || 'admin@bekisstudio.com',
      };
      await deleteMediaItem(mediaToDelete.id, album.id, actor);
      success('Media removed from album');
      setMediaToDelete(null);
      loadData();
    } catch {
      error('Failed to delete media');
    } finally {
      setIsDeletingMedia(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (!album || selectedMediaIds.length === 0) return;
    setIsDeletingMedia(true);
    try {
      const actor = {
        id: user?.uid || 'admin',
        name: adminProfile?.name || 'Administrator',
        email: adminProfile?.email || 'admin@bekisstudio.com',
      };
      await deleteMultipleMedia(selectedMediaIds, album.id, actor);
      success(`Removed ${selectedMediaIds.length} media items.`);
      setSelectedMediaIds([]);
      setShowBulkDeleteConfirm(false);
      loadData();
    } catch {
      error('Bulk deletion failed');
    } finally {
      setIsDeletingMedia(false);
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!album || !newSectionTitle.trim()) return;
    try {
      await createAlbumSection(album.id, newSectionTitle.trim());
      setNewSectionTitle('');
      setShowAddSection(false);
      success('Album section created');
      loadData();
    } catch {
      error('Failed to create section');
    }
  };

  const toggleSelectMedia = (id: string) => {
    setSelectedMediaIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllMedia = () => {
    if (selectedMediaIds.length === media.length) {
      setSelectedMediaIds([]);
    } else {
      setSelectedMediaIds(media.map((m) => m.id));
    }
  };

  if (isLoading || !album) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-4 animate-pulse">
        <div className="h-6 w-32 bg-[#EFECE4] rounded-xs" />
        <div className="h-10 w-80 bg-[#EFECE4] rounded-xs" />
        <div className="h-64 bg-[#EFECE4] rounded-xs" />
      </div>
    );
  }

  const photos = media.filter((m) => m.type === 'PHOTO');
  const videos = media.filter((m) => m.type === 'VIDEO');

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E0D0]">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 text-[#77736B] hover:text-[#171717] hover:bg-[#EFECE4] rounded-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge status={album.status} />
              <VisibilityBadge visibility={album.visibility} />
            </div>
            <h2
              className="font-serif text-3xl sm:text-4xl text-[#171717] font-normal tracking-wide mt-1"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {album.title}
            </h2>
            <p className="text-xs text-[#77736B] font-light">
              {album.eventType} &bull; {album.eventDate} &bull; {album.location} &bull;{' '}
              <span className="font-mono text-[#C8A96B]">/a/{album.slug}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onShowQR(album)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#FCFBF8] border border-[#E8E0D0] hover:border-[#C8A96B] rounded-xs text-xs uppercase tracking-wider text-[#171717] transition-colors cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-[#C8A96B]" />
            <span>QR Card</span>
          </button>

          <button
            onClick={() => onPreviewPublic(album.slug)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#FCFBF8] border border-[#E8E0D0] hover:border-[#C8A96B] rounded-xs text-xs uppercase tracking-wider text-[#171717] transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Preview Guest View</span>
          </button>

          <Button
            variant={album.status === 'PUBLISHED' ? 'outline' : 'gold'}
            size="sm"
            onClick={handleTogglePublish}
            leftIcon={<Globe className="w-3.5 h-3.5" />}
          >
            {album.status === 'PUBLISHED' ? 'Unpublish' : 'Publish Album'}
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-[#E8E0D0] overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'gallery', label: `Gallery (${photos.length})` },
          { id: 'videos', label: `Videos (${videos.length})` },
          { id: 'upload', label: 'Upload' },
          { id: 'sections', label: `Sections (${sections.length})` },
          { id: 'settings', label: 'Settings' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-xs uppercase tracking-widest font-medium transition-all shrink-0 cursor-pointer border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-[#C8A96B] text-[#171717]'
                : 'border-transparent text-[#77736B] hover:text-[#171717]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Cover Hero Banner Card */}
            <div className="relative aspect-21/9 rounded-xs overflow-hidden border border-[#E8E0D0] bg-[#EFECE4] shadow-xs group">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleUploadCover(file);
                    e.target.value = '';
                  }
                }}
              />

              {album.coverImageUrl ? (
                <img
                  src={album.coverImageUrl}
                  alt={album.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#77736B]">
                  <ImageIcon className="w-12 h-12 opacity-40" />
                </div>
              )}

              {/* Cover Upload action button */}
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={isUploadingCover}
                className="absolute top-3 right-3 z-10 px-3 py-1.5 bg-black/60 hover:bg-black/80 text-white rounded-xs text-[11px] uppercase tracking-wider backdrop-blur-xs border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Upload className="w-3.5 h-3.5 text-[#C8A96B]" />
                <span>{isUploadingCover ? 'Uploading...' : 'Change Cover Photo'}</span>
              </button>

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-6 text-white pointer-events-none">
                <span className="text-[10px] tracking-[0.25em] uppercase text-[#DCCB9A]">
                  Cover Photograph
                </span>
                <h3 className="font-serif text-3xl font-normal">{album.title}</h3>
                <p className="text-xs text-white/80 font-light mt-0.5">
                  "{album.welcomeMessage}"
                </p>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-4 rounded-xs text-center shadow-2xs">
                <span className="text-[10px] uppercase tracking-wider text-[#77736B]">Total Media</span>
                <p className="font-serif text-3xl text-[#171717] mt-1">{media.length}</p>
              </div>
              <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-4 rounded-xs text-center shadow-2xs">
                <span className="text-[10px] uppercase tracking-wider text-[#77736B]">Photographs</span>
                <p className="font-serif text-3xl text-[#171717] mt-1">{photos.length}</p>
              </div>
              <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-4 rounded-xs text-center shadow-2xs">
                <span className="text-[10px] uppercase tracking-wider text-[#77736B]">Video Reels</span>
                <p className="font-serif text-3xl text-[#171717] mt-1">{videos.length}</p>
              </div>
            </div>
          </div>

          {/* Quick Info Sidebar */}
          <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-6 rounded-xs shadow-2xs space-y-4 text-xs">
            <h4 className="font-serif text-xl text-[#171717] font-normal pb-2 border-b border-[#E8E0D0]">
              Collection Metadata
            </h4>
            <div className="space-y-2">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#77736B]">Permanent URL</span>
                <p className="font-mono text-[#C8A96B] break-all">{`/a/${album.slug}`}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#77736B]">Date & Venue</span>
                <p className="text-[#171717]">{album.eventDate} &bull; {album.location}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#77736B]">Downloads</span>
                <p className="text-[#171717]">{album.allowDownloads ? `Enabled (${album.downloadQuality})` : 'Disabled'}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#77736B]">Created At</span>
                <p className="text-[#171717]">{new Date(album.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E8E0D0] space-y-2">
              <Button
                variant="gold"
                size="sm"
                onClick={() => setActiveTab('upload')}
                leftIcon={<Upload className="w-3.5 h-3.5" />}
                className="w-full"
              >
                Upload Media
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onShowQR(album)}
                leftIcon={<QrCode className="w-3.5 h-3.5" />}
                className="w-full"
              >
                Generate QR Cards
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: GALLERY & MEDIA */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FCFBF8] border border-[#E8E0D0] p-4 rounded-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={selectAllMedia}
                className="text-xs uppercase tracking-wider text-[#77736B] hover:text-[#171717] cursor-pointer"
              >
                {selectedMediaIds.length === media.length ? 'Deselect All' : 'Select All'}
              </button>
              {selectedMediaIds.length > 0 && (
                <span className="text-xs bg-[#171717] text-[#F8F6F0] px-2.5 py-0.5 rounded-xs font-mono">
                  {selectedMediaIds.length} selected
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedMediaIds.length > 0 && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Delete Selected ({selectedMediaIds.length})
                </Button>
              )}
              <Button
                variant="gold"
                size="sm"
                onClick={() => setActiveTab('upload')}
                leftIcon={<Upload className="w-3.5 h-3.5" />}
              >
                Upload More
              </Button>
            </div>
          </div>

          {/* Media Grid */}
          {photos.length === 0 ? (
            <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-12 text-center rounded-xs">
              <p className="font-serif text-xl text-[#77736B] italic mb-4">
                No photographs in this collection yet.
              </p>
              <Button variant="gold" size="sm" onClick={() => setActiveTab('upload')}>
                Upload Photographs
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {photos.map((item) => {
                const isSelected = selectedMediaIds.includes(item.id);
                const isCover = album.coverImageUrl === item.storagePath;

                return (
                  <div
                    key={item.id}
                    className={`relative aspect-square rounded-xs overflow-hidden border transition-all group ${
                      isSelected
                        ? 'border-[#C8A96B] ring-2 ring-[#C8A96B]'
                        : 'border-[#E8E0D0] hover:border-[#C8A96B]'
                    }`}
                  >
                    <img
                      src={item.thumbnailPath || item.storagePath}
                      alt={item.originalFileName}
                      className="w-full h-full object-cover"
                    />

                    {/* Checkbox select */}
                    <div
                      onClick={() => toggleSelectMedia(item.id)}
                      className={`absolute top-2 left-2 w-5 h-5 rounded-xs border flex items-center justify-center cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#C8A96B] border-[#C8A96B] text-[#171717]'
                          : 'bg-black/40 border-white/60 text-transparent hover:bg-black/60'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>

                    {/* Cover badge */}
                    {isCover && (
                      <span className="absolute bottom-2 left-2 bg-[#C8A96B] text-[#171717] px-1.5 py-0.5 rounded-xs text-[9px] font-semibold uppercase tracking-wider">
                        Cover
                      </span>
                    )}

                    {/* Hover actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                      {!isCover && (
                        <button
                          onClick={() => handleSetCover(item)}
                          className="p-1.5 bg-white/20 hover:bg-[#C8A96B] text-white hover:text-[#171717] rounded-xs transition-colors cursor-pointer"
                          title="Set as Album Cover"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setMediaToDelete(item)}
                        className="p-1.5 bg-white/20 hover:bg-red-700 text-white rounded-xs transition-colors cursor-pointer"
                        title="Delete photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: VIDEOS */}
      {activeTab === 'videos' && (
        <div className="space-y-6">
          {videos.length === 0 ? (
            <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-12 text-center rounded-xs">
              <Play className="w-8 h-8 text-[#C8A96B] mx-auto mb-3" />
              <p className="font-serif text-xl text-[#77736B] italic mb-4">
                No video moments uploaded yet.
              </p>
              <Button variant="gold" size="sm" onClick={() => setActiveTab('upload')}>
                Upload Video Reels
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((vid) => (
                <div
                  key={vid.id}
                  className="bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs overflow-hidden shadow-xs"
                >
                  <video
                    src={vid.storagePath}
                    controls
                    playsInline
                    className="w-full aspect-16/9 bg-black object-cover"
                  />
                  <div className="p-4 flex items-center justify-between text-xs">
                    <span className="font-medium truncate">{vid.originalFileName}</span>
                    <button
                      onClick={() => setMediaToDelete(vid)}
                      className="text-red-700 hover:text-red-900 p-1 cursor-pointer"
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

      {/* TAB CONTENT: UPLOAD */}
      {activeTab === 'upload' && (
        <BulkUploader
          albumId={album.id}
          sections={sections}
          onUploadFinished={() => {
            loadData();
            setActiveTab('gallery');
          }}
        />
      )}

      {/* TAB CONTENT: SECTIONS */}
      {activeTab === 'sections' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-2xl text-[#171717] font-normal">
                Curated Story Sections
              </h3>
              <p className="text-xs text-[#77736B] font-light">
                Group memories into moments like Ceremony, Portraits, Reception, and Celebration.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddSection(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Section
            </Button>
          </div>

          {showAddSection && (
            <form onSubmit={handleCreateSection} className="bg-[#FCFBF8] border border-[#E8E0D0] p-4 rounded-xs flex items-center gap-3">
              <input
                type="text"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="e.g. Ceremony / Reception / Getting Ready"
                className="flex-1 px-3 py-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs text-[#171717] focus:outline-none focus:border-[#C8A96B]"
                autoFocus
              />
              <Button variant="gold" size="sm" type="submit">
                Save Section
              </Button>
              <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddSection(false)}>
                Cancel
              </Button>
            </form>
          )}

          <div className="space-y-2">
            {sections.length === 0 ? (
              <p className="text-xs text-[#77736B] italic py-4">
                No sections defined. All memories will display together in the "All Memories" flow.
              </p>
            ) : (
              sections.map((sec, idx) => {
                const count = media.filter((m) => m.sectionId === sec.id).length;
                return (
                  <div
                    key={sec.id}
                    className="p-4 bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#F8F6F0] border border-[#E8E0D0] flex items-center justify-center font-mono text-[10px] text-[#C8A96B]">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-sm text-[#171717]">{sec.title}</span>
                    </div>
                    <span className="text-[#77736B]">{count} memories</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-6 rounded-xs space-y-6 max-w-xl text-xs">
          <h3 className="font-serif text-2xl text-[#171717] font-normal pb-3 border-b border-[#E8E0D0]">
            Album Configuration
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#77736B] mb-1">
                Welcome Message
              </label>
              <textarea
                rows={3}
                value={album.welcomeMessage || ''}
                onChange={(e) => setAlbum({ ...album, welcomeMessage: e.target.value })}
                className="w-full p-2.5 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs text-[#171717]"
              />
            </div>

            <Button
              variant="gold"
              size="sm"
              onClick={async () => {
                const actor = {
                  id: user?.uid || 'admin',
                  name: adminProfile?.name || 'Administrator',
                  email: adminProfile?.email || 'admin@bekisstudio.com',
                };
                await updateAlbum(album.id, { welcomeMessage: album.welcomeMessage }, actor);
                success('Settings updated');
              }}
            >
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* Delete Single Media Dialog */}
      {mediaToDelete && (
        <ConfirmDialog
          isOpen={!!mediaToDelete}
          onClose={() => setMediaToDelete(null)}
          onConfirm={handleDeleteSingleMedia}
          title="Delete this photograph?"
          description="Deleting this file removes it from the album collection and guest gallery."
          confirmLabel="Delete Media"
          isDestructive={true}
          isLoading={isDeletingMedia}
        />
      )}

      {/* Bulk Delete Confirm */}
      {showBulkDeleteConfirm && (
        <ConfirmDialog
          isOpen={showBulkDeleteConfirm}
          onClose={() => setShowBulkDeleteConfirm(false)}
          onConfirm={handleConfirmBulkDelete}
          title={`Delete ${selectedMediaIds.length} media items?`}
          description="This will permanently delete all selected items from this album."
          confirmLabel="Delete Selected"
          isDestructive={true}
          isLoading={isDeletingMedia}
        />
      )}
    </div>
  );
};
