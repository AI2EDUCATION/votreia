"use client";

import { trpc } from "@/lib/trpc-client";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

export function NotificationsClient() {
  const router = useRouter();
  const { success } = useToast();

  const markAll = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      success("Tout marque comme lu");
      router.refresh();
    },
  });

  return (
    <button
      className="btn-secondary text-sm"
      onClick={() => markAll.mutate()}
      disabled={markAll.isPending}
    >
      {markAll.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
      Tout marquer comme lu
    </button>
  );
}
