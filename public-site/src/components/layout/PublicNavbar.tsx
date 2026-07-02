import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Wrench, Phone, Mail } from "lucide-react";
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
  const businessPhone = settings.business_phone || "03 5023 0000";

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b-2 border-copper-200 shadow-sm">
      {/* Top bar with contact info - hand-written style */}
      <div className="hidden md:block bg-copper-50 border-b border-copper-100">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex items-center justify-end gap-6 py-2 text-xs">
          <div className="flex items-center gap-1.5 text-copper-700">
            <Phone className="h-3 w-3" />
            <span>Call us: {businessPhone}</span>
          </div>
          <div className="flex items-center gap-1.5 text-copper-700">
            <Mail className="h-3 w-3" />
            <span>{settings.business_email || "info@sunsetcountryrepairs.com.au"}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <img src={settings.logo_url || "/logo.svg"} alt={businessName} className="h-10 w-auto object-contain transition-transform group-hover:scale-105" />
            <Wrench className="absolute -bottom-1 -right-1 h-4 w-4 text-copper-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "relative px-4 py-2 text-sm font-medium transition-colors rounded-md",
                "after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:bg-copper-500 after:transition-all after:duration-300",
                location.pathname === link.to
                  ? "text-copper-800 after:w-full after:left-0"
                  : "text-warm-700 hover:text-copper-700 after:w-0 hover:after:w-full hover:after:left-0"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2.5 text-warm-700 hover:bg-copper-50 transition-colors md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu with paper texture effect */}
      {mobileOpen && (
        <div className="border-t-2 border-copper-200 bg-white/95 backdrop-blur-sm md:hidden">
          <nav className="flex flex-col px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                  location.pathname === link.to
                    ? "bg-copper-50 text-copper-800"
                    : "text-warm-700 hover:bg-copper-50 hover:text-copper-700"
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