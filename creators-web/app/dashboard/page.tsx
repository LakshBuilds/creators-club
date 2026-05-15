"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function DashboardContent() {
  const sp = useSearchParams();
  const userId = sp.get("user_id");
  const username = sp.get("username");

  if (!userId) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-indigo-100">
        <h1 className="text-2xl font-semibold text-indigo-950">
          No active session
        </h1>
        <p className="mt-3 text-indigo-900/80">
          Connect your Instagram account to continue.
        </p>
        <Link
          href="/connect"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700"
        >
          Connect Instagram
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-indigo-100">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h1 className="mt-6 text-2xl font-semibold text-indigo-950">
        Instagram connected
      </h1>
      {username ? (
        <p className="mt-2 text-indigo-900/80">
          Linked as <span className="font-semibold">@{username}</span>
        </p>
      ) : null}
      <p className="mt-4 text-sm text-indigo-900/70">
        Your account is ready. Open the Creators Club mobile app to apply for
        campaigns, submit drafts, and track payouts.
      </p>
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <a
          href="https://hatkecreators.netlify.app/"
          className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-700"
        >
          Back to home
        </a>
        <Link
          href="/data-deletion-status"
          className="text-sm font-medium text-indigo-700 hover:underline"
        >
          Manage data
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-indigo-50">
      <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <Link
          href="/"
          className="text-sm font-medium text-indigo-700 hover:underline"
        >
          ← Back to home
        </Link>
        <div className="mt-6">
          <Suspense
            fallback={
              <p className="p-8 text-center text-indigo-700/70">Loading…</p>
            }
          >
            <DashboardContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
