import { NextResponse } from 'next/server';
export async function GET() {
  const scopes = 'instagram_basic,instagram_manage_insights,instagram_manage_comments,pages_show_list,pages_read_engagement';
  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.NEXT_PUBLIC_IG_APP_ID}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_REDIRECT_URI!)}&scope=${scopes}&response_type=code`;
  return NextResponse.redirect(url);
}
