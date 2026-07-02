import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import PublicNavbar from "./components/layout/PublicNavbar";
import PublicFooter from "./components/layout/PublicFooter";
import { useSettingsContext } from "./context/settings-context";
import { useFavicon } from "./hooks/use-favicon";
import { Wrench } from "lucide-react";

const HomePage = lazy(() => import("./pages/public/HomePage"));
const ServicesPage = lazy(() => import("./pages/public/ServicesPage"));
const ServiceAreasPage = lazy(() => import("./pages/public/ServiceAreasPage"));
const AboutPage = lazy(() => import("./pages/public/AboutPage"));
const ContactPage = lazy(() => import("./pages/public/ContactPage"));
const PrivacyPage = lazy(() => import("./pages/public/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/public/TermsPage"));
const WarrantyPage = lazy(() => import("./pages/public/WarrantyPage"));

function PublicLayout({ children }: { children: React.ReactNode }) {
  const { settings } = useSettingsContext();
  useFavicon(settings.favicon_url);

  return (
    <div className="flex min-h-screen flex-col bg-warm-50 text-warm-900">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-warm-50">
      <div className="relative">
        <div className="h-10 w-10 rounded-lg border-2 border-copper-500 border-t-transparent animate-spin" />
        <Wrench className="absolute inset-0 m-auto h-4 w-4 text-copper-600" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          element={
            <PublicLayout>
              <Outlet />
            </PublicLayout>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/service-areas" element={<ServiceAreasPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/warranty" element={<WarrantyPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
