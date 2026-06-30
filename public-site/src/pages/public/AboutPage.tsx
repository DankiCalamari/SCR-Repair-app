import { useEffect } from "react";
import { Link } from "react-router-dom";

export default function AboutPage() {
  useEffect(() => {
    document.title = "About Us | Sunset Country Repairs";
  }, []);

  return (
    <div className="min-h-screen bg-warm-50 text-warm-900">
      <section className="bg-warm-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="font-heading text-3xl font-bold sm:text-4xl">About Us</h1>
          <p className="mt-3 text-warm-300 max-w-xl">A local electronics repair business serving Sunraysia from Mildura.</p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-2xl space-y-5 text-warm-600 leading-relaxed">
            <p>
              Sunset Country Repairs is based in Mildura. We started the business because people in the Sunraysia region needed a local, reliable place to get their phones, laptops and other devices fixed — without having to send them away or replace them outright.
            </p>
            <p>
              We service communities across the region, including Mildura, Irymple, Red Cliffs, Merbein, Nichols Point, Buronga, Gol Gol and Wentworth. If you can't get to us, we can often arrange pickup and drop-off.
            </p>
            <p>
              We focus on honest repairs. That means we'll tell you if a repair is worth doing or if it makes more sense to replace the device. We quote before we start work, and we don't charge you for repairs that don't fix the problem.
            </p>
            <p>
              Every repair is backed by a 90-day workmanship warranty. If the same issue comes back within that period, we sort it out at no extra cost.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-warm-200 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="font-heading text-lg font-semibold text-warm-900">90-Day Warranty</h2>
              <p className="mt-2 text-sm text-warm-500 leading-relaxed">
                We stand behind our work. If the same fault reoccurs within 90 days of your repair, we'll fix it again at no charge.
              </p>
              <Link to="/warranty" className="mt-3 text-sm font-medium text-accent-600 hover:text-accent-700 transition-colors">
                Full warranty details &rarr;
              </Link>
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-warm-900">Pickup &amp; Drop-off</h2>
              <p className="mt-2 text-sm text-warm-500 leading-relaxed">
                Can't make it to us? We offer pickup and drop-off across the Sunraysia area.
              </p>
              <Link to="/service-areas" className="mt-3 text-sm font-medium text-accent-600 hover:text-accent-700 transition-colors">
                Service areas &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-warm-200 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-warm-900">Get in touch</h2>
              <p className="mt-1.5 text-warm-500">Have a device that needs fixing? We're happy to help.</p>
            </div>
            <Link to="/contact" className="inline-block rounded bg-accent-500 px-6 py-3 text-sm font-semibold text-white hover:bg-accent-600 transition-colors">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
