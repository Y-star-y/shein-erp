"use client";

import { readJsonResponse } from "@/lib/api-response";
import type {
  OpsTodoTaskId,
  OpsTodoTaskSummary,
  OpsTodosResponse,
  StoreOpenTarget,
} from "@shein-erp/shared";
import { Button, Empty } from "antd";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OpsTodoListPanel } from "./ops-todo-list-panel";

type StoreTaskRow = {
  storeId: string;
  storeName: string;
  count: number;
};

function ordersTarget(storeId: string): StoreOpenTarget {
  return { storeId, tab: "orders" };
}

function unmappedOrdersTarget(storeId: string): StoreOpenTarget {
  return { storeId, tab: "orders", ordersFilter: "unmapped" };
}

function jumpToTask(
  taskId: OpsTodoTaskId,
  pendingStores: StoreTaskRow[],
  unmappedStores: StoreTaskRow[],
): StoreOpenTarget | null {
  if (taskId === "pending_ship") {
    const store = pendingStores.find((row) => row.count > 0);
    return store ? ordersTarget(store.storeId) : null;
  }
  if (taskId === "order_bind") {
    const store = unmappedStores.find((row) => row.count > 0);
    return store ? unmappedOrdersTarget(store.storeId) : null;
  }
  return null;
}

export function OpsTodoPage({
  initialTaskId,
  onConsumeInitialTask,
  onOpenStore,
  unmappedReloadKey = 0,
}: {
  initialTaskId?: OpsTodoTaskId | null;
  onConsumeInitialTask?: () => void;
  onOpenStore?: (target: StoreOpenTarget) => void;
  unmappedReloadKey?: number;
}) {
  const [tasks, setTasks] = useState<OpsTodoTaskSummary[]>([]);
  const [pendingStores, setPendingStores] = useState<StoreTaskRow[]>([]);
  const [unmappedStores, setUnmappedStores] = useState<StoreTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedTaskId, setSelectedTaskId] = useState<OpsTodoTaskId | null>(null);
  const initialTaskHandled = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksResponse, pendingResponse, unmappedResponse] = await Promise.all([
        fetch("/api/ops-todos"),
        fetch("/api/orders/pending/counts"),
        fetch("/api/orders/unmapped/counts"),
      ]);
      const tasksData = await readJsonResponse<OpsTodosResponse & { error?: string }>(tasksResponse);
      const pendingData = await readJsonResponse<{ stores?: StoreTaskRow[] }>(pendingResponse);
      const unmappedData = await readJsonResponse<{ stores?: StoreTaskRow[] }>(unmappedResponse);

      setTasks(tasksResponse.ok ? (tasksData?.tasks ?? []) : []);
      setPendingStores(pendingResponse.ok ? (pendingData?.stores ?? []) : []);
      setUnmappedStores(unmappedResponse.ok ? (unmappedData?.stores ?? []) : []);
    } catch {
      setTasks([]);
      setPendingStores([]);
      setUnmappedStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData, unmappedReloadKey]);

  const tryJumpToTask = useCallback(
    (taskId: OpsTodoTaskId) => {
      const target = jumpToTask(taskId, pendingStores, unmappedStores);
      if (!target || !onOpenStore) return false;
      onOpenStore(target);
      return true;
    },
    [onOpenStore, pendingStores, unmappedStores],
  );

  useEffect(() => {
    if (!initialTaskId || initialTaskHandled.current || loading) return;
    initialTaskHandled.current = true;

    if (tryJumpToTask(initialTaskId)) {
      onConsumeInitialTask?.();
      return;
    }

    if (initialTaskId === "after_sales" || initialTaskId === "shipment_exception") {
      setSelectedTaskId(initialTaskId);
      setView("detail");
    }
    onConsumeInitialTask?.();
  }, [initialTaskId, loading, onConsumeInitialTask, tryJumpToTask]);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  function openTask(task: OpsTodoTaskSummary) {
    if (!task.implemented) {
      setSelectedTaskId(task.id);
      setView("detail");
      return;
    }
    tryJumpToTask(task.id);
  }

  function backToList() {
    setView("list");
    setSelectedTaskId(null);
  }

  return (
    <div className="page-stack store-management-page">
      <header className="store-page-header">
        {view === "detail" && selectedTask ? (
          <div className="store-page-header__main">
            <Button
              className="store-page-header__back"
              icon={<ArrowLeft size={16} />}
              type="text"
              onClick={backToList}
            >
              返回待办列表
            </Button>
            <div>
              <h2 className="store-page-header__title">{selectedTask.title}</h2>
              <p className="store-page-header__desc">{selectedTask.description}</p>
            </div>
          </div>
        ) : (
          <div className="store-page-header__main">
            <span className="store-page-header__eyebrow">
              <ClipboardList size={14} /> 运营部
            </span>
            <h2 className="store-page-header__title">待办任务</h2>
            <p className="store-page-header__desc">点击任务直接进入对应处理页面</p>
          </div>
        )}
      </header>

      {view === "list" ? (
        <OpsTodoListPanel loading={loading} tasks={tasks} onOpenTask={openTask} />
      ) : (
        <Empty description="该功能即将上线，敬请期待" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </div>
  );
}
