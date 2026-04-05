"use client";

import { trpc } from "@/lib/trpc-client";
import { useToast } from "@/components/ui/toast";
import { Zap, ArrowUpRight, Loader2 } from "lucide-react";

export function CheckoutButton({ plan }: { plan: "essentiel" | "professionnel" }) {
  const { error: toastError } = useToast();

  const checkout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => toastError("Echec", err.message),
  });

  return (
    <button
      className="btn-primary w-full text-sm"
      onClick={() => checkout.mutate({ plan })}
      disabled={checkout.isPending}
    >
      {checkout.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <Zap className="w-4 h-4" />
          Choisir ce plan
        </>
      )}
    </button>
  );
}

export function PortalButton() {
  const { error: toastError } = useToast();

  const portal = trpc.billing.portalUrl.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => toastError("Echec", err.message),
  });

  return (
    <button
      className="btn-secondary text-sm"
      onClick={() => portal.mutate()}
      disabled={portal.isPending}
    >
      {portal.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <ArrowUpRight className="w-4 h-4" />
          Portail Stripe
        </>
      )}
    </button>
  );
}

export function ContactButton() {
  return (
    <button
      className="btn-secondary w-full text-sm"
      onClick={() => window.location.href = "mailto:contact@votria.fr?subject=Plan Commande Totale"}
    >
      Nous contacter
    </button>
  );
}
