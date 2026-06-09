import { Routes, Route, useLocation, Link, useNavigationType, useNavigate } from 'react-router-dom';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import NavBar from './components/NavBar';
import MobileTabBar from './components/MobileTabBar';
import Footer from './components/Footer';
import ToastContainer from './components/Toast';
import Logo from './components/Logo';
import { useIsMobile } from './hooks/useDevice';
import LoadingMetronome from './components/LoadingMetronome';

const HomePage = lazy(() => import('./pages/HomePage'));
const ConcertListPage = lazy(() => import('./pages/ConcertListPage'));
const ConcertDetailPage = lazy(() => import('./pages/ConcertDetailPage'));
const ConcertEditPage = lazy(() => import('./pages/ConcertEditPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const ArchivePage = lazy(() => import('./pages/ArchivePage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const DocsPage = lazy(() => import('./pages/DocsPage'));
const ApiDocsPage = lazy(() => import('./pages/ApiDocsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const DainagonPage = lazy(() => import('./pages/DainagonPage'));
const StudentToolsPage = lazy(() => import('./pages/StudentToolsPage'));
const SECRET_DAINAGON_PATH = '/solfege/after-hours/86b7';

function NotFoundPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <p className="text-5xl font-display text-primary-300 mb-4">♪</p>
      <h1 className="text-3xl font-serif font-bold mb-4 text-stone-900">404 — ページが見つかりません</h1>
      <p className="text-stone-500 mb-8">お探しのページは存在しないか、移動された可能性があります。</p>
      <div className="flex gap-4 justify-center">
        <Link to="/" className="btn-primary">トップページへ</Link>
        <Link to="/concerts" className="btn-secondary">演奏会一覧へ</Link>
      </div>
    </div>
  );
}

function PageFallback() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16" aria-live="polite" aria-busy="true">
      <LoadingMetronome label="ページを準備しています..." />
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/concerts" element={<ConcertListPage />} />
        <Route path="/concerts/:slug" element={<ConcertDetailPage />} />
        <Route path="/concerts/:slug/edit" element={<ConcertEditPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/archive" element={<ArchivePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/docs/api" element={<ApiDocsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path={SECRET_DAINAGON_PATH} element={<DainagonPage />} />
        <Route path="/student-tools" element={<StudentToolsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

function EasterEggs() {
  const navigate = useNavigate();
  const bufferRef = useRef('');
  const tapsRef = useRef(0);
  const tapTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length !== 1) return;
      bufferRef.current = `${bufferRef.current}${event.key.toLowerCase()}`.slice(-24);
      if (bufferRef.current.endsWith('dainagon')) {
        navigate(SECRET_DAINAGON_PATH);
      }
      if (bufferRef.current.endsWith('bravo')) {
        document.documentElement.classList.add('egg-bravo');
        window.setTimeout(() => document.documentElement.classList.remove('egg-bravo'), 1800);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  const tap = () => {
    tapsRef.current += 1;
    if (tapTimerRef.current) window.clearTimeout(tapTimerRef.current);
    tapTimerRef.current = window.setTimeout(() => { tapsRef.current = 0; }, 1200);
    if (tapsRef.current >= 7) {
      tapsRef.current = 0;
      navigate(SECRET_DAINAGON_PATH);
    }
  };

  return (
    <button
      type="button"
      aria-label="."
      onClick={tap}
      className="fixed right-0 top-0 z-[60] h-3 w-3 opacity-0"
      tabIndex={-1}
    />
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const navTypeRef = useRef(navigationType);
  navTypeRef.current = navigationType;

  useEffect(() => {
    // Skip scroll-to-top on back/forward navigation — page will restore its own scroll
    if (navTypeRef.current !== 'POP') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Disable browser native scroll restoration (we handle it manually)
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  return null;
}

// Page transition wrapper — animates on route change
function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [displayKey, setDisplayKey] = useState(location.key);
  const [animClass, setAnimClass] = useState('animate-page-enter');

  useEffect(() => {
    setAnimClass('');
    const frame = requestAnimationFrame(() => {
      setDisplayKey(location.key);
      setAnimClass('animate-page-enter');
    });
    return () => cancelAnimationFrame(frame);
  }, [location.key]);

  return (
    <div key={displayKey} className={animClass}>
      {children}
    </div>
  );
}

export default function App() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className={`min-h-screen flex flex-col ${isMobile && !isAdminPage ? 'pb-14' : ''}`}>
      <ScrollToTop />
      <EasterEggs />
      {/* Desktop: top navbar, Mobile: simplified top bar + bottom tabs */}
      {isMobile ? (
        !isAdminPage && (
          <header className="bg-navy-900/95 border-b border-primary-800/20 sticky top-0 z-50 backdrop-blur-xl h-12 flex items-center justify-center">
            <Logo compact showSubtitle={false} />
          </header>
        )
      ) : (
        <NavBar />
      )}
      <main className="flex-1">
        {isMobile ? (
          <AppRoutes />
        ) : (
          <PageTransition>
            <AppRoutes />
          </PageTransition>
        )}
      </main>
      {isMobile ? (!isAdminPage && <MobileTabBar />) : <Footer />}
      <ToastContainer />
    </div>
  );
}
