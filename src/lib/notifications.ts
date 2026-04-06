import { Resend } from "resend";
import { db } from "@/db";
import { notifications } from "@/db/schema";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "agents@votria.fr";

// ============================================
// Email notifications via Resend
// ============================================
export async function sendEmail(params: {
  tenantId: string;
  userId?: string;
  to: string;
  subject: string;
  html: string;
}) {
  const { data, error } = await resend.emails.send({
    from: `VotrIA <${FROM}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(`Email failed: ${error.message}`);
  }

  // Log notification
  await db.insert(notifications).values({
    tenantId: params.tenantId,
    userId: params.userId,
    channel: "email",
    title: params.subject,
    content: `Email sent to ${params.to}`,
  });

  return data;
}

// ============================================
// SMS notifications via Twilio
// ============================================
// ============================================
// In-App notifications
// ============================================
export async function sendInAppNotification(params: {
  tenantId: string;
  userId?: string;
  title: string;
  content: string;
}) {
  await db.insert(notifications).values({
    tenantId: params.tenantId,
    userId: params.userId,
    channel: "in_app",
    title: params.title,
    content: params.content,
  });
}

/**
 * Notify all admins of a tenant via email + in_app
 */
export async function notifyTenantAdmins(params: {
  tenantId: string;
  subject: string;
  html: string;
  inAppTitle: string;
  inAppContent: string;
}) {
  const { users } = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");

  const admins = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(and(eq(users.tenantId, params.tenantId), eq(users.role, "admin")));

  for (const admin of admins) {
    // In-app notification
    await sendInAppNotification({
      tenantId: params.tenantId,
      userId: admin.id,
      title: params.inAppTitle,
      content: params.inAppContent,
    });

    // Email notification (best-effort)
    try {
      await sendEmail({
        tenantId: params.tenantId,
        userId: admin.id,
        to: admin.email,
        subject: params.subject,
        html: params.html,
      });
    } catch {
      // Don't fail if email fails
    }
  }
}

// ============================================
// SMS notifications via Twilio
// ============================================
export async function sendSMS(params: {
  tenantId: string;
  userId?: string;
  to: string;
  body: string;
}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error("Twilio credentials not configured");
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      },
      body: new URLSearchParams({ To: params.to, From: from, Body: params.body }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("Twilio error:", err);
    throw new Error(`SMS failed: ${response.status}`);
  }

  await db.insert(notifications).values({
    tenantId: params.tenantId,
    userId: params.userId,
    channel: "sms",
    title: "SMS Alert",
    content: params.body,
  });

  return response.json();
}

// ============================================
// Email templates
// ============================================
export function welcomeEmailTemplate(data: {
  fullName: string;
  company: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
  .container { max-width: 560px; margin: 0 auto; padding: 32px 24px; }
  .card { background: white; border-radius: 12px; padding: 24px; border: 1px solid #e9ecef; }
  .btn { display: inline-block; background: #4c6ef5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
</style></head>
<body>
  <div class="container">
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px">
        <div style="width:36px;height:36px;background:#4c6ef5;border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:16px">V</div>
        <div style="font-weight:700;font-size:18px;color:#212529">VotrIA</div>
      </div>
      <h1 style="font-size:24px;color:#212529;margin:0 0 12px">Bienvenue, ${data.fullName} !</h1>
      <p style="color:#495057;font-size:14px;line-height:1.6">
        Votre compte <strong>${data.company}</strong> est maintenant actif sur VotrIA.
        Vous etes en periode d'essai gratuit de 14 jours.
      </p>
      <h3 style="font-size:16px;color:#212529;margin:24px 0 12px">Pour demarrer :</h3>
      <ol style="color:#495057;font-size:14px;line-height:2;padding-left:20px">
        <li>Creez votre premier agent IA</li>
        <li>Configurez son comportement</li>
        <li>Testez-le en mode simulation (gratuit)</li>
        <li>Activez-le pour qu'il travaille 24/7</li>
      </ol>
      <div style="text-align:center;margin:24px 0">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/agents" class="btn">Creer mon premier agent</a>
      </div>
      <p style="color:#868e96;font-size:12px;margin-top:20px">
        Besoin d'aide ? Repondez a cet email ou contactez-nous a contact@ai2-education.com
      </p>
    </div>
    <div style="text-align:center;font-size:12px;color:#adb5bd;margin-top:24px">
      VotrIA — Votre premier employe IA<br>
      AI2 / DATAKOO — Tous droits reserves
    </div>
  </div>
</body>
</html>`;
}

export function weeklyReportTemplate(data: {
  tenantName: string;
  weekStart: string;
  weekEnd: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  newLeads: number;
  wonLeads: number;
  costEuros: string;
  topAgent: string;
}) {
  const successRate = data.totalTasks > 0 ? Math.round((data.completedTasks / data.totalTasks) * 100) : 0;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
  .container { max-width: 560px; margin: 0 auto; padding: 32px 24px; }
  .card { background: white; border-radius: 12px; padding: 24px; border: 1px solid #e9ecef; }
  .stat { display: inline-block; text-align: center; padding: 12px 16px; }
  .stat-value { font-size: 24px; font-weight: 700; color: #212529; }
  .stat-label { font-size: 12px; color: #868e96; margin-top: 2px; }
</style></head>
<body>
  <div class="container">
    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px">
        <div style="width:32px;height:32px;background:#4c6ef5;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px">V</div>
        <div>
          <div style="font-weight:600;color:#212529">${data.tenantName}</div>
          <div style="font-size:12px;color:#868e96">Rapport hebdomadaire — ${data.weekStart} au ${data.weekEnd}</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-around;margin:20px 0;padding:16px 0;background:#f8f9fa;border-radius:8px">
        <div class="stat">
          <div class="stat-value">${data.totalTasks}</div>
          <div class="stat-label">Taches</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color:#40c057">${successRate}%</div>
          <div class="stat-label">Reussite</div>
        </div>
        <div class="stat">
          <div class="stat-value">${data.costEuros}€</div>
          <div class="stat-label">Cout API</div>
        </div>
      </div>

      <div style="margin:16px 0">
        <div style="font-weight:600;font-size:14px;color:#212529;margin-bottom:8px">Points cles</div>
        <div style="padding:8px 0;border-bottom:1px solid #f1f3f5;font-size:14px;color:#495057">
          📊 ${data.totalTasks} taches traitees (${data.failedTasks} echouees)
        </div>
        <div style="padding:8px 0;border-bottom:1px solid #f1f3f5;font-size:14px;color:#495057">
          👥 ${data.newLeads} nouveaux leads, ${data.wonLeads} gagnes
        </div>
        <div style="padding:8px 0;border-bottom:1px solid #f1f3f5;font-size:14px;color:#495057">
          🏆 Agent le plus actif : ${data.topAgent}
        </div>
      </div>

      <div style="text-align:center;margin:20px 0">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/analytics" style="display:inline-block;background:#4c6ef5;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Voir le rapport complet</a>
      </div>
    </div>
    <div style="text-align:center;font-size:12px;color:#adb5bd;margin-top:24px">
      VotrIA — Votre premier employe IA
    </div>
  </div>
</body>
</html>`;
}

export function dailyBriefTemplate(data: {
  tenantName: string;
  date: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  costEuros: string;
  highlights: string[];
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
    .container { max-width: 560px; margin: 0 auto; padding: 32px 24px; }
    .card { background: white; border-radius: 12px; padding: 24px; border: 1px solid #e9ecef; }
    .header { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
    .logo { width: 32px; height: 32px; background: #4c6ef5; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; }
    .stat { display: inline-block; text-align: center; padding: 12px 16px; }
    .stat-value { font-size: 24px; font-weight: 700; color: #212529; }
    .stat-label { font-size: 12px; color: #868e96; margin-top: 2px; }
    .highlight { padding: 8px 0; border-bottom: 1px solid #f1f3f5; font-size: 14px; color: #495057; }
    .footer { text-align: center; font-size: 12px; color: #adb5bd; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">V</div>
        <div>
          <div style="font-weight:600;color:#212529">${data.tenantName}</div>
          <div style="font-size:12px;color:#868e96">Bilan du ${data.date}</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-around;margin:20px 0;padding:16px 0;background:#f8f9fa;border-radius:8px">
        <div class="stat">
          <div class="stat-value">${data.totalTasks}</div>
          <div class="stat-label">Tâches</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color:#40c057">${data.completedTasks}</div>
          <div class="stat-label">Réussies</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color:#fa5252">${data.failedTasks}</div>
          <div class="stat-label">Échouées</div>
        </div>
        <div class="stat">
          <div class="stat-value">${data.costEuros}€</div>
          <div class="stat-label">Coût API</div>
        </div>
      </div>

      ${
        data.highlights.length > 0
          ? `<div style="margin-top:16px">
              <div style="font-weight:600;font-size:14px;color:#212529;margin-bottom:8px">Points clés</div>
              ${data.highlights.map((h) => `<div class="highlight">• ${h}</div>`).join("")}
            </div>`
          : ""
      }
    </div>
    <div class="footer">
      VotrIA — Votre premier employé IA<br>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="color:#4c6ef5;text-decoration:none">Voir le dashboard</a>
    </div>
  </div>
</body>
</html>`;
}
