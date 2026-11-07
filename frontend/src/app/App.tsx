import { useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { createAppRouter } from "./router";
import { useSession } from "@/store/session";

export const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 500, refetchOnWindowFocus: false } },
  });

export function App({ client, router: injected }: { client?: QueryClient; router?: ReturnType<typeof createAppRouter> }) {
  const qc = useMemo(() => client ?? makeQueryClient(), [client]);
  const router = useMemo(() => injected ?? createAppRouter(), [injected]);
  const apiKey = useSession((s) => s.apiKey);
  // Logout / expired key: bounce to the login screen.
  useEffect(() => {
    if (!apiKey) router.navigate({ to: "/login", replace: true }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);
  return (
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
