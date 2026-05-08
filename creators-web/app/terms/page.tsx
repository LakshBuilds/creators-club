import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Buyhatke Creators",
  description:
    "Terms governing use of the Buyhatke Creators app for Indian content creators and brand partners."
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-indigo-950">
      <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-indigo-700">Last updated: 8 May 2026</p>

      <Section title="1. Who we are">
        <p>
          Buyhatke Creators (the &quot;app&quot;) is operated by Compare Hatke
          Pvt. Ltd., the company behind buyhatke.com (&quot;Buyhatke&quot;,
          &quot;we&quot;, &quot;us&quot;). By signing in to the app you agree
          to these terms.
        </p>
      </Section>

      <Section title="2. What the app does">
        <p>
          The app connects Indian content creators with brand partners running
          paid promotion campaigns. Creators apply to campaigns, brands review
          and approve, creators upload draft videos, and after approval they
          publish on their own Instagram. We facilitate the workflow and the
          payout.
        </p>
      </Section>

      <Section title="3. Eligibility">
        <ul className="ml-6 list-disc space-y-1">
          <li>You must be at least 13 years old.</li>
          <li>
            You must own the Instagram account you connect, and that account
            must be set to a Business or Creator (Professional) account type.
          </li>
          <li>
            You must provide accurate information about yourself and your
            content categories during onboarding.
          </li>
        </ul>
      </Section>

      <Section title="4. Your account">
        <ul className="ml-6 list-disc space-y-1">
          <li>
            You sign in using a one-time password (OTP) sent to your email. You
            are responsible for keeping that email secure.
          </li>
          <li>
            One person, one account. Do not create multiple accounts to gain
            unfair access to campaigns.
          </li>
          <li>
            You can delete your account anytime from Profile → Settings →
            Delete account. See our{" "}
            <Link href="/privacy" className="underline">
              Privacy Policy
            </Link>{" "}
            for what happens to your data.
          </li>
        </ul>
      </Section>

      <Section title="5. Campaigns and submissions">
        <ul className="ml-6 list-disc space-y-1">
          <li>
            Applying to a campaign does not guarantee selection. Brand admins
            choose at their discretion based on engagement and fit.
          </li>
          <li>
            If you are selected, you must upload your draft video within the
            campaign deadline. Drafts that do not meet quality requirements
            (resolution, duration, aspect ratio) will be rejected.
          </li>
          <li>
            Once your draft is approved, you must publish the final post on
            Instagram and paste the live URL inside the app to trigger your
            payout.
          </li>
          <li>
            Do not edit or delete the published post until the campaign has
            ended and your payout has cleared.
          </li>
        </ul>
      </Section>

      <Section title="6. Payouts">
        <ul className="ml-6 list-disc space-y-1">
          <li>
            Payouts are issued in INR to the bank account or UPI ID you provide.
          </li>
          <li>
            Payouts clear within 7 working days of you submitting the live IG
            post URL and the brand confirming it.
          </li>
          <li>
            We do not deduct any platform commission. Applicable TDS may be
            withheld as required by Indian tax law.
          </li>
        </ul>
      </Section>

      <Section title="7. Auto-DM and comment replies">
        <ul className="ml-6 list-disc space-y-1">
          <li>
            Auto-DM rules you configure send a single private message and post a
            single public reply comment when a viewer comments your chosen
            trigger keyword on a reel you own.
          </li>
          <li>
            You agree not to use Auto-DM rules for spam, impersonation, or
            content that violates Instagram&apos;s Community Guidelines.
          </li>
          <li>
            You can disable any Auto-DM rule at any time from the Auto-DM tab.
          </li>
        </ul>
      </Section>

      <Section title="8. Acceptable use">
        <p>You agree NOT to:</p>
        <ul className="ml-6 list-disc space-y-1">
          <li>Buy followers, likes, or fake engagement</li>
          <li>Misrepresent the brand or its products in your post</li>
          <li>Reverse-engineer, scrape, or abuse our APIs</li>
          <li>Use the app to send unsolicited messages or comments</li>
          <li>
            Violate Instagram&apos;s Terms of Use or Community Guidelines while
            participating in campaigns
          </li>
        </ul>
        <p>
          We may suspend or terminate accounts that violate these rules and
          reverse pending payouts.
        </p>
      </Section>

      <Section title="9. Disclaimers">
        <p>
          The app is provided &quot;as is&quot;. We make no guarantees about
          campaign approval rates, payout timing in extraordinary
          circumstances, or that Instagram will not change its policies in a
          way that affects the app&apos;s functionality.
        </p>
      </Section>

      <Section title="10. Liability">
        <p>
          To the extent allowed by law, we are not liable for indirect or
          consequential losses arising from your use of the app. Our total
          liability for any claim is capped at the total amount we have paid
          you in the last 12 months.
        </p>
      </Section>

      <Section title="11. Changes">
        <p>
          We may update these terms. Material changes will be announced inside
          the app at least 14 days before they take effect. Continued use after
          the effective date means you accept the updated terms.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          Compare Hatke Pvt. Ltd.
          <br />
          Email:{" "}
          <a className="underline" href="mailto:support@buyhatke.com">
            support@buyhatke.com
          </a>
          <br />
          See also:{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 space-y-3 text-sm leading-7">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
