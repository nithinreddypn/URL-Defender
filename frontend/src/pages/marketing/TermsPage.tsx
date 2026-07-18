import { ShieldCheck } from "lucide-react";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By accessing or using URL Defender, you agree to these Terms of Service. If you do not agree, please do not use the service. These terms apply to all visitors, users and others who access the service.",
  },
  {
    title: "2. Service Description",
    body: "URL Defender scans URLs and web content to identify phishing, malware, impersonation and other security threats. Results are provided for informational and security-awareness purposes only and do not constitute professional security or legal advice.",
  },
  {
    title: "3. User Accounts",
    body: "You may need to create an account to access certain features. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate and complete information when creating an account.",
  },
  {
    title: "4. Acceptable Use",
    body: "You agree not to use URL Defender to scan, target or harass third parties without authorization, upload illegal content, abuse the API, reverse-engineer the service, or interfere with its infrastructure. We may suspend or terminate accounts that violate these rules.",
  },
  {
    title: "5. Subscriptions and Payments",
    body: "Paid plans are billed in advance according to the selected cadence. All prices are shown in INR and may be subject to applicable taxes. You can cancel your subscription at any time from your account settings. No refunds are provided for partial billing periods unless required by law.",
  },
  {
    title: "6. Limitation of Liability",
    body: 'URL Defender is provided "as is" without warranties of any kind. To the fullest extent permitted by law, URL Defender is not liable for indirect, incidental, special or consequential damages arising from your use of the service.',
  },
  {
    title: "7. Changes to Terms",
    body: "We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the revised terms. We will notify users of material changes via email or through the application.",
  },
  {
    title: "8. Contact",
    body: "For questions about these terms, contact us at legal@urldefender.io.",
  },
];

export default function TermsPage() {
  return (
    <section className="container-page py-24 sm:py-32">
      <div className="mx-auto max-w-3xl animate-fade-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          Legal
        </div>
        <h1 className="mt-6 text-display text-4xl sm:text-5xl">Terms of Service</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Effective date:{" "}
          {new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        <div className="mt-14 space-y-10">
          {SECTIONS.map((s) => (
            <article key={s.title}>
              <h2 className="text-xl font-semibold tracking-tight">{s.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{s.body}</p>
            </article>
          ))}
        </div>

        <p className="mt-16 text-xs text-muted-foreground">
          These terms are provided as standard SaaS terms. If you need a signed agreement or
          enterprise terms, contact us at legal@urldefender.io.
        </p>
      </div>
    </section>
  );
}
