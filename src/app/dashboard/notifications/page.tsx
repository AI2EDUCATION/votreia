import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createSupabaseServer } from "@/lib/supabase-server";
import { Bell, Mail, MessageSquare, Smartphone, CheckCircle2 } from "lucide-react";
import { NotificationsClient } from "./client";

async function getTenantId() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return dbUser?.tenantId ?? null;
}

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="w-4 h-4 text-blue-500" />,
  sms: <Smartphone className="w-4 h-4 text-emerald-500" />,
  in_app: <Bell className="w-4 h-4 text-brand-500" />,
  push: <MessageSquare className="w-4 h-4 text-violet-500" />,
};

export default async function NotificationsPage() {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  const notifList = await db
    .select()
    .from(notifications)
    .where(eq(notifications.tenantId, tenantId))
    .orderBy(desc(notifications.sentAt))
    .limit(100);

  const unreadCount = notifList.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Notifications</h1>
          <p className="text-sm text-surface-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est lu"}
          </p>
        </div>
        {unreadCount > 0 && <NotificationsClient />}
      </div>

      {notifList.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-surface-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-surface-300" />
          </div>
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-2">Aucune notification</h3>
          <p className="text-sm text-surface-500">Les notifications de vos agents apparaitront ici.</p>
        </div>
      ) : (
        <div className="card divide-y divide-surface-100 dark:divide-white/[0.04] overflow-hidden">
          {notifList.map((notif) => (
            <div
              key={notif.id}
              className={`px-5 py-4 flex items-start gap-3 transition-colors ${
                !notif.read ? "bg-brand-50/30 dark:bg-brand-500/[0.03]" : ""
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {channelIcons[notif.channel] ?? channelIcons.in_app}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-surface-900 dark:text-surface-50">{notif.title}</h4>
                  {!notif.read && <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />}
                </div>
                <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">{notif.content}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-surface-400">
                  <span className="capitalize">{notif.channel}</span>
                  <span>{new Date(notif.sentAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
