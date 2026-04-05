import { db } from "@/db";
import { leads, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createSupabaseServer } from "@/lib/supabase-server";
import { ArrowLeft, Mail, Phone, Building2, Calendar, Target, Globe } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadDetailActions } from "./client";

async function getTenantId() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return dbUser?.tenantId ?? null;
}

const statusConfig: Record<string, { label: string; light: string; dark: string }> = {
  new: { label: "Nouveau", light: "bg-blue-50 text-blue-700 ring-blue-200", dark: "dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20" },
  contacted: { label: "Contacte", light: "bg-violet-50 text-violet-700 ring-violet-200", dark: "dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20" },
  qualified: { label: "Qualifie", light: "bg-emerald-50 text-emerald-700 ring-emerald-200", dark: "dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20" },
  proposal: { label: "Proposition", light: "bg-amber-50 text-amber-700 ring-amber-200", dark: "dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20" },
  won: { label: "Gagne", light: "bg-green-50 text-green-700 ring-green-200", dark: "dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20" },
  lost: { label: "Perdu", light: "bg-red-50 text-red-700 ring-red-200", dark: "dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20" },
};

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  const { id } = await params;

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, id), eq(leads.tenantId, tenantId)))
    .limit(1);

  if (!lead) notFound();

  const status = statusConfig[lead.status] ?? statusConfig.new;
  const score = lead.score ?? 0;
  const scoreColor = score >= 70 ? "text-emerald-600 dark:text-emerald-400" : score >= 40 ? "text-amber-600 dark:text-amber-400" : "text-surface-500";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/leads" className="flex items-center gap-1 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Leads
        </Link>
        <span className="text-surface-300 dark:text-surface-600">/</span>
        <span className="text-surface-900 dark:text-surface-50 font-medium">
          {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email || "Lead"}
        </span>
      </div>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xl font-bold">
              {(lead.firstName?.[0] ?? lead.email?.[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">
                {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Sans nom"}
              </h1>
              {lead.company && (
                <p className="text-sm text-surface-500 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3.5 h-3.5" />
                  {lead.company}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className={`text-2xl font-bold ${scoreColor}`}>{score}</div>
              <div className="text-xs text-surface-400">Score</div>
            </div>
            <span className={`badge ring-1 ${status.light} ${status.dark}`}>{status.label}</span>
          </div>
        </div>

        {/* Contact info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-surface-100 dark:border-white/[0.06]">
          {lead.email && (
            <div>
              <div className="flex items-center gap-1.5 text-xs text-surface-400 mb-1"><Mail className="w-3.5 h-3.5" />Email</div>
              <a href={`mailto:${lead.email}`} className="text-sm text-brand-600 dark:text-brand-400 hover:underline">{lead.email}</a>
            </div>
          )}
          {lead.phone && (
            <div>
              <div className="flex items-center gap-1.5 text-xs text-surface-400 mb-1"><Phone className="w-3.5 h-3.5" />Telephone</div>
              <a href={`tel:${lead.phone}`} className="text-sm text-surface-800 dark:text-surface-200">{lead.phone}</a>
            </div>
          )}
          {lead.source && (
            <div>
              <div className="flex items-center gap-1.5 text-xs text-surface-400 mb-1"><Globe className="w-3.5 h-3.5" />Source</div>
              <div className="text-sm text-surface-800 dark:text-surface-200 capitalize">{lead.source}</div>
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-surface-400 mb-1"><Calendar className="w-3.5 h-3.5" />Cree le</div>
            <div className="text-sm text-surface-800 dark:text-surface-200">{new Date(lead.createdAt).toLocaleDateString("fr-FR")}</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <LeadDetailActions leadId={lead.id} currentStatus={lead.status} currentScore={score} currentNotes={lead.notes ?? ""} />

      {/* Notes */}
      {lead.notes && (
        <div className="card p-5">
          <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-50 mb-2">Notes</h3>
          <p className="text-sm text-surface-600 dark:text-surface-400 whitespace-pre-wrap">{lead.notes}</p>
        </div>
      )}

      {/* Score bar */}
      <div className="card p-5">
        <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-50 mb-3">Score de qualification</h3>
        <div className="w-full h-3 bg-surface-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-surface-300"}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-surface-400">
          <span>0 — Froid</span>
          <span>50 — Tiede</span>
          <span>100 — Chaud</span>
        </div>
      </div>
    </div>
  );
}
