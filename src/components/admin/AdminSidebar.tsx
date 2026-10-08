import React from 'react';
import { AuraLogo } from '../common/AuraLogo';
import { RoleBadge } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Images,
  Film,
  ShieldCheck,
  History,
  Settings,
  Sparkles,
  LogOut,
  ExternalLink,
  Plus,
  X,
} from 'lucide-react';

export type AdminTab =
  | 'dashboard'
  | 'albums'
  | 'album-new'
  | 'album-detail'
  | 'media'
  | 'content'
  | 'admins'
  | 'activity'
  | 'settings';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onPreviewSite: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onPreviewSite,
}) => {
  const { adminProfile, role, isSuperAdmin, hasPermission, logout } = useAuth();

  const canCreateAlbum = isSuperAdmin || hasPermission('createAlbums');

  // Base navigation items: Administrators and Homepage Assets
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'albums', label: 'Albums', icon: Images },
    { id: 'media', label: 'Media Library', icon: Film },
    { id: 'content', label: 'Homepage & Assets', icon: Sparkles },
    ...(isSuperAdmin ? [{ id: 'admins', label: 'Administrators', icon: ShieldCheck }] : []),
    { id: 'activity', label: 'Activity Logs', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#FCFBF8] border-r border-[#E8E0D0] flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Brand Header */}
        <div className="p-6 border-b border-[#E8E0D0] flex items-center justify-between">
          <AuraLogo size="sm" stacked={false} showWordmark={true} />
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-[#77736B] hover:text-[#171717] p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center: Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {/* Create Album Action (if permitted) */}
          {canCreateAlbum && (
            <button
              onClick={() => {
                onSelectTab('album-new');
                onCloseMobile();
              }}
              className="w-full flex items-center justify-center gap-2 mb-6 px-4 py-2.5 bg-[#171717] text-[#F8F6F0] rounded-xs text-xs uppercase tracking-widest font-semibold hover:bg-[#2A2826] transition-colors border border-[#171717] cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#C8A96B]" />
              <span>Create Album</span>
            </button>
          )}

          <p className="px-3 text-[10px] uppercase tracking-[0.25em] text-[#A8A49C] font-medium pb-2">
            Studio Management
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentTab === item.id ||
              (item.id === 'albums' && (currentTab === 'album-detail' || currentTab === 'album-new'));

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id as AdminTab);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xs text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#171717] text-[#F8F6F0] font-medium shadow-xs border-l-2 border-[#C8A96B]'
                    : 'text-[#77736B] hover:text-[#171717] hover:bg-[#EFECE4]/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#C8A96B]' : 'text-[#77736B]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-6 mt-6 border-t border-[#E8E0D0]">
            <button
              onClick={() => {
                onPreviewSite();
                onCloseMobile();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2 text-xs text-[#77736B] hover:text-[#171717] tracking-wider uppercase transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#C8A96B]" />
              <span>Public Experience</span>
            </button>
          </div>
        </div>

        {/* Bottom: Signed-in User Details & Logout */}
        <div className="p-4 border-t border-[#E8E0D0] bg-[#F8F6F0]/80">
          <div className="flex items-center justify-between mb-3">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs font-semibold text-[#171717] truncate">
                {adminProfile?.name || (isSuperAdmin ? "Beki's Studio Owner" : 'Administrator')}
              </p>
              <p className="text-[10px] text-[#77736B] truncate font-mono">
                {adminProfile?.email}
              </p>
            </div>
            {role && <RoleBadge role={role} />}
          </div>

          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs tracking-wider uppercase text-[#77736B] hover:text-red-700 hover:bg-red-50/50 rounded-xs transition-colors cursor-pointer border border-[#E8E0D0]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
