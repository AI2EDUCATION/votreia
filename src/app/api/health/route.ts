import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Health check endpoint — used by UptimeRobot, Vercel, etc.
 * Checks: app running, database connection, critical services
 */
export async function GET() {
  const checks: Record<string, { status: "ok" | "error"; latencyMs?: number; error?: string }> = {};
  let healthy = true;

  // 1. Database check
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.database = { status: "ok", latencyMs: Date.now() - start };
  } catch (error) {
    checks.database = {
      status: "error",
      error: error instanceof Error ? error.message : "DB unreachable",
    };
    healthy = false;
  }

  // 2. Anthropic API key check
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && apiKey.startsWith("sk-ant-")) {
    checks.anthropic = { status: "ok" };
  } else {
    checks.anthropic = { status: "error", error: "API key missing or invalid" };
    healthy = false;
  }

  // 3. Stripe key check
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey && stripeKey.startsWith("sk_")) {
    checks.stripe = { status: "ok" };
  } else {
    checks.stripe = { status: "error", error: "Stripe key missing" };
  }

  // 4. Encryption key check
  const encKey = process.env.ENCRYPTION_KEY;
  if (encKey && encKey.length === 64) {
    checks.encryption = { status: "ok" };
  } else {
    checks.encryption = { status: "error", error: "Encryption key missing or wrong length (need 64 hex chars)" };
    healthy = false;
  }

  // 5. Redis / Upstash check
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (redisUrl && redisToken) {
    try {
      const start = Date.now();
      const res = await fetch(redisUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["PING"]),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        checks.redis = { status: "ok", latencyMs: Date.now() - start };
      } else {
        checks.redis = { status: "error", error: `HTTP ${res.status}` };
      }
    } catch (error) {
      checks.redis = { status: "error", error: "Redis unreachable" };
    }
  } else {
    checks.redis = { status: "error", error: "Redis not configured" };
  }

  // 6. Resend check (email service)
  if (process.env.RESEND_API_KEY) {
    checks.resend = { status: "ok" };
  } else {
    checks.resend = { status: "error", error: "Resend API key missing" };
  }

  // 7. Supabase check
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    checks.supabase = { status: "ok" };
  } else {
    checks.supabase = { status: "error", error: "Supabase config missing" };
    healthy = false;
  }

  const response = {
    status: healthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    environment: process.env.NODE_ENV ?? "unknown",
    uptime: process.uptime ? Math.round(process.uptime()) : undefined,
    checks,
  };

  return NextResponse.json(response, {
    status: healthy ? 200 : 503,
    headers: { "Cache-Control": "no-cache, no-store" },
  });
}
