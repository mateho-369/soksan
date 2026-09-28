import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Discover from './pages/Discover';
import Rankings from './pages/Rankings';
import Clips from './pages/Clips';
import Messages from './pages/Messages';
import Partners from './pages/Partners';
import Profile from './pages/Profile';
import MerchantCenter from './pages/MerchantCenter';

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/rankings" element={<Rankings />} />
            <Route path="/clips" element={<Clips />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/merchant" element={<MerchantCenter />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </LanguageProvider>
  );
}
