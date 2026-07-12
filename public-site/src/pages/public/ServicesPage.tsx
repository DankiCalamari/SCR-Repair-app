import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Wrench, Clock, Shield, Phone } from "lucide-react";

const services = [
  {
    title: "Smartphone Repair",
    icon: "📱",
    description: "We fix iPhones, Samsung Galaxy phones, Google Pixels and most other smartphones. Common fixes include cracked screen replacements, battery swaps, charging port repairs, camera replacements and button issues.",
    turnaround: "Same day",
    warranty: "90 days",
  },
  {
    title: "Tablet Repair",
    icon: "📲",
    description: "iPad and Android tablet repairs including screen replacements, battery issues, charging problems and software troubleshooting.",
    turnaround: "1-2 days",
    warranty: "90 days",
  },
  {
    title: "Laptop Repair",
    icon: "💻",
    description: "Hardware and software repairs for most laptop brands — MacBook, Dell, HP, Lenovo, Acer, Asus and more. Screen replacements, keyboard fixes, trackpad issues, battery replacements, performance upgrades and operating system problems.",
    turnaround: "2-3 days",
    warranty: "90 days",
  },
  {
    title: "Gaming Console Repair",
    icon: "🎮",
    description: "PlayStation, Xbox and Nintendo Switch repairs. We fix disc drive failures, HDMI port replacements, overheating issues, power problems and controller repairs.",
    turnaround: "3-5 days",
    warranty: "90 days",
  },
  {
    title: "Smart Watch Repair",
    icon: "⌚",
    description: "Apple Watch, Samsung Galaxy Watch and other smart watch repairs. Screen replacements, battery issues and band replacements.",
    turnaround: "2-3 days",
    warranty: "90 days",
  },
  {
    title: "Screen Replacement",
    icon: "🔲",
    description: "Cracked or broken screens on phones, tablets and laptops. We use quality replacement parts and test every repair before returning your device.",
    turnaround: "Same day",
    warranty: "90 days",
  },
  {
    title: "Battery Replacement",
    icon: "🔋",
    description: "If your device doesn't hold a charge like it used to, a battery replacement can make it feel like new again. We replace batteries in phones, tablets, laptops and smart watches.",
    turnaround: "1 hour",
    warranty: "12 months",
  },
  {
    title: "Software Troubleshooting",
    icon: "⚙️",
    description: "Device running slow, stuck in a boot loop, apps crashing or not updating? We diagnose and fix software issues across phones, tablets and laptops.",
    turnaround: "Same day",
    warranty: "90 days",
  },
];

export default function ServicesPage() {
  return (
    <>
      <Helmet>
        <title>Repair Services | Sunset Country Repairs Mildura</title>
        <meta name="description" content="Phone, tablet, laptop & console repairs in Mildura & Sunraysia. Screen replacements, battery changes, software fixes. 90-day warranty on all repairs." />
        <meta name="keywords" content="phone screen repair, tablet screen replacement, laptop repair, console repair, battery replacement, screen fix, Mildura repairs" />
        <link rel="canonical" href="https://sunsetcountryrepairs.com.au/services" />
      </Helmet>

      <div className="min-h-screen bg-warm-50 text-warm-900">
      {/* Hero with character */}
      <section className="relative bg-copper-50 border-b-2 border-copper-200">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-lg bg-copper-600 flex items-center justify-center">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-warm-900 sm:text-4xl">
              Our Repair Services
            </h1>
          </div>
          <p className="text-warm-700 max-w-2xl">
            We repair most types of portable electronics. Every repair comes with a 90-day workmanship warranty. 
            Not sure if we can fix something? Just ask - we've seen it all.
          </p>
        </div>
      </section>

      {/* Services List */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-4xl space-y-6">
            {services.map((service) => (
              <div key={service.title} className="rounded-lg border-2 border-copper-200 bg-white p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{service.icon}</div>
                  <div className="flex-1">
                    <h2 className="font-heading text-xl font-bold text-warm-900">
                      {service.title}
                    </h2>
                    <p className="mt-2 text-sm text-warm-600 leading-relaxed">
                      {service.description}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-copper-600" />
                        <span className="text-warm-600">Turnaround:</span>
                        <span className="font-medium text-warm-800">{service.turnaround}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-copper-600" />
                        <span className="text-warm-600">Warranty:</span>
                        <span className="font-medium text-warm-800">{service.warranty}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Contact */}
      <section className="border-t-2 border-copper-200 bg-white py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-lg border-2 border-dashed border-copper-300 bg-copper-50/30 p-8 text-center">
            <h2 className="font-heading text-xl font-bold text-warm-900 mb-3">
              Not sure what you need?
            </h2>
            <p className="text-sm text-warm-600 mb-6">
              Describe the problem and we'll let you know what can be done. No obligation.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-copper-600 px-6 py-3 text-sm font-semibold text-white hover:bg-copper-700 transition-colors"
            >
              <Phone className="h-4 w-4" />
              Call for a Quote
            </Link>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}