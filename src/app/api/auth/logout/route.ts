import { createSupabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { logError } from "@/lib/error-handler";

export async function POST() {
  try {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/auth/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    );
  } catch (error) {
    logError(error, { context: "logout" });
    return NextResponse.redirect(
      new URL("/auth/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    );
  }
}

// Also support GET for simple link-based logout
export async function GET() {
  return POST();
}
