import { NextResponse } from "next/server";
import { isMockMode } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pubKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return NextResponse.json({
    isMockMode: isMockMode(),
    NEXT_PUBLIC_SUPABASE_URL: {
      exists: !!url,
      value: url ? `${url.substring(0, 15)}...` : null,
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      exists: !!anonKey,
      length: anonKey ? anonKey.length : 0,
      value: anonKey ? `${anonKey.substring(0, 15)}...` : null,
    },
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: {
      exists: !!pubKey,
      length: pubKey ? pubKey.length : 0,
      value: pubKey ? `${pubKey.substring(0, 15)}...` : null,
    },
    NODE_ENV: process.env.NODE_ENV,
  });
}
