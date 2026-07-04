import { useEffect, useState, type FormEvent } from "react";
import { Wrench, Clock, MapPin, Phone, Mail, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { DEVICE_TYPES, EMAIL_REGEX, AUSTRALIAN_PHONE_REGEX } from "../../lib/constants";
import { cn } from "../../lib/utils";
import { useSettingsContext } from "../../context/settings-context";

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

  const { settings } = useSettingsContext();
  const businessPhone = settings.business_phone || "03 5023 0000";

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
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again or call us directly.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-warm-50 text-warm-900">
      {/* Hero with personality */}
      <section className="relative bg-gradient-to-b from-copper-50 to-white border-b-2 border-copper-200">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-copper-600 flex items-center justify-center">
              <Phone className="h-5 w-5 text-white" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-warm-900 sm:text-4xl">
              Get In Touch
            </h1>
          </div>
          <p className="text-warm-700 max-w-xl">
            Got a broken device? We'll give you a straight-up quote - no mucking around.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-5">
            <div className="lg:col-span-3">
              {submitSuccess ? (
                <div className="rounded-lg border-2 border-green-500/30 bg-green-50 p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                    <h2 className="font-heading text-xl font-bold text-green-800">
                      Message sent!
                    </h2>
                  </div>
                  <p className="text-sm text-green-700">
                    Cheers for getting in touch. We've got your message and will call you within the hour.
                  </p>
                  <button
                    onClick={() => setSubmitSuccess(false)}
                    className="mt-6 text-sm font-medium text-copper-600 hover:text-copper-700 transition-colors"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  {submitError && (
                    <div className="rounded-lg border-2 border-red-500/30 bg-red-50 p-4 text-sm text-red-700">
                      {submitError}
                    </div>
                  )}

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-warm-800">
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={cn(
                        "mt-2 block w-full rounded-lg border-2 bg-white px-4 py-3 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-copper-500",
                        errors.name ? "border-red-400" : "border-copper-200"
                      )}
                      placeholder="John Smith"
                    />
                    {errors.name && <p className="mt-1.5 text-xs text-red-600">{errors.name}</p>}
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-warm-800">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className={cn(
                          "mt-2 block w-full rounded-lg border-2 bg-white px-4 py-3 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-copper-500",
                          errors.phone ? "border-red-400" : "border-copper-200"
                        )}
                        placeholder="0400 000 000"
                      />
                      {errors.phone && <p className="mt-1.5 text-xs text-red-600">{errors.phone}</p>}
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-warm-800">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={cn(
                          "mt-2 block w-full rounded-lg border-2 bg-white px-4 py-3 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-copper-500",
                          errors.email ? "border-red-400" : "border-copper-200"
                        )}
                        placeholder="john@email.com"
                      />
                      {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="device_type" className="block text-sm font-medium text-warm-800">
                        Device Type
                      </label>
                      <select
                        id="device_type"
                        name="device_type"
                        value={formData.device_type}
                        onChange={handleChange}
                        className="mt-2 block w-full rounded-lg border-2 border-copper-200 bg-white px-4 py-3 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-copper-500"
                      >
                        <option value="">Select a device</option>
                        {DEVICE_TYPES.map((type: string) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="device_model" className="block text-sm font-medium text-warm-800">
                        Device Model
                      </label>
                      <input
                        type="text"
                        id="device_model"
                        name="device_model"
                        value={formData.device_model}
                        onChange={handleChange}
                        className="mt-2 block w-full rounded-lg border-2 border-copper-200 bg-white px-4 py-3 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-copper-500"
                        placeholder="e.g. iPhone 14 Pro"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="issue_description" className="block text-sm font-medium text-warm-800">
                      What's the problem? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="issue_description"
                      name="issue_description"
                      rows={4}
                      value={formData.issue_description}
                      onChange={handleChange}
                      className={cn(
                        "mt-2 block w-full rounded-lg border-2 bg-white px-4 py-3 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-copper-500",
                        errors.issue_description ? "border-red-400" : "border-copper-200"
                      )}
                      placeholder="Describe the problem... e.g. cracked screen, won't turn on"
                    />
                    {errors.issue_description && (
                      <p className="mt-1.5 text-xs text-red-600">{errors.issue_description}</p>
                    )}
                  </div>

                  <div>
                    <fieldset>
                      <legend className="block text-sm font-medium text-warm-800 mb-2">
                        Best way to reach you
                      </legend>
                      <div className="flex flex-wrap gap-3">
                        {(["phone", "sms", "email"] as const).map((method) => (
                          <label
                            key={method}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm transition-all",
                              formData.preferred_contact_method === method
                                ? "border-copper-500 bg-copper-50 text-copper-800"
                                : "border-copper-200 bg-white text-warm-700 hover:bg-copper-50"
                            )}
                          >
                            <input
                              type="radio"
                              name="preferred_contact_method"
                              value={method}
                              checked={formData.preferred_contact_method === method}
                              onChange={handleChange}
                              className="sr-only"
                            />
                            <span
                              className={cn(
                                "h-3 w-3 rounded-full border-2",
                                formData.preferred_contact_method === method
                                  ? "border-copper-500 bg-copper-500"
                                  : "border-copper-300"
                              )}
                            />
                            {method === "phone" ? "Phone" : method === "sms" ? "SMS" : "Email"}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={cn(
                        "inline-flex items-center justify-center rounded-lg px-8 py-3 text-sm font-semibold transition-all",
                        isSubmitting
                          ? "cursor-not-allowed bg-copper-400 text-white"
                          : "bg-copper-600 text-white hover:bg-copper-700 hover:shadow-lg"
                      )}
                    >
                      {isSubmitting ? "Sending..." : "Send Message"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Contact Info Sidebar */}
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-lg border-2 border-copper-200 bg-white p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded bg-copper-100 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-copper-700" />
                  </div>
                  <h3 className="font-heading text-sm font-bold text-warm-900">Call Us</h3>
                </div>
                <p className="text-sm text-warm-600">
                  Chat directly about your repair. We're happy to give you a rough estimate over the phone.
                </p>
                <p className="mt-2 text-copper-700 font-medium">{businessPhone}</p>
              </div>

              <div className="rounded-lg border-2 border-copper-200 bg-white p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded bg-copper-100 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-copper-700" />
                  </div>
                  <h3 className="font-heading text-sm font-bold text-warm-900">Service Area</h3>
                </div>
                <p className="text-sm text-warm-600">
                  Mobile service across Mildura and Sunraysia.
                </p>
                <Link
                  to="/service-areas"
                  className="mt-2 inline-block text-sm font-medium text-copper-600 hover:text-copper-700 transition-colors"
                >
                  Areas we cover →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}