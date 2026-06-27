"use client";

import { readJsonResponse } from "@/lib/api-response";
import type { NotificationsSummary } from "@shein-erp/shared";
import { useCallback, useEffect, useState } from "react";

const POLL_INTERVAL_MS = 60_000;

const EMPTY_SUMMARY: NotificationsSummary = {
  items: [],
  total: 0,
  unmappedCount: 0,
  pendingOrderCount: 0,
};

export function useNotifications(refreshKey = 0) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<NotificationsSummary>(EMPTY_SUMMARY);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications");
      const data = await readJsonResponse<NotificationsSummary & { error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error ?? "加载通知失败");
      }
      setSummary(data);
    } catch {
      setSummary(EMPTY_SUMMARY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh, refreshKey]);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refresh, refreshKey]);

  return { summary, loading, refresh };
}
