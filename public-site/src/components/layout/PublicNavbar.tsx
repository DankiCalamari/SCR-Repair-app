import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { useSettingsContext } from "../../context/settings-context";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/service-areas", label: "Areas" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { settings } = useSettingsContext();
  const businessName = settings.business_name || "Sunset Country Repairs";

  return (
    <header className="sticky top-0 z-50 border-b border-warm-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={settings.logo_url || "/logo.svg"} alt={businessName} className="h-7 w-auto object-contain" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "rounded px-3 py-1.5 text-sm transition-colors",
                location.pathname === link.to
                  ? "text-accent-600 font-medium"
                  : "text-warm-600 hover:text-warm-900",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded p-2 text-warm-600 hover:bg-warm-100 md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-warm-200 bg-white px-4 pb-3 md:hidden">
          <nav className="flex flex-col space-y-0.5 pt-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded px-3 py-2 text-sm transition-colors",
                  location.pathname === link.to
                    ? "text-accent-600 font-medium"
                    : "text-warm-600 hover:text-warm-900",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
