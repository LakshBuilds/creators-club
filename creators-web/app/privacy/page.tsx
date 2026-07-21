import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Buyhatke Creators",
  description:
    "How Buyhatke Creators collects, uses, stores, and deletes data from creators and brands using the platform."
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-indigo-950">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-indigo-700">Last updated: 8 May 2026</p>

      <section className="mt-8 space-y-3 text-sm leading-7">
        <p>
          This policy explains what data Buyhatke Creators (the &quot;app&quot;,
          &quot;we&quot;, &quot;us&quot;) collects when you use our mobile app
          and web admin dashboard, why we collect it, who we share it with, how
          long we keep it, and how you can ask us to delete it. The app is
          operated by BuyHatke Tech Private Limited (&quot;Buyhatke&quot;), the entity
          behind buyhatke.com.
        </p>
      </section>

      <Section title="1. What this app does">
        <p>
          Buyhatke Creators is a marketplace where Indian Instagram creators
          apply for paid brand-promotion campaigns. Brands review creator
          profiles and engagement metrics, select creators, and creators upload
          a draft video for review before publishing the final post on
          Instagram.
        </p>
      </Section>

      <Section title="2. Data we collect">
        <p>From the creator (you) directly:</p>
        <ul className="ml-6 list-disc space-y-1">
          <li>Email address (used for sign-in via one-time password)</li>
          <li>Full name and profile photo (optional, set during onboarding)</li>
          <li>City and content category preferences (optional)</li>
          <li>The video drafts you upload for brand review</li>
          <li>Notes you write to brands</li>
        </ul>
        <p className="pt-3">
          From your Instagram Business or Creator account (only after you tap
          &quot;Verify Instagram&quot; and grant consent on Instagram&apos;s
          official OAuth consent screen):
        </p>
        <ul className="ml-6 list-disc space-y-1">
          <li>Instagram user ID, username, display name, profile picture URL</li>
          <li>Account type (Business or Creator)</li>
          <li>Followers count and total media count</li>
          <li>
            Aggregated reach metrics on your last few reels (used solely to
            compute a single Engagement Rate number)
          </li>
          <li>
            Comments left by viewers on your reels (only when an Auto-DM rule
            you configured matches a trigger keyword)
          </li>
        </ul>
        <p className="pt-3">From third parties:</p>
        <ul className="ml-6 list-disc space-y-1">
          <li>
            If you connect your Buyhatke gift-card account, we receive your
            referral code and cumulative reward balance from buyhatke.com.
          </li>
        </ul>
      </Section>

      <Section title="3. How we use the data">
        <ul className="ml-6 list-disc space-y-1">
          <li>
            To show your profile to brand admins reviewing campaign applications
          </li>
          <li>
            To compute your Creator Score so brands can filter creators by
            engagement, not just follower count
          </li>
          <li>
            To run your configured Auto-DM rule: when a viewer comments your
            chosen trigger keyword on a reel, we (a) DM them the message you
            configured and (b) post a single public reply comment under the
            trigger comment. We never DM or comment without your explicit
            per-reel configuration.
          </li>
          <li>
            To process payouts when a brand approves your published post
          </li>
          <li>To send you transactional notifications about your campaigns</li>
        </ul>
        <p className="pt-3">
          We do <strong>not</strong> use any data for advertising targeting, sell
          data to third parties, or share Instagram-derived data with anyone
          outside the brand admin running the specific campaign you applied to.
        </p>
      </Section>

      <Section title="4. Where data is stored">
        <ul className="ml-6 list-disc space-y-1">
          <li>
            Identity, profile, application, and submission data: Supabase (a
            managed PostgreSQL provider) in their AP-South region.
          </li>
          <li>
            Draft videos uploaded for brand review: a private Google Drive
            shared with our service account. Files are accessible only to the
            brand admin via embedded preview and to you via the in-app player.
          </li>
          <li>
            Instagram access tokens: encrypted at rest in Supabase. We never log
            them or display them in any UI.
          </li>
        </ul>
      </Section>

      <Section title="5. Who can see your data">
        <ul className="ml-6 list-disc space-y-1">
          <li>You — full read access to everything we hold about you</li>
          <li>
            Brand admins — only see your IG profile fields, your engagement
            score, and the specific submission you made to their campaign
          </li>
          <li>
            Buyhatke staff — limited operations access for support and platform
            integrity
          </li>
          <li>
            We do not give Instagram or Meta direct access to your stored data
            beyond what their own APIs return
          </li>
        </ul>
      </Section>

      <Section title="6. Retention">
        <p>
          We keep your data for as long as your account is active. If you delete
          your account, we permanently remove all personal data within 30 days,
          including Instagram tokens and the contents of any unfunded draft
          video uploads. Anonymised, aggregated metrics (e.g. number of
          campaigns processed last month) may be kept indefinitely.
        </p>
      </Section>

      <Section title="7. Deleting your data">
        <p>You have three ways to delete your data:</p>
        <ul className="ml-6 list-decimal space-y-2">
          <li>
            <strong>From the app:</strong> Profile → Settings → Delete account.
            Your row in our database is hard-deleted within minutes; downstream
            cleanup completes within 30 days.
          </li>
          <li>
            <strong>By revoking the app on Instagram:</strong> open Instagram →
            Settings → Apps and Websites → remove Buyhatke Creators. Meta
            notifies our deletion endpoint at{" "}
            <code className="rounded bg-indigo-50 px-1 text-xs">
              /api/auth/instagram/data-deletion
            </code>
            ; we delete your Instagram-derived data within minutes.
          </li>
          <li>
            <strong>By emailing us:</strong> send a deletion request from your
            registered email to{" "}
            <a className="underline" href="mailto:support@buyhatke.com">
              support@buyhatke.com
            </a>
            . We confirm and complete the deletion within 7 working days.
          </li>
        </ul>
      </Section>

      <Section title="8. Children">
        <p>
          The app is intended for users aged 13 and above. We do not knowingly
          collect data from children younger than 13. If you believe a child has
          signed up, contact us and we will remove their data.
        </p>
      </Section>

      <Section title="9. Changes to this policy">
        <p>
          We will update this page when our practices change and update the
          &quot;Last updated&quot; date at the top. Material changes will be
          announced inside the app at least 14 days before they take effect.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          BuyHatke Tech Private Limited
          <br />
          Email:{" "}
          <a className="underline" href="mailto:support@buyhatke.com">
            support@buyhatke.com
          </a>
          <br />
          See also:{" "}
          <Link href="/terms" className="underline">
            Terms of Service
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
