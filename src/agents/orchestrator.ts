import { db } from "@/db";
import { agents, tasks, agentLogs, tenants, leads, documents, notifications } from "@/db/schema";
import { callAgent, extractText, extractToolUse, type ModelTier } from "@/lib/anthropic";
import { checkUsageLimits, recordUsage, getWarningLevel } from "@/lib/usage-limits";
import { simulateAgent } from "@/agents/simulator";
import { sendEmail, sendInAppNotification, notifyTenantAdmins, dailyBriefTemplate } from "@/lib/notifications";
import { inngest } from "@/inngest/client";
import { logError, AgentError } from "@/lib/error-handler";
import { logAudit } from "@/lib/audit";
import { eq, and } from "drizzle-orm";
import type { Tool, MessageParam } from "@anthropic-ai/sdk/resources/messages";

// ============================================
// Agent Orchestrator — Event-Driven Pipeline
// ============================================

export interface AgentEvent {
  tenantId: string;
  agentId: string;
  type: string;
  input: Record<string, unknown>;
}

export interface AgentToolHandler {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: Record<string, unknown>, ctx: AgentContext) => Promise<unknown>;
}

export interface AgentContext {
  tenantId: string;
  agentId: string;
  agentConfig: Record<string, unknown>;
  systemPrompt: string;
}

export interface AgentResult {
  taskId: string;
  status: "completed" | "failed" | "escalated" | "rate_limited";
  output: Record<string, unknown>;
  tokensUsed: number;
  costCents: number;
  durationMs: number;
}

/**
 * Execute an agent task through the full pipeline
 */
export async function executeAgent(event: AgentEvent): Promise<AgentResult> {
  const startTime = Date.now();

  // ═══════════════════════════════════════════
  // STEP 0: HARD LIMIT CHECK
  // ═══════════════════════════════════════════
  const usageCheck = await checkUsageLimits(event.tenantId);

  if (!usageCheck.allowed) {
    await db.insert(agentLogs).values({
      tenantId: event.tenantId,
      agentId: event.agentId,
      action: `${event.type}.rate_limited`,
      detail: {
        reason: usageCheck.reason,
        usage: usageCheck.usage,
        limits: {
          maxTasksPerDay: usageCheck.limits.maxTasksPerDay,
          maxTasksPerMonth: usageCheck.limits.maxTasksPerMonth,
          maxTokensPerMonth: usageCheck.limits.maxTokensPerMonth,
        },
      },
      level: "warning",
    });

    return {
      taskId: "",
      status: "rate_limited",
      output: {
        error: "PLAN_LIMIT_EXCEEDED",
        reason: usageCheck.reason,
        message: getLimitExceededMessage(usageCheck.reason ?? "UNKNOWN"),
        usage: usageCheck.usage,
      },
      tokensUsed: 0,
      costCents: 0,
      durationMs: Date.now() - startTime,
    };
  }

  // Log warning if approaching limits
  const warningLevel = getWarningLevel(usageCheck.utilizationPercent);
  if (warningLevel === "critical") {
    await db.insert(agentLogs).values({
      tenantId: event.tenantId,
      agentId: event.agentId,
      action: "usage.critical_warning",
      detail: {
        utilizationPercent: usageCheck.utilizationPercent,
        usage: usageCheck.usage,
      },
      level: "warning",
    });
  }

  // ═══════════════════════════════════════════
  // STEP 1: TRIAL CHECK — Simulation mode (0 EUR API)
  // ═══════════════════════════════════════════
  const [tenantRow] = await db
    .select({ plan: tenants.plan })
    .from(tenants)
    .where(eq(tenants.id, event.tenantId))
    .limit(1);

  if (tenantRow?.plan === "trial") {
    const [agentRow] = await db
      .select({ type: agents.type, name: agents.name })
      .from(agents)
      .where(and(eq(agents.id, event.agentId), eq(agents.tenantId, event.tenantId)))
      .limit(1);

    const agentType = agentRow?.type ?? "email";
    const simResult = simulateAgent(agentType, event.type, event.input);
    const durationMs = 800 + Math.floor(Math.random() * 2200);

    const [simTask] = await db
      .insert(tasks)
      .values({
        tenantId: event.tenantId,
        agentId: event.agentId,
        type: event.type,
        status: "completed",
        input: event.input,
        output: {
          text: simResult.text,
          toolResults: simResult.toolResults,
          isSimulated: true,
          upgradeMessage: simResult.upgradeMessage,
        },
        durationMs,
        tokensUsed: 0,
        modelUsed: "simulation",
        costCents: 0,
        completedAt: new Date(),
      })
      .returning();

    await db.insert(agentLogs).values({
      tenantId: event.tenantId,
      agentId: event.agentId,
      action: `${event.type}.simulated`,
      detail: { taskId: simTask.id, plan: "trial" },
      level: "info",
    });

    if (agentRow) {
      await db
        .update(agents)
        .set({ lastActiveAt: new Date() })
        .where(eq(agents.id, event.agentId));
    }

    return {
      taskId: simTask.id,
      status: "completed",
      output: {
        text: simResult.text,
        toolResults: simResult.toolResults,
        isSimulated: true,
        upgradeMessage: simResult.upgradeMessage,
      },
      tokensUsed: 0,
      costCents: 0,
      durationMs,
    };
  }

  // ═══════════════════════════════════════════
  // PAID PLANS — Real Claude API execution
  // ═══════════════════════════════════════════

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, event.agentId), eq(agents.tenantId, event.tenantId)))
    .limit(1);

  if (!agent) {
    throw new AgentError(`Agent ${event.agentId} not found for tenant ${event.tenantId}`, {
      agentId: event.agentId,
      tenantId: event.tenantId,
    });
  }

  if (agent.status !== "active") {
    throw new AgentError(`Agent ${agent.name} is not active (status: ${agent.status})`, {
      agentId: agent.id,
      status: agent.status,
    });
  }

  const [task] = await db
    .insert(tasks)
    .values({
      tenantId: event.tenantId,
      agentId: event.agentId,
      type: event.type,
      status: "processing",
      input: event.input,
    })
    .returning();

  try {
    const agentTools = getToolsForAgent(agent.type);
    const toolDefs: Tool[] = agentTools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Tool.InputSchema,
    }));

    const messages: MessageParam[] = [
      { role: "user", content: buildUserPrompt(event) },
    ];

    const modelTier = selectModelTier(event.type, agent.type);

    const result = await callAgent({
      model: modelTier,
      systemPrompt: agent.systemPrompt || getDefaultSystemPrompt(agent.type),
      messages,
      tools: toolDefs.length > 0 ? toolDefs : undefined,
    });

    // Execute tool calls
    let output: Record<string, unknown> = {};
    const toolCalls = extractToolUse(result.content);
    const ctx: AgentContext = {
      tenantId: event.tenantId,
      agentId: event.agentId,
      agentConfig: (agent.config as Record<string, unknown>) ?? {},
      systemPrompt: agent.systemPrompt || "",
    };

    if (toolCalls.length > 0) {
      const toolResults: Record<string, unknown>[] = [];
      for (const toolCall of toolCalls) {
        const handler = agentTools.find((t) => t.name === toolCall.name);
        if (handler) {
          try {
            const toolResult = await handler.handler(
              toolCall.input as Record<string, unknown>,
              ctx
            );
            toolResults.push({
              tool: toolCall.name,
              input: toolCall.input,
              result: toolResult,
            });
          } catch (toolError) {
            logError(toolError, { tool: toolCall.name, agentId: agent.id });
            toolResults.push({
              tool: toolCall.name,
              input: toolCall.input,
              error: toolError instanceof Error ? toolError.message : "Tool execution failed",
            });
          }
        }
      }
      output = { toolResults, text: extractText(result.content) };
    } else {
      output = { text: extractText(result.content) };
    }

    // Detect escalation from tool results
    const isEscalated = toolCalls.some((tc) => tc.name === "escalate_to_human");
    const finalStatus = isEscalated ? "escalated" : "completed";

    const durationMs = Date.now() - startTime;

    await db
      .update(tasks)
      .set({
        status: finalStatus,
        output,
        durationMs,
        tokensUsed: result.tokensInput + result.tokensOutput,
        modelUsed: result.modelUsed,
        costCents: result.costCents,
        completedAt: new Date(),
      })
      .where(eq(tasks.id, task.id));

    await db.insert(agentLogs).values({
      tenantId: event.tenantId,
      agentId: event.agentId,
      action: `${event.type}.${finalStatus}`,
      detail: {
        taskId: task.id,
        tokensUsed: result.tokensInput + result.tokensOutput,
        costCents: result.costCents,
        durationMs,
        toolsExecuted: toolCalls.map((tc) => tc.name),
      },
      level: isEscalated ? "warning" : "info",
    });

    await db
      .update(agents)
      .set({
        totalTasks: agent.totalTasks + 1,
        lastActiveAt: new Date(),
      })
      .where(eq(agents.id, agent.id));

    await recordUsage({
      tenantId: event.tenantId,
      agentId: event.agentId,
      tokensUsed: result.tokensInput + result.tokensOutput,
      costCents: result.costCents,
      taskType: event.type,
    });

    return {
      taskId: task.id,
      status: finalStatus as "completed" | "escalated",
      output,
      tokensUsed: result.tokensInput + result.tokensOutput,
      costCents: result.costCents,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    logError(error, {
      context: "agent_execution",
      agentId: agent.id,
      taskId: task.id,
      taskType: event.type,
    });

    await db
      .update(tasks)
      .set({
        status: "failed",
        error: errorMessage,
        durationMs,
        completedAt: new Date(),
      })
      .where(eq(tasks.id, task.id));

    await db.insert(agentLogs).values({
      tenantId: event.tenantId,
      agentId: event.agentId,
      action: `${event.type}.failed`,
      detail: { taskId: task.id, error: errorMessage },
      level: "error",
    });

    return {
      taskId: task.id,
      status: "failed",
      output: { error: errorMessage },
      tokensUsed: 0,
      costCents: 0,
      durationMs,
    };
  }
}

// ============================================
// Model tier selection
// ============================================
function selectModelTier(taskType: string, agentType: string): ModelTier {
  const fastTasks = ["classify", "triage", "categorize", "filter", "score"];
  if (fastTasks.some((t) => taskType.toLowerCase().includes(t))) return "fast";

  const extendedTasks = ["summarize_long", "full_analysis", "report", "daily_brief"];
  if (extendedTasks.some((t) => taskType.toLowerCase().includes(t))) return "extended";

  return "standard";
}

// ============================================
// Agent-specific tools registry — FULLY IMPLEMENTED
// ============================================
function getToolsForAgent(agentType: string): AgentToolHandler[] {
  const toolRegistry: Record<string, AgentToolHandler[]> = {
    email: [
      {
        name: "send_email",
        description: "Envoyer un email de reponse ou de suivi",
        inputSchema: {
          type: "object" as const,
          properties: {
            to: { type: "string", description: "Adresse email du destinataire" },
            subject: { type: "string", description: "Sujet de l'email" },
            body: { type: "string", description: "Corps de l'email en HTML" },
            replyToMessageId: { type: "string", description: "ID du message auquel repondre" },
          },
          required: ["to", "subject", "body"],
        },
        handler: async (input, ctx) => {
          await sendEmail({
            tenantId: ctx.tenantId,
            to: String(input.to),
            subject: String(input.subject),
            html: String(input.body),
          });
          await db.insert(agentLogs).values({
            tenantId: ctx.tenantId,
            agentId: ctx.agentId,
            action: "email.sent",
            detail: { to: input.to, subject: input.subject },
            level: "info",
          });
          return { sent: true, to: input.to, subject: input.subject };
        },
      },
      {
        name: "classify_email",
        description: "Classifier un email par categorie et urgence",
        inputSchema: {
          type: "object" as const,
          properties: {
            category: {
              type: "string",
              enum: ["urgent", "commercial", "admin", "support", "spam", "personal"],
            },
            urgency: { type: "string", enum: ["high", "medium", "low"] },
            summary: { type: "string", description: "Resume en une phrase" },
          },
          required: ["category", "urgency", "summary"],
        },
        handler: async (input) => input,
      },
      {
        name: "escalate_to_human",
        description: "Escalader un email a un humain quand l'agent ne peut pas traiter",
        inputSchema: {
          type: "object" as const,
          properties: {
            reason: { type: "string", description: "Raison de l'escalade" },
            priority: { type: "string", enum: ["high", "medium", "low"] },
          },
          required: ["reason"],
        },
        handler: async (input, ctx) => {
          const priority = String(input.priority ?? "medium");
          const reason = String(input.reason);

          await notifyTenantAdmins({
            tenantId: ctx.tenantId,
            subject: `[VotrIA] Escalade ${priority === "high" ? "URGENTE" : ""}: ${reason}`,
            html: `<div style="font-family:sans-serif;padding:20px">
              <h2>Escalade agent Email</h2>
              <p><strong>Priorite:</strong> ${priority}</p>
              <p><strong>Raison:</strong> ${reason}</p>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tasks">Voir les taches</a></p>
            </div>`,
            inAppTitle: `Escalade: ${reason.slice(0, 80)}`,
            inAppContent: `Priorite ${priority} — ${reason}`,
          });

          return { escalated: true, reason, priority };
        },
      },
    ],
    commercial: [
      {
        name: "qualify_lead",
        description: "Qualifier un lead commercial (score 0-100)",
        inputSchema: {
          type: "object" as const,
          properties: {
            score: { type: "number", description: "Score de qualification 0-100" },
            reason: { type: "string", description: "Justification du score" },
            nextAction: { type: "string", description: "Prochaine action recommandee" },
          },
          required: ["score", "reason", "nextAction"],
        },
        handler: async (input, ctx) => {
          const score = Math.max(0, Math.min(100, Number(input.score)));
          const leadId = String(ctx.agentConfig.leadId ?? (input as Record<string, unknown>).leadId ?? "");

          if (leadId) {
            const newStatus = score >= 70 ? "qualified" : score >= 40 ? "contacted" : "new";
            await db
              .update(leads)
              .set({
                score,
                status: newStatus as "new" | "contacted" | "qualified",
                notes: String(input.reason),
              })
              .where(and(eq(leads.id, leadId), eq(leads.tenantId, ctx.tenantId)));
          }

          return { score, reason: input.reason, nextAction: input.nextAction };
        },
      },
      {
        name: "send_quote",
        description: "Generer et envoyer un devis au prospect",
        inputSchema: {
          type: "object" as const,
          properties: {
            leadEmail: { type: "string" },
            productName: { type: "string" },
            amount: { type: "number" },
            validUntil: { type: "string" },
          },
          required: ["leadEmail", "productName", "amount"],
        },
        handler: async (input, ctx) => {
          const amount = Number(input.amount);
          const validUntil = String(input.validUntil ?? new Date(Date.now() + 30 * 86400000).toLocaleDateString("fr-FR"));

          await sendEmail({
            tenantId: ctx.tenantId,
            to: String(input.leadEmail),
            subject: `Proposition commerciale — ${input.productName}`,
            html: `<div style="font-family:sans-serif;padding:20px;max-width:560px;margin:0 auto">
              <div style="background:#4c6ef5;color:white;padding:16px 24px;border-radius:12px 12px 0 0">
                <h2 style="margin:0">Proposition commerciale</h2>
              </div>
              <div style="background:white;border:1px solid #e9ecef;padding:24px;border-radius:0 0 12px 12px">
                <p>Bonjour,</p>
                <p>Suite a notre echange, voici notre proposition pour <strong>${input.productName}</strong> :</p>
                <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
                  <div style="font-size:32px;font-weight:700;color:#212529">${amount.toLocaleString("fr-FR")} EUR</div>
                  <div style="font-size:12px;color:#868e96">HT — Valide jusqu'au ${validUntil}</div>
                </div>
                <p>N'hesitez pas a revenir vers nous pour toute question.</p>
                <p>Cordialement</p>
              </div>
            </div>`,
          });

          await db.insert(agentLogs).values({
            tenantId: ctx.tenantId,
            agentId: ctx.agentId,
            action: "quote.sent",
            detail: { to: input.leadEmail, product: input.productName, amount },
            level: "info",
          });

          return { sent: true, to: input.leadEmail, amount, validUntil };
        },
      },
      {
        name: "schedule_followup",
        description: "Planifier une relance automatique",
        inputSchema: {
          type: "object" as const,
          properties: {
            leadId: { type: "string" },
            followupDate: { type: "string", description: "Date ISO de la relance" },
            message: { type: "string", description: "Message de relance" },
          },
          required: ["leadId", "followupDate"],
        },
        handler: async (input, ctx) => {
          const followupDate = new Date(String(input.followupDate));
          const delayMs = Math.max(0, followupDate.getTime() - Date.now());

          await inngest.send({
            name: "agent/commercial.followup",
            data: {
              tenantId: ctx.tenantId,
              agentId: ctx.agentId,
              leadId: String(input.leadId),
              message: String(input.message ?? ""),
              scheduledFor: followupDate.toISOString(),
            },
          });

          await db.insert(agentLogs).values({
            tenantId: ctx.tenantId,
            agentId: ctx.agentId,
            action: "followup.scheduled",
            detail: { leadId: input.leadId, followupDate: followupDate.toISOString() },
            level: "info",
          });

          return { scheduled: true, leadId: input.leadId, followupDate: followupDate.toISOString() };
        },
      },
    ],
    admin: [
      {
        name: "classify_document",
        description: "Classifier un document par type (facture, contrat, devis, etc.)",
        inputSchema: {
          type: "object" as const,
          properties: {
            category: {
              type: "string",
              enum: ["facture", "contrat", "devis", "bon_commande", "releve", "courrier", "autre"],
            },
            confidence: { type: "number" },
            extractedFields: {
              type: "object",
              description: "Champs extraits (montant, date, fournisseur, etc.)",
            },
          },
          required: ["category", "confidence"],
        },
        handler: async (input, ctx) => {
          const documentId = String(ctx.agentConfig.documentId ?? (input as Record<string, unknown>).documentId ?? "");
          if (documentId) {
            await db
              .update(documents)
              .set({
                category: String(input.category),
                extractedData: (input.extractedFields as Record<string, unknown>) ?? {},
                processedByAgentId: ctx.agentId,
              })
              .where(and(eq(documents.id, documentId), eq(documents.tenantId, ctx.tenantId)));
          }
          return input;
        },
      },
      {
        name: "extract_data",
        description: "Extraire des donnees structurees d'un document",
        inputSchema: {
          type: "object" as const,
          properties: {
            fields: {
              type: "object",
              description: "Donnees extraites en cle-valeur",
            },
          },
          required: ["fields"],
        },
        handler: async (input, ctx) => {
          const documentId = String(ctx.agentConfig.documentId ?? (input as Record<string, unknown>).documentId ?? "");
          if (documentId) {
            await db
              .update(documents)
              .set({
                extractedData: input.fields as Record<string, unknown>,
              })
              .where(and(eq(documents.id, documentId), eq(documents.tenantId, ctx.tenantId)));
          }
          return input;
        },
      },
    ],
    support: [
      {
        name: "reply_to_customer",
        description: "Repondre a un client",
        inputSchema: {
          type: "object" as const,
          properties: {
            message: { type: "string" },
            tone: { type: "string", enum: ["empathetic", "professional", "casual"] },
            customerEmail: { type: "string" },
          },
          required: ["message"],
        },
        handler: async (input, ctx) => {
          const customerEmail = String(
            input.customerEmail ?? ctx.agentConfig.customerEmail ?? ""
          );

          if (customerEmail) {
            await sendEmail({
              tenantId: ctx.tenantId,
              to: customerEmail,
              subject: "Re: Votre demande de support",
              html: `<div style="font-family:sans-serif;padding:20px">
                <p>${String(input.message).replace(/\n/g, "<br>")}</p>
                <hr style="border:none;border-top:1px solid #e9ecef;margin:24px 0">
                <p style="font-size:12px;color:#868e96">Reponse automatique VotrIA — Support Client</p>
              </div>`,
            });
          }

          return { replied: true, message: input.message, tone: input.tone };
        },
      },
      {
        name: "create_ticket",
        description: "Creer un ticket de support",
        inputSchema: {
          type: "object" as const,
          properties: {
            title: { type: "string" },
            priority: { type: "string", enum: ["high", "medium", "low"] },
            category: { type: "string" },
          },
          required: ["title", "priority"],
        },
        handler: async (input, ctx) => {
          const priority = String(input.priority);
          const title = String(input.title);

          await sendInAppNotification({
            tenantId: ctx.tenantId,
            title: `Ticket: ${title}`,
            content: `Priorite ${priority} — ${input.category ?? "General"}`,
          });

          await db.insert(agentLogs).values({
            tenantId: ctx.tenantId,
            agentId: ctx.agentId,
            action: "ticket.created",
            detail: { title, priority, category: input.category },
            level: priority === "high" ? "warning" : "info",
          });

          return { created: true, title, priority, category: input.category };
        },
      },
    ],
    direction: [
      {
        name: "send_daily_brief",
        description: "Envoyer le bilan quotidien au dirigeant",
        inputSchema: {
          type: "object" as const,
          properties: {
            summary: { type: "string" },
            keyMetrics: { type: "object" },
            alerts: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
          },
          required: ["summary"],
        },
        handler: async (input, ctx) => {
          const metrics = (input.keyMetrics ?? {}) as Record<string, number>;
          const alerts = (input.alerts ?? []) as string[];
          const recs = (input.recommendations ?? []) as string[];

          // Get tenant name for the email
          const [tenant] = await db
            .select({ name: tenants.name })
            .from(tenants)
            .where(eq(tenants.id, ctx.tenantId))
            .limit(1);

          const html = dailyBriefTemplate({
            tenantName: tenant?.name ?? "VotrIA",
            date: new Date().toLocaleDateString("fr-FR"),
            totalTasks: metrics.total ?? 0,
            completedTasks: metrics.completed ?? 0,
            failedTasks: metrics.failed ?? 0,
            costEuros: ((metrics.costCents ?? 0) / 100).toFixed(2),
            highlights: [...alerts, ...recs],
          });

          await notifyTenantAdmins({
            tenantId: ctx.tenantId,
            subject: `[VotrIA] Bilan du ${new Date().toLocaleDateString("fr-FR")}`,
            html,
            inAppTitle: "Bilan quotidien disponible",
            inAppContent: String(input.summary).slice(0, 200),
          });

          return { sent: true, summary: input.summary, metrics };
        },
      },
      {
        name: "track_decisions",
        description: "Enregistrer une decision a suivre",
        inputSchema: {
          type: "object" as const,
          properties: {
            decision: { type: "string" },
            owner: { type: "string" },
            deadline: { type: "string" },
          },
          required: ["decision"],
        },
        handler: async (input, ctx) => {
          await db.insert(agentLogs).values({
            tenantId: ctx.tenantId,
            agentId: ctx.agentId,
            action: "decision.tracked",
            detail: {
              decision: input.decision,
              owner: input.owner,
              deadline: input.deadline,
            },
            level: "info",
          });

          return { tracked: true, decision: input.decision };
        },
      },
    ],
  };

  return toolRegistry[agentType] ?? [];
}

// ============================================
// Default system prompts
// ============================================
function getDefaultSystemPrompt(agentType: string): string {
  const prompts: Record<string, string> = {
    email: `Tu es un assistant email professionnel pour une PME francaise. Tu traites les emails entrants :
- Classifie chaque email par categorie et urgence
- Redige des reponses professionnelles en francais
- Escalade les emails sensibles ou complexes vers un humain
- Ne reponds JAMAIS aux emails suspects ou spam
- Ton : professionnel mais chaleureux, vouvoiement par defaut
- Signe toujours avec le nom de l'entreprise`,

    commercial: `Tu es un assistant commercial IA pour une PME francaise. Tu geres le pipeline commercial :
- Qualifie les leads entrants (scoring 0-100)
- Redige des emails de prospection personnalises
- Planifie les relances au bon moment
- Genere des propositions commerciales
- Ton : professionnel, oriente solution, persuasif mais honnete
- Respecte scrupuleusement la reglementation RGPD`,

    admin: `Tu es un assistant administratif IA pour une PME francaise. Tu traites les documents :
- Classifie automatiquement les documents (factures, contrats, devis, etc.)
- Extrais les donnees cles (montants, dates, fournisseurs, numeros)
- Organise et archive les fichiers
- Signale les anomalies (montants inhabituels, echeances proches)
- Sois meticuleux et precis dans l'extraction de donnees`,

    support: `Tu es un agent de support client IA pour une PME francaise. Tu assistes les clients :
- Reponds aux questions frequentes avec empathie
- Cree des tickets pour les problemes complexes
- Escalade les clients mecontents vers un humain
- Ton : empathique, patient, oriente solution
- Vouvoiement systematique`,

    direction: `Tu es un assistant de direction IA pour un dirigeant de PME francaise. Tu fournis :
- Des bilans quotidiens synthetiques de l'activite
- Le suivi des decisions et actions en cours
- Des alertes sur les indicateurs importants
- Des recommandations strategiques basees sur les donnees
- Ton : concis, factuel, oriente action, pas de fluff`,
  };

  return prompts[agentType] ?? prompts.email;
}

function buildUserPrompt(event: AgentEvent): string {
  return `Traite cette tache de type "${event.type}":\n\n${JSON.stringify(event.input, null, 2)}`;
}

function getLimitExceededMessage(reason: string): string {
  const messages: Record<string, string> = {
    DAILY_TASK_LIMIT: "Limite quotidienne de taches atteinte. Vos agents reprendront demain ou passez au plan superieur.",
    MONTHLY_TASK_LIMIT: "Limite mensuelle de taches atteinte. Passez au plan superieur pour continuer.",
    MONTHLY_TOKEN_LIMIT: "Budget tokens mensuel epuise. Passez au plan superieur pour augmenter votre capacite.",
    MONTHLY_COST_LIMIT: "Budget API mensuel atteint. Passez au plan superieur pour continuer.",
    TENANT_NOT_FOUND: "Compte non trouve. Contactez le support.",
  };
  return messages[reason] ?? "Limite d'utilisation atteinte. Contactez le support.";
}
