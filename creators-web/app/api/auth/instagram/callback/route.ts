import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const oauthError = searchParams.get('error');
  const oauthErrorDescription =
    searchParams.get('error_description') ?? searchParams.get('error_reason');
  if (oauthError) {
    return NextResponse.json(
      {
        error: oauthError,
        ...(oauthErrorDescription && { details: oauthErrorDescription })
      },
      { status: 400 }
    );
  }

  let code = searchParams.get('code');

  if (!code) {
    return NextResponse.json(
      {
        error: 'No authorization code',
        hint: 'Open /connect and complete the Instagram login; if the URL has only a #fragment, the server cannot read the code.'
      },
      { status: 400 }
    );
  }

  // Instagram appends #_ to the code sometimes
  code = code.replace(/#_$/, '');

  try {
    // 1️⃣ Exchange code for short-lived token
    const body = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_IG_APP_ID!,
      client_secret: process.env.IG_APP_SECRET!,
      grant_type: 'authorization_code',
      redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI!,
      code: code
    });

    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error) throw new Error(tokenData.error_message);

    // 2️⃣ Exchange for long-lived token (60 days)
    const longRes = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.IG_APP_SECRET}&access_token=${tokenData.access_token}`);
    const longData = await longRes.json();

    // 🟢 SUCCESS: Log token for now (store in DB later)
    console.log('✅ LONG-LIVED TOKEN:', longData.access_token);
    console.log('🆔 IG USER ID:', tokenData.user_id);

    try {
      const subRes = await fetch(`https://graph.instagram.com/v25.0/${tokenData.user_id}/subscribed_apps?subscribed_fields=comments,messages&access_token=${longData.access_token}`, {
        method: 'POST'
      });
      const subData = await subRes.json();
      console.log('🔔 WEBHOOK SUBSCRIPTION:', subData.success ? 'ENABLED' : 'FAILED', subData);
    } catch (subErr) {
      console.error('❌ Failed to enable webhook subscription:', subErr);
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_REDIRECT_URI!.replace('/api/auth/instagram/callback', '')}/dashboard?token=${longData.access_token}&user_id=${tokenData.user_id}`);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
