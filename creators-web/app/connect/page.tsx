"use client";

import { buildInstagramAuthorizeUrl } from "@/lib/instagram-oauth";

export default function ConnectPage() {
  const appId = process.env.NEXT_PUBLIC_IG_APP_ID;
  const redirect = process.env.NEXT_PUBLIC_REDIRECT_URI;
  const authUrl = appId && redirect ? buildInstagramAuthorizeUrl(appId, redirect) : "#";

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-6">Connect Instagram</h1>
      <a
        href={authUrl}
        className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 rounded-lg font-medium transition"
        aria-disabled={!appId || !redirect}
      >
        Authorize Instagram
      </a>
    </div>
  );
}
