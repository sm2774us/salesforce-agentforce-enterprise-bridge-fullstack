import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { api, ApiError } from "./api";
import { useSession } from "@/store/session";

/** Validates an API key via /v1/whoami and installs it as the session. */
export function useSignIn() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const setSession = useSession((s) => s.setSession);
  return useMutation({
    mutationFn: async ({ key }: { key: string; silent?: boolean }) => ({
      key,
      user: await api.whoami(key.trim()),
    }),
    onSuccess: ({ key, user }, vars) => {
      setSession(key.trim(), user);
      qc.clear();
      if (vars.silent) toast.success(`Now acting as ${user.name} (${user.role})`);
      else navigate({ to: "/" });
    },
    onError: (e: ApiError) => {
      if (e.status === 401) return;
      toast.error(e.message);
    },
  });
}
