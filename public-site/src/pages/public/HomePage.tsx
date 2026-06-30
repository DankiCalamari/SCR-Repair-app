import { useEffect } from "react";
import { Link } from "react-router-dom";
import { SERVICE_AREAS } from "../../lib/constants";

const services = [
  {
    title: "Smartphone Repair",
    description: "Cracked screens, dead batteries, charging ports, water damage — we fix iPhones, Samsung, Google Pixel and most other phones.",
  },
  {
    title: "Tablet Repair",
    description: "iPad and Android tablet screen replacements, battery swaps, and software issues sorted.",
  },
  {
    title: "Laptop Repair",
    description: "Screen replacements, keyboard fixes, performance issues and hardware repairs for most laptop brands.",
  },
  {
    title: "Gaming Console Repair",
    description: "PlayStation, Xbox and Nintendo Switch repairs — disc drives, HDMI ports, overheating and controller issues.",
  },
];

const process = [
  {
    step: "1",
    title: "Get in touch",
    description: "Call, text, email or fill in the contact form. Tell us what device you have and what's wrong with it.",
  },
  {
    step: "2",
    title: "We diagnose the problem",
    description: "We'll take a look and let you know what needs doing and how much it'll cost before we start any work.",
  },
  {
    step: "3",
    title: "We repair your device",
    description: "Most common repairs are done within a day or two. We'll keep you updated on how it's going.",
  },
  {
    step: "4",
    title: "Pick up your device",
    description: "Collect your repaired device, or we can drop it back to you if you're in the Sunraysia area.",
  },
];

const faqs = [
  {
    question: "How long do repairs take?",
    answer: "Most common repairs like screen replacements and battery swaps are completed within 24 to 48 hours. More complex repairs or those needing parts to be ordered may take a bit longer — we'll let you know upfront.",
  },
  {
    question: "Do you offer a warranty?",
    answer: "Yes. Every repair comes with a 90-day workmanship warranty. If the same issue comes back within that period, we'll fix it at no extra cost.",
  },
  {
    question: "Can you repair water-damaged devices?",
    answer: "We can assess water-damaged devices and often recover them, depending on the extent of the damage. The sooner you bring it in, the better the chance of a successful repair.",
  },
  {
    question: "Do I need to book an appointment?",
    answer: "No appointment needed. You can drop off your device or contact us to arrange a pickup. For complex repairs, we may call you to discuss the issue first.",
  },
  {
    question: "What devices do you repair?",
    answer: "We repair smartphones, tablets, laptops, gaming consoles, smart watches and other portable electronics. If you're not sure whether we can fix something, just ask.",
  },
];

export default function HomePage() {
  useEffect(() => {
    document.title = "Sunset Country Repairs | Electronics Repair Across Sunraysia";
  }, []);

  return (
    <div className="min-h-screen bg-warm-50 text-warm-900">
      {/* Hero */}
      <section className="bg-warm-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
          <div className="max-w-2xl">
            <h1 className="font-heading text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Electronics repair across Sunraysia
            </h1>
            <p className="mt-4 text-lg text-warm-300 leading-relaxed">
              We fix smartphones, tablets, laptops, gaming consoles and more. Based in Mildura, servicing Irymple, Red Cliffs, Merbein, Nichols Point, Buronga, Gol Gol, Wentworth and the surrounding areas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/contact"
                className="inline-block rounded bg-accent-500 px-6 py-3 text-sm font-semibold text-white hover:bg-accent-600 transition-colors"
              >
                Contact Us
              </Link>
              <Link
                to="/services"
                className="inline-block rounded border border-warm-600 px-6 py-3 text-sm font-semibold text-warm-200 hover:border-warm-400 hover:text-white transition-colors"
              >
                Our Services
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-xl">
            <h2 className="font-heading text-2xl font-bold text-warm-900 sm:text-3xl">
              What we fix
            </h2>
            <p className="mt-2 text-warm-500">
              We repair most types of portable electronics. If you're not sure whether we can help, get in touch and ask.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {services.map((service) => (
              <div
                key={service.title}
                className="rounded-lg border border-warm-200 bg-white p-5"
              >
                <h3 className="font-heading text-base font-semibold text-warm-900">
                  {service.title}
                </h3>
                <p className="mt-1.5 text-sm text-warm-500 leading-relaxed">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link
              to="/services"
              className="text-sm font-medium text-accent-600 hover:text-accent-700 transition-colors"
            >
              See all services &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-warm-200 bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-xl">
            <h2 className="font-heading text-2xl font-bold text-warm-900 sm:text-3xl">
              How it works
            </h2>
            <p className="mt-2 text-warm-500">
              Straightforward process from start to finish.
            </p>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {process.map((item) => (
              <div key={item.step}>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-500 text-sm font-bold text-white">
                  {item.step}
                </span>
                <h3 className="mt-3 font-heading text-base font-semibold text-warm-900">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm text-warm-500 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="border-t border-warm-200 py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-xl">
            <h2 className="font-heading text-2xl font-bold text-warm-900 sm:text-3xl">
              Where we service
            </h2>
            <p className="mt-2 text-warm-500">
              Based in Mildura, we cover the Sunraysia region and surrounding areas. Pickup and drop-off available.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {SERVICE_AREAS.map((area) => (
              <span
                key={area}
                className="rounded-full border border-warm-200 bg-white px-4 py-1.5 text-sm text-warm-700"
              >
                {area}
              </span>
            ))}
          </div>
          <div className="mt-6">
            <Link
              to="/service-areas"
              className="text-sm font-medium text-accent-600 hover:text-accent-700 transition-colors"
            >
              Service area details &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-warm-200 bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-xl">
            <h2 className="font-heading text-2xl font-bold text-warm-900 sm:text-3xl">
              Frequently asked questions
            </h2>
          </div>
          <div className="mt-8 space-y-6 max-w-2xl">
            {faqs.map((faq) => (
              <div key={faq.question}>
                <h3 className="font-heading text-base font-semibold text-warm-900">
                  {faq.question}
                </h3>
                <p className="mt-1.5 text-sm text-warm-500 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="border-t border-warm-200 py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-lg border border-warm-200 bg-white p-6 sm:p-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-warm-900 sm:text-2xl">
                Need something repaired?
              </h2>
              <p className="mt-1.5 text-warm-500">
                Get in touch and we'll let you know what we can do. No obligation.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/contact"
                className="inline-block rounded bg-accent-500 px-6 py-3 text-sm font-semibold text-white hover:bg-accent-600 transition-colors"
              >
                Contact Us
              </Link>
              <Link
                to="/warranty"
                className="inline-block rounded border border-warm-200 px-6 py-3 text-sm font-semibold text-warm-700 hover:border-warm-300 transition-colors"
              >
                Warranty Info
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
