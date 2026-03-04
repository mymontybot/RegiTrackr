import Link from "next/link";

export const metadata = {
  title: "Terms of Service — RegiTrackr",
  description: "Terms of Service for RegiTrackr compliance monitoring platform.",
  alternates: { canonical: "https://regitrackr.com/terms" },
};

export default function TermsPage() {
  return (
    <>
      <article className="prose prose-invert mx-auto max-w-3xl px-4 py-24 text-slate-300 sm:px-6 lg:px-8 prose-headings:text-slate-100 prose-p:leading-relaxed prose-ul:leading-relaxed">
          <h1 className="text-3xl font-bold text-slate-100">Terms of Service</h1>
          <section
            className="mb-8 rounded-xl border border-[#854D0E] bg-[#1A1400] p-6"
            style={{ borderLeft: "4px solid #FDE047" }}
          >
            <h2 className="text-sm font-semibold text-[#FDE047]">Subscription Auto-Renewal Summary</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              RegiTrackr is a subscription service that renews automatically. By subscribing you agree to recurring
              charges at the rate for your plan tier until you cancel.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              To cancel: go to Settings, then Billing, then Cancel Subscription - or email support@regitrackr.com.
              Cancellation takes effect at the end of your current billing period.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Annual plans are refunded pro-rata for unused months. Monthly plans are not refunded for partial periods.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              See Section 6 below for full California auto-renewal disclosure.
            </p>
          </section>
          <p className="text-sm text-slate-500">Last updated: March 2026</p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">1. Service description</h2>
          <p>
            RegiTrackr is a compliance monitoring tool for accounting professionals and CPA firms. The service
            provides nexus threshold monitoring, filing deadline calendars, and related workflow features. RegiTrackr
            is not a tax advisor and does not provide tax, legal, or professional advice. You are responsible for
            obtaining any such advice from qualified professionals.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">2. Acceptable use</h2>
          <p>
            You agree to use RegiTrackr only for lawful purposes and in accordance with these Terms. You may not use the
            service to violate any applicable law, infringe third-party rights, transmit malicious code, attempt to gain
            unauthorized access to any system or data, or use the service in any way that could harm RegiTrackr or its
            users. We may suspend or terminate access for conduct that we reasonably believe violates these terms.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">3. AI-generated content disclaimer</h2>
          <p>
            RegiTrackr may present AI-generated narratives and summaries (e.g., nexus exposure briefings) for
            informational and workflow convenience only. Such content is not tax, legal, or professional advice. You are
            solely responsible for verifying all information before relying on it for any decision or client work. We do
            not guarantee the accuracy, completeness, or suitability of AI-generated content for any particular purpose.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">4. Data handling</h2>
          <p>
            We store your data using industry-standard encryption and do not sell your data to third parties. Our use of
            data is described in our Privacy Policy. You retain ownership of your data; by using the service you grant us
            the rights necessary to operate, store, and process your data in accordance with our policies and applicable
            law.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">5. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, RegiTrackr and its affiliates, officers, and employees shall not be
            liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of
            profits, data, or goodwill, arising from your use of the service or these Terms. Our total liability for any
            claims arising from or related to the service or these Terms shall not exceed the amount you paid us in the
            twelve (12) months preceding the claim. Some jurisdictions do not allow certain limitations of liability; in
            such jurisdictions, our liability will be limited to the greatest extent permitted by law.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">6. Automatic Renewal - California Disclosure</h2>
          <p>
            AUTOMATIC RENEWAL NOTICE (REQUIRED UNDER CALIFORNIA BUSINESS AND PROFESSIONS CODE SECTION 17600 ET SEQ.)
          </p>
          <p>
            Your RegiTrackr subscription is a recurring subscription that automatically renews at the end of each
            billing period unless you cancel before the renewal date.
          </p>
          <p>The following terms apply to your subscription:</p>
          <p>
            Billing cycle:
            <br />
            Your subscription renews monthly (or annually if you selected annual billing) at the rate shown at the
            time of purchase. Your billing cycle begins on the date your free trial ends or the date you first provide
            payment information, whichever comes first.
          </p>
          <p>
            Renewal price:
            <br />
            Your subscription will renew at the then-current rate for your plan tier, based on the number of active
            clients in your account at the time of renewal. You will receive notice of any price increase at least 30
            days before it takes effect.
          </p>
          <p>
            How to cancel:
            <br />
            You may cancel your subscription at any time by visiting your account settings at
            app.regitrackr.com/settings/billing and selecting Cancel Subscription, or by emailing
            support@regitrackr.com with your cancellation request. Cancellation takes effect at the end of the current
            billing period. You will not be charged for the next period after cancellation is confirmed.
          </p>
          <p>
            Effect of cancellation:
            <br />
            After cancellation, your account will remain accessible until the end of the paid period. After that date,
            your account will be downgraded to read-only status for 90 days, after which your data will be permanently
            deleted unless you reactivate your subscription.
          </p>
          <p>
            No partial refunds:
            <br />
            Monthly subscriptions are not refunded for partial periods. Annual subscriptions are refunded on a
            pro-rata basis for unused complete months remaining at the time of cancellation.
          </p>
          <p>
            Free trial:
            <br />
            If you are currently in a free trial period, you will not be charged until the trial ends. You may cancel
            at any time during the trial at no charge. If you do not cancel before the trial ends, your subscription
            will begin automatically and your payment method will be charged.
          </p>
          <p>
            To avoid being charged, you must cancel before your trial period ends. The trial end date is shown in your
            account settings.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">7. Governing Law and Dispute Resolution</h2>
          <p>
            These Terms are governed by and construed in accordance with the laws of the State of California, without
            regard to its conflict of law provisions.
          </p>
          <p>
            Any dispute, claim, or controversy arising out of or relating to these Terms or the use of the Service
            shall be subject to the exclusive jurisdiction of the state and federal courts located in Riverside County,
            California. You consent to the personal jurisdiction of those courts.
          </p>
          <p>
            If any provision of these Terms is found to be unenforceable under California law, that provision will be
            modified to the minimum extent necessary to make it enforceable, and the remaining provisions will
            continue in full force and effect.
          </p>

          <h2 className="mt-10 text-xl font-semibold text-slate-100">8. Contact</h2>
          <p>
            For questions about these Terms or legal matters, contact us at{" "}
            <a href="mailto:legal@regitrackr.com" className="text-blue-400 hover:text-blue-300">
              legal@regitrackr.com
            </a>
            .
          </p>
        </article>
    </>
  );
}
