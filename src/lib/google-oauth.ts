import { encrypt } from "./encryption";
import { db } from "@/db";
import { emailAccounts } from "@/db/schema";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
].join(" ");

export function getGoogleAuthUrl(tenantId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: tenantId,
  });

  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
  tenantId: string
): Promise<{ email: string; accountId: string }> {
  // Exchange code for tokens
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Google token exchange failed: ${tokenRes.status}`);
  }

  const tokens = await tokenRes.json();

  // Get user email from Gmail
  const profileRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  const profile = await profileRes.json();

  // Store encrypted tokens
  const [account] = await db
    .insert(emailAccounts)
    .values({
      tenantId,
      provider: "gmail",
      email: profile.emailAddress,
      accessTokenEncrypted: encrypt(tokens.access_token),
      refreshTokenEncrypted: encrypt(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      isActive: true,
    })
    .returning();

  // Set up Gmail push notifications via Pub/Sub
  await setupGmailWatch(tokens.access_token);

  return { email: profile.emailAddress, accountId: account.id };
}

async function setupGmailWatch(accessToken: string) {
  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/watch",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topicName: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/topics/votria-gmail`,
        labelIds: ["INBOX"],
      }),
    }
  );

  if (!res.ok) {
    console.error("Gmail watch setup failed:", await res.text());
  }
}

export async function refreshGoogleToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) throw new Error("Token refresh failed");

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}
