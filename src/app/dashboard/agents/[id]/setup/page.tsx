import { db } from "@/db";
import { agents, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createSupabaseServer } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import { SetupWizardClient } from "./client";

async function getTenantId() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return dbUser?.tenantId ?? null;
}

export default async function AgentSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  const { id } = await params;

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, id), eq(agents.tenantId, tenantId)))
    .limit(1);

  if (!agent) notFound();

  // If agent is already active, redirect to detail
  if (agent.status === "active") {
    redirect(`/dashboard/agents/${id}`);
  }

  return (
    <SetupWizardClient
      agent={{
        id: agent.id,
        name: agent.name,
        type: agent.type,
        systemPrompt: agent.systemPrompt,
        config: agent.config,
        status: agent.status,
      }}
    />
  );
}
