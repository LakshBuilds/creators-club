type SearchParams = Promise<{ code?: string }>;

export const metadata = {
  title: "Data Deletion Status — Buyhatke Creators"
};

export default async function DataDeletionStatusPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const { code } = await searchParams;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-indigo-950">
      <h1 className="text-3xl font-semibold tracking-tight">
        Data Deletion Status
      </h1>
      <p className="mt-3 text-sm text-indigo-700">
        We received your data deletion request from Instagram.
      </p>

      <section className="mt-8 rounded-lg border border-indigo-100 bg-indigo-50/50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-900/70">
          Confirmation code
        </p>
        <p className="mt-1 break-all font-mono text-sm text-indigo-950">
          {code ?? "(not provided)"}
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-7">
        <h2 className="text-lg font-semibold">What happened</h2>
        <p>
          When you revoked the Buyhatke Creators app on Instagram, Meta notified
          our deletion endpoint. We immediately cleared all Instagram-derived
          data linked to your IG user ID — username, profile picture URL,
          followers count, access tokens, and engagement metrics.
        </p>
        <p>
          Your Buyhatke Creators app account itself (email, name, campaign
          history) remains active so you can re-link Instagram later if you
          choose. To delete the entire account, open the app → Profile →
          Settings → Delete account, or email{" "}
          <a className="underline" href="mailto:support@buyhatke.com">
            support@buyhatke.com
          </a>{" "}
          from your registered address.
        </p>
        <p>
          If you have questions about the status of this deletion, include the
          confirmation code above when you contact support.
        </p>
      </section>
    </main>
  );
}
