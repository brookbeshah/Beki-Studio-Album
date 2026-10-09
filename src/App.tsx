import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { PublicHome } from './views/PublicHome';
import { AdminSidebar, AdminTab } from './components/admin/AdminSidebar';
import { AdminHeader } from './components/admin/AdminHeader';
import { QRCodeModal } from './components/admin/QRCodeModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LanguageProvider } from './context/LanguageContext';
import { Album } from './types';

// Code-split route-level bundles for blistering fast initial load
const PublicBrowse = lazy(() =>
  import('./views/PublicBrowse').then((m) => ({ default: m.PublicBrowse }))
);
const PublicAlbumView = lazy(() =>
  import('./views/PublicAlbumView').then((m) => ({ default: m.PublicAlbumView }))
);
const LegalPage = lazy(() =>
  import('./views/LegalPage').then((m) => ({ default: m.LegalPage }))
);
const AdminLogin = lazy(() =>
  import('./views/AdminLogin').then((m) => ({ default: m.AdminLogin }))
);
const AdminDashboard = lazy(() =>
  import('./views/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const AdminAlbumsList = lazy(() =>
  import('./views/AdminAlbumsList').then((m) => ({ default: m.AdminAlbumsList }))
);
const AdminAlbumEditor = lazy(() =>
  import('./views/AdminAlbumEditor').then((m) => ({ default: m.AdminAlbumEditor }))
);
const AdminAlbumDetail = lazy(() =>
  import('./views/AdminAlbumDetail').then((m) => ({ default: m.AdminAlbumDetail }))
);
const AdminMediaList = lazy(() =>
  import('./views/AdminMediaList').then((m) => ({ default: m.AdminMediaList }))
);
const AdminStudioContent = lazy(() =>
  import('./views/AdminStudioContent').then((m) => ({ default: m.AdminStudioContent }))
);
const AdminUsers = lazy(() =>
  import('./views/AdminUsers').then((m) => ({ default: m.AdminUsers }))
);
const AdminActivityLogs = lazy(() =>
  import('./views/AdminActivityLogs').then((m) => ({ default: m.AdminActivityLogs }))
);
const AdminSettings = lazy(() =>
  import('./views/AdminSettings').then((m) => ({ default: m.AdminSettings }))
);

const RouteLoadingFallback = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-150">
    <div className="w-8 h-8 rounded-full border-2 border-[#DCCB9A] border-t-[#171717] animate-spin mb-3" />
    <span className="text-[10px] uppercase tracking-[0.25em] text-[#77736B] font-mono">
      Beki's Studio
    </span>
  </div>
);

function parseAdminPath(path: string): { tab: AdminTab; albumId: string } {
  if (path === '/studio' || path === '/studio/dashboard') {
    return { tab: 'dashboard', albumId: '' };
  }
  if (path === '/studio/albums') {
    return { tab: 'albums', albumId: '' };
  }
  if (path === '/studio/albums/new') {
    return { tab: 'album-new', albumId: '' };
  }
  if (path.startsWith('/studio/albums/')) {
    const id = path.replace('/studio/albums/', '').split('/')[0];
    if (id) {
      return { tab: 'album-detail', albumId: id };
    }
  }
  if (path === '/studio/media') {
    return { tab: 'media', albumId: '' };
  }
  if (path === '/studio/content') {
    return { tab: 'content', albumId: '' };
  }
  if (path === '/studio/admins') {
    return { tab: 'admins', albumId: '' };
  }
  if (path === '/studio/activity') {
    return { tab: 'activity', albumId: '' };
  }
  if (path === '/studio/settings') {
    return { tab: 'settings', albumId: '' };
  }
  return { tab: 'dashboard', albumId: '' };
}

function AppContent() {
  const { user, isAuthorizedAdmin, loading } = useAuth();

  // Navigation State
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname || '/');
  const [adminTab, setAdminTab] = useState<AdminTab>(() => parseAdminPath(window.location.pathname || '/').tab);
  const [activeAlbumId, setActiveAlbumId] = useState<string>(() => parseAdminPath(window.location.pathname || '/').albumId);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Persistent sidebar collapse preference (desktop)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bekis_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('bekis_admin_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // QR Modal State
  const [qrModalAlbum, setQrModalAlbum] = useState<Album | null>(null);

  // Listen to browser forward/back buttons
  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname || '/';
      setCurrentPath(p);
      const { tab, albumId } = parseAdminPath(p);
      setAdminTab(tab);
      setActiveAlbumId(albumId);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Internal Router Navigate Function
  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    const { tab, albumId } = parseAdminPath(path);
    setAdminTab(tab);
    setActiveAlbumId(albumId);
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  };

  const handleSelectAdminTab = (tab: AdminTab) => {
    setAdminTab(tab);
    if (tab === 'dashboard') navigate('/studio/dashboard');
    else if (tab === 'albums') navigate('/studio/albums');
    else if (tab === 'album-new') navigate('/studio/albums/new');
    else if (tab === 'album-detail' && activeAlbumId) {
      navigate(`/studio/albums/${activeAlbumId}`);
    } else if (tab === 'media') navigate('/studio/media');
    else if (tab === 'content') navigate('/studio/content');
    else if (tab === 'admins') navigate('/studio/admins');
    else if (tab === 'activity') navigate('/studio/activity');
    else if (tab === 'settings') navigate('/studio/settings');
  };

  const handleOpenAlbumDetail = (albumId: string) => {
    setActiveAlbumId(albumId);
    setAdminTab('album-detail');
    navigate(`/studio/albums/${albumId}`);
  };

  const handleAdminTrigger = () => {
    navigate('/studio');
  };

  const handleShowQR = (album: Album) => {
    setQrModalAlbum(album);
  };

  // Route matching
  const isStudioRoute = currentPath.startsWith('/studio');
  const isAlbumRoute = currentPath.startsWith('/a/');
  const albumSlug = isAlbumRoute ? currentPath.replace(/^\/a\//, '').split('/')[0] : '';

  // 1. PUBLIC ALBUM VIEW (/a/:slug)
  if (isAlbumRoute && albumSlug) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <PublicAlbumView
          slug={albumSlug}
          onAdminTrigger={handleAdminTrigger}
          onGoHome={() => navigate('/')}
          onNavigate={navigate}
        />
        <QRCodeModal
          album={qrModalAlbum}
          isOpen={!!qrModalAlbum}
          onClose={() => setQrModalAlbum(null)}
        />
      </Suspense>
    );
  }

  // 2. DEDICATED PUBLIC BROWSE CATALOG (/albums)
  if (currentPath === '/albums') {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <PublicBrowse
          onAdminTrigger={handleAdminTrigger}
          onOpenAlbumSlug={(slug) => navigate(`/a/${slug}`)}
          onNavigate={navigate}
        />
        <QRCodeModal
          album={qrModalAlbum}
          isOpen={!!qrModalAlbum}
          onClose={() => setQrModalAlbum(null)}
        />
      </Suspense>
    );
  }

  // 3. PRIVACY & TERMS
  if (currentPath === '/privacy') {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <LegalPage
          type="privacy"
          onGoHome={() => navigate('/')}
          onAdminTrigger={handleAdminTrigger}
          onNavigate={navigate}
        />
      </Suspense>
    );
  }

  if (currentPath === '/terms') {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <LegalPage
          type="terms"
          onGoHome={() => navigate('/')}
          onAdminTrigger={handleAdminTrigger}
          onNavigate={navigate}
        />
      </Suspense>
    );
  }

  // 4. ADMIN STUDIO ROUTES (/studio)
  if (isStudioRoute) {
    if (loading) {
      return (
        <div className="min-h-screen bg-[#F8F6F0] flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#DCCB9A] border-t-[#C8A96B] rounded-full animate-spin mx-auto" />
            <p className="font-serif text-sm tracking-widest uppercase text-[#171717]">
              Verifying Studio Access...
            </p>
          </div>
        </div>
      );
    }

    // If not authenticated or not authorized, show Studio Login screen
    if (!user || !isAuthorizedAdmin) {
      return (
        <Suspense fallback={<RouteLoadingFallback />}>
          <AdminLogin
            onSuccess={() => {
              navigate('/studio');
            }}
            onGoBack={() => navigate('/')}
          />
        </Suspense>
      );
    }

    // Authenticated Admin Dashboard Layout
    return (
      <div className="min-h-screen bg-[#F8F6F0] flex text-[#171717]">
        {/* Desktop & Mobile Admin Sidebar */}
        <AdminSidebar
          currentTab={adminTab}
          onSelectTab={handleSelectAdminTab}
          isOpenMobile={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onPreviewSite={() => navigate('/')}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebarCollapse}
        />

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
          }`}
        >
          <AdminHeader
            title={
              adminTab === 'dashboard'
                ? 'Dashboard'
                : adminTab === 'albums'
                ? 'Albums & Events'
                : adminTab === 'album-new'
                ? 'New Album'
                : adminTab === 'album-detail'
                ? 'Album Details'
                : adminTab === 'media'
                ? 'Media Library'
                : adminTab === 'content'
                ? 'Homepage & Assets CMS'
                : adminTab === 'admins'
                ? 'Staff & Roles'
                : adminTab === 'activity'
                ? 'Activity Logs'
                : 'Studio Settings'
            }
            onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
            onCreateAlbum={() => navigate('/studio/albums/new')}
            onPreviewSite={() => navigate('/')}
            onNavigateToTab={(tab, options) => {
              if (tab === 'album-detail' && options?.albumId) {
                handleOpenAlbumDetail(options.albumId);
              } else {
                handleSelectAdminTab(tab as AdminTab);
              }
            }}
          />

          <main className="flex-1 pb-16">
            <Suspense fallback={<RouteLoadingFallback />}>
              {adminTab === 'dashboard' && (
                <AdminDashboard
                  onCreateAlbum={() => navigate('/studio/albums/new')}
                  onOpenAlbum={handleOpenAlbumDetail}
                  onShowQR={handleShowQR}
                  onPreviewPublic={(slug) => navigate(`/a/${slug}`)}
                />
              )}

              {adminTab === 'albums' && (
                <AdminAlbumsList
                  onCreateAlbum={() => navigate('/studio/albums/new')}
                  onOpenAlbum={handleOpenAlbumDetail}
                  onShowQR={handleShowQR}
                  onPreviewPublic={(slug) => navigate(`/a/${slug}`)}
                />
              )}

              {adminTab === 'album-new' && (
                <AdminAlbumEditor
                  existingAlbum={null}
                  onFinished={(id) => handleOpenAlbumDetail(id)}
                  onCancel={() => navigate('/studio/albums')}
                />
              )}

              {adminTab === 'album-detail' && activeAlbumId && (
                <AdminAlbumDetail
                  albumId={activeAlbumId}
                  onBack={() => navigate('/studio/albums')}
                  onShowQR={handleShowQR}
                  onPreviewPublic={(slug) => navigate(`/a/${slug}`)}
                />
              )}

              {adminTab === 'media' && <AdminMediaList />}

              {adminTab === 'content' && <AdminStudioContent />}

              {adminTab === 'admins' && <AdminUsers />}

              {adminTab === 'activity' && <AdminActivityLogs />}

              {adminTab === 'settings' && <AdminSettings />}
            </Suspense>
          </main>
        </div>

        {/* Global QR Code Modal */}
        <QRCodeModal
          album={qrModalAlbum}
          isOpen={!!qrModalAlbum}
          onClose={() => setQrModalAlbum(null)}
        />
      </div>
    );
  }

  // 5. PUBLIC BEKI'S STUDIO HOME (DEFAULT /)
  return (
    <>
      <PublicHome
        onAdminTrigger={handleAdminTrigger}
        onOpenAlbumSlug={(slug) => navigate(`/a/${slug}`)}
        onNavigate={navigate}
      />
      <QRCodeModal
        album={qrModalAlbum}
        isOpen={!!qrModalAlbum}
        onClose={() => setQrModalAlbum(null)}
      />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
