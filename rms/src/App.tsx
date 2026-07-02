import { lazy, Suspense } from "react";
import {
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { useAuthStore } from "./store/auth-store";
import AdminSidebar from "./components/layout/AdminSidebar";
import { useFavicon } from "./hooks/use-favicon";

const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const SetupPage = lazy(() => import("./pages/auth/SetupPage"));

const PortalDashboardPage = lazy(() => import("./pages/portal/PortalDashboardPage"));
const PortalRepairDetailPage = lazy(() => import("./pages/portal/PortalRepairDetailPage"));
const PortalProfilePage = lazy(() => import("./pages/portal/PortalProfilePage"));

const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminRepairsPage = lazy(() => import("./pages/admin/AdminRepairsPage"));
const AdminCustomersPage = lazy(() => import("./pages/admin/AdminCustomersPage"));
const AdminQuotesPage = lazy(() => import("./pages/admin/AdminQuotesPage"));
const AdminInvoicesPage = lazy(() => import("./pages/admin/AdminInvoicesPage"));
const AdminSmsPage = lazy(() => import("./pages/admin/AdminSmsPage"));
const AdminEmailPage = lazy(() => import("./pages/admin/AdminEmailPage"));
const AdminWarrantyPage = lazy(() => import("./pages/admin/AdminWarrantyPage"));
const AdminLeadsPage = lazy(() => import("./pages/admin/AdminLeadsPage"));
const AdminSystemHealthPage = lazy(() => import("./pages/admin/AdminSystemHealthPage"));
const AdminRepairDetailPage = lazy(() => import("./pages/admin/AdminRepairDetailPage"));
const AdminCustomerDetailPage = lazy(() => import("./pages/admin/AdminCustomerDetailPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));
const AdminCommunicationsPage = lazy(() => import("./pages/admin/AdminCommunicationsPage"));

function CustomerRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isCustomer = useAuthStore((s) => s.isCustomer);
  if (!isAuthenticated || !isCustomer) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function StaffRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isStaff = useAuthStore((s) => s.isStaff);
  if (!isAuthenticated || !isStaff) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-warm-50 text-warm-900">{children}</div>;
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  useFavicon();
  return (
    <div className="flex min-h-screen bg-warm-900 text-warm-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-50">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-copper-500 border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth routes */}
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Customer portal routes */}
        <Route
          element={
            <CustomerRoute>
              <PortalLayout>
                <Outlet />
              </PortalLayout>
            </CustomerRoute>
          }
        >
          <Route path="/portal" element={<PortalDashboardPage />} />
          <Route path="/portal/repairs/:id" element={<PortalRepairDetailPage />} />
          <Route path="/portal/profile" element={<PortalProfilePage />} />
        </Route>

        {/* Staff/Admin routes */}
        <Route
          element={
            <StaffRoute>
              <AdminLayout>
                <Outlet />
              </AdminLayout>
            </StaffRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/repairs" element={<AdminRepairsPage />} />
          <Route path="/admin/customers" element={<AdminCustomersPage />} />
          <Route path="/admin/quotes" element={<AdminQuotesPage />} />
          <Route path="/admin/invoices" element={<AdminInvoicesPage />} />
          <Route path="/admin/sms" element={<AdminSmsPage />} />
          <Route path="/admin/email" element={<AdminEmailPage />} />
          <Route path="/admin/communications" element={<AdminCommunicationsPage />} />
          <Route path="/admin/warranty" element={<AdminWarrantyPage />} />
          <Route path="/admin/leads" element={<AdminLeadsPage />} />
          <Route path="/admin/system-health" element={<AdminSystemHealthPage />} />
          <Route path="/admin/repairs/:id" element={<AdminRepairDetailPage />} />
          <Route path="/admin/customers/:id" element={<AdminCustomerDetailPage />} />
        </Route>

        {/* Admin-only routes */}
        <Route
          element={
            <AdminRoute>
              <AdminLayout>
                <Outlet />
              </AdminLayout>
            </AdminRoute>
          }
        >
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}
