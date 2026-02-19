import { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router';
import './App.css';
import FileExplorer from './components/FileExplorer';
import Sidebar from './components/sidebar';
import TopBar from './components/topbar/topbar';
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import { useAuthStore } from './stores/authStore';
import NotificationBox from './components/Notifications/Cards';
import SharedFiles from './components/SharedFiles';
import DownloadPage from './components/DownloadPage';

// Layout for authenticated pages (topbar + sidebar + content)
function AuthenticatedLayout() {
  const { isLoggedIn, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div>
      <div className="grid h-screen w-full bg-[var(--bg-primary)] grid-cols-[280px_1fr] grid-rows-[56px_1fr] [grid-template-areas:'navbar_navbar'_'sidebar_main']">
        <div style={{ gridArea: 'navbar' }}>
          <TopBar />
        </div>
        <div style={{ gridArea: 'sidebar' }}>
          <Sidebar />
        </div>
        <div className="[grid-area:main] bg-[var(--bg-primary)] overflow-hidden flex flex-col">
          <Outlet />
        </div>
      </div>

      <NotificationBox />
    </div>
  );
}

// Redirect authenticated users away from login/register
function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}


function App() {
  const { checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<AuthRedirect><LoginPage /></AuthRedirect>} />
      <Route path="/register" element={<AuthRedirect><LoginPage isRegistering /></AuthRedirect>} />
      <Route path="/share/:shareId" element={<DownloadPage />} />
      <Route path="/s/:shareId" element={<DownloadPage />} />

      {/* Authenticated routes */}
      <Route element={<AuthenticatedLayout />}>
        <Route index element={<HomePage />} />
        <Route path="files/*" element={<FileExplorer />} />
        <Route path="shared" element={<SharedFiles />} />
      </Route>

      {/* Catch-all: redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;