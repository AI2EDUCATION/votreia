import { NextResponse } from "next/server";
import { db } from "@/db";
import { tenants, users, agents } from "@/db/schema";
import { createSupabaseServer } from "@/lib/supabase-server";
import { logAudit, getIpFromRequest } from "@/lib/audit";
import { logError, ValidationError } from "@/lib/error-handler";
import { z } from "zod";

const onboardingSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate input
    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, fullName, company, email } = parsed.data;

    // Verify the requesting user matches the userId (anti-tampering)
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized: userId mismatch" },
        { status: 401 }
      );
    }

    // Generate slug from company name
    const slug = company
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 50);

    // Create tenant
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: company,
        slug: `${slug}-${Date.now().toString(36)}`,
        plan: "trial",
        settings: {
          timezone: "Europe/Paris",
          language: "fr",
          notificationPreferences: {
            email: true,
            sms: false,
            dailyDigest: true,
          },
        },
      })
      .returning();

    // Create user linked to tenant
    await db.insert(users).values({
      id: userId,
      tenantId: tenant.id,
      email,
      fullName,
      role: "admin",
      lastLogin: new Date(),
    });

    // Create default email agent in setup mode to guide onboarding
    await db.insert(agents).values({
      tenantId: tenant.id,
      type: "email",
      name: "Agent Email",
      status: "setup",
      config: {},
    });

    // Audit log
    await logAudit({
      tenantId: tenant.id,
      userId,
      action: "account.created",
      resource: "tenant",
      resourceId: tenant.id,
      detail: { company, email, plan: "trial" },
      ipAddress: getIpFromRequest(req),
    });

    return NextResponse.json({ tenantId: tenant.id, success: true });
  } catch (error) {
    logError(error, { context: "onboarding" });
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
