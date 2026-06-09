import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AdminRoute } from './components/AdminRoute';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import { GlobalLoader } from './components/ui/GlobalLoader';

// Helper to handle lazy loading failures when new versions are deployed
const lazyRetry = <T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) => {
  return lazy(async () => {
    try {
      const component = await componentImport();
      sessionStorage.removeItem('chunk-failed-retry');
      return component;
    } catch (error) {
      console.error("Failed to fetch dynamically imported module, forcing page reload:", error);
      const hasRetried = sessionStorage.getItem('chunk-failed-retry');
      if (!hasRetried) {
        sessionStorage.setItem('chunk-failed-retry', 'true');
        window.location.reload();
      }
      throw error;
    }
  });
};

// Lazy loading pages with retry protocol for zero-downtime hot redeploys
const Landing = lazyRetry(() => import('./pages/Landing'));
const Dashboard = lazyRetry(() => import('./pages/Dashboard'));
const Auth = lazyRetry(() => import('./pages/Auth'));
const CompanySettings = lazyRetry(() => import('./pages/CompanySettings'));
const CreateParty = lazyRetry(() => import('./pages/CreateParty'));
const UserProfile = lazyRetry(() => import('./pages/UserProfile'));
const PartyLedger = lazyRetry(() => import('./pages/LedgerView'));
const PartyReport = lazyRetry(() => import('./pages/PartyReport'));
const BalanceSheet = lazyRetry(() => import('./pages/BalanceSheet'));
const ProfitLossReport = lazyRetry(() => import('./pages/ProfitLossReport'));
const TransactionReport = lazyRetry(() => import('./pages/TransactionReport'));
const TransferEntry = lazyRetry(() => import('./pages/TransferEntry'));
const AdminLogin = lazyRetry(() => import('./pages/AdminLogin'));
const AdminDashboard = lazyRetry(() => import('./pages/AdminDashboard'));

// Global Fallback Loader
const PageLoader = () => <GlobalLoader fullScreen={false} />;

import { SubscriptionGate } from './components/SubscriptionGate';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <GlobalLoader fullScreen={false} />;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <SubscriptionGate>{children}</SubscriptionGate>;
};

const AppContent = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <GlobalLoader fullScreen={true} />;
  }

  const isLandingPage = location.pathname === '/';
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      {!isAdminPage && <Navbar />}
      
      <main className={`flex-grow w-full ${user ? 'pb-16 md:pb-0' : ''}`}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route 
              path="/" 
              element={user ? <Navigate to="/dashboard" replace /> : <Landing />} 
            />
            <Route 
              path="/auth" 
              element={user ? <Navigate to="/dashboard" replace /> : <Auth />} 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Settings & Profile Routes */}
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/configure/company" 
              element={
                <ProtectedRoute>
                  <CompanySettings />
                </ProtectedRoute>
              } 
            />
            
            {/* Party Management */}
            <Route 
              path="/create/party" 
              element={
                <ProtectedRoute>
                  <CreateParty />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/ledger" 
              element={
                <ProtectedRoute>
                  <PartyLedger />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reports/parties" 
              element={
                <ProtectedRoute>
                  <PartyReport />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reports/balance" 
              element={
                <ProtectedRoute>
                  <BalanceSheet />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reports/profit-loss" 
              element={
                <ProtectedRoute>
                  <ProfitLossReport />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reports/transactions" 
              element={
                <ProtectedRoute>
                  <TransactionReport />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/transfer-entry" 
              element={
                <ProtectedRoute>
                  <TransferEntry />
                </ProtectedRoute>
              } 
            />

            {/* Secure Admin Portal Routes */}
            <Route 
              path="/admin" 
              element={<AdminLogin />} 
            />
            <Route 
              path="/admin/dashboard" 
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } 
            />

            {/* Placeholder for missing pages */}
            <Route 
              path="*" 
              element={
                <div className="flex flex-col items-center justify-center py-20">
                  <h2 className="text-2xl font-bold text-slate-400">Page Coming Soon</h2>
                  <Link to="/" className="text-blue-600 font-bold mt-4">Go Back Home</Link>
                </div>
              } 
            />
          </Routes>
        </Suspense>
      </main>

      {isLandingPage && !user && !isAdminPage && <Footer />}
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </AdminProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

