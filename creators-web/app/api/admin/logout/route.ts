import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/admin/login`, { status: 303 });
}
