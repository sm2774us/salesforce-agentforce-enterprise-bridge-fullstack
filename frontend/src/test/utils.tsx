import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryHistory } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { App } from "@/app/App";
import { createAppRouter } from "@/app/router";
import { useSession } from "@/store/session";
import { KEYS } from "./server";

export function renderApp(path = "/", as?: keyof typeof KEYS) {
  useSession.setState(
    as ? { apiKey: as, user: KEYS[as], live: false } : { apiKey: "", user: null, live: false },
  );
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const user = userEvent.setup();
  return { user, router, ...render(<App client={client} router={router} />) };
}
