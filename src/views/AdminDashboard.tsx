import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { StatusBadge, VisibilityBadge } from '../components/common/Badge';
import { Album, ActivityLog } from '../types';
import {
  getDashboardStats,
  getActivityLogs,
  seedDemoAlbumIfEmpty,
} from '../services/albumService';
import {
  Images,
  Camera,
  Film,
  Sparkles,
  ArrowRight,
  Plus,
  QrCode,
  ExternalLink,
  History,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface AdminDashboardProps {
  onCreateAlbum: () => void;
  onOpenAlbum: (albumId: string) => void;
  onShowQR: (album: Album) => void;
  onPreviewPublic: (slug: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onCreateAlbum,
  onOpenAlbum,
  onShowQR,
  onPreviewPublic,
}) => {
  const { adminProfile, isSuperAdmin, hasPermission } = useAuth();
  const { success, info } = useToast();
  const [stats, setStats] = useState<{
    totalAlbums: number;
    activeAlbums: number;
    publishedAlbums: number;
    totalPhotos: number;
    totalVideos: number;
    pendingUploads: number;
    recentAlbums: Album[];
  } | null>(null);
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const canCreate = isSuperAdmin || hasPermission('createAlbums');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getDashboardStats();
      const logs = await getActivityLogs(8);
      setStats(data);
      setRecentLogs(logs);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="h-8 bg-[#EFECE4] w-64 rounded-xs" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-[#EFECE4] rounded-xs" />
          ))}
        </div>
      </div>
    );
  }

  const hasAlbums = stats && stats.totalAlbums > 0;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-10">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E8E0D0]">
        <div>
          <span className="text-[11px] uppercase tracking-[0.3em] text-[#C8A96B] font-medium">
            Overview & Operations
          </span>
          <h2
            className="font-serif text-3xl sm:text-4xl text-[#171717] font-normal tracking-wide mt-1"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Welcome back, {adminProfile?.name?.split(' ')[0] || (isSuperAdmin ? 'Owner' : 'Administrator')}
          </h2>
          <p className="text-xs sm:text-sm text-[#77736B] font-light mt-1">
            Real-time status of Beki's Studio wedding collections and event deliveries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canCreate && (
            <Button
              variant="gold"
              size="md"
              onClick={onCreateAlbum}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Album
            </Button>
          )}
        </div>
      </div>

      {/* Real Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-5 sm:p-6 rounded-xs shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#77736B] font-medium">
              Active Albums
            </span>
            <div className="w-8 h-8 rounded-full bg-[#F8F6F0] border border-[#E8E0D0] flex items-center justify-center text-[#C8A96B]">
              <Images className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl sm:text-4xl text-[#171717] font-normal">
            {stats?.activeAlbums ?? 0}
          </div>
          <p className="text-[11px] text-[#A8A49C] mt-1">
            {stats?.publishedAlbums ?? 0} currently published
          </p>
        </div>

        <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-5 sm:p-6 rounded-xs shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#77736B] font-medium">
              Total Photos
            </span>
            <div className="w-8 h-8 rounded-full bg-[#F8F6F0] border border-[#E8E0D0] flex items-center justify-center text-[#C8A96B]">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl sm:text-4xl text-[#171717] font-normal">
            {stats?.totalPhotos.toLocaleString() ?? 0}
          </div>
          <p className="text-[11px] text-[#A8A49C] mt-1">Across all event stories</p>
        </div>

        <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-5 sm:p-6 rounded-xs shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#77736B] font-medium">
              Total Videos
            </span>
            <div className="w-8 h-8 rounded-full bg-[#F8F6F0] border border-[#E8E0D0] flex items-center justify-center text-[#C8A96B]">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl sm:text-4xl text-[#171717] font-normal">
            {stats?.totalVideos.toLocaleString() ?? 0}
          </div>
          <p className="text-[11px] text-[#A8A49C] mt-1">Cinematic reels preserved</p>
        </div>

        <div className="bg-[#FCFBF8] border border-[#E8E0D0] p-5 sm:p-6 rounded-xs shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#77736B] font-medium">
              Pending Jobs
            </span>
            <div className="w-8 h-8 rounded-full bg-[#F8F6F0] border border-[#E8E0D0] flex items-center justify-center text-[#C8A96B]">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl sm:text-4xl text-[#171717] font-normal">
            {stats?.pendingUploads ?? 0}
          </div>
          <p className="text-[11px] text-[#A8A49C] mt-1">All pipelines operational</p>
        </div>
      </div>

      {/* Main Content Area */}
      {!hasAlbums ? (
        <div className="bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs p-12 text-center max-w-2xl mx-auto shadow-xs my-8">
          <div className="w-16 h-16 rounded-full bg-[#F8F6F0] border border-[#E8E0D0] flex items-center justify-center text-[#C8A96B] mx-auto mb-4">
            <Images className="w-8 h-8" />
          </div>
          <h3 className="font-serif text-2xl sm:text-3xl text-[#171717] mb-2 font-normal">
            Your Beki's Studio is ready for its first story.
          </h3>
          <p className="text-sm text-[#77736B] max-w-md mx-auto mb-8 leading-relaxed font-light">
            Create an album for a wedding or celebration to generate a unique permanent URL,
            custom printable QR code card, and mobile guest experience.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {canCreate && (
              <Button variant="gold" size="md" onClick={onCreateAlbum} leftIcon={<Plus className="w-4 h-4" />}>
                Create Album
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Albums Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-2">
              <h3 className="font-serif text-2xl text-[#171717] font-normal">
                Recent Albums
              </h3>
              <button
                onClick={() => onOpenAlbum('')}
                className="text-xs uppercase tracking-wider text-[#77736B] hover:text-[#171717] flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {stats?.recentAlbums.map((album) => (
                <div
                  key={album.id}
                  className="bg-[#FCFBF8] border border-[#E8E0D0] hover:border-[#C8A96B] p-4 sm:p-5 rounded-xs transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {album.coverImageUrl ? (
                      <img
                        src={album.coverImageUrl}
                        alt={album.title}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xs border border-[#E8E0D0] shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#EFECE4] rounded-xs border border-[#E8E0D0] flex items-center justify-center text-[#77736B] shrink-0">
                        <Images className="w-6 h-6" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <StatusBadge status={album.status} />
                        <VisibilityBadge visibility={album.visibility} />
                      </div>
                      <h4 className="font-serif text-lg sm:text-xl text-[#171717] font-normal truncate group-hover:text-[#C8A96B] transition-colors">
                        {album.title}
                      </h4>
                      <p className="text-xs text-[#77736B] font-light truncate">
                        {album.eventType} &bull; {album.eventDate} &bull; {album.location || 'Location'}
                      </p>
                      <p className="text-[11px] text-[#A8A49C] mt-0.5 font-mono">
                        /a/{album.slug} &bull; {album.mediaCount} media
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => onShowQR(album)}
                      className="p-2 text-[#77736B] hover:text-[#171717] hover:bg-[#F8F6F0] rounded-xs transition-colors cursor-pointer border border-[#E8E0D0]"
                      title="View QR Code"
                    >
                      <QrCode className="w-4 h-4 text-[#C8A96B]" />
                    </button>

                    <button
                      onClick={() => onPreviewPublic(album.slug)}
                      className="p-2 text-[#77736B] hover:text-[#171717] hover:bg-[#F8F6F0] rounded-xs transition-colors cursor-pointer border border-[#E8E0D0]"
                      title="Preview public guest view"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenAlbum(album.id)}
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2">
              <h3 className="font-serif text-2xl text-[#171717] font-normal flex items-center gap-2">
                <History className="w-5 h-5 text-[#C8A96B]" />
                Recent Activity
              </h3>
            </div>

            <div className="bg-[#FCFBF8] border border-[#E8E0D0] rounded-xs p-4 sm:p-5 shadow-2xs divide-y divide-[#E8E0D0]/50">
              {recentLogs.length === 0 ? (
                <p className="text-xs text-[#77736B] py-6 text-center italic">
                  No recent activity logged yet.
                </p>
              ) : (
                recentLogs.map((log) => (
                  <div key={log.id} className="py-3 first:pt-0 last:pb-0 text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-[#171717] uppercase tracking-wider text-[10px] text-[#8C6D2C]">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-[#A8A49C]">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[#77736B] leading-relaxed truncate">
                      {log.details || log.targetType}
                    </p>
                    <p className="text-[10px] text-[#A8A49C] mt-0.5">
                      by {log.actorName || log.actorEmail}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
