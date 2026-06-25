"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  MAINTENANCE_EVENT_STORAGE_KEY,
} from "./constants";
import type {
  CompanySku,
  ConfirmState,
  MaintenanceEvent,
  MasterDataResponse,
  ModalState,
  PageKey,
  PlatformSkuMapping,
  Toast,
} from "./types";

export type ErpStore = {
  page: PageKey;
  setPage: (page: PageKey) => void;
  companySkus: CompanySku[];
  setCompanySkus: React.Dispatch<React.SetStateAction<CompanySku[]>>;
  mappings: PlatformSkuMapping[];
  setMappings: React.Dispatch<React.SetStateAction<PlatformSkuMapping[]>>;
  events: MaintenanceEvent[];
  recordEvent: (action: string, targetType: MaintenanceEvent["targetType"], targetCode: string, detail: string) => void;
  toasts: Toast[];
  pushToast: (type: Toast["type"], message: string) => void;
  modal: ModalState;
  setModal: React.Dispatch<React.SetStateAction<ModalState>>;
  confirm: ConfirmState;
  setConfirm: React.Dispatch<React.SetStateAction<ConfirmState>>;
  companyQuery: string;
  setCompanyQuery: (query: string) => void;
  companyStatusFilter: string;
  setCompanyStatusFilter: (status: string) => void;
  mappingQuery: string;
  setMappingQuery: (query: string) => void;
  mappingPlatformFilter: string;
  setMappingPlatformFilter: (platform: string) => void;
  mappingStatusFilter: string;
  setMappingStatusFilter: (status: string) => void;
  activeCompanySkus: CompanySku[];
  incompleteSkus: CompanySku[];
  isStorageReady: boolean;
};

const ErpContext = createContext<ErpStore | null>(null);

export function ErpProvider({
  children,
  normalizeCompanySku,
  normalizeMapping,
  isSkuIncomplete,
}: {
  children: ReactNode;
  normalizeCompanySku: (item: CompanySku) => CompanySku;
  normalizeMapping: (item: PlatformSkuMapping) => PlatformSkuMapping;
  isSkuIncomplete: (item: CompanySku) => boolean;
}) {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [companySkus, setCompanySkus] = useState<CompanySku[]>([]);
  const [mappings, setMappings] = useState<PlatformSkuMapping[]>([]);
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyStatusFilter, setCompanyStatusFilter] = useState("all");
  const [mappingQuery, setMappingQuery] = useState("");
  const [mappingPlatformFilter, setMappingPlatformFilter] = useState("all");
  const [mappingStatusFilter, setMappingStatusFilter] = useState("all");
  const [modal, setModal] = useState<ModalState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isStorageReady, setIsStorageReady] = useState(false);

  const activeCompanySkus = useMemo(() => companySkus.filter((item) => item.status === "active"), [companySkus]);
  const incompleteSkus = useMemo(() => companySkus.filter(isSkuIncomplete), [companySkus, isSkuIncomplete]);

  useEffect(() => {
    let cancelled = false;

    async function loadMasterData() {
      try {
        const [masterResponse, storedEvents] = await Promise.all([
          fetch("/api/master-data", { cache: "no-store" }),
          Promise.resolve(localStorage.getItem(MAINTENANCE_EVENT_STORAGE_KEY)),
        ]);

        if (!masterResponse.ok) throw new Error("Failed to load master data");

        const masterData = (await masterResponse.json()) as MasterDataResponse;
        if (cancelled) return;

        setCompanySkus(masterData.companySkus.map(normalizeCompanySku));
        setMappings(masterData.mappings.map(normalizeMapping));
        if (storedEvents) setEvents(JSON.parse(storedEvents) as MaintenanceEvent[]);
      } catch {
        if (!cancelled) {
          setCompanySkus([]);
          setMappings([]);
          localStorage.removeItem(MAINTENANCE_EVENT_STORAGE_KEY);
        }
      } finally {
        if (!cancelled) setIsStorageReady(true);
      }
    }

    loadMasterData();
    return () => {
      cancelled = true;
    };
  }, [normalizeCompanySku, normalizeMapping]);

  useEffect(() => {
    if (!isStorageReady) return;
    localStorage.setItem(MAINTENANCE_EVENT_STORAGE_KEY, JSON.stringify(events));
  }, [events, isStorageReady]);

  function pushToast(type: Toast["type"], message: string) {
    const toast = { id: `toast-${Date.now()}-${Math.random()}`, type, message };
    setToasts((current) => [toast, ...current].slice(0, 4));
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== toast.id));
    }, 2800);
  }

  function recordEvent(action: string, targetType: MaintenanceEvent["targetType"], targetCode: string, detail: string) {
    setEvents((current) => [
      {
        id: `event-${Date.now()}-${Math.random()}`,
        action,
        targetType,
        targetCode,
        detail,
        createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      },
      ...current,
    ].slice(0, 80));
  }

  const value: ErpStore = {
    page,
    setPage,
    companySkus,
    setCompanySkus,
    mappings,
    setMappings,
    events,
    recordEvent,
    toasts,
    pushToast,
    modal,
    setModal,
    confirm,
    setConfirm,
    companyQuery,
    setCompanyQuery,
    companyStatusFilter,
    setCompanyStatusFilter,
    mappingQuery,
    setMappingQuery,
    mappingPlatformFilter,
    setMappingPlatformFilter,
    mappingStatusFilter,
    setMappingStatusFilter,
    activeCompanySkus,
    incompleteSkus,
    isStorageReady,
  };

  return <ErpContext.Provider value={value}>{children}</ErpContext.Provider>;
}

export function useErpStore() {
  const context = useContext(ErpContext);
  if (!context) throw new Error("useErpStore must be used within ErpProvider");
  return context;
}
