import { useEffect } from "react";
import { Link } from "react-router-dom";
import { SERVICE_AREAS } from "../../lib/constants";

const areaDescriptions: Record<string, string> = {
  Mildura: "Our base. Full pickup and drop-off available throughout Mildura.",
  "Red Cliffs": "Pickup and drop-off available for Red Cliffs residents.",
  "Irymple": "Regular service routes through the Irymple district.",
  Merbein: "We service Merbein and surrounding areas.",
  "Nichols Point": "Pickup and drop-off available for Nichols Point and nearby areas.",
  Buronga: "Cross-river service available for Buronga residents.",
  "Gol Gol": "Gol Gol residents can access our pickup and drop-off service.",
  Wentworth: "We extend our service to Wentworth and the surrounding district.",
};

export default function ServiceAreasPage() {
  useEffect(() => {
    document.title = "Service Areas | Sunset Country Repairs";
  }, []);

  return (
    <div className="min-h-screen bg-warm-50 text-warm-900">
      <section className="bg-warm-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="font-heading text-3xl font-bold sm:text-4xl">Service Areas</h1>
          <p className="mt-3 text-warm-300 max-w-xl">
            Based in Mildura, we cover the Sunraysia region. Pickup and drop-off available across all areas listed below.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
            {SERVICE_AREAS.map((area) => (
              <div key={area} className="rounded-lg border border-warm-200 bg-white p-4">
                <h2 className="font-heading text-base font-semibold text-warm-900">{area}</h2>
                <p className="mt-1 text-sm text-warm-500">{areaDescriptions[area]}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 max-w-2xl">
            <div className="rounded-lg border border-warm-200 bg-white p-5">
              <h2 className="font-heading text-base font-semibold text-warm-900">Pickup &amp; Drop-off</h2>
              <p className="mt-2 text-sm text-warm-500 leading-relaxed">
                If you can't get to us, we can come to you. We run regular pickup and drop-off routes across the Sunraysia area. Contact us to arrange a time that suits.
              </p>
            </div>

            <p className="mt-6 text-sm text-warm-500">
              Not in one of these areas?{" "}
              <Link to="/contact" className="font-medium text-accent-600 hover:text-accent-700">Get in touch</Link>
              {" "}— we may still be able to help.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
