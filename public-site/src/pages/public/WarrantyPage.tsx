import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

interface WarrantyResult {
  valid: boolean;
  warranty_number: string | null;
  status: string | null;
  expiry_date: string | null;
  message: string;
}

const covered = [
  "The same fault reoccurring after a completed repair",
  "Defects in workmanship related to the original repair",
  "Replacement parts that fail under normal use within the warranty period",
  "Labour costs for re-doing the original repair",
];

const notCovered = [
  "Physical damage after the repair (drops, impacts, pressure)",
  "Liquid or water damage after the device has been returned",
  "Damage from misuse, neglect or unauthorised modifications",
  "Issues unrelated to the original repair",
  "Normal wear and tear",
  "Software issues not related to the original repair",
  "Cosmetic damage that doesn't affect functionality",
];

const claimSteps = [
  { title: "Contact us", description: "Reach out via the contact form, phone or email. Provide your warranty number or repair details." },
  { title: "Describe the issue", description: "Let us know what's happening, when it started and any relevant details." },
  { title: "Bring or send the device", description: "We'll arrange for you to bring it in or schedule a pickup." },
  { title: "Warranty repair", description: "If the claim is valid, we carry out the repair at no extra cost." },
];

export default function WarrantyPage() {
  useEffect(() => {
    document.title = "Warranty Information | Sunset Country Repairs";
  }, []);

  const [warrantyNumber, setWarrantyNumber] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<WarrantyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck(e: FormEvent) {
    e.preventDefault();
    if (!warrantyNumber.trim()) return;
    setIsChecking(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/v1/warranty/${encodeURIComponent(warrantyNumber.trim())}/validate`);
      if (!res.ok) throw new Error("Could not validate warranty number.");
      const data = await res.json();
      setResult(data as WarrantyResult);
    } catch {
      setError("Could not validate the warranty number. Please check it and try again, or contact us directly.");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <div className="min-h-screen bg-warm-50 text-warm-900">
      <section className="bg-warm-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="font-heading text-3xl font-bold sm:text-4xl">Warranty Information</h1>
          <p className="mt-3 text-warm-300 max-w-xl">All our repairs are backed by a 90-day workmanship warranty. Here's what that means.</p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 max-w-3xl">
            <div>
              <h2 className="font-heading text-lg font-semibold text-warm-900">What's covered</h2>
              <ul className="mt-4 space-y-3">
                {covered.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    <span className="text-sm text-warm-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-warm-900">What's not covered</h2>
              <ul className="mt-4 space-y-3">
                {notCovered.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    <span className="text-sm text-warm-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-warm-200 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="font-heading text-lg font-semibold text-warm-900">How to make a claim</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 max-w-3xl">
            {claimSteps.map((item, i) => (
              <div key={item.title}>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-500 text-xs font-bold text-white">{i + 1}</span>
                <h3 className="mt-2 font-heading text-sm font-semibold text-warm-900">{item.title}</h3>
                <p className="mt-1 text-sm text-warm-500 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-warm-200 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-md">
            <h2 className="font-heading text-lg font-semibold text-warm-900">Check your warranty</h2>
            <p className="mt-1.5 text-sm text-warm-500">Enter your warranty number to check its status.</p>
            <form onSubmit={handleCheck} className="mt-4">
              <div className="flex gap-2">
                <input type="text" value={warrantyNumber} onChange={(e) => setWarrantyNumber(e.target.value)} placeholder="Warranty number" className="flex-1 rounded border border-warm-200 bg-white px-3 py-2 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-accent-500" />
                <button type="submit" disabled={isChecking || !warrantyNumber.trim()} className={cn("rounded px-4 py-2 text-sm font-medium transition-colors", isChecking || !warrantyNumber.trim() ? "cursor-not-allowed bg-accent-300 text-white" : "bg-accent-500 text-white hover:bg-accent-600")}>
                  {isChecking ? "Checking..." : "Check"}
                </button>
              </div>
            </form>
            {error && <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            {result && (
              <div className={cn("mt-3 rounded border p-3", result.valid ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50")}>
                <p className={cn("text-sm font-medium", result.valid ? "text-green-700" : "text-yellow-700")}>{result.message}</p>
                {result.warranty_number && (
                  <div className="mt-1.5 space-y-0.5 text-xs text-warm-500">
                    <p>Number: {result.warranty_number}</p>
                    {result.status && <p>Status: {result.status}</p>}
                    {result.expiry_date && <p>Expires: {result.expiry_date}</p>}
                  </div>
                )}
              </div>
            )}
            <p className="mt-3 text-xs text-warm-400">Lost your warranty number? Contact us with your name and repair date and we'll look it up.</p>
          </div>
        </div>
      </section>

      <section className="border-t border-warm-200 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold text-warm-900">Need to make a claim?</h2>
              <p className="mt-1 text-warm-500">Get in touch and we'll sort it out.</p>
            </div>
            <Link to="/contact" className="inline-block rounded bg-accent-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-600 transition-colors">Contact Us</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
