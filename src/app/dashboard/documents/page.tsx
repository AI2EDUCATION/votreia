import { db } from "@/db";
import { documents, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createSupabaseServer } from "@/lib/supabase-server";
import { FileText } from "lucide-react";
import { DocumentUploadButton, DocumentDropZone } from "@/components/dashboard/document-upload";
import { DocumentDownloadButton } from "@/components/dashboard/document-download";

async function getTenantId() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return dbUser?.tenantId ?? null;
}

const categoryConfig: Record<string, { icon: string; color: string; dark: string }> = {
  facture: { icon: "🧾", color: "bg-emerald-50 text-emerald-700", dark: "dark:bg-emerald-500/10 dark:text-emerald-400" },
  contrat: { icon: "📝", color: "bg-blue-50 text-blue-700", dark: "dark:bg-blue-500/10 dark:text-blue-400" },
  devis: { icon: "💰", color: "bg-amber-50 text-amber-700", dark: "dark:bg-amber-500/10 dark:text-amber-400" },
  bon_commande: { icon: "📦", color: "bg-violet-50 text-violet-700", dark: "dark:bg-violet-500/10 dark:text-violet-400" },
  releve: { icon: "🏦", color: "bg-rose-50 text-rose-700", dark: "dark:bg-rose-500/10 dark:text-rose-400" },
  courrier: { icon: "✉️", color: "bg-brand-50 text-brand-700", dark: "dark:bg-brand-500/10 dark:text-brand-400" },
  autre: { icon: "📄", color: "bg-surface-100 text-surface-700", dark: "dark:bg-white/5 dark:text-surface-400" },
};

export default async function DocumentsPage() {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  const docList = await db
    .select()
    .from(documents)
    .where(eq(documents.tenantId, tenantId))
    .orderBy(desc(documents.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Documents</h1>
          <p className="text-sm text-surface-500 mt-1">
            {docList.length} document{docList.length > 1 ? "s" : ""} traite{docList.length > 1 ? "s" : ""} par l'agent Admin
          </p>
        </div>
        <DocumentUploadButton />
      </div>

      {docList.length === 0 ? (
        <DocumentDropZone />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left px-5 py-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Fichier</th>
                  <th className="text-left px-5 py-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Categorie</th>
                  <th className="text-left px-5 py-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Taille</th>
                  <th className="text-left px-5 py-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Date</th>
                  <th className="text-right px-5 py-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-white/[0.04]">
                {docList.map((doc) => {
                  const cat = categoryConfig[doc.category ?? "autre"] ?? categoryConfig.autre;
                  return (
                    <tr key={doc.id} className="table-row">
                      <td className="px-5 py-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-surface-100 dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-surface-400" />
                        </div>
                        <span className="font-medium text-surface-800 dark:text-surface-200 truncate max-w-[300px]">
                          {doc.fileName}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {doc.category ? (
                          <span className={`badge ${cat.color} ${cat.dark}`}>
                            {cat.icon} {doc.category}
                          </span>
                        ) : (
                          <span className="badge bg-surface-100 dark:bg-white/5 text-surface-400">En attente</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-surface-500 dark:text-surface-400 text-xs font-mono tabular-nums">
                        {doc.fileSizeBytes
                          ? `${(doc.fileSizeBytes / 1024).toFixed(0)} Ko`
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-surface-400 text-xs tabular-nums">
                        {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <DocumentDownloadButton docId={doc.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
