import { NextResponse } from 'next/server';

// 1️⃣ VERIFICATION (GET): Used by Meta to verify your webhook URL
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const EXPECTED_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === EXPECTED_TOKEN && challenge) {
    // Meta expects EXACTLY the challenge string back with 200 status
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  return new NextResponse('Verification failed', { status: 403 });
}

// 2️⃣ DATA RECEIVER (POST): Where Meta sends the actual notifications
export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('📩 RECEIVED WEBHOOK:', JSON.stringify(data, null, 2));

    // Handle different types of events here (comments, mentions, etc.)

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}
