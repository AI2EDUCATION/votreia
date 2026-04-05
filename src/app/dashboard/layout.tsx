import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { KeyboardShortcuts } from "@/components/dashboard/keyboard-shortcuts";
import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!dbUser) redirect("/auth/login");

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, dbUser.tenantId))
    .limit(1);

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-[#0f1117]">
      <KeyboardShortcuts />
      <Sidebar />
      <div className="lg:pl-60">
        <TopBar
          user={{
            email: dbUser.email,
            fullName: dbUser.fullName ?? undefined,
            role: dbUser.role,
            avatarUrl: dbUser.avatarUrl ?? undefined,
          }}
          tenant={{
            name: tenant?.name ?? "—",
            plan: tenant?.plan ?? "trial",
          }}
        />
        <main className="p-4 sm:p-6 max-w-[1400px] mx-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
