import { useEffect } from "react";

export default function TermsPage() {
  useEffect(() => {
    document.title = "Terms and Conditions | Sunset Country Repairs";
  }, []);

  return (
    <div className="min-h-screen bg-warm-50 text-warm-900">
      <section className="bg-warm-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="font-heading text-3xl font-bold sm:text-4xl">Terms and Conditions</h1>
          <p className="mt-3 text-warm-300 max-w-xl">The terms governing our repair services.</p>
          <p className="mt-2 text-sm text-warm-500">Last updated: June 2026</p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="space-y-10">
            <div>
              <h2 className="font-heading text-2xl font-semibold text-warm-900">1. Introduction</h2>
              <div className="mt-4 space-y-4 text-warm-500 leading-relaxed">
                <p>These Terms and Conditions ("Terms") govern the use of services provided by Sunset Country Repairs ("we", "our", or "us"). By engaging our services, you agree to be bound by these Terms.</p>
              </div>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-warm-900">2. Services</h2>
              <div className="mt-4 space-y-4 text-warm-500 leading-relaxed">
                <p>We provide mobile electronics repair services including but not limited to smartphone, tablet, laptop, gaming console, and smart watch repairs, as well as data recovery, screen replacement, battery replacement, and software troubleshooting.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>All repairs are subject to device condition and parts availability.</li>
                  <li>We will provide an honest assessment of whether a repair is feasible and cost-effective before proceeding.</li>
                  <li>We reserve the right to decline any repair that we deem impractical or beyond our capability.</li>
                  <li>Repair timeframes are estimates only and may vary depending on parts availability and the complexity of the repair.</li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-warm-900">3. Quotes and Pricing</h2>
              <div className="mt-4 space-y-4 text-warm-500 leading-relaxed">
                <p>Where applicable, we will provide a quote before commencing repair work. Quotes are valid for the period specified on the quote or, if no period is specified, for 14 days from the date of issue.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Quotes are based on the information provided and the initial diagnosis. Additional issues discovered during repair may affect the final cost.</li>
                  <li>If the final cost is likely to exceed the quoted amount, we will contact you for approval before proceeding.</li>
                  <li>All prices are quoted in Australian Dollars and include GST unless otherwise stated.</li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-warm-900">4. Payment</h2>
              <div className="mt-4 space-y-4 text-warm-500 leading-relaxed">
                <ul className="list-disc pl-6 space-y-2">
                  <li>Full payment is due upon completion of the repair and before the device is returned.</li>
                  <li>We accept cash, bank transfer, and card payments.</li>
                  <li>A deposit may be required for repairs requiring the ordering of specific parts.</li>
                  <li>Devices not collected within 90 days of notification of completion may incur storage fees or be disposed of in accordance with applicable law.</li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-warm-900">5. Warranty</h2>
              <div className="mt-4 space-y-4 text-warm-500 leading-relaxed">
                <p>All repairs carried out by Sunset Country Repairs are backed by a 90-day workmanship warranty from the date of repair completion.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>The warranty covers the specific repair performed and the same fault reoccurring within the warranty period.</li>
                  <li>The warranty does not cover physical damage, liquid damage, misuse, or any issue unrelated to the original repair.</li>
                  <li>The warranty is void if the device is tampered with by any person other than our authorised technicians after the repair.</li>
                  <li>Warranty claims must be accompanied by the original repair receipt or warranty number.</li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-warm-900">6. Limitation of Liability</h2>
              <div className="mt-4 space-y-4 text-warm-500 leading-relaxed">
                <p>To the maximum extent permitted by law, Sunset Country Repairs is not liable for any indirect, incidental, special, or consequential damages arising from the use of our services.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>We are not responsible for any data loss that may occur during the repair process. Customers are strongly advised to back up their data before submitting a device for repair.</li>
                  <li>Our liability for any claim arising from our services is limited to the amount paid for the specific repair in question.</li>
                  <li>Nothing in these Terms excludes, restricts, or modifies any consumer rights under the Australian Consumer Law.</li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-warm-900">7. Device Collection and Care</h2>
              <div className="mt-4 space-y-4 text-warm-500 leading-relaxed">
                <ul className="list-disc pl-6 space-y-2">
                  <li>You are responsible for collecting your device within the notified timeframe after the repair is completed.</li>
                  <li>We take reasonable care of devices in our possession but are not liable for damage or loss caused by events beyond our reasonable control.</li>
                  <li>Devices not collected within 90 days of notification may be subject to storage fees or disposal in accordance with applicable uncollected goods legislation.</li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-warm-900">8. General</h2>
              <div className="mt-4 space-y-4 text-warm-500 leading-relaxed">
                <ul className="list-disc pl-6 space-y-2">
                  <li>These Terms are governed by the laws of Victoria, Australia.</li>
                  <li>If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will continue in full force and effect.</li>
                  <li>We may update these Terms from time to time. The current version will always be available on our website.</li>
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-warm-200 bg-white p-6">
              <h3 className="font-heading text-lg font-semibold text-warm-900">Questions About These Terms?</h3>
              <p className="mt-2 text-warm-500">If you have any questions, please contact us through our website contact form.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
