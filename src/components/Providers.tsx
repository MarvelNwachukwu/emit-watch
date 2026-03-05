"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { WatchlistProvider } from "@/contexts/WatchlistContext";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function Providers({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 2,
          },
        },
      })
  );

  const privyEnabled = mounted && PRIVY_APP_ID && !PRIVY_APP_ID.startsWith("placeholder");

  if (!privyEnabled) {
    return (
      <QueryClientProvider client={queryClient}>
        <WatchlistProvider>{children}</WatchlistProvider>
      </QueryClientProvider>
    );
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#e8a427",
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <WatchlistProvider>{children}</WatchlistProvider>
        </AuthProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
