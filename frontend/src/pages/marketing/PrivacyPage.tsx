import { Lock } from "lucide-react";

const SECTIONS = [
  {
    title: "1. Information We Collect",
    body: "We collect information you provide directly, such as your name, email address and password when you create an account. We also collect URLs and related content you submit for scanning, scan results, and technical information like IP address, browser type and device information for security and service improvement.",
  },
  {
    title: "2. How We Use Your Information",
    body: "We use your information to operate and improve URL Defender, provide scan results, send security alerts and digests, process payments, respond to support requests and protect against abuse. We do not sell your personal information to third parties.",
  },
  {
    title: "3. Data Sharing",
    body: "We may share data with service providers who help us run the service, such as hosting, payment, email and analytics providers. We may also disclose information when required by law or to protect our rights and users' safety.",
  },
  {
    title: "4. Cookies and Analytics",
    body: "We use cookies and similar technologies to keep you signed in, remember preferences and understand how the service is used. You can control cookies through your browser settings. We use analytics tools to improve the product experience.",
  },
  {
    title: "5. Data Retention",
    body: "We retain your account information for as long as your account is active. Scan history is kept according to your plan limits. You can request deletion of your account and associated data at any time.",
  },
  {
    title: "6. Your Rights",
    body: "Depending on your location, you may have rights to access, correct, delete or export your personal data. To exercise these rights, contact us at privacy@urldefender.io. We will respond within a reasonable timeframe.",
  },
  {
    title: "7. Security",
    body: "We take reasonable measures to protect your data, including encryption in transit and at rest, access controls and regular security reviews. No online service is completely secure, and we cannot guarantee absolute security.",
  },
  {
    title: "8. Changes to This Policy",
    body: "We may update this Privacy Policy from time to time. We will notify you of material changes through the service or by email. Continued use of URL Defender after changes means you accept the updated policy.",
  },
  {
    title: "9. Contact",
    body: "For privacy-related questions or data requests, contact us at privacy@urldefender.io.",
  },
];

export default function PrivacyPage() {
  return (
    <section className="container-page py-24 sm:py-32">
      <div className="mx-auto max-w-3xl animate-fade-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <Lock className="h-3 w-3" />
          Privacy
        </div>
        <h1 className="mt-6 text-display text-4xl sm:text-5xl">Privacy Policy</h1>
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
          This privacy policy is provided as a standard SaaS privacy notice. For enterprise or
          region-specific terms, contact us at privacy@urldefender.io.
        </p>
      </div>
    </section>
  );
}
