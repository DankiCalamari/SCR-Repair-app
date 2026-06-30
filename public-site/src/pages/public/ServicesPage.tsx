import { useEffect } from "react";
import { Link } from "react-router-dom";

const services = [
  {
    title: "Smartphone Repair",
    description: "We repair iPhones, Samsung Galaxy phones, Google Pixels and most other smartphones. Common fixes include cracked screen replacements, battery swaps, charging port repairs, camera replacements and water damage recovery. If your phone has a problem, there's a good chance we can fix it.",
  },
  {
    title: "Tablet Repair",
    description: "iPad and Android tablet repairs including screen replacements, battery issues, charging problems and software troubleshooting. We work on iPads, Samsung Galaxy Tabs, Microsoft Surface and most other tablets.",
  },
  {
    title: "Laptop Repair",
    description: "Hardware and software repairs for most laptop brands — MacBook, Dell, HP, Lenovo, Acer, Asus and more. Screen replacements, keyboard fixes, trackpad issues, battery replacements, performance upgrades and operating system problems.",
  },
  {
    title: "Gaming Console Repair",
    description: "PlayStation, Xbox and Nintendo Switch repairs. We fix disc drive failures, HDMI port replacements, overheating issues, power problems and controller repairs.",
  },
  {
    title: "Smart Watch Repair",
    description: "Apple Watch, Samsung Galaxy Watch and other smart watch repairs. Screen replacements, battery issues and band replacements.",
  },
  {
    title: "Screen Replacement",
    description: "Cracked or broken screens on phones, tablets and laptops. We use quality replacement parts and test every repair before returning your device.",
  },
  {
    title: "Battery Replacement",
    description: "If your device doesn't hold a charge like it used to, a battery replacement can make it feel like new again. We replace batteries in phones, tablets, laptops and smart watches.",
  },
  {
    title: "Water Damage Repair",
    description: "Dropped your device in water? The sooner you bring it in, the better the chance of saving it. We assess the damage, clean internal corrosion and replace any damaged components where possible.",
  },
  {
    title: "Data Recovery",
    description: "If your device won't turn on or has suffered damage, we may still be able to recover your photos, contacts, messages and documents. We'll assess the device and let you know what's recoverable before proceeding.",
  },
  {
    title: "Software Troubleshooting",
    description: "Device running slow, stuck in a boot loop, apps crashing or not updating? We diagnose and fix software issues across phones, tablets and laptops.",
  },
];

export default function ServicesPage() {
  useEffect(() => {
    document.title = "Our Services | Sunset Country Repairs";
  }, []);

  return (
    <div className="min-h-screen bg-warm-50 text-warm-900">
      <section className="bg-warm-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="font-heading text-3xl font-bold sm:text-4xl">Our Services</h1>
          <p className="mt-3 text-warm-300 max-w-xl">
            We repair most types of portable electronics. Every repair comes with a 90-day workmanship warranty. Not sure if we can fix something? Just ask.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="space-y-6 max-w-3xl">
            {services.map((service) => (
              <div key={service.title} className="border-b border-warm-200 pb-6 last:border-0 last:pb-0">
                <h2 className="font-heading text-lg font-semibold text-warm-900">{service.title}</h2>
                <p className="mt-2 text-sm text-warm-500 leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-warm-200 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-warm-900">Not sure what you need?</h2>
              <p className="mt-1.5 text-warm-500">Describe the problem and we'll let you know what can be done.</p>
            </div>
            <Link to="/contact" className="inline-block rounded bg-accent-500 px-6 py-3 text-sm font-semibold text-white hover:bg-accent-600 transition-colors">
              Get a Free Quote
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
