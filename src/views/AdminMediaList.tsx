import React, { useEffect, useState } from 'react';
import { Media, Album } from '../types';
import { getAlbums, getAlbumMedia } from '../services/albumService';
import { deleteMediaItem, addMultipleMediaFromUrls, validateImageUrl } from '../services/mediaService';
import { Button } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Film, Image as ImageIcon, Trash2, Filter, Link, Plus, X, CheckCircle2 } from 'lucide-react';

export const AdminMediaList: React.FC = () => {
  const { user, adminProfile } = useAuth();
  const { success, error } = useToast();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('all');
  const [allMedia, setAllMedia] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaToDelete, setMediaToDelete] = useState<Media | null>(null);

  // Quick Add By URL Modal State
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlAlbumId, setUrlAlbumId] = useState<string>('');
  const [urlInput, setUrlInput] = useState<string>('');
  const [urlAltText, setUrlAltText] = useState<string>('');
  const [isSubmittingUrl, setIsSubmittingUrl] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const albList = await getAlbums();
      setAlbums(albList);
      if (albList.length > 0 && !urlAlbumId) {
        setUrlAlbumId(albList[0].id);
      }

      // Parallel fetch to speed up loading dramatically
      const mediaResults = await Promise.all(
        albList.map((a) => getAlbumMedia(a.id).catch(() => []))
      );
      const combined = mediaResults.flat();
      setAllMedia(combined);
    } catch {
      console.error('Failed to load media library');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async () => {
    if (!mediaToDelete) return;
    try {
      const actor = {
        id: user?.uid || 'admin',
        name: adminProfile?.name || 'Administrator',
        email: adminProfile?.email || 'admin@bekisstudio.com',
      };
      await deleteMediaItem(mediaToDelete.id, mediaToDelete.albumId, actor);
      success('Media removed from library');
      setMediaToDelete(null);
      loadData();
    } catch {
      error('Failed to delete media');
    }
  };

  const handleAddFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlAlbumId || !urlInput.trim() || isSubmittingUrl) return;

    const urls = urlInput
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) {
      error('Please enter at least one valid image URL');
      return;
    }

    setIsSubmittingUrl(true);
    try {
      const actor = {
        id: user?.uid || 'admin',
        name: adminProfile?.name || 'Administrator',
        email: adminProfile?.email || 'admin@bekisstudio.com',
      };

      const added = await addMultipleMediaFromUrls({
        albumId: urlAlbumId,
        urls,
        altTextPrefix: urlAltText.trim() || 'Studio Photograph',
        actor,
      });

      if (added.length > 0) {
        success(`Added ${added.length} media items via URL!`);
        setShowUrlModal(false);
        setUrlInput('');
        setUrlAltText('');
        loadData();
      } else {
        error('Could not process any of the provided URLs. Check formatting.');
      }
    } catch (err: any) {
      error(err.message || 'Failed to add media from URLs');
    } finally {
      setIsSubmittingUrl(false);
    }
  };

  const filteredMedia =
    selectedAlbumId === 'all'
      ? allMedia
      : allMedia.filter((m) => m.albumId === selectedAlbumId);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E0D0]">
        <div>
          <span className="text-[11px] uppercase tracking-[0.3em] text-[#C8A96B] font-medium">
            Central Repository
          </span>
          <h2
            className="font-serif text-3xl text-[#171717] font-normal tracking-wide mt-0.5"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Studio Media Library
          </h2>
          <p className="text-xs text-[#77736B] font-light mt-1">
            Browse all uploaded photographs and videos across all active event collections.
          </p>
        </div>

        {/* Actions & Album filter */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="gold"
            size="sm"
            onClick={() => setShowUrlModal(true)}
            leftIcon={<Link className="w-3.5 h-3.5" />}
          >
            Add Media by URL
          </Button>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#77736B]" />
            <select
              value={selectedAlbumId}
              onChange={(e) => setSelectedAlbumId(e.target.value)}
              className="text-xs px-3 py-2 bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs text-[#171717] focus:outline-none focus:border-[#C8A96B]"
            >
              <option value="all">All Albums ({allMedia.length})</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.mediaCount || 0})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <p className="text-xs tracking-widest uppercase text-[#77736B] animate-pulse">
            Loading Media Catalog...
          </p>
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs p-12 text-center">
          <p className="font-serif text-xl text-[#171717] mb-2 font-normal">
            No media found in the library.
          </p>
          <p className="text-xs text-[#77736B] font-light mb-4">
            Upload photographs or add media via external image URLs to populate the catalog.
          </p>
          <Button
            variant="gold"
            size="sm"
            onClick={() => setShowUrlModal(true)}
            leftIcon={<Link className="w-3.5 h-3.5" />}
          >
            Add First Media via URL
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredMedia.map((item) => {
            const albumObj = albums.find((a) => a.id === item.albumId);
            const isVideo = item.type === 'VIDEO';

            return (
              <div
                key={item.id}
                className="group relative aspect-square bg-[#EFECE4] border border-[#E8E0D0] hover:border-[#C8A96B] rounded-xs overflow-hidden transition-all shadow-2xs"
              >
                {isVideo ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#171717] text-[#F8F6F0]">
                    <Film className="w-8 h-8 text-[#C8A96B] mb-1" />
                    <span className="text-[10px] tracking-widest uppercase text-[#DCCB9A]">Video</span>
                  </div>
                ) : (
                  <img
                    src={item.thumbnailPath || item.storagePath}
                    alt={item.originalFileName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                )}

                {/* Info Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-between text-white">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setMediaToDelete(item)}
                      className="p-1.5 bg-black/60 hover:bg-red-700 rounded-xs transition-colors cursor-pointer"
                      title="Delete from Library"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-[#DCCB9A] block truncate font-mono">
                      {albumObj?.title || 'Unknown Album'}
                    </span>
                    <p className="text-[11px] truncate font-light text-white/90">
                      {item.altText || item.originalFileName}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QUICK ADD BY URL MODAL */}
      {showUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowUrlModal(false)}
              className="absolute top-4 right-4 p-1 text-[#77736B] hover:text-[#171717] rounded-xs"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#C8A96B] font-semibold">
                Instant Addition
              </span>
              <h3 className="font-serif text-2xl text-[#171717] font-normal">
                Add Images / Videos by URL
              </h3>
              <p className="text-xs text-[#77736B] font-light mt-0.5">
                Fast, zero-upload media insertion into any active event album.
              </p>
            </div>

            <form onSubmit={handleAddFromUrl} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                  Select Target Album
                </label>
                <select
                  value={urlAlbumId}
                  onChange={(e) => setUrlAlbumId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#E8E0D0] rounded-xs text-[#171717] focus:border-[#C8A96B] outline-none"
                  required
                >
                  {albums.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.eventType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                  Image or Video URL(s)
                </label>
                <textarea
                  rows={4}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&#10;https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1600&#10;(Paste multiple URLs on new lines)"
                  className="w-full px-3 py-2 bg-white border border-[#E8E0D0] rounded-xs font-mono text-xs text-[#171717] focus:border-[#C8A96B] outline-none"
                  required
                />
                <span className="text-[10px] text-[#77736B] block mt-1">
                  Supports HTTPS image URLs (JPEG, PNG, WebP) and video URLs (MP4, WebM).
                </span>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-[#77736B] mb-1 font-medium">
                  Caption / Alt Text (Optional)
                </label>
                <input
                  type="text"
                  value={urlAltText}
                  onChange={(e) => setUrlAltText(e.target.value)}
                  placeholder="e.g. Wedding Reception Highlights"
                  className="w-full px-3 py-2 bg-white border border-[#E8E0D0] rounded-xs text-[#171717] focus:border-[#C8A96B] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8E0D0]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUrlModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  size="sm"
                  isLoading={isSubmittingUrl}
                  disabled={!urlInput.trim()}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  Add to Album
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {mediaToDelete && (
        <ConfirmDialog
          isOpen={!!mediaToDelete}
          onClose={() => setMediaToDelete(null)}
          onConfirm={handleDelete}
          title="Remove Media from Library?"
          description="Are you sure you want to delete this media item? It will be removed from its album and the public gallery."
          confirmLabel="Delete Media"
          isDestructive={true}
        />
      )}
    </div>
  );
};
