import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Wrench, Shield, Clock, Phone, MapPin, Heart } from "lucide-react";

export default function AboutPage() {
  useEffect(() => {
    document.title = "About Us | Sunset Country Repairs";
  }, []);

  return (
    <div className="min-h-screen bg-warm-50 text-warm-900">
      {/* Hero */}
      <section className="relative bg-copper-50 border-b-2 border-copper-200">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-copper-600 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-warm-900 sm:text-4xl">
              Local Repairs. Honest Service.
            </h1>
          </div>
          <p className="text-warm-700 max-w-xl">
            Your local electronics repair business serving Mildura and Sunraysia.
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-3xl space-y-4 text-warm-700 leading-relaxed">
            <p className="text-lg">
              At Sunset Country Repairs, we believe getting your technology repaired shouldn't be complicated.
            </p>
            <p>
              We're a locally owned and operated mobile electronics repair business servicing Mildura and the wider Sunraysia region, providing reliable repairs for phones, tablets, laptops, computers, and other electronic devices.
            </p>
            <p>
              Rather than operating from a traditional retail shop, we focus on convenience. Whether you need a pickup, drop-off, or arranged meeting location, we aim to make the repair process as simple and stress-free as possible.
            </p>
          </div>
        </div>
      </section>

      {/* Why We Started */}
      <section className="border-t-2 border-copper-200 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-6">
            <Heart className="h-6 w-6 text-copper-600" />
            <h2 className="font-heading text-2xl font-bold text-warm-900">Why We Started</h2>
          </div>
          <div className="max-w-3xl space-y-4 text-warm-700 leading-relaxed">
            <p>
              Sunset Country Repairs was created with one simple goal: to provide honest, professional repairs backed by clear communication and quality workmanship.
            </p>
            <p>
              Too often, customers are left wondering what's happening with their device, how much the repair will cost, or whether they can trust the advice they're receiving.
            </p>
            <p>
              We're changing that by keeping our customers informed every step of the way with detailed diagnostics, transparent pricing, and regular repair updates.
            </p>
          </div>
        </div>
      </section>

      {/* What We Repair */}
      <section className="border-t-2 border-copper-200 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-6 w-6 text-copper-600" />
            <h2 className="font-heading text-2xl font-bold text-warm-900">What We Repair</h2>
          </div>
          <p className="text-warm-700 mb-6">We work on a wide range of devices, including:</p>
          <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
            {["Mobile Phones", "Tablets", "Laptops", "Desktop Computers", "General Electronics", "Software Issues", "Device Diagnostics"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <span className="text-copper-600">✓</span>
                <span className="text-sm text-warm-700">{item}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-warm-600">
            If you're unsure whether we can repair your device, simply get in touch and we'll be happy to help.
          </p>
        </div>
      </section>

      {/* Our Commitment */}
      <section className="border-t-2 border-copper-200 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="h-6 w-6 text-copper-600" />
            <h2 className="font-heading text-2xl font-bold text-warm-900">Our Commitment</h2>
          </div>
          <div className="max-w-3xl space-y-4 text-warm-700 leading-relaxed">
            <p>
              Every repair is treated with care and attention to detail.
            </p>
            <p>
              We strive to provide:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-copper-600 mt-0.5">•</span>
                <span className="text-sm">Honest advice without unnecessary upselling</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-copper-600 mt-0.5">•</span>
                <span className="text-sm">Transparent quotes before work begins</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-copper-600 mt-0.5">•</span>
                <span className="text-sm">High-quality replacement parts where available</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-copper-600 mt-0.5">•</span>
                <span className="text-sm">Clear communication throughout the repair</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-copper-600 mt-0.5">•</span>
                <span className="text-sm">Professional workmanship backed by warranty</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-copper-600 mt-0.5">•</span>
                <span className="text-sm">Friendly local service you can rely on</span>
              </li>
            </ul>
            <p>
              Our goal isn't just to fix devices—it's to earn your trust and become the first place you think of whenever you need technology repaired.
            </p>
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="border-t-2 border-copper-200 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="h-6 w-6 text-copper-600" />
            <h2 className="font-heading text-2xl font-bold text-warm-900">Proudly Serving Sunraysia</h2>
          </div>
          <p className="text-warm-700 mb-4">We're proud to support our local community by providing mobile repair services across:</p>
          <div className="flex flex-wrap gap-2">
            {["Mildura", "Irymple", "Red Cliffs", "Merbein", "Nichols Point", "Buronga", "Gol Gol", "Wentworth"].map((area) => (
              <span
                key={area}
                className="rounded-md border border-copper-200 bg-copper-50 px-3 py-1.5 text-xs font-medium text-copper-800"
              >
                {area}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-warm-600">
            If you're located nearby but don't see your area listed, contact us and we'll do our best to help.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t-2 border-copper-200 bg-white py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <h2 className="font-heading text-2xl font-bold text-warm-900 mb-3">
            Let's Get Your Device Working Again
          </h2>
          <p className="text-warm-600 mb-6 max-w-2xl mx-auto">
            Whether you've cracked your screen, your battery won't last the day, your laptop refuses to boot, 
            or you're dealing with another technical issue, we're here to help.
          </p>
          <p className="text-sm text-warm-600 mb-6">
            Get in touch today to discuss your repair, request a quote, or ask any questions. 
            We're committed to making the repair process straightforward, transparent, and hassle-free from start to finish.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-copper-600 px-8 py-3 text-sm font-semibold text-white hover:bg-copper-700 transition-all"
          >
            <Phone className="h-4 w-4" />
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}