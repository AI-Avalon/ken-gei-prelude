import { Routes, Route } from 'react-router-dom';
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

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
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
        </Routes>
      </main>
      <Footer />
      <ToastContainer />
    </div>
  );
}
