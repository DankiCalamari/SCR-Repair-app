import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export default function TermsPage() {
  return (
    <>
      <Helmet>
        <title>Terms & Conditions | Sunset Country Repairs</title>
        <meta name="description" content="Terms and conditions for Sunset Country Repairs. Our straightforward terms - no fine print tricks." />
        <link rel="canonical" href="https://sunsetcountryrepairs.com.au/terms" />
      </Helmet>

      <div className="min-h-screen bg-warm-50 text-warm-900">
      {/* Hero */}
      <section className="relative bg-copper-50 border-b-2 border-copper-200">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="font-heading text-3xl font-bold text-warm-900 sm:text-4xl">
            Terms & Conditions
          </h1>
          <p className="mt-3 text-warm-700 max-w-xl">
            Straightforward terms - no fine print tricks.
          </p>
          <p className="mt-2 text-xs text-warm-500">Last updated: June 2026</p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="space-y-8">
            <div>
              <h2 className="font-heading text-lg font-bold text-copper-800 mb-3">
                About Your Repair
              </h2>
              <p className="text-sm text-warm-600 leading-relaxed">
                We'll have a proper look at your device before deciding if it's worth fixing. 
                If we reckon it's not worth it, we'll tell you straight up. No pressure, no upsell.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-lg font-bold text-copper-800 mb-3">
                Pricing
              </h2>
              <p className="text-sm text-warm-600 leading-relaxed mb-2">
                We quote before we start. That's our word.
              </p>
              <ul className="text-sm text-warm-600 space-y-1.5 list-disc pl-5">
                <li>Quotes valid for 14 days</li>
                <li>If we find extra issues, we'll ring before proceeding</li>
                <li>Prices in AUD, include GST</li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-lg font-bold text-copper-800 mb-3">
                Payment & Collection
              </h2>
              <ul className="text-sm text-warm-600 space-y-1.5 list-disc pl-5">
                <li>Pay on pickup - cash, card, or bank transfer</li>
                <li>We accept EFTPOS</li>
                <li>Please collect within 90 days</li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-lg font-bold text-copper-800 mb-3">
                Warranty
              </h2>
              <p className="text-sm text-warm-600 leading-relax">
                90 days on workmanship. If the same fault comes back, we sort it. Does not cover 
                accidents after you've taken it home.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-lg font-bold text-copper-800 mb-3">
                Data
              </h2>
              <p className="text-sm text-warm-600 leading-relax">
                We don't muck around with your data, but we strongly recommend backing up before 
                bringing your device in. Sometimes we need to wipe to fix software issues.
              </p>
            </div>
          </div>

          <div className="mt-12 rounded-lg border-2 border-copper-200 bg-white p-6">
            <p className="text-sm text-warm-600">
              These terms are governed by Victorian law. Fair dinkum service, that's all we aim for.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t-2 border-copper-200 bg-white py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <Link
            to="/contact"
            className="inline-block rounded-lg bg-copper-600 px-8 py-3 text-sm font-semibold text-white hover:bg-copper-700 transition-all"
          >
            Got Questions? Contact Us
          </Link>
        </div>
      </section>
    </div>
    </>
  );
}