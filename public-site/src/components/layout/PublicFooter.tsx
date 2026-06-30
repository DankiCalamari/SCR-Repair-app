import { Link } from "react-router-dom";
import { useSettingsContext } from "../../context/settings-context";

const serviceLinks = [
  { to: "/services", label: "Services" },
  { to: "/service-areas", label: "Service Areas" },
  { to: "/warranty", label: "Warranty" },
];

const companyLinks = [
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/privacy", label: "Privacy" },
];

export default function PublicFooter() {
  const { settings } = useSettingsContext();
  const businessName = settings.business_name || "Sunset Country Repairs";

  return (
    <footer className="border-t border-warm-200 bg-warm-100">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <img src={settings.logo_url || "/logo.svg"} alt={businessName} className="h-6 w-auto object-contain" />
            </Link>
            <p className="mt-3 text-sm text-warm-500 leading-relaxed">
              Electronics repair across the Sunraysia region. Mildura, Red Cliffs, Irymple, Merbein, Nichols Point, Buronga, Gol Gol, and Wentworth.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-warm-800">Services</h4>
            <ul className="mt-3 space-y-2">
              {serviceLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-warm-500 hover:text-accent-600 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-warm-800">Company</h4>
            <ul className="mt-3 space-y-2">
              {companyLinks.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-warm-500 hover:text-accent-600 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <Link
                to="/contact"
                className="inline-block rounded bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 transition-colors"
              >
                Get a Quote
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-warm-200 pt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-warm-400">
            &copy; {new Date().getFullYear()} Sunset Country Repairs. All rights reserved.
          </p>
          <Link to="/terms" className="text-xs text-warm-400 hover:text-warm-600 transition-colors">
            Terms &amp; Conditions
          </Link>
        </div>
      </div>
    </footer>
  );
}
