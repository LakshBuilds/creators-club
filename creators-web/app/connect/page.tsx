"use client";

import { buildInstagramAuthorizeUrl } from "@/lib/instagram-oauth";

export default function ConnectPage() {
  const appId = process.env.NEXT_PUBLIC_IG_APP_ID;
  const redirect = process.env.NEXT_PUBLIC_REDIRECT_URI;
  const authUrl = appId && redirect ? buildInstagramAuthorizeUrl(appId, redirect) : "#";

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-indigo-50">
      <h1 className="mb-6 text-3xl font-bold text-indigo-950">Connect Instagram</h1>
      <a
        href={authUrl}
        className="rounded-lg bg-indigo-800 px-8 py-3 font-medium text-white transition hover:bg-indigo-900"
        aria-disabled={!appId || !redirect}
      >
        Authorize Instagram
      </a>
    </div>
  );
}
