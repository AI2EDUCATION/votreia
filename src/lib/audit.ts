import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { logError } from "@/lib/error-handler";

export interface AuditLogParams {
  tenantId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  detail?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Insert an audit log entry. Fire-and-forget — never throws.
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      tenantId: params.tenantId,
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      detail: params.detail,
      ipAddress: params.ipAddress,
    });
  } catch (error) {
    logError(error, { context: "audit_log", ...params });
  }
}

/**
 * Extract IP address from request headers
 */
export function getIpFromRequest(req: Request): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? undefined;
}
