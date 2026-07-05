import { Link } from "react-router-dom";
import { Wrench, MapPin, Phone, LogIn } from "lucide-react";
import { useSettingsContext } from "../../context/settings-context";

const serviceLinks = [
  { to: "/services", label: "Repair Services" },
  { to: "/warranty", label: "Warranty Info" },
];

const companyLinks = [
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact" },
  { to: "/privacy", label: "Privacy" },
];

export default function PublicFooter() {
  const { settings } = useSettingsContext();
  const businessName = settings.business_name || "Sunset Country Repairs";

  return (
    <footer className="relative border-t-2 border-copper-200 bg-gradient-to-b from-white to-copper-50/30">
      {/* Hand-drawn style decorative element */}
      <div className="absolute inset-x-0 top-0 h-1 bg-copper-300 opacity-30" style={{
        backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 8px, #d97706 8px, #d97706 10px)"
      }}></div>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand section */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-copper-100 rounded-lg">
                <img src={settings.logo_url || "/logo.svg"} alt={businessName} className="h-8 w-auto object-contain" />
              </div>
            </Link>
            <p className="text-sm text-warm-600 leading-relaxed mb-4">
              Your local electronics repair shop in Mildura. We fix what matters to you.
            </p>

            {/* Quick contact badges */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-warm-700">
                <Phone className="h-3.5 w-3.5 text-copper-600" />
                <span>{settings.business_phone || "03 5023 0000"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-warm-700">
                <MapPin className="h-3.5 w-3.5 text-copper-600" />
                <span>Mildura</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-sm font-bold text-copper-800 uppercase tracking-wider mb-4">Services</h4>
            <ul className="space-y-2">
              {serviceLinks.map((link) => (
                <li key={link.to}>
                  <Link 
                    to={link.to} 
                    className="inline-block text-sm text-warm-600 hover:text-copper-700 transition-colors underline-offset-2 hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-bold text-copper-800 uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-2 mb-4">
              {companyLinks.map((link) => (
                <li key={link.to}>
                  <Link 
                    to={link.to} 
                    className="inline-block text-sm text-warm-600 hover:text-copper-700 transition-colors underline-offset-2 hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-copper-600 px-4 py-2 text-sm font-medium text-white hover:bg-copper-700 transition-colors"
            >
              <Wrench className="h-3.5 w-3.5" />
              Get a Free Quote
            </Link>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-copper-200 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <p className="text-xs text-warm-500">
            &copy; {new Date().getFullYear()} {businessName}. Est. 2010.
          </p>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/terms" className="text-warm-500 hover:text-copper-600 transition-colors underline-offset-2 hover:underline">
              Terms & Conditions
            </Link>
            <span className="text-copper-300">|</span>
            <span className="text-warm-500">ABN: {settings.abn || "12 345 678 901"}</span>
            <span className="text-copper-300">|</span>
            <a 
              href="/app/login" 
              className="flex items-center gap-1 text-warm-500 hover:text-copper-600 transition-colors underline-offset-2 hover:underline"
            >
              <LogIn className="h-3 w-3" />
              Staff Login
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}