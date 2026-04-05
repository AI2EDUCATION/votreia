import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  pgEnum,
  index,
  varchar,
  bigint,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// ENUMS
// ============================================

export const planEnum = pgEnum("plan", [
  "essentiel",
  "professionnel",
  "commande_totale",
  "trial",
]);

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "manager",
  "viewer",
]);

export const agentTypeEnum = pgEnum("agent_type", [
  "email",
  "commercial",
  "admin",
  "support",
  "direction",
]);

export const agentStatusEnum = pgEnum("agent_status", [
  "active",
  "paused",
  "error",
  "setup",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "escalated",
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "canceled",
  "trialing",
  "incomplete",
]);

export const emailProviderEnum = pgEnum("email_provider", [
  "gmail",
  "outlook",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "sms",
  "push",
  "in_app",
]);

// ============================================
// TABLES
// ============================================

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 63 }).notNull().unique(),
  plan: planEnum("plan").default("trial").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  domain: text("domain"),
  logoUrl: text("logo_url"),
  settings: jsonb("settings").default({}).$type<TenantSettings>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => tenants.id, { onDelete: "cascade" })
      .notNull(),
    email: text("email").notNull(),
    fullName: text("full_name"),
    role: userRoleEnum("role").default("viewer").notNull(),
    avatarUrl: text("avatar_url"),
    lastLogin: timestamp("last_login", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("users_tenant_idx").on(table.tenantId),
    emailIdx: index("users_email_idx").on(table.email),
  })
);

export const agents = pgTable(
  "agents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => tenants.id, { onDelete: "cascade" })
      .notNull(),
    type: agentTypeEnum("type").notNull(),
    name: text("name").notNull(),
    status: agentStatusEnum("status").default("setup").notNull(),
    config: jsonb("config").default({}).$type<AgentConfig>(),
    systemPrompt: text("system_prompt"),
    totalTasks: integer("total_tasks").default(0).notNull(),
    successRate: integer("success_rate").default(100),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("agents_tenant_idx").on(table.tenantId),
    typeIdx: index("agents_type_idx").on(table.type),
  })
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => tenants.id, { onDelete: "cascade" })
      .notNull(),
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    status: taskStatusEnum("status").default("pending").notNull(),
    input: jsonb("input").$type<Record<string, unknown>>(),
    output: jsonb("output").$type<Record<string, unknown>>(),
    error: text("error"),
    durationMs: integer("duration_ms"),
    tokensUsed: integer("tokens_used"),
    modelUsed: text("model_used"),
    costCents: integer("cost_cents"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    tenantIdx: index("tasks_tenant_idx").on(table.tenantId),
    agentIdx: index("tasks_agent_idx").on(table.agentId),
    statusIdx: index("tasks_status_idx").on(table.status),
    createdAtIdx: index("tasks_created_at_idx").on(table.createdAt),
  })
);

export const emailAccounts = pgTable(
  "email_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => tenants.id, { onDelete: "cascade" })
      .notNull(),
    provider: emailProviderEnum("provider").notNull(),
    email: text("email").notNull(),
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    watchExpiration: timestamp("watch_expiration", { withTimezone: true }),
    isActive: boolean("is_active").default(true).notNull(),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("email_accounts_tenant_idx").on(table.tenantId),
  })
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => tenants.id, { onDelete: "cascade" })
      .notNull(),
    filePath: text("file_path").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type"),
    fileSizeBytes: integer("file_size_bytes"),
    category: text("category"),
    extractedData: jsonb("extracted_data").$type<Record<string, unknown>>(),
    processedByAgentId: uuid("processed_by_agent_id").references(() => agents.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("documents_tenant_idx").on(table.tenantId),
    categoryIdx: index("documents_category_idx").on(table.category),
  })
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => tenants.id, { onDelete: "cascade" })
      .notNull(),
    email: text("email"),
    phone: text("phone"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    company: text("company"),
    position: text("position"),
    status: leadStatusEnum("status").default("new").notNull(),
    score: integer("score").default(0),
    source: text("source"),
    notes: text("notes"),
    lastContact: timestamp("last_contact", { withTimezone: true }),
    nextFollowup: timestamp("next_followup", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("leads_tenant_idx").on(table.tenantId),
    statusIdx: index("leads_status_idx").on(table.status),
    scoreIdx: index("leads_score_idx").on(table.score),
  })
);

export const agentLogs = pgTable(
  "agent_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => tenants.id, { onDelete: "cascade" })
      .notNull(),
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),
    action: text("action").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    level: text("level").default("info"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("agent_logs_tenant_idx").on(table.tenantId),
    agentIdx: index("agent_logs_agent_idx").on(table.agentId),
    createdAtIdx: index("agent_logs_created_at_idx").on(table.createdAt),
  })
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => tenants.id, { onDelete: "cascade" })
      .notNull(),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    plan: planEnum("plan").notNull(),
    status: subscriptionStatusEnum("status").default("trialing").notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("subscriptions_tenant_idx").on(table.tenantId),
  })
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => tenants.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    channel: notificationChannelEnum("channel").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    read: boolean("read").default(false),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("notifications_tenant_idx").on(table.tenantId),
    userIdx: index("notifications_user_idx").on(table.userId),
  })
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => tenants.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(),
    resource: text("resource").notNull(),
    resourceId: text("resource_id"),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("audit_logs_tenant_idx").on(table.tenantId),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  })
);

// ============================================
// RELATIONS
// ============================================

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  agents: many(agents),
  tasks: many(tasks),
  leads: many(leads),
  documents: many(documents),
  emailAccounts: many(emailAccounts),
  subscriptions: many(subscriptions),
  notifications: many(notifications),
}));

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
}));

export const agentsRelations = relations(agents, ({ one, many }) => ({
  tenant: one(tenants, { fields: [agents.tenantId], references: [tenants.id] }),
  tasks: many(tasks),
  logs: many(agentLogs),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  tenant: one(tenants, { fields: [tasks.tenantId], references: [tenants.id] }),
  agent: one(agents, { fields: [tasks.agentId], references: [agents.id] }),
}));

// ============================================
// TYPE EXPORTS
// ============================================

export type TenantSettings = {
  timezone?: string;
  language?: string;
  notificationPreferences?: {
    email?: boolean;
    sms?: boolean;
    dailyDigest?: boolean;
  };
  agentDefaults?: {
    escalateAfterMinutes?: number;
    maxAutoRepliesPerDay?: number;
  };
};

export type AgentConfig = {
  maxTasksPerDay?: number;
  autoEscalate?: boolean;
  escalateKeywords?: string[];
  whitelistDomains?: string[];
  blacklistDomains?: string[];
  responseStyle?: "formal" | "casual" | "neutral";
  language?: string;
  customInstructions?: string;
};
