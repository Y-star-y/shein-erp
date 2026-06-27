"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";

const POLL_MS = 5000;

/** 禁用账户或 sessionVersion 变更后，主动踢下线 */
export function useSessionGuard() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;

    async function validate() {
      try {
        const response = await fetch("/api/auth/session-validate", { cache: "no-store" });
        if (cancelled) return;
        if (response.status === 401) {
          await signOut({ callbackUrl: "/login?reason=disabled" });
        }
        // 503 = stale Prisma client; do not sign out — dev needs db:generate
      } catch {
        // ignore network errors
      }
    }

    void validate();
    const timer = window.setInterval(() => void validate(), POLL_MS);
    const onFocus = () => void validate();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [status]);
}
