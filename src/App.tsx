import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { PublicHome } from './views/PublicHome';
import { PublicBrowse } from './views/PublicBrowse';
import { PublicAlbumView } from './views/PublicAlbumView';
import { LegalPage } from './views/LegalPage';
import { AdminLogin } from './views/AdminLogin';
import { AdminSidebar, AdminTab } from './components/admin/AdminSidebar';
import { AdminHeader } from './components/admin/AdminHeader';
import { AdminDashboard } from './views/AdminDashboard';
import { AdminAlbumsList } from './views/AdminAlbumsList';
import { AdminAlbumEditor } from './views/AdminAlbumEditor';
import { AdminAlbumDetail } from './views/AdminAlbumDetail';
import { AdminMediaList } from './views/AdminMediaList';
import { AdminUsers } from './views/AdminUsers';
import { AdminActivityLogs } from './views/AdminActivityLogs';
import { AdminSettings } from './views/AdminSettings';
import { AdminStudioContent } from './views/AdminStudioContent';
import { QRCodeModal } from './components/admin/QRCodeModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LanguageProvider } from './context/LanguageContext';
import { Album } from './types';

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

  // QR Modal State
  const [qrModalAlbum, setQrModalAlbum] = useState<Album | null>(null);

  // Listen to browser forward/back buttons
  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname || '/';
      setCurrentPath(p);
      if (p.startsWith('/studio')) {
        const parsed = parseAdminPath(p);
        setAdminTab(parsed.tab);
        setActiveAlbumId(parsed.albumId);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    if (path.startsWith('/studio')) {
      const parsed = parseAdminPath(path);
      setAdminTab(parsed.tab);
      setActiveAlbumId(parsed.albumId);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Hidden 5-click admin entry gesture callback
  const handleAdminTrigger = () => {
    navigate('/studio');
  };

  const handleOpenAlbumDetail = (id: string) => {
    if (id) {
      navigate(`/studio/albums/${id}`);
    } else {
      navigate('/studio/albums');
    }
  };

  const handleSelectAdminTab = (tab: AdminTab) => {
    setAdminTab(tab);
    if (tab === 'dashboard') navigate('/studio');
    else if (tab === 'albums') navigate('/studio/albums');
    else if (tab === 'album-new') {
      setActiveAlbumId('');
      navigate('/studio/albums/new');
    } else if (tab === 'media') navigate('/studio/media');
    else if (tab === 'content') navigate('/studio/content');
    else if (tab === 'admins') navigate('/studio/admins');
    else if (tab === 'activity') navigate('/studio/activity');
    else if (tab === 'settings') navigate('/studio/settings');
  };

  const handleShowQR = (album: Album) => {
    setQrModalAlbum(album);
  };

  // Determine current route
  const isStudioRoute = currentPath.startsWith('/studio');
  const isAlbumRoute = currentPath.startsWith('/a/');
  const albumSlug = isAlbumRoute ? currentPath.replace(/^\/a\//, '').split('/')[0] : '';

  // 1. PUBLIC ALBUM VIEW (/a/:slug)
  if (isAlbumRoute && albumSlug) {
    return (
      <>
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
      </>
    );
  }

  // 2. DEDICATED PUBLIC BROWSE CATALOG (/albums)
  if (currentPath === '/albums') {
    return (
      <>
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
      </>
    );
  }

  // 3. PRIVACY & TERMS
  if (currentPath === '/privacy') {
    return (
      <LegalPage
        type="privacy"
        onGoHome={() => navigate('/')}
        onAdminTrigger={handleAdminTrigger}
        onNavigate={navigate}
      />
    );
  }

  if (currentPath === '/terms') {
    return (
      <LegalPage
        type="terms"
        onGoHome={() => navigate('/')}
        onAdminTrigger={handleAdminTrigger}
        onNavigate={navigate}
      />
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
        <AdminLogin
          onSuccess={() => {
            navigate('/studio');
          }}
          onGoBack={() => navigate('/')}
        />
      );
    }

    // Authenticated Admin Dashboard Layout
    return (
      <div className="min-h-screen bg-[#F8F6F0] flex">
        {/* Sidebar */}
        <AdminSidebar
          currentTab={adminTab}
          onSelectTab={handleSelectAdminTab}
          isOpenMobile={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onPreviewSite={() => navigate('/')}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
          <AdminHeader
            title={
              adminTab === 'dashboard'
                ? 'Dashboard'
                : adminTab === 'albums'
                ? 'Albums'
                : adminTab === 'album-new'
                ? 'Create New Album'
                : adminTab === 'album-detail'
                ? 'Album Details'
                : adminTab === 'media'
                ? 'Media Library'
                : adminTab === 'content'
                ? 'Homepage & Assets CMS'
                : adminTab === 'admins'
                ? 'Administrators'
                : adminTab === 'activity'
                ? 'Activity Logs'
                : 'Studio Settings'
            }
            onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
            onCreateAlbum={() => navigate('/studio/albums/new')}
            onPreviewSite={() => navigate('/')}
          />

          <main className="flex-1 pb-16">
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
