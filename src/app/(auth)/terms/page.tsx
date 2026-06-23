import Link from "next/link";

export const metadata = {
  title: "Terms and Conditions · The Job Market",
};

const LAST_UPDATED = "22 June 2026";

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "1. ACCEPTANCE OF TERMS",
    body: [
      "These Terms and Conditions (the \"Terms\") govern your access to and use of The Job Market (the \"Platform\"), a talent marketplace operated for the Hong Kong technology vertical. By registering for an account, accessing, or using the Platform, you agree to be bound by these Terms. If you do not agree, you must not use the Platform.",
      "We may update these Terms from time to time. Continued use of the Platform after changes take effect constitutes acceptance of the revised Terms.",
    ],
  },
  {
    heading: "2. ELIGIBILITY",
    body: [
      "You must be at least 18 years old and legally able to enter into a binding contract to use the Platform. Employers must have authority to act on behalf of the organisation they register.",
      "You are responsible for ensuring that your use of the Platform complies with all laws applicable to you, including any right-to-work, immigration, and employment regulations in your jurisdiction.",
    ],
  },
  {
    heading: "3. ACCOUNTS AND SECURITY",
    body: [
      "You agree to provide accurate, current, and complete information during registration and to keep it up to date. You are responsible for safeguarding your password and for all activity that occurs under your account.",
      "You must notify us immediately of any unauthorised use of your account. We are not liable for any loss arising from your failure to protect your credentials.",
    ],
  },
  {
    heading: "4. CANDIDATE OBLIGATIONS",
    body: [
      "Candidates are responsible for the accuracy of their portfolio, skills, experience, salary expectations, and any other information they publish. You must only upload work and links that you have the right to share, and must not misrepresent your abilities or experience.",
      "Composite scores, percentile ranks, and salary references are estimates generated from the information you and others provide. They are provided for guidance only and do not constitute a guarantee of employment, compensation, or outcome.",
    ],
  },
  {
    heading: "5. EMPLOYER OBLIGATIONS",
    body: [
      "Employers must use candidate information solely for legitimate recruitment purposes and in accordance with applicable data-protection law. You must not share, resell, or repurpose candidate data outside the Platform.",
      "Pitches, offers, and any commitments you communicate through the Platform must be genuine. Repeated non-response or abandonment of conversations may result in reputation penalties or account suspension.",
    ],
  },
  {
    heading: "6. SUBSCRIPTIONS AND FEES",
    body: [
      "Certain features, including browsing the candidate feed and unlimited job postings, require an active employer subscription. Fees, billing cycles, and renewal terms are presented at the point of purchase. Subscriptions renew automatically unless cancelled before the renewal date.",
      "Sending and accepting pitches is free for candidates. We reserve the right to change our pricing and feature availability on reasonable notice.",
    ],
  },
  {
    heading: "7. USER CONTENT",
    body: [
      "You retain ownership of the content you submit. By submitting content, you grant us a non-exclusive, worldwide, royalty-free licence to host, display, and process it for the purpose of operating and improving the Platform.",
      "Anonymised and aggregated data (for example, accepted-offer salaries) may be used to power market references shown to other users. We will not publish your identifying information as part of these aggregate references.",
    ],
  },
  {
    heading: "8. ACCEPTABLE USE",
    body: [
      "You agree not to: upload unlawful, infringing, or malicious content; harass or discriminate against other users; scrape or harvest data; attempt to circumvent security or access controls; or use the Platform for any purpose other than its intended recruitment use.",
      "We may remove content and suspend or terminate accounts that violate these Terms.",
    ],
  },
  {
    heading: "9. PRIVACY",
    body: [
      "Our handling of personal data is described in our Privacy Policy. By using the Platform you consent to the collection and processing of your data as described there and as necessary to provide the service.",
    ],
  },
  {
    heading: "10. DISCLAIMERS",
    body: [
      "The Platform is provided \"as is\" and \"as available\" without warranties of any kind, whether express or implied. We do not warrant that the Platform will be uninterrupted, error-free, or that any match, score, or salary estimate will lead to a particular result.",
      "We are not a party to any employment relationship formed between candidates and employers and are not responsible for the conduct of any user.",
    ],
  },
  {
    heading: "11. LIMITATION OF LIABILITY",
    body: [
      "To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages, or for any loss of profits, data, or goodwill arising from your use of the Platform. Our total aggregate liability shall not exceed the fees you paid to us in the twelve months preceding the claim.",
    ],
  },
  {
    heading: "12. TERMINATION",
    body: [
      "You may close your account at any time. We may suspend or terminate your access if you breach these Terms or if required by law. Provisions that by their nature should survive termination will survive.",
    ],
  },
  {
    heading: "13. GOVERNING LAW",
    body: [
      "These Terms are governed by the laws of the Hong Kong Special Administrative Region, and you submit to the exclusive jurisdiction of the Hong Kong courts.",
    ],
  },
  {
    heading: "14. CONTACT",
    body: [
      "Questions about these Terms can be directed to the Platform operator through the contact channels listed on the Platform.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="panel p-8">
      <div className="mb-6">
        <Link href="/sign-up" className="link-up mono mb-1 inline-block" style={{ fontSize: 11 }}>
          ← BACK
        </Link>
        <h1
          className="mono"
          style={{ fontSize: 18, fontWeight: 700, color: "var(--up)", letterSpacing: "0.04em" }}
        >
          TERMS AND CONDITIONS
        </h1>
        <p className="kicker mt-1">LAST UPDATED · {LAST_UPDATED}</p>
      </div>

      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2
              className="mono mb-2"
              style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", letterSpacing: "0.04em" }}
            >
              {section.heading}
            </h2>
            {section.body.map((para, i) => (
              <p
                key={i}
                className="mono mb-2"
                style={{ fontSize: 12, lineHeight: 1.6, color: "var(--text-2)" }}
              >
                {para}
              </p>
            ))}
          </section>
        ))}
      </div>

      <div className="hr my-6" />
      <p className="mono text-center" style={{ fontSize: 12, color: "var(--muted)" }}>
        <Link href="/sign-up" className="link-up">
          RETURN TO REGISTRATION
        </Link>
      </p>
    </div>
  );
}
