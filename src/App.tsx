import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import { LoadingState } from './components/States';
import Home from './pages/Home';
import { LoginPage, RegisterPage } from './pages/Auth';

// Route-level code splitting: secondary pages load on demand.
const Discover = lazy(() => import('./pages/Discover'));
const Rankings = lazy(() => import('./pages/Rankings'));
const Clips = lazy(() => import('./pages/Clips'));
const Messages = lazy(() => import('./pages/Messages'));
const Partners = lazy(() => import('./pages/Partners'));
const Profile = lazy(() => import('./pages/Profile'));
const MerchantCenter = lazy(() => import('./pages/MerchantCenter'));
const BusinessRegister = lazy(() => import('./pages/BusinessRegister'));
const BusinessDashboard = lazy(() => import('./pages/BusinessDashboard'));

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          {/* Global accessibility gate: every Framer Motion animation below
              simplifies automatically for prefers-reduced-motion users. */}
          <MotionConfig reducedMotion="user">
          <Layout>
            <Suspense fallback={<LoadingState />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/rankings" element={<Rankings />} />
                <Route path="/clips" element={<Clips />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/partners" element={<Partners />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/merchant" element={<MerchantCenter />} />
                <Route path="/business/register" element={<BusinessRegister />} />
                <Route path="/business/dashboard" element={<BusinessDashboard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Layout>
          </MotionConfig>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
