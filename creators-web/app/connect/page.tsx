'use client';
export default function ConnectPage() {
  const scopes = 'instagram_basic,instagram_manage_insights,instagram_manage_comments,pages_show_list,pages_read_engagement';
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.NEXT_PUBLIC_IG_APP_ID}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_REDIRECT_URI!)}&scope=${scopes}&response_type=code`;

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-6">Connect Instagram</h1>
      <a href={authUrl} className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 rounded-lg font-medium transition">
        Authorize Instagram
      </a>
    </div>
  );
}
