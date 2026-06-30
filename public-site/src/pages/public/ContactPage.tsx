import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { DEVICE_TYPES, EMAIL_REGEX, AUSTRALIAN_PHONE_REGEX } from "../../lib/constants";
import { cn } from "../../lib/utils";

interface FormData {
  name: string;
  phone: string;
  email: string;
  device_type: string;
  device_model: string;
  issue_description: string;
  preferred_contact_method: "phone" | "email" | "sms";
}

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
  issue_description?: string;
}

const initialFormData: FormData = {
  name: "",
  phone: "",
  email: "",
  device_type: "",
  device_model: "",
  issue_description: "",
  preferred_contact_method: "phone",
};

export default function ContactPage() {
  useEffect(() => {
    document.title = "Contact Us | Sunset Country Repairs";
  }, []);

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validate(): FormErrors {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required.";
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required.";
    } else if (!AUSTRALIAN_PHONE_REGEX.test(formData.phone.trim())) {
      newErrors.phone = "Please enter a valid Australian phone number.";
    }
    if (formData.email && !EMAIL_REGEX.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (!formData.issue_description.trim()) {
      newErrors.issue_description = "Please describe the issue with your device.";
    }
    return newErrors;
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          device_type: formData.device_type || null,
          device_model: formData.device_model.trim() || null,
          issue_description: formData.issue_description.trim(),
          preferred_contact_method: formData.preferred_contact_method,
          source: "website",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { detail?: string }).detail || "Something went wrong. Please try again.");
      }
      setSubmitSuccess(true);
      setFormData(initialFormData);
      setErrors({});
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again or contact us directly.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-warm-50 text-warm-900">
      <section className="bg-warm-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="font-heading text-3xl font-bold sm:text-4xl">Contact Us</h1>
          <p className="mt-3 text-warm-300 max-w-xl">
            Tell us what's wrong with your device and we'll get back to you with a quote.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-5">
            <div className="lg:col-span-3">
              {submitSuccess ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-6">
                  <h2 className="font-heading text-lg font-semibold text-green-800">Message sent</h2>
                  <p className="mt-2 text-sm text-green-700">Thanks for getting in touch. We've received your enquiry and will be in touch soon.</p>
                  <button onClick={() => setSubmitSuccess(false)} className="mt-4 text-sm font-medium text-accent-600 hover:text-accent-700">
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  {submitError && (
                    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{submitError}</div>
                  )}

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-warm-700">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text" id="name" name="name" value={formData.name} onChange={handleChange}
                      className={cn("mt-1.5 block w-full rounded border bg-white px-3 py-2.5 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-accent-500", errors.name ? "border-red-400" : "border-warm-200")}
                      placeholder="Your name"
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-warm-700">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange}
                        className={cn("mt-1.5 block w-full rounded border bg-white px-3 py-2.5 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-accent-500", errors.phone ? "border-red-400" : "border-warm-200")}
                        placeholder="0400 000 000"
                      />
                      {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-warm-700">Email</label>
                      <input
                        type="email" id="email" name="email" value={formData.email} onChange={handleChange}
                        className={cn("mt-1.5 block w-full rounded border bg-white px-3 py-2.5 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-accent-500", errors.email ? "border-red-400" : "border-warm-200")}
                        placeholder="your@email.com"
                      />
                      {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="device_type" className="block text-sm font-medium text-warm-700">Device Type</label>
                      <select id="device_type" name="device_type" value={formData.device_type} onChange={handleChange} className="mt-1.5 block w-full rounded border border-warm-200 bg-white px-3 py-2.5 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-accent-500">
                        <option value="">Select a device</option>
                        {DEVICE_TYPES.map((type: string) => (<option key={type} value={type}>{type}</option>))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="device_model" className="block text-sm font-medium text-warm-700">Device Model</label>
                      <input type="text" id="device_model" name="device_model" value={formData.device_model} onChange={handleChange} className="mt-1.5 block w-full rounded border border-warm-200 bg-white px-3 py-2.5 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-accent-500" placeholder="e.g. iPhone 14 Pro" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="issue_description" className="block text-sm font-medium text-warm-700">
                      What's wrong? <span className="text-red-500">*</span>
                    </label>
                    <textarea id="issue_description" name="issue_description" rows={4} value={formData.issue_description} onChange={handleChange}
                      className={cn("mt-1.5 block w-full rounded border bg-white px-3 py-2.5 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-accent-500", errors.issue_description ? "border-red-400" : "border-warm-200")}
                      placeholder="Describe the problem..."
                    />
                    {errors.issue_description && <p className="mt-1 text-xs text-red-600">{errors.issue_description}</p>}
                  </div>

                  <div>
                    <fieldset>
                      <legend className="block text-sm font-medium text-warm-700">Preferred contact method</legend>
                      <div className="mt-2 flex flex-wrap gap-3">
                        {(["phone", "email", "sms"] as const).map((method) => (
                          <label key={method} className={cn("flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm", formData.preferred_contact_method === method ? "border-accent-500 bg-accent-50 text-accent-700" : "border-warm-200 bg-white text-warm-600")}>
                            <input type="radio" name="preferred_contact_method" value={method} checked={formData.preferred_contact_method === method} onChange={handleChange} className="sr-only" />
                            <span className={cn("h-3.5 w-3.5 rounded-full border-2", formData.preferred_contact_method === method ? "border-accent-500 bg-accent-500" : "border-warm-400")} />
                            {method === "phone" ? "Phone" : method === "email" ? "Email" : "SMS"}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </div>

                  <div>
                    <button type="submit" disabled={isSubmitting}
                      className={cn("inline-flex items-center justify-center rounded px-6 py-2.5 text-sm font-semibold transition-colors", isSubmitting ? "cursor-not-allowed bg-accent-400 text-white" : "bg-accent-500 text-white hover:bg-accent-600")}
                    >
                      {isSubmitting ? "Sending..." : "Send Message"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-lg border border-warm-200 bg-white p-5">
                <h3 className="font-heading text-sm font-semibold text-warm-900">Phone</h3>
                <p className="mt-1.5 text-sm text-warm-500">Call or text to talk about your repair.</p>
              </div>
              <div className="rounded-lg border border-warm-200 bg-white p-5">
                <h3 className="font-heading text-sm font-semibold text-warm-900">Email</h3>
                <p className="mt-1.5 text-sm text-warm-500">Send us a message and we'll reply within a few hours.</p>
              </div>
              <div className="rounded-lg border border-warm-200 bg-white p-5">
                <h3 className="font-heading text-sm font-semibold text-warm-900">Service Area</h3>
                <p className="mt-1.5 text-sm text-warm-500">Sunraysia region — Mildura, Red Cliffs, Irymple, Merbein, Nichols Point, Buronga, Gol Gol, Wentworth.</p>
                <Link to="/service-areas" className="mt-2 text-sm font-medium text-accent-600 hover:text-accent-700">Service areas &rarr;</Link>
              </div>
              <div className="rounded-lg border border-accent-200 bg-accent-50 p-5">
                <h3 className="font-heading text-sm font-semibold text-warm-900">90-Day Warranty</h3>
                <p className="mt-1.5 text-sm text-warm-500">All repairs backed by our workmanship warranty.</p>
                <Link to="/warranty" className="mt-2 text-sm font-medium text-accent-600 hover:text-accent-700">Warranty details &rarr;</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
