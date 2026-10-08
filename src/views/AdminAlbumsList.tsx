import React, { useEffect, useState } from 'react';
import { Album, AlbumStatus, AlbumVisibility } from '../types';
import { getAlbums, subscribeAlbums, deleteAlbum, updateAlbum } from '../services/albumService';
import { Button } from '../components/common/Button';
import { StatusBadge, VisibilityBadge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Search,
  Plus,
  QrCode,
  ExternalLink,
  Trash2,
  Edit,
  Eye,
  Images,
  Globe,
  Lock,
} from 'lucide-react';

interface AdminAlbumsListProps {
  onCreateAlbum: () => void;
  onOpenAlbum: (albumId: string) => void;
  onShowQR: (album: Album) => void;
  onPreviewPublic: (slug: string) => void;
}

export const AdminAlbumsList: React.FC<AdminAlbumsListProps> = ({
  onCreateAlbum,
  onOpenAlbum,
  onShowQR,
  onPreviewPublic,
}) => {
  const { user, adminProfile } = useAuth();
  const { success, error } = useToast();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('ALL');

  // Deletion modal state
  const [albumToDelete, setAlbumToDelete] = useState<Album | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAlbums = async () => {
    setIsLoading(true);
    try {
      const data = await getAlbums();
      setAlbums(data);
    } catch (err) {
      console.error('Failed to load albums:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlbums();
    const unsubscribe = subscribeAlbums((updatedList) => {
      setAlbums(updatedList);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleTogglePublish = async (album: Album) => {
    const newStatus: AlbumStatus = album.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      const actor = {
        id: user?.uid || 'admin',
        name: adminProfile?.name || 'Administrator',
        email: adminProfile?.email || 'admin@bekisstudio.com',
      };
      await updateAlbum(album.id, { status: newStatus }, actor);
      success(newStatus === 'PUBLISHED' ? `Album "${album.title}" published!` : `Album unpublished`);
      loadAlbums();
    } catch (err) {
      error('Failed to update album status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!albumToDelete) return;
    setIsDeleting(true);
    try {
      const actor = {
        id: user?.uid || 'admin',
        name: adminProfile?.name || 'Administrator',
        email: adminProfile?.email || 'admin@bekisstudio.com',
      };
      await deleteAlbum(albumToDelete.id, actor);
      success(`Album "${albumToDelete.title}" and its media removed.`);
      setAlbumToDelete(null);
      loadAlbums();
    } catch (err) {
      error('Failed to delete album');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredAlbums = albums.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.slug.toLowerCase().includes(search.toLowerCase()) ||
      a.location.toLowerCase().includes(search.toLowerCase()) ||
      a.eventType.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchesVisibility = visibilityFilter === 'ALL' || a.visibility === visibilityFilter;

    return matchesSearch && matchesStatus && matchesVisibility;
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E0D0]">
        <div>
          <span className="text-[11px] uppercase tracking-[0.3em] text-[#C8A96B] font-medium">
            Story Archive
          </span>
          <h2
            className="font-serif text-3xl text-[#171717] font-normal tracking-wide mt-0.5"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Album Management
          </h2>
          <p className="text-xs text-[#77736B] font-light mt-1">
            Manage permanent links, privacy, media counts, and physical QR codes.
          </p>
        </div>

        <Button variant="gold" size="md" onClick={onCreateAlbum} leftIcon={<Plus className="w-4 h-4" />}>
          Create Album
        </Button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#FCFBF8] border border-[#E8E0D0] p-4 rounded-xs shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#77736B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by couple, slug, location, or event type..."
            className="w-full pl-9 pr-4 py-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-xs text-[#171717] placeholder-[#A8A49C] focus:outline-none focus:border-[#C8A96B]"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-[#171717] focus:outline-none focus:border-[#C8A96B]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="READY">Ready</option>
            <option value="UPLOADING">Uploading</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          {/* Visibility Filter */}
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-[#F8F6F0] border border-[#E8E0D0] rounded-xs text-[#171717] focus:outline-none focus:border-[#C8A96B]"
          >
            <option value="ALL">All Visibility</option>
            <option value="UNLISTED">Unlisted (Default)</option>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
          </select>
        </div>
      </div>

      {/* Album List View */}
      {isLoading ? (
        <div className="py-20 text-center">
          <p className="text-xs tracking-widest uppercase text-[#77736B] animate-pulse">
            Loading Albums...
          </p>
        </div>
      ) : filteredAlbums.length === 0 ? (
        <div className="bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs p-12 text-center my-6">
          <p className="font-serif text-xl text-[#171717] mb-2 font-normal">
            No albums match your filter criteria.
          </p>
          <p className="text-xs text-[#77736B] mb-6 font-light">
            Try adjusting your search terms or create a new event album.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setSearch(''); setStatusFilter('ALL'); setVisibilityFilter('ALL'); }}>
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAlbums.map((album) => {
            const isPublished = album.status === 'PUBLISHED';

            return (
              <div
                key={album.id}
                className="bg-[#FCFBF8] border border-[#E8E0D0] hover:border-[#C8A96B] rounded-xs overflow-hidden shadow-xs transition-all duration-300 flex flex-col justify-between group"
              >
                {/* Album Cover & Status Overlays */}
                <div className="relative aspect-16/10 bg-[#EFECE4] overflow-hidden">
                  {album.coverImageUrl ? (
                    <img
                      src={album.coverImageUrl}
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#77736B]">
                      <Images className="w-8 h-8 opacity-40" />
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <StatusBadge status={album.status} />
                    <VisibilityBadge visibility={album.visibility} />
                  </div>

                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs text-[#F8F6F0] px-2 py-0.5 rounded-xs text-[10px] tracking-widest font-mono">
                    {album.photoCount || 0}P / {album.videoCount || 0}V
                  </div>
                </div>

                {/* Content Metadata */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-[#C8A96B] font-medium">
                      {album.eventType}
                    </span>
                    <h3 className="font-serif text-2xl text-[#171717] font-normal truncate mt-0.5 mb-1 group-hover:text-[#C8A96B] transition-colors">
                      {album.title}
                    </h3>

                    <p className="text-xs text-[#77736B] font-light truncate">
                      {album.eventDate} &bull; {album.location || 'Location'}
                    </p>

                    <div className="mt-3 pt-3 border-t border-[#E8E0D0]/60 flex items-center justify-between text-[11px] text-[#77736B]">
                      <span className="font-mono text-[#171717] truncate">/a/{album.slug}</span>
                      <span>{album.mediaCount} memories</span>
                    </div>
                  </div>

                  {/* Action Buttons Toolbar */}
                  <div className="mt-5 pt-3 border-t border-[#E8E0D0] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onShowQR(album)}
                        className="p-2 text-[#77736B] hover:text-[#171717] hover:bg-[#F8F6F0] rounded-xs transition-colors cursor-pointer border border-[#E8E0D0]"
                        title="Generate Scannable QR & Print Card"
                      >
                        <QrCode className="w-4 h-4 text-[#C8A96B]" />
                      </button>

                      <button
                        onClick={() => onPreviewPublic(album.slug)}
                        className="p-2 text-[#77736B] hover:text-[#171717] hover:bg-[#F8F6F0] rounded-xs transition-colors cursor-pointer border border-[#E8E0D0]"
                        title="Preview Public Guest Experience"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleTogglePublish(album)}
                        className={`p-2 rounded-xs transition-colors cursor-pointer border border-[#E8E0D0] ${
                          isPublished
                            ? 'text-emerald-700 hover:bg-emerald-50'
                            : 'text-[#77736B] hover:text-[#171717] hover:bg-[#F8F6F0]'
                        }`}
                        title={isPublished ? 'Unpublish Album' : 'Publish Album'}
                      >
                        <Globe className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setAlbumToDelete(album)}
                        className="p-2 text-[#77736B] hover:text-red-700 hover:bg-red-50 rounded-xs transition-colors cursor-pointer border border-[#E8E0D0]"
                        title="Delete Album"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenAlbum(album.id)}
                      leftIcon={<Edit className="w-3.5 h-3.5" />}
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Safety Dialog */}
      {albumToDelete && (
        <ConfirmDialog
          isOpen={!!albumToDelete}
          onClose={() => setAlbumToDelete(null)}
          onConfirm={handleConfirmDelete}
          title={`Delete "${albumToDelete.title}"?`}
          description="This action will permanently delete this album, its permanent QR code link, and all associated photography and videos. This operation cannot be undone."
          requireTypingText={albumToDelete.title}
          confirmLabel="Permanently Delete Album"
          isDestructive={true}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};
