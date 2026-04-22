import { NextResponse } from 'next/server';
import crypto from 'crypto';

// 1️⃣ VERIFICATION (GET): Used by Meta to verify your webhook URL
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const EXPECTED_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === EXPECTED_TOKEN && challenge) {
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
    const signature = request.headers.get('x-hub-signature-256');
    const rawBody = await request.text();

    // 🔒 Security: Validate the SHA256 signature from Meta
    if (signature && process.env.IG_APP_SECRET) {
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', process.env.IG_APP_SECRET)
        .update(rawBody)
        .digest('hex')}`;

      if (signature !== expectedSignature) {
        console.warn('⚠️ Webhook signature mismatch!');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const data = JSON.parse(rawBody);
    console.log('📩 RECEIVED WEBHOOK:', JSON.stringify(data, null, 2));

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}
