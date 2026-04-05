"use client";

import { TRPCProvider } from "@/lib/trpc-client";
import { ErrorBoundary } from "@/components/error-boundary";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <TRPCProvider>
        <ToastProvider>{children}</ToastProvider>
      </TRPCProvider>
    </ErrorBoundary>
  );
}
