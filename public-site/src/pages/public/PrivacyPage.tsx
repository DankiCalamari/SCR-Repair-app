import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export default function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | Sunset Country Repairs</title>
        <meta name="description" content="Privacy policy for Sunset Country Repairs. Learn how we collect, use, and protect your personal information." />
        <link rel="canonical" href="https://sunsetcountryrepairs.com.au/privacy" />
      </Helmet>

      <div className="min-h-screen bg-warm-50 text-warm-900">
      {/* Hero */}
      <section className="relative bg-copper-50 border-b-2 border-copper-200">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="font-heading text-3xl font-bold text-warm-900 sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-warm-700 max-w-xl">
            How we look after your personal information.
          </p>
          <p className="mt-2 text-xs text-warm-500">Last updated: June 2026</p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="space-y-10">
            <div>
              <h2 className="font-heading text-xl font-bold text-copper-800 border-b-2 border-copper-200 pb-2">
                1. What We Collect
              </h2>
              <p className="mt-4 text-sm text-warm-600 leading-relaxed">
                We collect contact details (name, phone, email) and information about your device 
                (type, model, issue) to do the repair work. That's pretty much it.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl font-bold text-copper-800 border-b-2 border-copper-200 pb-2">
                2. Why We Keep It
              </h2>
              <p className="mt-4 text-sm text-warm-600 leading-relaxed">
                To do your repair, communicate about it, and for warranty purposes. We keep records 
                secure and don't share them around.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl font-bold text-copper-800 border-b-2 border-copper-200 pb-2">
                3. Your Rights
              </h2>
              <p className="mt-4 text-sm text-warm-600 leading-relaxed">
                Want to see what we've got on file? Need something corrected? Just ask. 
                You can get in touch via our contact page or call the shop.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl font-bold text-copper-800 border-b-2 border-copper-200 pb-2">
                4. Questions?
              </h2>
              <p className="mt-4 text-sm text-warm-600 leading-relaxed">
                Give us a shout if you want to know more about how we handle your info.
              </p>
            </div>
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
            Contact Us
          </Link>
        </div>
      </section>
    </div>
    </>
  );
}