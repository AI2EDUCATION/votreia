import {
  pgTable,
  uuid,
  date,
  integer,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { tenants } from "./tables";

// ============================================
// Usage tracking — Daily aggregated usage per tenant
// Used for plan limit enforcement and billing
// ============================================

export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .references(() => tenants.id, { onDelete: "cascade" })
      .notNull(),
    /** Date (YYYY-MM-DD) */
    date: date("date").notNull(),
    /** Number of tasks executed this day */
    tasksCount: integer("tasks_count").default(0).notNull(),
    /** Total tokens consumed (input + output) */
    tokensUsed: integer("tokens_used").default(0).notNull(),
    /** Total cost in cents */
    costCents: integer("cost_cents").default(0).notNull(),
    /** Timestamp of last update */
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantDateUnique: unique("usage_tenant_date_unique").on(table.tenantId, table.date),
    tenantIdx: index("usage_records_tenant_idx").on(table.tenantId),
    dateIdx: index("usage_records_date_idx").on(table.date),
  })
);
