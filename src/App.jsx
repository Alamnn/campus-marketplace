import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import { initStore, getUser } from './services/marketplaceStore';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SellPage = lazy(() => import('./pages/SellPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: '#64748B', fontSize: '0.875rem' }}>
      Loading...
    </div>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    initStore();
    return getUser();
  });

  useEffect(() => {
    const handler = () => setUser(getUser());
    window.addEventListener('store_update', handler);
    return () => window.removeEventListener('store_update', handler);
  }, []);

  return (
    <BrowserRouter>
      <Layout user={user} onUserChange={setUser}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage user={user} />} />
            <Route path="/login" element={<LoginPage onLogin={setUser} />} />
            <Route path="/register" element={<RegisterPage onLogin={setUser} />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/outlook-sso" element={<Navigate to="/login" replace />} />
            <Route path="/profile" element={<ProfilePage user={user} />} />
            <Route path="/settings" element={<SettingsPage user={user} onUserChange={setUser} />} />
            <Route path="/sell" element={<SellPage user={user} />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/admin" element={<AdminPage user={user} />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
