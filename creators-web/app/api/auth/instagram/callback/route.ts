import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) return NextResponse.json({ error: 'No code' }, { status: 400 });

  try {
    // 1️⃣ Exchange code for short-lived token
    const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.NEXT_PUBLIC_IG_APP_ID}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_REDIRECT_URI!)}&client_secret=${process.env.IG_APP_SECRET}&code=${code}`);
    const tokenData = await tokenRes.json();

    if (tokenData.error) throw new Error(tokenData.error_message);

    // 2️⃣ Exchange for long-lived token (60 days)
    const longRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.NEXT_PUBLIC_IG_APP_ID}&client_secret=${process.env.IG_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`);
    const longData = await longRes.json();

    // 🟢 SUCCESS: Log token for now (store in DB later)
    console.log('✅ LONG-LIVED TOKEN:', longData.access_token);
    console.log('🆔 IG USER ID:', tokenData.user_id);
    console.log('⏳ EXPIRES IN:', longData.expires_in, 'seconds');

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_REDIRECT_URI!.replace('/api/auth/instagram/callback', '')}/dashboard?token=${longData.access_token}&user_id=${tokenData.user_id}`);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
