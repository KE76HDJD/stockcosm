import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './hooks/useAuth';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { DashboardPage } from './pages/Dashboard';
import { ProduitsPage } from './pages/Produits';
import { CategoriesPage } from './pages/Categories';
import { NouvelleVentePage } from './pages/NouvelleVente';
import { VentesPage } from './pages/Ventes';
import { EntreesPage } from './pages/Entrees';
import { MouvementsPage } from './pages/Mouvements';
import { InventairePage } from './pages/Inventaire';
import { UtilisateursPage } from './pages/Utilisateurs';
import { ProfilPage } from './pages/Profil';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  if (isLoading) return null;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return user?.role === 'ADMIN' ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
            <Routes>
              <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<DashboardPage />} />
                <Route path="/produits" element={<ProduitsPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/ventes/nouvelle" element={<NouvelleVentePage />} />
                <Route path="/ventes" element={<VentesPage />} />
                <Route path="/entrees" element={<EntreesPage />} />
                <Route path="/mouvements" element={<MouvementsPage />} />
                <Route path="/inventaire" element={<InventairePage />} />
                <Route path="/utilisateurs" element={<AdminRoute><UtilisateursPage /></AdminRoute>} />
                <Route path="/profil" element={<ProfilPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
