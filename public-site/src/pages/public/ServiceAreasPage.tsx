import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MapPin, Truck } from "lucide-react";
import { SERVICE_AREAS } from "../../lib/constants";

const areaDescriptions: Record<string, string> = {
  Mildura: "Our workshop's here. Just bring your device in.",
  "Red Cliffs": "Regular pickup runs. Usually same-day or next-day service.",
  "Irymple": "Easy drop-off point available. Quick turnaround on most repairs.",
  Merbein: "Pickup service covers Merbein and surrounding areas.",
  "Nichols Point": "We come to you - arrange a pickup at your convenience.",
  Buronga: "Cross-river service available. Give us a call to arrange.",
  "Gol Gol": "Pickup and drop-off service for Gol Gol residents.",
  Wentworth: "Extended service area. Contact for timing details.",
};

export default function ServiceAreasPage() {
  return (
    <>
      <Helmet>
        <title>Service Areas | Sunset Country Repairs Mildura</title>
        <meta name="description" content="Mobile electronics repair service across Mildura and Sunraysia region. Areas include Red Cliffs, Irymple, Merbein, Nichols Point, Buronga, Gol Gol, Wentworth." />
        <meta name="keywords" content="Mildura, Red Cliffs, Irymple, Merbein, Sunraysia, service area, mobile repair" />
        <link rel="canonical" href="https://sunsetcountryrepairs.com.au/service-areas" />
      </Helmet>

      <div className="min-h-screen bg-warm-50 text-warm-900">
      {/* Hero */}
      <section className="relative bg-copper-50 border-b-2 border-copper-200">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-copper-600 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-warm-900 sm:text-4xl">
              Where We Work
            </h1>
          </div>
          <p className="text-warm-700 max-w-xl">
            Mildura-based repair shop serving the Sunraysia region. Can't get to us? We'll come to you.
          </p>
        </div>
      </section>

      {/* Areas Grid */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
            {SERVICE_AREAS.map((area) => (
              <div
                key={area}
                className="rounded-lg border-2 border-copper-200 bg-white p-5 hover:shadow-md transition-shadow"
              >
                <h2 className="font-heading text-lg font-bold text-copper-800">{area}</h2>
                <p className="mt-2 text-sm text-warm-600">{areaDescriptions[area]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pickup Service */}
      <section className="border-t-2 border-copper-200 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-lg border-2 border-dashed border-copper-300 bg-copper-50/30 p-8 max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Truck className="h-7 w-7 text-copper-700" />
              <h2 className="font-heading text-xl font-bold text-warm-900">
                Pickup & Drop-off
              </h2>
            </div>
            <p className="text-sm text-warm-700">
              We run regular pickup routes across the region. If you can't get to us, give us a call 
              and we'll sort out a time to collect your device.
            </p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="border-t-2 border-copper-200 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <h2 className="font-heading text-xl font-bold text-warm-900 mb-3">
            Outside our area?
          </h2>
          <p className="text-warm-600 mb-6">
            Give us a shout - we do our best to help everyone.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-copper-600 px-8 py-3 text-sm font-semibold text-white hover:bg-copper-700 transition-all"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </div>
    </>
  );
}