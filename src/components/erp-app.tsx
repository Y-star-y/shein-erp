"use client";

import {
  Activity,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Layers3,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { type CSSProperties, type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import type { CompanySku, CompanySkuStatus, MaintenanceEvent, PageKey, PlatformSkuMapping, PlatformSkuMappingStatus } from "@/lib/types";

type MenuSection = {
  title: string;
  items: {
    key: PageKey;
    title: string;
    icon: typeof Package;
  }[];
};

type ModalState =
  | { type: "company"; mode: "create" | "edit"; value: CompanySku; errors: FormErrors }
  | { type: "mapping"; mode: "create" | "edit"; value: PlatformSkuMapping; errors: FormErrors }
  | null;

type ConfirmState = {
  title: string;
  description: string;
  confirmText: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
} | null;

type Toast = {
  id: string;
  type: "success" | "error" | "info";
  message: string;
};

type FormErrors = Record<string, string>;

type SelectOption = {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
};

const COMPANY_SKU_STORAGE_KEY = "bingyu-erp-company-skus-v1";
const PLATFORM_MAPPING_STORAGE_KEY = "bingyu-erp-platform-sku-mappings-v1";
const MAINTENANCE_EVENT_STORAGE_KEY = "bingyu-erp-maintenance-events-v1";

const menuSections: MenuSection[] = [
  {
    title: "运营工作台",
    items: [{ key: "dashboard", title: "运营台", icon: Layers3 }],
  },
  {
    title: "SKU 管理",
    items: [
      { key: "companySku", title: "公司SKU", icon: Package },
      { key: "platformMappings", title: "平台映射", icon: Tag },
    ],
  },
];

const platformOptions: SelectOption[] = [
  { label: "SHEIN", value: "SHEIN" },
  { label: "其他平台", value: "OTHER" },
];

const statusOptions: SelectOption[] = [
  { label: "启用", value: "active" },
  { label: "停用", value: "inactive" },
];

function nowText() {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

function createCompanySku(): CompanySku {
  const now = nowText();

  return {
    id: `company-sku-${Date.now()}`,
    platformSkc: "",
    productNameCn: "",
    status: "active",
    specification: "",
    color: "",
    model: "",
    imageUrl: "",
    supplierUrl: "",
    defaultWarningQuantity: "",
    source: "manual",
    createdAt: now,
    updatedAt: now,
  };
}

function createPlatformMapping(defaultSkc = ""): PlatformSkuMapping {
  const now = nowText();

  return {
    id: `platform-mapping-${Date.now()}`,
    platform: "SHEIN",
    platformSku: "",
    platformSkc: defaultSkc,
    sheinProductId: "",
    platformSpu: "",
    sellerSku: "",
    sheinProductName: "",
    status: "active",
    remark: "",
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeCompanySku(item: CompanySku): CompanySku {
  const now = nowText();

  return {
    ...createCompanySku(),
    ...item,
    source: "manual",
    status: item.status || "active",
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || item.createdAt || now,
  };
}

function normalizeMapping(item: PlatformSkuMapping): PlatformSkuMapping {
  const now = nowText();

  return {
    ...createPlatformMapping(),
    ...item,
    platform: item.platform || "SHEIN",
    status: item.status || "active",
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || item.createdAt || now,
  };
}

function isSkuIncomplete(item: CompanySku) {
  return item.status === "active" && [item.specification, item.color, item.model, item.imageUrl, item.supplierUrl, item.defaultWarningQuantity].some((value) => !value.trim());
}

function statusText(status: CompanySkuStatus | PlatformSkuMappingStatus) {
  return status === "active" ? "启用" : "停用";
}

function platformText(platform: string) {
  return platform === "SHEIN" ? "SHEIN" : platform || "-";
}

function includesQuery(values: string[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return values.join(" ").toLowerCase().includes(normalized);
}

export function ErpApp() {
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

  const activeTitle = menuSections.flatMap((section) => section.items).find((item) => item.key === page)?.title || "运营台";
  const activeCompanySkus = useMemo(() => companySkus.filter((item) => item.status === "active"), [companySkus]);
  const inactiveCompanySkus = useMemo(() => companySkus.filter((item) => item.status === "inactive"), [companySkus]);
  const incompleteSkus = useMemo(() => companySkus.filter(isSkuIncomplete), [companySkus]);

  useEffect(() => {
    try {
      const storedSkus = localStorage.getItem(COMPANY_SKU_STORAGE_KEY);
      const storedMappings = localStorage.getItem(PLATFORM_MAPPING_STORAGE_KEY);
      const storedEvents = localStorage.getItem(MAINTENANCE_EVENT_STORAGE_KEY);

      if (storedSkus) setCompanySkus((JSON.parse(storedSkus) as CompanySku[]).map(normalizeCompanySku));
      if (storedMappings) setMappings((JSON.parse(storedMappings) as PlatformSkuMapping[]).map(normalizeMapping));
      if (storedEvents) setEvents(JSON.parse(storedEvents) as MaintenanceEvent[]);
    } catch {
      localStorage.removeItem(COMPANY_SKU_STORAGE_KEY);
      localStorage.removeItem(PLATFORM_MAPPING_STORAGE_KEY);
      localStorage.removeItem(MAINTENANCE_EVENT_STORAGE_KEY);
    } finally {
      setIsStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isStorageReady) return;
    localStorage.setItem(COMPANY_SKU_STORAGE_KEY, JSON.stringify(companySkus));
  }, [companySkus, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady) return;
    localStorage.setItem(PLATFORM_MAPPING_STORAGE_KEY, JSON.stringify(mappings));
  }, [isStorageReady, mappings]);

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
        createdAt: nowText(),
      },
      ...current,
    ].slice(0, 80));
  }

  function openCompanyModal(mode: "create" | "edit", value?: CompanySku) {
    setModal({ type: "company", mode, value: value ? normalizeCompanySku(value) : createCompanySku(), errors: {} });
  }

  function openMappingModal(mode: "create" | "edit", value?: PlatformSkuMapping, defaultSkc = "") {
    setModal({ type: "mapping", mode, value: value ? normalizeMapping(value) : createPlatformMapping(defaultSkc), errors: {} });
  }

  function setModalErrors(errors: FormErrors) {
    setModal((current) => (current ? { ...current, errors } : current));
  }

  function validateCompanySku(value: CompanySku, mode: "create" | "edit") {
    const errors: FormErrors = {};
    const platformSkc = value.platformSkc.trim();

    if (!platformSkc) errors.platformSkc = "公司 SKU 编码不能为空";
    if (!value.productNameCn.trim()) errors.productNameCn = "产品中文名不能为空";
    if (
      platformSkc &&
      companySkus.some((item) => item.platformSkc.trim() === platformSkc && (mode === "create" || item.id !== value.id))
    ) {
      errors.platformSkc = "该公司 SKU 编码已存在";
    }

    return errors;
  }

  function validateMapping(value: PlatformSkuMapping, mode: "create" | "edit") {
    const errors: FormErrors = {};
    const platform = value.platform.trim() || "SHEIN";
    const platformSku = value.platformSku.trim();
    const platformSkc = value.platformSkc.trim();
    const targetSku = companySkus.find((item) => item.platformSkc === platformSkc);

    if (!platform) errors.platform = "平台不能为空";
    if (!platformSku) errors.platformSku = "平台 SKU 不能为空";
    if (!platformSkc) errors.platformSkc = "必须选择公司 SKU";
    if (platformSkc && !targetSku) errors.platformSkc = "关联的公司 SKU 不存在";
    if (targetSku?.status === "inactive") errors.platformSkc = "停用公司 SKU 不能新增映射";
    if (
      platform &&
      platformSku &&
      mappings.some((item) => item.platform === platform && item.platformSku.trim() === platformSku && (mode === "create" || item.id !== value.id))
    ) {
      errors.platformSku = "该平台 SKU 已存在映射";
    }

    return errors;
  }

  function saveCompanySku(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal || modal.type !== "company") return;

    const errors = validateCompanySku(modal.value, modal.mode);
    if (Object.keys(errors).length) {
      setModalErrors(errors);
      pushToast("error", "请先修正表单错误");
      return;
    }

    const now = nowText();
    const saved = {
      ...modal.value,
      platformSkc: modal.value.platformSkc.trim(),
      productNameCn: modal.value.productNameCn.trim(),
      specification: modal.value.specification.trim(),
      color: modal.value.color.trim(),
      model: modal.value.model.trim(),
      imageUrl: modal.value.imageUrl.trim(),
      supplierUrl: modal.value.supplierUrl.trim(),
      defaultWarningQuantity: modal.value.defaultWarningQuantity.trim(),
      updatedAt: now,
      createdAt: modal.mode === "create" ? now : modal.value.createdAt,
    };

    setCompanySkus((current) => (modal.mode === "create" ? [saved, ...current] : current.map((item) => (item.id === saved.id ? saved : item))));
    recordEvent(modal.mode === "create" ? "新增公司 SKU" : "编辑公司 SKU", "companySku", saved.platformSkc, saved.productNameCn);
    pushToast("success", modal.mode === "create" ? "公司 SKU 已新增" : "公司 SKU 已保存");
    setModal(null);
  }

  function saveMapping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal || modal.type !== "mapping") return;

    const errors = validateMapping(modal.value, modal.mode);
    if (Object.keys(errors).length) {
      setModalErrors(errors);
      pushToast("error", "请先修正表单错误");
      return;
    }

    const now = nowText();
    const saved = {
      ...modal.value,
      platform: modal.value.platform.trim() || "SHEIN",
      platformSku: modal.value.platformSku.trim(),
      platformSkc: modal.value.platformSkc.trim(),
      sheinProductId: modal.value.sheinProductId.trim(),
      platformSpu: modal.value.platformSpu.trim(),
      sellerSku: modal.value.sellerSku.trim(),
      sheinProductName: modal.value.sheinProductName.trim(),
      remark: modal.value.remark.trim(),
      updatedAt: now,
      createdAt: modal.mode === "create" ? now : modal.value.createdAt,
    };

    setMappings((current) => (modal.mode === "create" ? [saved, ...current] : current.map((item) => (item.id === saved.id ? saved : item))));
    recordEvent(modal.mode === "create" ? "新增平台映射" : "编辑平台映射", "platformMapping", saved.platformSku, `${saved.platform} -> ${saved.platformSkc}`);
    pushToast("success", modal.mode === "create" ? "平台映射已新增" : "平台映射已保存");
    setModal(null);
  }

  function requestCompanyStatusChange(item: CompanySku, status: CompanySkuStatus) {
    const action = status === "active" ? "启用" : "停用";
    setConfirm({
      title: `${action}公司 SKU`,
      description: `确认${action}「${item.platformSkc}」吗？${status === "inactive" ? "停用后不能被新增平台映射选择。" : ""}`,
      confirmText: action,
      tone: status === "inactive" ? "danger" : "primary",
      onConfirm: () => {
        const now = nowText();
        setCompanySkus((current) => current.map((sku) => (sku.id === item.id ? { ...sku, status, updatedAt: now } : sku)));
        recordEvent(`${action}公司 SKU`, "companySku", item.platformSkc, item.productNameCn);
        pushToast("success", `已${action}公司 SKU`);
        setConfirm(null);
      },
    });
  }

  function requestMappingStatusChange(item: PlatformSkuMapping, status: PlatformSkuMappingStatus) {
    const action = status === "active" ? "启用" : "停用";
    setConfirm({
      title: `${action}平台映射`,
      description: `确认${action}「${item.platform} / ${item.platformSku}」吗？`,
      confirmText: action,
      tone: status === "inactive" ? "danger" : "primary",
      onConfirm: () => {
        const now = nowText();
        setMappings((current) => current.map((mapping) => (mapping.id === item.id ? { ...mapping, status, updatedAt: now } : mapping)));
        recordEvent(`${action}平台映射`, "platformMapping", item.platformSku, `${item.platform} -> ${item.platformSkc}`);
        pushToast("success", `已${action}平台映射`);
        setConfirm(null);
      },
    });
  }

  function requestCompanyDelete(item: CompanySku) {
    setConfirm({
      title: "删除公司 SKU",
      description: `确认删除「${item.platformSkc}」吗？已有平台映射不会删除，但会显示关联 SKU 不可用。`,
      confirmText: "删除",
      tone: "danger",
      onConfirm: () => {
        setCompanySkus((current) => current.filter((sku) => sku.id !== item.id));
        recordEvent("删除公司 SKU", "companySku", item.platformSkc, item.productNameCn);
        pushToast("success", "公司 SKU 已删除");
        setConfirm(null);
      },
    });
  }

  function requestMappingDelete(item: PlatformSkuMapping) {
    setConfirm({
      title: "删除平台映射",
      description: `确认删除「${item.platform} / ${item.platformSku}」吗？公司 SKU 主档不会受影响。`,
      confirmText: "删除",
      tone: "danger",
      onConfirm: () => {
        setMappings((current) => current.filter((mapping) => mapping.id !== item.id));
        recordEvent("删除平台映射", "platformMapping", item.platformSku, `${item.platform} -> ${item.platformSkc}`);
        pushToast("success", "平台映射已删除");
        setConfirm(null);
      },
    });
  }

  const filteredCompanySkus = useMemo(() => {
    return companySkus.filter((item) => {
      const statusMatched = companyStatusFilter === "all" || item.status === companyStatusFilter;
      return (
        statusMatched &&
        includesQuery(
          [item.platformSkc, item.productNameCn, item.specification, item.color, item.model, item.supplierUrl],
          companyQuery
        )
      );
    });
  }, [companyQuery, companySkus, companyStatusFilter]);

  const filteredMappings = useMemo(() => {
    return mappings.filter((item) => {
      const platformMatched = mappingPlatformFilter === "all" || item.platform === mappingPlatformFilter;
      const statusMatched = mappingStatusFilter === "all" || item.status === mappingStatusFilter;
      return (
        platformMatched &&
        statusMatched &&
        includesQuery(
          [item.platform, item.platformSku, item.platformSkc, item.sellerSku, item.sheinProductId, item.platformSpu, item.sheinProductName, item.remark],
          mappingQuery
        )
      );
    });
  }, [mappingPlatformFilter, mappingQuery, mappingStatusFilter, mappings]);

  return (
    <div className="erp-shell">
      <aside className="erp-sidebar">
        <div className="brand-card">
          <div className="brand-logo">冰</div>
          <div>
            <strong>冰域 ERP</strong>
            <span>SKU 基础档案</span>
          </div>
        </div>
        <nav className="menu-sections" aria-label="冰域 ERP 菜单">
          {menuSections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              <div className="menu-list">
                {section.items.map((item) => (
                  <button className={page === item.key ? "active" : ""} key={item.key} onClick={() => setPage(item.key)}>
                    <item.icon size={17} />
                    <span>{item.title}</span>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      <main className="erp-main">
        <header className="erp-topbar">
          <div>
            <p>第一阶段</p>
            <h1>{activeTitle}</h1>
          </div>
          <div className="topbar-actions">
            <label className="search-shell">
              <Search size={16} />
              <input
                placeholder={page === "platformMappings" ? "搜索平台 SKU、公司 SKU 或备注" : "搜索公司 SKU、商品名或供应商"}
                value={page === "platformMappings" ? mappingQuery : companyQuery}
                onChange={(event) => (page === "platformMappings" ? setMappingQuery(event.target.value) : setCompanyQuery(event.target.value))}
              />
            </label>
            <button className="primary-btn" onClick={() => (page === "platformMappings" ? openMappingModal("create") : openCompanyModal("create"))}>
              <Plus size={16} />
              {page === "platformMappings" ? "新增映射" : "新增公司 SKU"}
            </button>
          </div>
        </header>

        <section className="erp-workspace">
          {page === "dashboard" && (
            <DashboardPage
              activeCompanySkus={activeCompanySkus}
              companySkus={companySkus}
              events={events}
              inactiveCompanySkus={inactiveCompanySkus}
              incompleteSkus={incompleteSkus}
              mappings={mappings}
              onCreateCompanySku={() => openCompanyModal("create")}
              onCreateMapping={() => openMappingModal("create")}
              onJump={setPage}
            />
          )}
          {page === "companySku" && (
            <CompanySkuPage
              companySkus={filteredCompanySkus}
              mappings={mappings}
              onCreate={() => openCompanyModal("create")}
              onDelete={requestCompanyDelete}
              onEdit={(item) => openCompanyModal("edit", item)}
              onStatusChange={requestCompanyStatusChange}
              query={companyQuery}
              setQuery={setCompanyQuery}
              setStatusFilter={setCompanyStatusFilter}
              statusFilter={companyStatusFilter}
              total={companySkus.length}
            />
          )}
          {page === "platformMappings" && (
            <PlatformMappingPage
              companySkus={companySkus}
              mappings={filteredMappings}
              onCreate={() => openMappingModal("create")}
              onDelete={requestMappingDelete}
              onEdit={(item) => openMappingModal("edit", item)}
              onStatusChange={requestMappingStatusChange}
              platformFilter={mappingPlatformFilter}
              query={mappingQuery}
              setPlatformFilter={setMappingPlatformFilter}
              setQuery={setMappingQuery}
              setStatusFilter={setMappingStatusFilter}
              statusFilter={mappingStatusFilter}
              total={mappings.length}
            />
          )}
        </section>
      </main>

      {modal?.type === "company" && (
        <AppModal title={modal.mode === "create" ? "新增公司 SKU" : "编辑公司 SKU"} onClose={() => setModal(null)}>
          <CompanySkuForm
            errors={modal.errors}
            mode={modal.mode}
            onChange={(value) => setModal({ ...modal, value, errors: { ...modal.errors, form: "" } })}
            onSubmit={saveCompanySku}
            value={modal.value}
          />
        </AppModal>
      )}
      {modal?.type === "mapping" && (
        <AppModal title={modal.mode === "create" ? "新增平台 SKU 映射" : "编辑平台 SKU 映射"} onClose={() => setModal(null)}>
          <MappingForm
            activeCompanySkus={activeCompanySkus}
            companySkus={companySkus}
            errors={modal.errors}
            mode={modal.mode}
            onChange={(value) => setModal({ ...modal, value, errors: { ...modal.errors, form: "" } })}
            onSubmit={saveMapping}
            value={modal.value}
          />
        </AppModal>
      )}
      <ConfirmModal confirm={confirm} onCancel={() => setConfirm(null)} />
      <ToastHost toasts={toasts} />
    </div>
  );
}

function DashboardPage({
  activeCompanySkus,
  companySkus,
  events,
  inactiveCompanySkus,
  incompleteSkus,
  mappings,
  onCreateCompanySku,
  onCreateMapping,
  onJump,
}: {
  activeCompanySkus: CompanySku[];
  companySkus: CompanySku[];
  events: MaintenanceEvent[];
  inactiveCompanySkus: CompanySku[];
  incompleteSkus: CompanySku[];
  mappings: PlatformSkuMapping[];
  onCreateCompanySku: () => void;
  onCreateMapping: () => void;
  onJump: (page: PageKey) => void;
}) {
  const cards = [
    { label: "公司 SKU 总数", value: companySkus.length, icon: Package, tone: "blue" },
    { label: "启用 SKU", value: activeCompanySkus.length, icon: ShieldCheck, tone: "green" },
    { label: "停用 SKU", value: inactiveCompanySkus.length, icon: AlertCircle, tone: "orange" },
    { label: "待完善资料", value: incompleteSkus.length, icon: Clock3, tone: "amber" },
    { label: "平台映射数", value: mappings.length, icon: Tag, tone: "violet" },
    { label: "待处理订单", value: 0, icon: Activity, tone: "slate" },
  ];

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">运营工作台</span>
          <h2>先把 SKU 地基搭稳</h2>
          <p>第一阶段只维护公司 SKU 和平台 SKU 映射。订单、物流、采购、财务先不接入，避免系统一开始就变重。</p>
        </div>
        <div className="hero-actions">
          <button className="primary-btn" onClick={onCreateCompanySku}>
            <Plus size={16} />
            新增公司 SKU
          </button>
          <button className="secondary-btn" onClick={onCreateMapping}>
            <Tag size={16} />
            新增平台映射
          </button>
        </div>
      </section>

      <section className="metric-grid">
        {cards.map((card) => (
          <article className="metric-card" key={card.label}>
            <div className={`metric-icon ${card.tone}`}>
              <card.icon size={18} />
            </div>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <Panel title="待完善 SKU" count={incompleteSkus.length} action={<button onClick={() => onJump("companySku")}>查看公司 SKU</button>}>
          <div className="mini-list">
            {incompleteSkus.slice(0, 8).map((item) => (
              <button className="mini-row" key={item.id} onClick={() => onJump("companySku")}>
                <span>
                  <strong>{item.platformSkc}</strong>
                  <em>{item.productNameCn}</em>
                </span>
                <StatusTag value="待完善" tone="warning" />
              </button>
            ))}
            {!incompleteSkus.length && <EmptyBlock icon={<Package size={22} />} title="暂无待完善 SKU" text="启用 SKU 的建议字段都已补齐。" />}
          </div>
        </Panel>

        <Panel title="最近维护记录" count={events.length}>
          <div className="event-list">
            {events.slice(0, 10).map((event) => (
              <div className="event-row" key={event.id}>
                <span>{event.action}</span>
                <strong>{event.targetCode}</strong>
                <em>{event.createdAt}</em>
              </div>
            ))}
            {!events.length && <EmptyBlock icon={<Clock3 size={22} />} title="暂无维护记录" text="新增或编辑 SKU 后会显示在这里。" />}
          </div>
        </Panel>
      </section>

      <section className="shortcut-grid">
        <button onClick={onCreateCompanySku}>
          <Package size={18} />
          新增公司 SKU
        </button>
        <button onClick={onCreateMapping}>
          <Tag size={18} />
          新增平台 SKU 映射
        </button>
        <button onClick={() => onJump("platformMappings")}>
          <RefreshCw size={18} />
          查看映射表
        </button>
      </section>
    </div>
  );
}

function CompanySkuPage({
  companySkus,
  mappings,
  onCreate,
  onDelete,
  onEdit,
  onStatusChange,
  query,
  setQuery,
  setStatusFilter,
  statusFilter,
  total,
}: {
  companySkus: CompanySku[];
  mappings: PlatformSkuMapping[];
  onCreate: () => void;
  onDelete: (item: CompanySku) => void;
  onEdit: (item: CompanySku) => void;
  onStatusChange: (item: CompanySku, status: CompanySkuStatus) => void;
  query: string;
  setQuery: (query: string) => void;
  setStatusFilter: (status: string) => void;
  statusFilter: string;
  total: number;
}) {
  const tableStyle = { "--table-min-width": "1320px" } as CSSProperties;

  return (
    <div className="page-stack">
      <PageHeader
        action={
          <button className="primary-btn" onClick={onCreate}>
            <Plus size={16} />
            新增公司 SKU
          </button>
        }
        description="只展示第一版核心字段，报关、物流、采购等扩展信息后续再接入。"
        title="公司 SKU"
      />

      <section className="table-panel">
        <div className="table-toolbar">
          <label className="table-search">
            <Search size={15} />
            <input placeholder="搜索公司 SKU、产品名、规格或供应商" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <AppSelect
            onChange={setStatusFilter}
            options={[{ label: "全部状态", value: "all" }, ...statusOptions]}
            value={statusFilter}
            width={128}
          />
          <span className="count-pill">{companySkus.length}/{total}</span>
        </div>
        <div className="table-scroll">
          <table className="data-table" style={tableStyle}>
            <thead>
              <tr>
                {["公司SKU", "产品中文名", "规格", "颜色", "型号", "图片", "供应商", "预警线", "映射数", "来源", "状态", "更新时间", "操作"].map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companySkus.length ? (
                companySkus.map((item) => {
                  const mappingCount = mappings.filter((mapping) => mapping.platformSkc === item.platformSkc).length;

                  return (
                    <tr key={item.id}>
                      <td title={item.platformSkc}><strong>{item.platformSkc}</strong></td>
                      <td title={item.productNameCn}>{item.productNameCn}</td>
                      <td title={item.specification}>{item.specification || "-"}</td>
                      <td>{item.color || "-"}</td>
                      <td>{item.model || "-"}</td>
                      <td title={item.imageUrl}>{item.imageUrl ? "已填写" : "-"}</td>
                      <td title={item.supplierUrl}>{item.supplierUrl || "-"}</td>
                      <td>{item.defaultWarningQuantity || "-"}</td>
                      <td>{mappingCount}</td>
                      <td>manual</td>
                      <td><StatusTag value={statusText(item.status)} tone={item.status === "active" ? "success" : "neutral"} /></td>
                      <td>{item.updatedAt}</td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-text-btn edit" onClick={() => onEdit(item)}><Pencil size={14} />编辑</button>
                          <button className="icon-text-btn" onClick={() => onStatusChange(item, item.status === "active" ? "inactive" : "active")}>
                            {item.status === "active" ? "停用" : "启用"}
                          </button>
                          <button className="icon-text-btn danger" onClick={() => onDelete(item)}><Trash2 size={14} />删除</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <EmptyTableRow colSpan={13} title="暂无公司 SKU" text="点击右上角新增公司 SKU。" />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PlatformMappingPage({
  companySkus,
  mappings,
  onCreate,
  onDelete,
  onEdit,
  onStatusChange,
  platformFilter,
  query,
  setPlatformFilter,
  setQuery,
  setStatusFilter,
  statusFilter,
  total,
}: {
  companySkus: CompanySku[];
  mappings: PlatformSkuMapping[];
  onCreate: () => void;
  onDelete: (item: PlatformSkuMapping) => void;
  onEdit: (item: PlatformSkuMapping) => void;
  onStatusChange: (item: PlatformSkuMapping, status: PlatformSkuMappingStatus) => void;
  platformFilter: string;
  query: string;
  setPlatformFilter: (platform: string) => void;
  setQuery: (query: string) => void;
  setStatusFilter: (status: string) => void;
  statusFilter: string;
  total: number;
}) {
  const tableStyle = { "--table-min-width": "1260px" } as CSSProperties;

  function companySkuState(platformSkc: string) {
    const sku = companySkus.find((item) => item.platformSkc === platformSkc);
    if (!sku) return <StatusTag value="SKU不存在" tone="danger" />;
    if (sku.status === "inactive") return <StatusTag value="SKU停用" tone="warning" />;
    return <StatusTag value="可用" tone="success" />;
  }

  return (
    <div className="page-stack">
      <PageHeader
        action={
          <button className="primary-btn" onClick={onCreate}>
            <Plus size={16} />
            新增映射
          </button>
        }
        description="维护 SHEIN 平台 SKU、seller SKU、商品 ID 和公司 SKU 的绑定关系。"
        title="平台 SKU 映射"
      />

      <section className="table-panel">
        <div className="table-toolbar">
          <label className="table-search">
            <Search size={15} />
            <input placeholder="搜索平台 SKU、公司 SKU、seller SKU 或商品名" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <AppSelect
            onChange={setPlatformFilter}
            options={[{ label: "全部平台", value: "all" }, ...platformOptions]}
            value={platformFilter}
            width={128}
          />
          <AppSelect
            onChange={setStatusFilter}
            options={[{ label: "全部状态", value: "all" }, ...statusOptions]}
            value={statusFilter}
            width={128}
          />
          <span className="count-pill">{mappings.length}/{total}</span>
        </div>
        <div className="table-scroll">
          <table className="data-table" style={tableStyle}>
            <thead>
              <tr>
                {["平台", "平台SKU", "公司SKU", "SKU状态", "SHEIN商品ID", "平台SPU", "seller SKU", "平台商品名", "映射状态", "备注", "更新时间", "操作"].map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mappings.length ? (
                mappings.map((item) => (
                  <tr key={item.id}>
                    <td>{platformText(item.platform)}</td>
                    <td title={item.platformSku}><strong>{item.platformSku}</strong></td>
                    <td title={item.platformSkc}>{item.platformSkc}</td>
                    <td>{companySkuState(item.platformSkc)}</td>
                    <td title={item.sheinProductId}>{item.sheinProductId || "-"}</td>
                    <td title={item.platformSpu}>{item.platformSpu || "-"}</td>
                    <td title={item.sellerSku}>{item.sellerSku || "-"}</td>
                    <td title={item.sheinProductName}>{item.sheinProductName || "-"}</td>
                    <td><StatusTag value={statusText(item.status)} tone={item.status === "active" ? "success" : "neutral"} /></td>
                    <td title={item.remark}>{item.remark || "-"}</td>
                    <td>{item.updatedAt}</td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-text-btn edit" onClick={() => onEdit(item)}><Pencil size={14} />编辑</button>
                        <button className="icon-text-btn" onClick={() => onStatusChange(item, item.status === "active" ? "inactive" : "active")}>
                          {item.status === "active" ? "停用" : "启用"}
                        </button>
                        <button className="icon-text-btn danger" onClick={() => onDelete(item)}><Trash2 size={14} />删除</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyTableRow colSpan={12} title="暂无平台映射" text="点击右上角新增平台 SKU 映射。" />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CompanySkuForm({
  errors,
  mode,
  onChange,
  onSubmit,
  value,
}: {
  errors: FormErrors;
  mode: "create" | "edit";
  onChange: (value: CompanySku) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  value: CompanySku;
}) {
  function setField<K extends keyof CompanySku>(field: K, fieldValue: CompanySku[K]) {
    onChange({ ...value, [field]: fieldValue });
  }

  return (
    <form className="modal-form" noValidate onSubmit={onSubmit}>
      <FormSection title="基础信息">
        <TextField error={errors.platformSkc} label="公司 SKU / platform_skc" required value={value.platformSkc} onChange={(fieldValue) => setField("platformSkc", fieldValue)} />
        <TextField error={errors.productNameCn} label="产品中文名" required value={value.productNameCn} onChange={(fieldValue) => setField("productNameCn", fieldValue)} />
        <AppSelect
          error={errors.status}
          label="商品状态"
          onChange={(fieldValue) => setField("status", fieldValue as CompanySkuStatus)}
          options={statusOptions}
          value={value.status}
        />
      </FormSection>
      <FormSection title="规格信息">
        <TextField label="规格" value={value.specification} onChange={(fieldValue) => setField("specification", fieldValue)} />
        <TextField label="颜色" value={value.color} onChange={(fieldValue) => setField("color", fieldValue)} />
        <TextField label="规格型号" value={value.model} onChange={(fieldValue) => setField("model", fieldValue)} />
      </FormSection>
      <FormSection title="图片 / 供应商">
        <TextField label="图片 URL" value={value.imageUrl} onChange={(fieldValue) => setField("imageUrl", fieldValue)} />
        <TextField label="供应商链接" value={value.supplierUrl} onChange={(fieldValue) => setField("supplierUrl", fieldValue)} />
        <TextField label="默认库存预警线" value={value.defaultWarningQuantity} onChange={(fieldValue) => setField("defaultWarningQuantity", fieldValue)} />
      </FormSection>
      <div className="modal-actions">
        <span>{mode === "create" ? "创建后会记录到最近维护记录。" : `创建时间：${value.createdAt}`}</span>
        <button className="primary-btn" type="submit">保存</button>
      </div>
    </form>
  );
}

function MappingForm({
  activeCompanySkus,
  companySkus,
  errors,
  mode,
  onChange,
  onSubmit,
  value,
}: {
  activeCompanySkus: CompanySku[];
  companySkus: CompanySku[];
  errors: FormErrors;
  mode: "create" | "edit";
  onChange: (value: PlatformSkuMapping) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  value: PlatformSkuMapping;
}) {
  const selectedCompanySku = companySkus.find((item) => item.platformSkc === value.platformSkc);
  const companyOptions: SelectOption[] = activeCompanySkus.map((item) => ({
    label: `${item.platformSkc} · ${item.productNameCn}`,
    value: item.platformSkc,
    description: item.supplierUrl || item.color || undefined,
  }));

  if (mode === "edit" && selectedCompanySku && selectedCompanySku.status === "inactive") {
    companyOptions.unshift({
      label: `${selectedCompanySku.platformSkc} · ${selectedCompanySku.productNameCn}（已停用）`,
      value: selectedCompanySku.platformSkc,
      description: "已有映射保留，但不建议继续使用",
      disabled: true,
    });
  }

  function setField<K extends keyof PlatformSkuMapping>(field: K, fieldValue: PlatformSkuMapping[K]) {
    onChange({ ...value, [field]: fieldValue });
  }

  return (
    <form className="modal-form" noValidate onSubmit={onSubmit}>
      <FormSection title="平台信息">
        <AppSelect
          error={errors.platform}
          label="平台"
          onChange={(fieldValue) => setField("platform", fieldValue)}
          options={platformOptions}
          value={value.platform}
        />
        <TextField error={errors.platformSku} label="平台 SKU" required value={value.platformSku} onChange={(fieldValue) => setField("platformSku", fieldValue)} />
        <AppSelect
          error={errors.platformSkc}
          label="关联公司 SKU"
          onChange={(fieldValue) => setField("platformSkc", fieldValue)}
          options={companyOptions}
          placeholder="选择启用的公司 SKU"
          value={value.platformSkc}
        />
      </FormSection>
      <FormSection title="SHEIN 字段">
        <TextField label="SHEIN 商品 ID" value={value.sheinProductId} onChange={(fieldValue) => setField("sheinProductId", fieldValue)} />
        <TextField label="平台 SPU" value={value.platformSpu} onChange={(fieldValue) => setField("platformSpu", fieldValue)} />
        <TextField label="seller SKU" value={value.sellerSku} onChange={(fieldValue) => setField("sellerSku", fieldValue)} />
        <TextField label="SHEIN 商品名" value={value.sheinProductName} onChange={(fieldValue) => setField("sheinProductName", fieldValue)} />
      </FormSection>
      <FormSection title="状态 / 备注">
        <AppSelect
          error={errors.status}
          label="映射状态"
          onChange={(fieldValue) => setField("status", fieldValue as PlatformSkuMappingStatus)}
          options={statusOptions}
          value={value.status}
        />
        <TextField label="备注" multiline value={value.remark} onChange={(fieldValue) => setField("remark", fieldValue)} />
      </FormSection>
      <div className="modal-actions">
        <span>{mode === "create" ? "一个平台 SKU 只能绑定一个公司 SKU。" : `创建时间：${value.createdAt}`}</span>
        <button className="primary-btn" type="submit">保存</button>
      </div>
    </form>
  );
}

function PageHeader({ action, description, title }: { action: ReactNode; description: string; title: string }) {
  return (
    <section className="page-header">
      <div>
        <span className="eyebrow">SKU 管理</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </section>
  );
}

function Panel({ action, children, count, title }: { action?: ReactNode; children: ReactNode; count?: number; title: string }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          {typeof count === "number" && <span>{count} 条</span>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function FormSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="form-section">
      <h4>{title}</h4>
      <div className="form-grid">{children}</div>
    </section>
  );
}

function TextField({
  error,
  label,
  multiline,
  onChange,
  required,
  value,
}: {
  error?: string;
  label: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <label className={`field ${error ? "has-error" : ""}`}>
      <span>
        {label}
        {required && <b>*</b>}
      </span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
      {error && <em>{error}</em>}
    </label>
  );
}

function AppSelect({
  error,
  label,
  onChange,
  options,
  placeholder = "请选择",
  value,
  width,
}: {
  error?: string;
  label?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  value: string;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <div className={`select-field ${error ? "has-error" : ""}`} style={width ? { width } : undefined}>
      {label && <span>{label}</span>}
      <button type="button" className={open ? "open" : ""} onClick={() => setOpen((current) => !current)}>
        <strong>{selected?.label || placeholder}</strong>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="select-popover">
          {options.map((option) => (
            <button
              className={option.value === value ? "selected" : ""}
              disabled={option.disabled}
              key={option.value}
              type="button"
              onClick={() => {
                if (option.disabled) return;
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>
                <b>{option.label}</b>
                {option.description && <em>{option.description}</em>}
              </span>
              {option.value === value && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
      {error && <em>{error}</em>}
    </div>
  );
}

function AppModal({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="modal-mask" onMouseDown={onClose}>
      <section className="app-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>冰域 ERP</span>
            <h3>{title}</h3>
          </div>
          <button aria-label="关闭弹窗" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function ConfirmModal({ confirm, onCancel }: { confirm: ConfirmState; onCancel: () => void }) {
  if (!confirm) return null;

  return (
    <div className="modal-mask">
      <section className="confirm-modal">
        <div className={`confirm-icon ${confirm.tone === "danger" ? "danger" : "primary"}`}>
          <AlertCircle size={22} />
        </div>
        <h3>{confirm.title}</h3>
        <p>{confirm.description}</p>
        <div>
          <button type="button" onClick={onCancel}>取消</button>
          <button className={confirm.tone === "danger" ? "danger-btn" : "primary-btn"} type="button" onClick={confirm.onConfirm}>
            {confirm.confirmText}
          </button>
        </div>
      </section>
    </div>
  );
}

function ToastHost({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-host">
      {toasts.map((toast) => (
        <div className={`toast ${toast.type}`} key={toast.id}>
          {toast.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

function StatusTag({ tone, value }: { tone: "success" | "warning" | "danger" | "neutral"; value: string }) {
  return <span className={`status-tag ${tone}`}>{value}</span>;
}

function EmptyTableRow({ colSpan, text, title }: { colSpan: number; text: string; title: string }) {
  return (
    <tr>
      <td className="empty-table-cell" colSpan={colSpan}>
        <EmptyBlock icon={<Package size={22} />} text={text} title={title} />
      </td>
    </tr>
  );
}

function EmptyBlock({ icon, text, title }: { icon: ReactNode; text: string; title: string }) {
  return (
    <div className="empty-block">
      {icon}
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}
