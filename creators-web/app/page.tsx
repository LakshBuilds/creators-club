import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-indigo-50">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-base font-bold text-white">
            C
          </div>
          <span className="text-lg font-semibold tracking-tight text-indigo-950">
            Creators Club
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-indigo-900/80 sm:flex">
          <a href="#features" className="hover:text-indigo-900">
            Features
          </a>
          <a href="#how" className="hover:text-indigo-900">
            How it works
          </a>
          <Link
            href="/connect"
            className="rounded-full bg-indigo-600 px-4 py-2 text-white shadow-sm hover:bg-indigo-700"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-12">
        <section className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
            For Indian Instagram creators · Powered by Buyhatke
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-indigo-950 sm:text-5xl md:text-6xl">
            Turn your Instagram into paid brand collaborations.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-indigo-900/80">
            Creators Club connects Instagram creators with verified brands.
            Get matched with paid campaigns, submit drafts, post sponsored
            Reels, and get paid — all in one place.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/connect"
              className="flex h-12 w-full items-center justify-center rounded-full bg-indigo-600 px-8 text-base font-semibold text-white shadow-lg transition-colors hover:bg-indigo-700 sm:w-auto"
            >
              Connect Instagram
            </Link>
            <a
              href="#how"
              className="flex h-12 w-full items-center justify-center rounded-full border border-indigo-200 bg-white px-8 text-base font-semibold text-indigo-900 hover:border-indigo-300 sm:w-auto"
            >
              How it works
            </a>
          </div>
        </section>

        <section id="features" className="mt-24 grid gap-6 md:grid-cols-3">
          <Feature
            title="Verified brand campaigns"
            body="Apply to live campaigns from brands looking for creators in your niche. Every brand is reviewed before going live."
          />
          <Feature
            title="Draft review by experts"
            body="Submit your Reel draft inside the app. Our team gives quality feedback before it goes live on Instagram."
          />
          <Feature
            title="One-tap payouts"
            body="Approved Reels are paid to your Buyhatke wallet within 7 days. Track every payout in the app."
          />
        </section>

        <section id="how" className="mt-24 rounded-2xl bg-white p-10 shadow-sm ring-1 ring-indigo-100">
          <h2 className="text-2xl font-bold tracking-tight text-indigo-950">
            How Creators Club uses your Instagram
          </h2>
          <p className="mt-3 max-w-2xl text-base text-indigo-900/80">
            We use Meta&apos;s Instagram Graph API to fetch only the data we need
            to verify your account and surface insights. We only comment or send
            DMs on Reels where you&apos;ve set up an automation rule, and you can
            turn it off anytime.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <Step
              n="1"
              title="Link your Instagram Business account"
              body="One-tap login via Meta. We fetch your username, follower count, and recent Reel thumbnails so brands can verify you."
            />
            <Step
              n="2"
              title="Get matched to brand campaigns"
              body="Apply to campaigns that fit your niche. Brands review your profile and pick creators."
            />
            <Step
              n="3"
              title="Submit your Reel draft"
              body="Upload the draft inside the app. Our team reviews quality and gives feedback before you post."
            />
            <Step
              n="4"
              title="Automate replies to your comments"
              body="Set up an Auto-DM rule on any Reel with a trigger keyword. When a viewer comments that keyword, Creators Club automatically sends them the DM you wrote and posts a public reply. You configure it once per Reel and can turn it off anytime."
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-indigo-100 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-indigo-900/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Creators Club · A{" "}
            <a
              href="https://buyhatke.com"
              className="font-medium text-indigo-900 hover:underline"
              rel="noreferrer"
            >
              Buyhatke
            </a>{" "}
            product
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/privacy" className="hover:text-indigo-900 hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-indigo-900 hover:underline">
              Terms
            </Link>
            <Link href="/data-deletion-status" className="hover:text-indigo-900 hover:underline">
              Data deletion
            </Link>
            <a
              href="mailto:support@buyhatke.com"
              className="hover:text-indigo-900 hover:underline"
            >
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-indigo-100">
      <h3 className="text-lg font-semibold text-indigo-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-indigo-900/80">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
        {n}
      </div>
      <div>
        <h3 className="font-semibold text-indigo-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-indigo-900/80">{body}</p>
      </div>
    </div>
  );
}
