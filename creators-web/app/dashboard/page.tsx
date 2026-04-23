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
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-zinc-600">No session data. Start from Connect.</p>
        <Link href="/connect" className="mt-4 inline-block text-pink-600 underline">
          Connect Instagram
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold text-zinc-900">Connected</h1>
      <ul className="mt-4 space-y-2 text-left text-sm text-zinc-700">
        {userId && (
          <li>
            <span className="font-medium">User ID:</span> {userId}
          </li>
        )}
        {username && (
          <li>
            <span className="font-medium">Username:</span> @{username}
          </li>
        )}
        <li className="text-zinc-500">Token stored server-side in Supabase.</li>
      </ul>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Suspense fallback={<p className="p-8 text-center text-zinc-500">Loading…</p>}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
