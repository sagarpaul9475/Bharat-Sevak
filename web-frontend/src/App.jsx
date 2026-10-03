import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

// Pages
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';

// Admin
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminApprovals from './pages/admin/AdminApprovals';
import AdminMenuManager from './pages/admin/AdminMenuManager';
import AdminRegions from './pages/admin/AdminRegions';
import AdminUsers from './pages/admin/AdminUsers';
import AdminOrders from './pages/admin/AdminOrders';
import AdminReports from './pages/admin/AdminReports';
import AdminGrievances from './pages/admin/AdminGrievances';

// Provider
import ProviderLayout from './layouts/ProviderLayout';
import ProviderDashboard from './pages/provider/ProviderDashboard';
import ProviderProducts from './pages/provider/ProviderProducts';
import ProviderServices from './pages/provider/ProviderServices';
import ProviderOrders from './pages/provider/ProviderOrders';
import ProviderCoProviders from './pages/provider/ProviderCoProviders';
import ProviderProfile from './pages/provider/ProviderProfile';

// Customer
import CustomerLayout from './layouts/CustomerLayout';
import CustomerBrowse from './pages/customer/CustomerBrowse';
import CustomerOrders from './pages/customer/CustomerOrders';
import CustomerProfile from './pages/customer/CustomerProfile';
import CustomerGrievance from './pages/customer/CustomerGrievance';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'provider') return <Navigate to="/provider" replace />;
    return <Navigate to="/browse" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="approvals" element={<AdminApprovals />} />
        <Route path="menu-manager" element={<AdminMenuManager />} />
        <Route path="regions" element={<AdminRegions />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="grievances" element={<AdminGrievances />} />
      </Route>

      {/* Provider */}
      <Route path="/provider" element={<ProtectedRoute roles={['provider']}><ProviderLayout /></ProtectedRoute>}>
        <Route index element={<ProviderDashboard />} />
        <Route path="products" element={<ProviderProducts />} />
        <Route path="services" element={<ProviderServices />} />
        <Route path="orders" element={<ProviderOrders />} />
        <Route path="co-providers" element={<ProviderCoProviders />} />
        <Route path="profile" element={<ProviderProfile />} />
      </Route>

      {/* Customer */}
      <Route path="/browse" element={<CustomerLayout><CustomerBrowse /></CustomerLayout>} />
      <Route path="/orders" element={<ProtectedRoute><CustomerLayout><CustomerOrders /></CustomerLayout></ProtectedRoute>} />
      <Route path="/grievance" element={<ProtectedRoute><CustomerLayout><CustomerGrievance /></CustomerLayout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><CustomerLayout><CustomerProfile /></CustomerLayout></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1E293B', color: '#F8FAFC', border: '1px solid #334155' },
            success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
