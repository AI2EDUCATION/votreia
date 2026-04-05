import { inngest } from "./client";
import { executeAgent } from "@/agents/orchestrator";
import { db } from "@/db";
import { agents, tasks, leads, documents } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendEmail, notifyTenantAdmins, dailyBriefTemplate } from "@/lib/notifications";
import { logError } from "@/lib/error-handler";

// ============================================
// Agent Email — Process incoming emails
// ============================================
export const processEmail = inngest.createFunction(
  {
    id: "process-email",
    retries: 3,
    concurrency: { limit: 10 },
  },
  { event: "agent/email.received" },
  async ({ event, step }) => {
    const { tenantId, agentId, emailId, from, subject, body } = event.data;

    // Step 1: Classify email (fast model)
    const classification = await step.run("classify-email", async () => {
      return executeAgent({
        tenantId,
        agentId,
        type: "classify_email",
        input: { from, subject, body: body.slice(0, 2000) },
      });
    });

    // Check if classified as spam — skip processing
    const classOutput = classification.output as Record<string, unknown>;
    const toolResults = (classOutput.toolResults ?? []) as Array<Record<string, unknown>>;
    const classResult = toolResults[0]?.result as Record<string, unknown> | undefined;

    if (classResult?.category === "spam") {
      return { status: "skipped", reason: "spam", classification: classResult };
    }

    // Step 2: Process based on classification
    const result = await step.run("process-email", async () => {
      return executeAgent({
        tenantId,
        agentId,
        type: "process_email",
        input: {
          emailId,
          from,
          subject,
          body,
          classification: classification.output,
        },
      });
    });

    // Step 3: If escalated, notify admins
    if (result.status === "escalated") {
      await step.run("notify-escalation", async () => {
        await notifyTenantAdmins({
          tenantId,
          subject: `[VotrIA] Email escalade: ${subject}`,
          html: `<div style="font-family:sans-serif;padding:20px">
            <h2>Email escalade</h2>
            <p><strong>De:</strong> ${from}</p>
            <p><strong>Sujet:</strong> ${subject}</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tasks">Voir les taches</a></p>
          </div>`,
          inAppTitle: `Email escalade de ${from}`,
          inAppContent: `Sujet: ${subject}`,
        });
      });
    }

    return result;
  }
);

// ============================================
// Agent Commercial — Qualify new lead
// ============================================
export const qualifyLead = inngest.createFunction(
  {
    id: "qualify-lead",
    retries: 2,
  },
  { event: "agent/lead.new" },
  async ({ event, step }) => {
    const { tenantId, agentId, leadId, email, company, source } = event.data;

    const result = await step.run("qualify", async () => {
      return executeAgent({
        tenantId,
        agentId,
        type: "qualify_lead",
        input: { leadId, email, company, source },
      });
    });

    // Update lead with qualification result
    await step.run("update-lead", async () => {
      const output = result.output as Record<string, unknown>;
      const toolResults = (output.toolResults ?? []) as Array<Record<string, unknown>>;
      const qualResult = toolResults.find((tr) => tr.tool === "qualify_lead");
      const qualData = qualResult?.result as Record<string, unknown> | undefined;

      if (qualData?.score !== undefined) {
        const score = Math.max(0, Math.min(100, Number(qualData.score)));
        const newStatus = score >= 70 ? "qualified" : score >= 40 ? "contacted" : "new";

        await db
          .update(leads)
          .set({
            score,
            status: newStatus as "new" | "contacted" | "qualified",
            notes: String(qualData.reason ?? ""),
          })
          .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)));
      }
    });

    return result;
  }
);

// ============================================
// Agent Commercial — Follow-up scheduled
// ============================================
export const commercialFollowup = inngest.createFunction(
  {
    id: "commercial-followup",
    retries: 2,
  },
  { event: "agent/commercial.followup" },
  async ({ event, step }) => {
    const { tenantId, agentId, leadId, scheduledFor } = event.data;

    // Wait until scheduled time if in the future
    if (scheduledFor) {
      const delay = new Date(scheduledFor).getTime() - Date.now();
      if (delay > 0) {
        await step.sleep("wait-for-followup", delay);
      }
    }

    const result = await step.run("followup", async () => {
      return executeAgent({
        tenantId,
        agentId,
        type: "followup_lead",
        input: { leadId },
      });
    });

    return result;
  }
);

// ============================================
// Agent Admin — Process uploaded document
// ============================================
export const processDocument = inngest.createFunction(
  {
    id: "process-document",
    retries: 2,
    concurrency: { limit: 5 },
  },
  { event: "agent/document.uploaded" },
  async ({ event, step }) => {
    const { tenantId, agentId, documentId, filePath, fileName, mimeType } = event.data;

    // Step 1: Classify document
    const classification = await step.run("classify-doc", async () => {
      return executeAgent({
        tenantId,
        agentId,
        type: "classify_document",
        input: { documentId, fileName, mimeType },
      });
    });

    // Step 2: Extract data
    const extraction = await step.run("extract-data", async () => {
      return executeAgent({
        tenantId,
        agentId,
        type: "extract_data",
        input: {
          documentId,
          filePath,
          classification: classification.output,
        },
      });
    });

    // Step 3: Update document with results
    await step.run("update-document", async () => {
      const classOutput = classification.output as Record<string, unknown>;
      const classToolResults = (classOutput.toolResults ?? []) as Array<Record<string, unknown>>;
      const classData = classToolResults.find((tr) => tr.tool === "classify_document");
      const classResult = classData?.result as Record<string, unknown> | undefined;

      const extOutput = extraction.output as Record<string, unknown>;
      const extToolResults = (extOutput.toolResults ?? []) as Array<Record<string, unknown>>;
      const extData = extToolResults.find((tr) => tr.tool === "extract_data");
      const extResult = extData?.result as Record<string, unknown> | undefined;

      await db
        .update(documents)
        .set({
          category: String(classResult?.category ?? "autre"),
          extractedData: (extResult?.fields ?? classResult?.extractedFields ?? {}) as Record<string, unknown>,
          processedByAgentId: agentId,
        })
        .where(and(eq(documents.id, documentId), eq(documents.tenantId, tenantId)));
    });

    return extraction;
  }
);

// ============================================
// Agent Support — Handle support ticket
// ============================================
export const handleSupportTicket = inngest.createFunction(
  {
    id: "handle-support-ticket",
    retries: 2,
  },
  { event: "agent/support.ticket" },
  async ({ event, step }) => {
    const { tenantId, agentId, ticketId, customerEmail, subject, message } = event.data;

    const result = await step.run("handle-ticket", async () => {
      return executeAgent({
        tenantId,
        agentId,
        type: "handle_support",
        input: { ticketId, customerEmail, subject, message },
      });
    });

    // If escalated, notify admins
    if (result.status === "escalated") {
      await step.run("notify-escalation", async () => {
        await notifyTenantAdmins({
          tenantId,
          subject: `[VotrIA] Ticket escalade: ${subject}`,
          html: `<div style="font-family:sans-serif;padding:20px">
            <h2>Ticket support escalade</h2>
            <p><strong>Client:</strong> ${customerEmail}</p>
            <p><strong>Sujet:</strong> ${subject}</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tasks">Voir les taches</a></p>
          </div>`,
          inAppTitle: `Ticket escalade: ${subject?.slice(0, 60) ?? ""}`,
          inAppContent: `Client: ${customerEmail}`,
        });
      });
    }

    return result;
  }
);

// ============================================
// Agent Direction — Daily brief (CRON)
// ============================================
export const dailyBrief = inngest.createFunction(
  { id: "daily-brief" },
  { cron: "0 8 * * 1-5" },
  async ({ step }) => {
    const activeAgents = await step.run("fetch-agents", async () => {
      return db
        .select()
        .from(agents)
        .where(
          and(
            eq(agents.type, "direction"),
            eq(agents.status, "active")
          )
        );
    });

    const results = [];

    for (const agent of activeAgents) {
      const result = await step.run(`brief-${agent.tenantId}`, async () => {
        const stats = await db
          .select({
            total: sql<number>`count(*)::int`,
            completed: sql<number>`count(*) filter (where status = 'completed')::int`,
            failed: sql<number>`count(*) filter (where status = 'failed')::int`,
            avgDuration: sql<number>`coalesce(avg(duration_ms)::int, 0)`,
            totalCost: sql<number>`coalesce(sum(cost_cents)::int, 0)`,
          })
          .from(tasks)
          .where(
            and(
              eq(tasks.tenantId, agent.tenantId),
              sql`created_at >= now() - interval '24 hours'`
            )
          );

        return executeAgent({
          tenantId: agent.tenantId,
          agentId: agent.id,
          type: "daily_brief",
          input: {
            stats: stats[0],
            date: new Date().toISOString().split("T")[0],
          },
        });
      });

      results.push({ tenantId: agent.tenantId, status: result.status });
    }

    return { processed: results.length, results };
  }
);

// ============================================
// Export all functions
// ============================================
export const functions = [
  processEmail,
  qualifyLead,
  commercialFollowup,
  processDocument,
  handleSupportTicket,
  dailyBrief,
];
