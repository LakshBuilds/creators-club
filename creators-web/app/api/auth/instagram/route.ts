import { NextResponse } from 'next/server';
export async function GET() {
  const scopes = 'instagram_business_basic,instagram_business_manage_insights,instagram_business_manage_comments,instagram_business_manage_messages';
  const url = `https://www.instagram.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_IG_APP_ID}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_REDIRECT_URI!)}&scope=${scopes}&response_type=code`;
  return NextResponse.redirect(url);
}
