import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Wrench, Shield, CheckCircle, XCircle, Clock, Phone } from "lucide-react";
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
  { title: "Give us a call", description: "Ring us or drop us a message with your warranty number and what's gone wrong." },
  { title: "Tell us what happened", description: "Let us know when the issue started and any details that might help." },
  { title: "Bring it in", description: "We'll check it over and confirm if it's covered under warranty." },
  { title: "We fix it", description: "If it's a valid claim, we get it sorted at no extra cost." },
];

export default function WarrantyPage() {
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
    <>
      <Helmet>
        <title>Warranty Information | Sunset Country Repairs Mildura</title>
        <meta name="description" content="90-day warranty on all electronics repairs. Learn what's covered, make a claim, and check your warranty status online." />
        <meta name="keywords" content="warranty, repair guarantee, electronics repair warranty, Mildura repair" />
        <link rel="canonical" href="https://sunsetcountryrepairs.com.au/warranty" />
      </Helmet>

      <div className="min-h-screen bg-warm-50 text-warm-900">
      {/* Hero */}
      <section className="relative bg-copper-50 border-b-2 border-copper-200">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-copper-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-warm-900 sm:text-4xl">
              Warranty Information
            </h1>
          </div>
          <p className="text-warm-700 max-w-xl">
            All our repairs come with a 90-day workmanship warranty. Here's the deal - plain and simple.
          </p>
        </div>
      </section>

      {/* What's Covered - Two column */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-10 sm:grid-cols-2 max-w-4xl">
            <div>
              <h2 className="font-heading text-lg font-bold text-copper-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                What's Covered
              </h2>
              <ul className="space-y-3">
                {covered.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span className="text-sm text-warm-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-warm-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                What's Not Covered
              </h2>
              <ul className="space-y-3">
                {notCovered.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="text-red-500 mt-0.5">✕</span>
                    <span className="text-sm text-warm-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Claim Process */}
      <section className="border-t-2 border-copper-200 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="font-heading text-2xl font-bold text-warm-900 mb-8">
            Making a Warranty Claim
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-4xl">
            {claimSteps.map((item, i) => (
              <div key={item.title} className="text-center">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-copper-600 text-white font-bold mb-3">
                  {i + 1}
                </div>
                <h3 className="font-heading text-sm font-bold text-warm-900">{item.title}</h3>
                <p className="mt-2 text-xs text-warm-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Warranty Check */}
      <section className="border-t-2 border-copper-200 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <Wrench className="h-6 w-6 text-copper-600" />
              <h2 className="font-heading text-xl font-bold text-warm-900">Check Your Warranty</h2>
            </div>
            <p className="text-sm text-warm-600 mb-4">
              Enter your warranty number to check if it's still valid.
            </p>
            <form onSubmit={handleCheck} className="space-y-3">
              <input
                type="text"
                value={warrantyNumber}
                onChange={(e) => setWarrantyNumber(e.target.value)}
                placeholder="Warranty number (e.g. WR-12345)"
                className="block w-full rounded-lg border-2 border-copper-200 bg-white px-4 py-3 text-sm text-warm-900 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-copper-500"
              />
              <button
                type="submit"
                disabled={isChecking || !warrantyNumber.trim()}
                className={cn(
                  "w-full rounded-lg px-4 py-3 text-sm font-semibold transition-all",
                  isChecking || !warrantyNumber.trim()
                    ? "cursor-not-allowed bg-copper-300 text-white"
                    : "bg-copper-600 text-white hover:bg-copper-700"
                )}
              >
                {isChecking ? "Checking..." : "Check Warranty"}
              </button>
            </form>

            {error && (
              <div className="mt-4 rounded-lg border-2 border-red-500/30 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {result && (
              <div className={cn(
                "mt-4 rounded-lg border-2 p-4",
                result.valid
                  ? "border-green-500/30 bg-green-50"
                  : "border-yellow-500/30 bg-yellow-50"
              )}>
                <p className={cn(
                  "text-sm font-medium",
                  result.valid ? "text-green-700" : "text-yellow-700"
                )}>
                  {result.message}
                </p>
                {result.warranty_number && (
                  <div className="mt-2 space-y-1 text-xs text-warm-600">
                    <p>Warranty #: {result.warranty_number}</p>
                    {result.status && <p>Status: {result.status}</p>}
                    {result.expiry_date && <p>Expires: {result.expiry_date}</p>}
                  </div>
                )}
              </div>
            )}

            <p className="mt-4 text-xs text-warm-500">
              Lost your warranty number? Give us a call with your name and repair date - we'll look it up.
            </p>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="border-t-2 border-copper-200 bg-white py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <h2 className="font-heading text-xl font-bold text-warm-900 mb-3">
            Need to claim your warranty?
          </h2>
          <p className="text-warm-600 mb-6">
            Get in touch and we'll sort it out for you.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-copper-600 px-8 py-3 text-sm font-semibold text-white hover:bg-copper-700 transition-all"
          >
            <Phone className="h-4 w-4" />
            Contact Us
          </Link>
        </div>
      </section>
    </div>
    </>
  );
}