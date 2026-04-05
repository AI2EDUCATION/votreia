import { db } from "../src/db";
import {
  tenants,
  users,
  agents,
  tasks,
  leads,
  documents,
} from "../src/db/schema";
import { randomUUID } from "crypto";

/**
 * Seed script — populates a demo tenant with agents, tasks, and leads
 * Run: npm run db:seed
 */
async function seed() {
  console.log("🌱 Seeding VotrIA database...\n");

  // 1. Create demo tenant
  const tenantId = randomUUID();
  await db.insert(tenants).values({
    id: tenantId,
    name: "Demo PME SAS",
    slug: "demo-pme-sas",
    plan: "professionnel",
    settings: {
      timezone: "Europe/Paris",
      language: "fr",
      notificationPreferences: { email: true, sms: false, dailyDigest: true },
    },
  });
  console.log("✅ Tenant: Demo PME SAS");

  // 2. Create demo user (admin)
  const userId = randomUUID();
  await db.insert(users).values({
    id: userId,
    tenantId,
    email: "demo@votria.fr",
    fullName: "Jean Dupont",
    role: "admin",
    lastLogin: new Date(),
  });
  console.log("✅ User: demo@votria.fr (admin)");

  // 3. Create agents
  const agentDefs = [
    { type: "email" as const, name: "Agent Email", status: "active" as const },
    { type: "commercial" as const, name: "Agent Commercial", status: "active" as const },
    { type: "admin" as const, name: "Agent Admin", status: "active" as const },
    { type: "support" as const, name: "Agent Support", status: "paused" as const },
    { type: "direction" as const, name: "Agent Direction", status: "setup" as const },
  ];

  const agentIds: string[] = [];
  for (const def of agentDefs) {
    const id = randomUUID();
    agentIds.push(id);
    await db.insert(agents).values({
      id,
      tenantId,
      type: def.type,
      name: def.name,
      status: def.status,
      totalTasks: Math.floor(Math.random() * 200),
      successRate: 90 + Math.floor(Math.random() * 10),
      lastActiveAt: new Date(Date.now() - Math.random() * 86400000),
    });
    console.log(`✅ Agent: ${def.name} (${def.status})`);
  }

  // 4. Create sample tasks
  const taskTypes = [
    "classify_email", "process_email", "send_reply",
    "qualify_lead", "send_quote", "followup_lead",
    "classify_document", "extract_data",
  ];
  const statuses: Array<"completed" | "failed" | "escalated" | "pending"> = ["completed", "completed", "completed", "completed", "failed", "escalated"];

  for (let i = 0; i < 50; i++) {
    const agentIdx = Math.floor(Math.random() * 3); // first 3 active agents
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const durationMs = 1000 + Math.floor(Math.random() * 14000);
    const tokensUsed = 500 + Math.floor(Math.random() * 3000);
    const costCents = Math.floor(tokensUsed * 0.003);

    await db.insert(tasks).values({
      tenantId,
      agentId: agentIds[agentIdx],
      type: taskTypes[Math.floor(Math.random() * taskTypes.length)],
      status,
      durationMs,
      tokensUsed,
      modelUsed: Math.random() > 0.3 ? "claude-sonnet-4-20250514" : "claude-haiku-4-5-20251001",
      costCents,
      createdAt: new Date(Date.now() - Math.random() * 7 * 86400000),
      completedAt: status !== "pending" ? new Date() : undefined,
      input: { demo: true },
      output: status === "completed" ? { result: "success" } : undefined,
    });
  }
  console.log("✅ 50 sample tasks created");

  // 5. Create sample leads
  const companies = [
    "Boulangerie Martin", "Cabinet Legrand Avocats", "Plomberie Express",
    "Garage Dubois", "Restaurant Le Petit Chef", "Clinique Beauté",
    "Imprimerie Rapide", "AgriTech Solutions", "Cabinet Comptable Moreau",
    "Studio Design Créatif",
  ];

  const leadStatuses = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;

  for (let i = 0; i < 20; i++) {
    const company = companies[i % companies.length];
    const firstName = ["Marie", "Pierre", "Sophie", "Luc", "Claire"][i % 5];
    const lastName = ["Martin", "Legrand", "Dubois", "Moreau", "Petit"][i % 5];

    await db.insert(leads).values({
      tenantId,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, "")}.fr`,
      phone: `+336${String(Math.floor(Math.random() * 100000000)).padStart(8, "0")}`,
      firstName,
      lastName,
      company,
      status: leadStatuses[Math.floor(Math.random() * leadStatuses.length)],
      score: Math.floor(Math.random() * 100),
      source: ["website", "linkedin", "referral", "cold_email", "event"][Math.floor(Math.random() * 5)],
      createdAt: new Date(Date.now() - Math.random() * 30 * 86400000),
    });
  }
  console.log("✅ 20 sample leads created");

  // 6. Create sample documents
  const docDefs = [
    { fileName: "Facture_2024_0042.pdf", category: "facture", mimeType: "application/pdf", size: 245000 },
    { fileName: "Contrat_Maintenance_2024.pdf", category: "contrat", mimeType: "application/pdf", size: 1200000 },
    { fileName: "Devis_Renovation_Bureau.pdf", category: "devis", mimeType: "application/pdf", size: 380000 },
    { fileName: "BC_Fournitures_Mars.xlsx", category: "bon_commande", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 52000 },
    { fileName: "Releve_Bancaire_Fevrier.pdf", category: "releve", mimeType: "application/pdf", size: 180000 },
    { fileName: "Facture_Fournisseur_EDF.pdf", category: "facture", mimeType: "application/pdf", size: 95000 },
    { fileName: "Contrat_Assurance_Pro.docx", category: "contrat", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 420000 },
    { fileName: "Courrier_Administration.pdf", category: "courrier", mimeType: "application/pdf", size: 67000 },
  ];

  for (const doc of docDefs) {
    await db.insert(documents).values({
      tenantId,
      filePath: `${tenantId}/demo-${doc.fileName}`,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      fileSizeBytes: doc.size,
      category: doc.category,
      processedByAgentId: agentIds[2], // admin agent
      extractedData: {
        processedAt: new Date().toISOString(),
        type: doc.category,
      },
      createdAt: new Date(Date.now() - Math.random() * 30 * 86400000),
    });
  }
  console.log("✅ 8 sample documents created");

  console.log("\n🎉 Seed complete!\n");
  console.log("   Email: demo@votria.fr");
  console.log("   Tenant: Demo PME SAS (professionnel)");
  console.log("   3 active agents, 50 tasks, 20 leads, 8 documents\n");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
