import { NextResponse } from "next/server";
import { exchangeGoogleCode } from "@/lib/google-oauth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // tenantId
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${origin}/dashboard/settings?error=gmail_denied`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/dashboard/settings?error=missing_params`
    );
  }

  try {
    const redirectUri = `${origin}/api/auth/gmail`;
    const result = await exchangeGoogleCode(code, redirectUri, state);

    return NextResponse.redirect(
      `${origin}/dashboard/settings?gmail=connected&email=${encodeURIComponent(result.email)}`
    );
  } catch (err) {
    console.error("Gmail OAuth error:", err);
    return NextResponse.redirect(
      `${origin}/dashboard/settings?error=gmail_failed`
    );
  }
}
