"use client";

/**
 * Providers Component
 *
 * Client-side provider wrapper for QueryClient, StellarGrantsProvider,
 * and SocketProvider. This component is imported into the root layout.
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/queryClient";
import { StellarGrantsProvider } from "@/components/StellarGrantsProvider";
import { SocketProvider } from "@/hooks/useSocket";
import { NotificationToast } from "@/components/ui/NotificationToast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <StellarGrantsProvider>
        <SocketProvider>
          {children}
          <NotificationToast />
        </SocketProvider>
      </StellarGrantsProvider>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
