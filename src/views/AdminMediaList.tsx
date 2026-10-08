import React, { useEffect, useState } from 'react';
import { Media, Album } from '../types';
import { getAlbums, getAlbumMedia } from '../services/albumService';
import { deleteMediaItem } from '../services/mediaService';
import { Button } from '../components/common/Button';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Film, Image as ImageIcon, Trash2, Filter } from 'lucide-react';

export const AdminMediaList: React.FC = () => {
  const { user, adminProfile } = useAuth();
  const { success, error } = useToast();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('all');
  const [allMedia, setAllMedia] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaToDelete, setMediaToDelete] = useState<Media | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const albList = await getAlbums();
      setAlbums(albList);

      let mediaAccumulator: Media[] = [];
      for (const a of albList) {
        const m = await getAlbumMedia(a.id);
        mediaAccumulator.push(...m);
      }
      setAllMedia(mediaAccumulator);
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

        {/* Album filter */}
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
          <p className="text-xs text-[#77736B] font-light">
            Upload photographs or video reels to an album to populate the studio catalog.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredMedia.map((item) => {
            const albumObj = albums.find((a) => a.id === item.albumId);
            const isVideo = item.type === 'VIDEO';

            return (
              <div
                key={item.id}
                className="group relative aspect-square bg-[#EFECE4] rounded-xs overflow-hidden border border-[#E8E0D0] hover:border-[#C8A96B] transition-all shadow-xs"
              >
                <img
                  src={item.thumbnailPath || item.storagePath}
                  alt={item.originalFileName}
                  className="w-full h-full object-cover"
                />

                {isVideo && (
                  <div className="absolute top-2 right-2 bg-black/60 text-[#C8A96B] p-1 rounded-xs">
                    <Film className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between text-white text-[10px]">
                  <div className="truncate font-semibold text-[#DCCB9A]">
                    {albumObj?.title || 'Album'}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="truncate max-w-[80px]">{item.originalFileName}</span>
                    <button
                      onClick={() => setMediaToDelete(item)}
                      className="p-1 text-red-400 hover:text-red-200 cursor-pointer"
                      title="Delete file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mediaToDelete && (
        <ConfirmDialog
          isOpen={!!mediaToDelete}
          onClose={() => setMediaToDelete(null)}
          onConfirm={handleDelete}
          title="Delete Media File?"
          description={`Permanently remove "${mediaToDelete.originalFileName}" from this collection.`}
          confirmLabel="Delete"
          isDestructive={true}
        />
      )}
    </div>
  );
};
