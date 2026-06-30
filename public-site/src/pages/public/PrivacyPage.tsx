import { useEffect } from "react";

export default function PrivacyPage() {
  useEffect(() => {
    document.title = "Privacy Policy | Sunset Country Repairs";
  }, []);

  return (
    <div className="min-h-screen bg-warm-50 text-warm-900">
      <section className="bg-warm-900 text-white">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="font-heading text-3xl font-bold sm:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-warm-300 max-w-xl">How we collect, use, and protect your personal information.</p>
          <p className="mt-2 text-sm text-warm-500">Last updated: June 2026</p>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="space-y-10">
            <div>
              <h2 className="font-heading text-2xl font-semibold text-warm-900">1. Introduction</h2>
              <div className="mt-4 space-y-4 text-warm-500 leading-relaxed">
                <p>Sunset Country Repairs ("we", "our", or "us") is committed to protecting the privacy of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, use our services, or otherwise interact with us.</p>
                <p>We comply with the Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs). By using our services or providing us with your personal information, you consent to the practices described in this policy.</p>
              </div>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-warm-900">2. Information We Collect</h2>
              <div className="mt-4 space-y-4 text-warm-500 leading-relaxed">
                <p>We may collect the following types of personal information:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong className="text-warm-600">Contact details:</strong> Your name, phone number, email address, and residential or business address.</li>
                  <li><strong className="text-warm-600">Device information:</strong> Device type, brand, model, IMEI number, serial number, colour, and any passcodes or lock codes necessary for repair.</li>
                  <li><strong className="text-warm-600">Repair information:</strong> Descriptions of device issues, diagnostic findings, repair notes, quotes, invoices, and warranty records.</li>
                  <li><strong className="text-warm-600">Communication records:</strong> Records of communications between you and us, including emails, SMS messages, and phone call logs.</li>
                  <li><strong className="text-warm-600">Website data:</strong> Information collected through our website, including IP addresses, browser type, pages visited, and other analytics data.</li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-warm-900">3. How We Use Your Information</h2>
              <div className="mt-4 space-y-4 text-warm-500 leading-relaxed">
                <p>We use your personal information for the following purposes:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>To provide, manage, and administer our repair services.</li>
                  <li>To communicate with you about your repairs, quotes, and invoices.</li>
                  <li>To process payments and maintain accurate financial records.</li>
                  <li>To arrange pickup and drop-off services.</li>
                  <li>To manage warranty claims and provide after-repair support.</li>
                  <li>To send you service-related communications, including status updates.</li>
                  <li>To improve our services, website, and customer experience.</li>
                  <li>To comply with our legal and regulatory obligations.</li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-warm-900">4. Disclosure of Personal Information</h2>
              <div className="mt-4 space-y-4 text-warm-500 leading-relaxed">
                <p>We may disclose your personal information in the following circumstances:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>To third-party service providers who assist us in operating our business, such as payment processors, SMS gateway providers, and email service providers.</li>
                  <li>Where required or authorised by law, including in response to a court order, subpoena, or other legal process.</li>
                  <li>To protect the rights, property, or safety of Sunset Country Repairs, our customers, or the public.</li>
                  <li>With your consent or at your direction.</li>
                </ul>
                <p>We will not sell, rent, or trade your personal information to third parties for marketing purposes.</p>
              </div>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-warm-900">5. Storage and Security</h2>
              <div className="mt-4 space-y-4 text-warm-500 leading-relaxed">
                <p>We take reasonable steps to protect your personal information from misuse, interference, loss, unauthorised access, modification, and disclosure.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Secure storage of physical records in locked premises.</li>
                  <li>Access controls limiting personal information to authorised personnel.</li>
                  <li>Encryption of data in transit and at rest where appropriate.</li>
                  <li>Regular review and updating of our security practices.</li>
                </ul>
                <p>Your personal information is stored on servers located in Australia. We retain your personal information for as long as necessary to fulfil the purposes for which it was collected, or as required by law.</p>
              </div>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-warm-900">6. Access and Correction</h2>
              <div className="mt-4 space-y-4 text-warm-500 leading-relaxed">
                <p>You have the right to access and request correction of the personal information we hold about you.</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong className="text-warm-600">Access your information:</strong> Contact us and we will provide you with a copy of the personal information we hold about you.</li>
                  <li><strong className="text-warm-600">Correct your information:</strong> If you believe any personal information we hold is inaccurate, incomplete, or out of date, contact us and we will take reasonable steps to correct it.</li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-warm-900">7. Complaints</h2>
              <div className="mt-4 space-y-4 text-warm-500 leading-relaxed">
                <p>If you believe we have breached the Australian Privacy Principles, please contact us. If you are not satisfied with our response, you may lodge a complaint with the Office of the Australian Information Commissioner (OAIC) at <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer" className="text-accent-500 underline hover:text-accent-600">www.oaic.gov.au</a>.</p>
              </div>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-warm-900">8. Contact Us</h2>
              <div className="mt-4 space-y-4 text-warm-500 leading-relaxed">
                <p>If you have any questions about this Privacy Policy or how we handle your personal information, please contact us through our website contact form or via the contact details provided on our website.</p>
              </div>
            </div>

            <div>
              <h2 className="font-heading text-2xl font-semibold text-warm-900">9. Changes to This Policy</h2>
              <div className="mt-4 space-y-4 text-warm-500 leading-relaxed">
                <p>We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
