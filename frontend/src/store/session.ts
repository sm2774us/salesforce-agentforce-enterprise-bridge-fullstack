import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Whoami } from "@/lib/types";

interface SessionState {
  apiKey: string;
  user: Whoami | null;
  live: boolean;
  setSession: (apiKey: string, user: Whoami) => void;
  setLive: (live: boolean) => void;
  logout: () => void;
  expire: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      apiKey: "",
      user: null,
      live: true,
      setSession: (apiKey, user) => set({ apiKey, user }),
      setLive: (live) => set({ live }),
      logout: () => set({ apiKey: "", user: null }),
      expire: () => set({ apiKey: "", user: null }),
    }),
    {
      name: "control-tower-session",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

export const can = (user: Whoami | null, permission: string) =>
  !!user && user.permissions.includes(permission);
