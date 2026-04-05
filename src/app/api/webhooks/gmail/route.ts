import { NextResponse } from "next/server";
import { db } from "@/db";
import { emailAccounts, agents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/encryption";
import { refreshGoogleToken } from "@/lib/google-oauth";
import { inngest } from "@/inngest/client";
import { logError, IntegrationError } from "@/lib/error-handler";

/**
 * Gmail Push Notification Webhook
 * Receives Pub/Sub messages when new emails arrive
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const message = body.message;
    if (!message?.data) {
      return NextResponse.json({ error: "No message data" }, { status: 400 });
    }

    const decoded = JSON.parse(
      Buffer.from(message.data, "base64").toString("utf-8")
    );

    const { emailAddress, historyId } = decoded;
    if (!emailAddress) {
      return NextResponse.json({ error: "No email address" }, { status: 400 });
    }

    // Find the email account
    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(
        and(
          eq(emailAccounts.email, emailAddress),
          eq(emailAccounts.isActive, true)
        )
      )
      .limit(1);

    if (!account) {
      return NextResponse.json({ received: true });
    }

    // Find active email agent for this tenant
    const [emailAgent] = await db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.tenantId, account.tenantId),
          eq(agents.type, "email"),
          eq(agents.status, "active")
        )
      )
      .limit(1);

    if (!emailAgent) {
      return NextResponse.json({ received: true });
    }

    // Get access token, refresh if needed
    let accessToken = decrypt(account.accessTokenEncrypted);

    const fetchWithToken = async (url: string, token: string) => {
      return fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
    };

    // Fetch new emails since last historyId
    let response = await fetchWithToken(
      `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${historyId}&historyTypes=messageAdded`,
      accessToken
    );

    // Token expired — attempt refresh
    if (response.status === 401 && account.refreshTokenEncrypted) {
      try {
        const refreshToken = decrypt(account.refreshTokenEncrypted);
        const refreshed = await refreshGoogleToken(refreshToken);

        // Update stored access token
        accessToken = refreshed.accessToken;
        await db
          .update(emailAccounts)
          .set({ accessTokenEncrypted: encrypt(refreshed.accessToken) })
          .where(eq(emailAccounts.id, account.id));

        // Retry with new token
        response = await fetchWithToken(
          `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${historyId}&historyTypes=messageAdded`,
          accessToken
        );
      } catch (refreshError) {
        logError(refreshError, {
          context: "gmail_token_refresh",
          accountId: account.id,
          tenantId: account.tenantId,
        });

        // Mark account as inactive if refresh fails
        await db
          .update(emailAccounts)
          .set({ isActive: false })
          .where(eq(emailAccounts.id, account.id));

        return NextResponse.json({ error: "Token refresh failed" }, { status: 502 });
      }
    }

    if (!response.ok) {
      logError(
        new IntegrationError("Gmail", `API error ${response.status}`),
        { context: "gmail_history_fetch", accountId: account.id }
      );
      return NextResponse.json({ error: "Gmail API error" }, { status: 502 });
    }

    const historyData = await response.json();
    const messageIds: string[] = historyData.history?.flatMap(
      (h: { messagesAdded?: { message: { id: string } }[] }) =>
        h.messagesAdded?.map((m) => m.message.id) ?? []
    ) ?? [];

    // Deduplicate message IDs
    const uniqueIds = [...new Set(messageIds)];

    // Process max 10 emails per webhook call
    let processed = 0;
    for (const messageId of uniqueIds.slice(0, 10)) {
      try {
        const emailRes = await fetchWithToken(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
          accessToken
        );

        if (!emailRes.ok) continue;

        const emailData = await emailRes.json();
        const emailHeaders = emailData.payload?.headers ?? [];
        const from = emailHeaders.find((h: { name: string }) => h.name === "From")?.value ?? "";
        const subject = emailHeaders.find((h: { name: string }) => h.name === "Subject")?.value ?? "";

        // Extract body
        let emailBody = "";
        if (emailData.payload?.body?.data) {
          emailBody = Buffer.from(emailData.payload.body.data, "base64").toString("utf-8");
        } else if (emailData.payload?.parts) {
          const textPart = emailData.payload.parts.find(
            (p: { mimeType: string }) => p.mimeType === "text/plain"
          );
          if (textPart?.body?.data) {
            emailBody = Buffer.from(textPart.body.data, "base64").toString("utf-8");
          }
        }

        await inngest.send({
          name: "agent/email.received",
          data: {
            tenantId: account.tenantId,
            agentId: emailAgent.id,
            emailId: messageId,
            from,
            subject,
            body: emailBody,
          },
        });

        processed++;
      } catch (emailError) {
        logError(emailError, {
          context: "gmail_message_fetch",
          messageId,
          tenantId: account.tenantId,
        });
      }
    }

    return NextResponse.json({ received: true, processed });
  } catch (error) {
    logError(error, { context: "gmail_webhook" });
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
