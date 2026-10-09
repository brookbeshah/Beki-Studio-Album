import React, { useEffect } from 'react';
import { AuraLogo } from '../common/AuraLogo';
import { RoleBadge } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/LanguageContext';
import { LanguageSelector } from '../common/LanguageSelector';
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
  ChevronLeft,
  ChevronRight,
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onPreviewSite,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { adminProfile, role, isSuperAdmin, hasPermission, logout } = useAuth();

  const canCreateAlbum = isSuperAdmin || hasPermission('createAlbums');

  // Handle escape key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpenMobile) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenMobile, onCloseMobile]);

  // Base navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'albums', label: 'Albums & Events', icon: Images },
    { id: 'media', label: 'Media Library', icon: Film },
    { id: 'content', label: 'Homepage & Assets CMS', icon: Sparkles },
    ...(isSuperAdmin ? [{ id: 'admins', label: 'Administrators', icon: ShieldCheck }] : []),
    { id: 'activity', label: 'Activity Logs', icon: History },
    { id: 'settings', label: 'Studio Settings', icon: Settings },
  ];

  return (
    <>
      {/* ---------------------------------------------------- */}
      {/* MOBILE DRAWER BACKDROP */}
      {/* ---------------------------------------------------- */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity duration-300"
          onClick={onCloseMobile}
          aria-label="Close navigation drawer"
        />
      )}

      {/* ---------------------------------------------------- */}
      {/* SIDEBAR ASIDE CONTAINER */}
      {/* ---------------------------------------------------- */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#FCFBF8] border-r border-[#E8E0D0] flex flex-col justify-between transition-all duration-300 ease-in-out ${
          // Mobile drawer classes
          isOpenMobile ? 'translate-x-0 w-72 max-w-[85vw]' : '-translate-x-full lg:translate-x-0'
        } ${
          // Desktop width classes
          isCollapsed ? 'lg:w-20' : 'lg:w-72'
        }`}
        aria-label="Studio Administration Navigation"
      >
        {/* TOP: Brand Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-[#E8E0D0] flex items-center justify-between min-h-[72px]">
          {/* Brand Logo */}
          <div className="overflow-hidden flex items-center gap-3">
            {isCollapsed ? (
              <div className="w-10 h-10 flex items-center justify-center rounded-xs bg-[#171717] text-[#C8A96B] font-serif font-bold text-lg select-none mx-auto shadow-xs">
                B
              </div>
            ) : (
              <AuraLogo size="sm" stacked={false} showWordmark={true} />
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-[#77736B] hover:text-[#171717] p-1.5 rounded-xs hover:bg-[#EFECE4] transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop Retractable / Collapsible Control */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={`hidden lg:flex items-center justify-center w-7 h-7 rounded-xs border border-[#E8E0D0] bg-[#F8F6F0] hover:bg-white text-[#77736B] hover:text-[#171717] hover:border-[#C8A96B] transition-colors cursor-pointer shadow-2xs ${
                isCollapsed ? 'mx-auto mt-0' : ''
              }`}
              title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-[#C8A96B]" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-[#77736B]" />
              )}
            </button>
          )}
        </div>

        {/* CENTER: Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-5 space-y-1.5 scrollbar-thin">
          {/* Quick Create Album Action */}
          {canCreateAlbum && (
            <button
              onClick={() => {
                onSelectTab('album-new');
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-center gap-2 mb-5 px-3 py-2.5 bg-[#171717] text-[#F8F6F0] rounded-xs text-xs uppercase tracking-widest font-semibold hover:bg-[#2A2826] transition-all border border-[#171717] cursor-pointer shadow-xs group ${
                isCollapsed ? 'lg:px-2' : ''
              }`}
              title="Create Album"
            >
              <Plus className="w-4 h-4 text-[#C8A96B] group-hover:scale-110 transition-transform shrink-0" />
              {!isCollapsed && <span className="truncate">Create Album</span>}
            </button>
          )}

          {!isCollapsed && (
            <p className="px-3 text-[10px] uppercase tracking-[0.25em] text-[#A8A49C] font-semibold pb-1.5">
              Studio Management
            </p>
          )}

          {/* Nav List */}
          <nav className="space-y-1">
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
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xs text-xs tracking-wider uppercase transition-all duration-150 cursor-pointer group relative ${
                    isActive
                      ? 'bg-[#171717] text-[#F8F6F0] font-medium shadow-xs border-l-2 border-[#C8A96B]'
                      : 'text-[#77736B] hover:text-[#171717] hover:bg-[#EFECE4]/70'
                  } ${isCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#C8A96B]' : 'text-[#77736B] group-hover:text-[#171717]'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}

                  {/* Desktop Collapsed Tooltip Bubble */}
                  {isCollapsed && (
                    <span className="hidden lg:group-hover:block absolute left-full ml-3 px-2.5 py-1 bg-[#171717] text-[#F8F6F0] text-[11px] font-medium tracking-wider uppercase rounded-xs whitespace-nowrap z-50 shadow-md border border-[#C8A96B]/30 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="pt-4 mt-4 border-t border-[#E8E0D0]">
            <button
              onClick={() => {
                onPreviewSite();
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2 text-xs text-[#77736B] hover:text-[#171717] tracking-wider uppercase transition-colors cursor-pointer group relative rounded-xs hover:bg-[#EFECE4]/50 ${
                isCollapsed ? 'lg:justify-center lg:px-2' : ''
              }`}
              title={isCollapsed ? 'Public Experience' : undefined}
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#C8A96B] shrink-0" />
              {!isCollapsed && <span className="truncate">Public Experience</span>}

              {isCollapsed && (
                <span className="hidden lg:group-hover:block absolute left-full ml-3 px-2.5 py-1 bg-[#171717] text-[#F8F6F0] text-[11px] font-medium tracking-wider uppercase rounded-xs whitespace-nowrap z-50 shadow-md border border-[#C8A96B]/30 pointer-events-none">
                  Public Experience
                </span>
              )}
            </button>
          </div>
        </div>

        {/* BOTTOM: Signed-in User Info & Sign Out */}
        <div className="p-3.5 sm:p-4 border-t border-[#E8E0D0] bg-[#F8F6F0]/80">
          {!isCollapsed ? (
            <>
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
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => logout()}
                className="w-10 h-10 flex items-center justify-center rounded-xs text-[#77736B] hover:text-red-700 hover:bg-red-50/50 border border-[#E8E0D0] transition-colors cursor-pointer group relative"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:group-hover:block absolute left-full ml-3 px-2.5 py-1 bg-[#171717] text-[#F8F6F0] text-[11px] font-medium tracking-wider uppercase rounded-xs whitespace-nowrap z-50 shadow-md border border-[#C8A96B]/30 pointer-events-none">
                  Sign Out
                </span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
