import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import ToastContainer from './components/Toast';
import HomePage from './pages/HomePage';
import ConcertListPage from './pages/ConcertListPage';
import ConcertDetailPage from './pages/ConcertDetailPage';
import ConcertEditPage from './pages/ConcertEditPage';
import CalendarPage from './pages/CalendarPage';
import ArchivePage from './pages/ArchivePage';
import UploadPage from './pages/UploadPage';
import AdminPage from './pages/AdminPage';
import ContactPage from './pages/ContactPage';
import DocsPage from './pages/DocsPage';
import ApiDocsPage from './pages/ApiDocsPage';
import AboutPage from './pages/AboutPage';
import { Link } from 'react-router-dom';

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

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <NavBar />
      <main className="flex-1">
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
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <ToastContainer />
    </div>
  );
}
