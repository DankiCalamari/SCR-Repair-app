import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Wrench, Clock, MapPin, Shield, Phone, Users, Award } from "lucide-react";
import { useSettingsContext } from "../../context/settings-context";

const services = [
  {
    title: "Phone Screen Repairs",
    description: "Cracked screens fixed same day. iPhone, Samsung, Google Pixel & more.",
    icon: "📱",
  },
  {
    title: "Battery Replacements",
    description: "Bring your device back to life with a fresh battery.",
    icon: "🔋",
  },
  {
    title: "Laptop Fixes",
    description: "Screens, keyboards, charging ports - we handle it all.",
    icon: "💻",
  },
  {
    title: "Tablet Repairs",
    description: "iPad and Android tablets restored to working order.",
    icon: "📲",
  },
  {
    title: "Game Console Repair",
    description: "PlayStation, Xbox, Nintendo Switch - back in action fast.",
    icon: "🎮",
  },
];

const whyChooseUs = [
  {
    title: "Mobile Service",
    description: "We come to you across Mildura and Sunraysia.",
    icon: Users,
  },
  {
    title: "Quick Turnaround",
    description: "Most repairs done within 24-48 hours.",
    icon: Clock,
  },
  {
    title: "Fixed Price Quotes",
    description: "No surprises. We quote before any work.",
    icon: Shield,
  },
  {
    title: "90-Day Warranty",
    description: "If it breaks again, we fix it free.",
    icon: Award,
  },
];

export default function HomePage() {
  useEffect(() => {
    document.title = "Sunset Country Repairs | Electronics Repair Mildura";
  }, []);

  const { settings } = useSettingsContext();
  const businessPhone = settings.business_phone || "03 5023 0000";

  return (
    <div className="min-h-screen bg-warm-50 text-warm-900">
      {/* Hero Section - Handwritten style */}
      <section className="relative bg-gradient-to-br from-copper-50 to-white border-b-2 border-copper-200">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          {/* Hand-drawn style badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-copper-100 px-4 py-1.5 mb-6 border border-copper-200">
            <Wrench className="h-4 w-4 text-copper-700" />
            <span className="text-xs font-medium text-copper-800 uppercase tracking-wider">Mobile Repair Service</span>
          </div>

          <h1 className="font-heading text-4xl font-bold text-warm-900 sm:text-5xl lg:text-6xl max-w-3xl">
            We come to you. Mobile repairs across Sunraysia.
          </h1>

          <p className="mt-4 text-lg text-warm-700 max-w-2xl leading-relaxed">
            Based in Mildura, we're a mobile electronics repair service covering the Sunraysia region.
            We'll pick up your device, repair it, and deliver it back - no need to leave home.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-copper-600 px-6 py-3 text-sm font-semibold text-white hover:bg-copper-700 transition-all hover:shadow-lg"
            >
              <Phone className="h-4 w-4" />
              Call Now - {businessPhone}
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-copper-600 px-6 py-3 text-sm font-semibold text-copper-700 hover:bg-copper-50 transition-all"
            >
              See All Services
            </Link>
          </div>
        </div>
      </section>

      {/* Services Grid - Card style with hand-drawn borders */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-12">
            <h2 className="font-heading text-3xl font-bold text-warm-900 sm:text-4xl">
              What We Fix
            </h2>
            <p className="mt-3 text-warm-600 max-w-xl">
              We don't just repair - we bring your devices back to life.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.title}
                className="group relative rounded-lg border-2 border-copper-200 bg-white p-6 transition-all hover:shadow-lg hover:border-copper-300"
              >
                <div className="text-3xl mb-3">{service.icon}</div>
                <h3 className="font-heading text-lg font-semibold text-warm-900">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm text-warm-600 leading-relaxed">
                  {service.description}
                </p>
                <Link
                  to="/contact"
                  className="mt-4 inline-block text-xs font-medium text-copper-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Get a quote →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us - Stats style */}
      <section className="border-t-2 border-copper-200 bg-copper-50/30 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-12">
            <h2 className="font-heading text-3xl font-bold text-warm-900 sm:text-4xl">
              Why Locals Trust Us
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {whyChooseUs.map((item) => (
              <div key={item.title} className="text-center">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-lg bg-copper-100 mb-4">
                  <item.icon className="h-6 w-6 text-copper-700" />
                </div>
                <h3 className="font-heading text-sm font-bold text-warm-900 uppercase tracking-wide">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs text-warm-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Area - Map style */}
      <section className="border-t-2 border-copper-200 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-lg border-2 border-copper-200 bg-white p-8">
            <div className="flex items-start gap-4 mb-6">
              <MapPin className="h-8 w-8 text-copper-600 flex-shrink-0" />
              <div>
                <h2 className="font-heading text-2xl font-bold text-warm-900">
                  Serving Sunraysia
                </h2>
                <p className="mt-2 text-warm-600">
                  Based in Mildura, we cover the entire Sunraysia region including:
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {["Mildura", "Irymple", "Red Cliffs", "Merbein", "Nichols Point", 
                "Buronga", "Gol Gol", "Wentworth"].map((area) => (
                <span
                  key={area}
                  className="rounded-md border border-copper-200 bg-copper-50 px-3 py-1.5 text-xs font-medium text-copper-800"
                >
                  {area}
                </span>
              ))}
            </div>

            <p className="mt-4 text-sm text-warm-600">
              We come to you - no need to leave your home or workplace.
            </p>
          </div>
        </div>
      </section>

      {/* Simple CTA */}
      <section className="border-t-2 border-copper-200 bg-white py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <h2 className="font-heading text-2xl font-bold text-warm-900 sm:text-3xl">
            Got a device that needs fixing?
          </h2>
          <p className="mt-3 text-warm-600">
            Drop in anytime or give us a call for a free quote.
          </p>
          <Link
            to="/contact"
            className="mt-6 inline-block rounded-lg bg-copper-600 px-8 py-3 text-sm font-semibold text-white hover:bg-copper-700 transition-all"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}