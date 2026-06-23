"use client";

import {
  AlertTriangle,
  BarChart3,
  Boxes,
  ChevronRight,
  ClipboardList,
  Download,
  FileSpreadsheet,
  LayoutDashboard,
  PackageCheck,
  PackagePlus,
  RefreshCw,
  Search,
  Settings,
  Ship,
  ShoppingBag,
  TrendingUp,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { availableStock, inTransit, matchOrder, orderKey, suggestedQuantity } from "@/lib/business";
import { demoState } from "@/lib/demo-data";
import { exportRows, parseSheinExcel } from "@/lib/excel";
import type { ErpState, PageKey, Purchase, Sku } from "@/lib/types";

const nav: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "管理看板", icon: LayoutDashboard },
  { key: "products", label: "01 SKU映射", icon: ShoppingBag },
  { key: "orders", label: "02 SHEIN订单", icon: FileSpreadsheet },
  { key: "shipments", label: "03 仓库发货表", icon: Ship },
  { key: "purchases", label: "04 备货采购", icon: PackagePlus },
  { key: "inventory", label: "05 库存出入库", icon: Boxes },
  { key: "replenishment", label: "07 库存总览", icon: TrendingUp },
  { key: "exceptions", label: "09 异常检查", icon: AlertTriangle },
];

const uid = () => Math.random().toString(36).slice(2, 10);
const storageKey = "icefield-erp-v2";

function normalizeState(value: ErpState): ErpState {
  return {
    ...demoState,
    ...value,
    skus: (value.skus || demoState.skus).map((rawSku) => {
      const sku = rawSku as Partial<Sku>;
      return {
        ...rawSku,
        sellerCode: sku.sellerCode || "",
        shippingName: sku.shippingName || sku.name || sku.code || "",
        shippingMethod: sku.shippingMethod || "",
        imageUrl: sku.imageUrl || "",
        supplier: sku.supplier || "",
        purchaseLink: sku.purchaseLink || "",
        reorderPoint: sku.reorderPoint || sku.safetyStock || 0,
        targetStock: sku.targetStock || sku.safetyStock || 0,
        confirmStatus: sku.confirmStatus || "已确认",
        owner: sku.owner || "",
      };
    }),
    shipmentDrafts: value.shipmentDrafts || [],
  };
}

export function ErpApp() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [state, setState] = useState<ErpState>(demoState);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey) || localStorage.getItem("shein-lite-erp-v1");
    if (saved) setState(normalizeState(JSON.parse(saved)));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(storageKey, JSON.stringify(normalizeState(state)));
  }, [ready, state]);

  function notify(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 2600);
  }

  async function importOrders(file?: File) {
    if (!file) return;
    try {
      const parsed = await parseSheinExcel(file);
      let duplicates = 0;
      let exceptions = 0;
      setState((current) => {
        const known = new Set(current.orders.map(orderKey));
        const incoming = parsed.flatMap((item) => {
          const matched = matchOrder(item, current.skus);
          if (known.has(orderKey(matched))) {
            duplicates++;
            return [];
          }
          known.add(orderKey(matched));
          if (matched.status === "异常") exceptions++;
          return matched;
        });
        return {
          ...current,
          orders: [...incoming, ...current.orders],
          audits: [
            {
              id: uid(),
              date: new Date().toLocaleString(),
              action: "导入订单",
              detail: `${file.name}：新增 ${incoming.length}，重复 ${duplicates}，异常 ${exceptions}`,
            },
            ...current.audits,
          ],
        };
      });
      notify(`导入完成：重复 ${duplicates} 条，异常 ${exceptions} 条`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "导入失败");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const content = {
    dashboard: <Dashboard state={state} go={setPage} />,
    products: <Products state={state} setState={setState} query={query} notify={notify} />,
    orders: (
      <Orders
        state={state}
        setState={setState}
        query={query}
        importClick={() => fileRef.current?.click()}
        notify={notify}
      />
    ),
    shipments: <Shipments state={state} setState={setState} notify={notify} />,
    inventory: <Inventory state={state} setState={setState} query={query} notify={notify} />,
    replenishment: <Replenishment state={state} setState={setState} notify={notify} />,
    purchases: <Purchases state={state} setState={setState} notify={notify} />,
    exceptions: <Exceptions state={state} setState={setState} notify={notify} />,
  }[page];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">冰</div>
          <div>
            <strong>冰域 ERP</strong>
            <span>跨境运营工作台</span>
          </div>
        </div>
        <nav className="top-nav">
          {nav.map((item) => (
            <button key={item.key} className={page === item.key ? "active" : ""} onClick={() => setPage(item.key)}>
              <item.icon size={19} />
              {item.label}
              {item.key === "exceptions" && state.orders.some((o) => o.status === "异常") && <i />}
            </button>
          ))}
        </nav>
        <div className="top-user">
          <div className="user-avatar">闫</div>
          <div><strong>闫星宇</strong><span>管理员</span></div>
          <Settings size={18} />
        </div>
      </header>

      <main>
        <section className="page-head">
          <div>
            <h1>{nav.find((item) => item.key === page)?.label}</h1>
            <p>数据更新于 {new Date().toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <div className="header-actions">
            <label className="search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索 SKU / 订单号" /></label>
            <button className="icon-button" onClick={() => location.reload()}><RefreshCw size={18} /></button>
            <button className="primary" onClick={() => fileRef.current?.click()}><Upload size={17} />导入订单</button>
            <input ref={fileRef} hidden type="file" accept=".xlsx,.xls" onChange={(e) => importOrders(e.target.files?.[0])} />
          </div>
        </section>
        <section className="content">{content}</section>
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Dashboard({ state, go }: { state: ErpState; go: (page: PageKey) => void }) {
  const pending = state.orders.filter((o) => o.status === "待发货");
  const exceptions = state.orders.filter((o) => o.status === "异常");
  const negative = state.stocks.filter((s) => s.quantity < 0);
  const suggestions = state.skus.filter((sku) => suggestedQuantity(state, sku) > 0);
  const cards = [
    ["今日订单", state.orders.length, "较昨日 +12.5%", "blue", ClipboardList],
    ["待发货", pending.reduce((n, o) => n + o.quantity, 0), "需在截止时间前处理", "orange", Ship],
    ["库存预警", negative.length + suggestions.length, `${negative.length} 个负库存`, "red", AlertTriangle],
    ["采购在途", state.purchases.reduce((n, p) => n + Math.max(0, p.quantity - p.receivedQty), 0), `${state.purchases.length} 张采购单`, "green", PackagePlus],
  ] as const;
  return (
    <>
      <div className="welcome">
        <div><span>运营总览</span><h2>早上好，闫星宇</h2><p>今天有 {pending.length} 个订单待发，{exceptions.length + suggestions.length} 项异常需要关注。</p></div>
        <button onClick={() => go("exceptions")}>查看待办 <ChevronRight size={16} /></button>
      </div>
      <div className="metric-grid">
        {cards.map(([label, value, note, color, Icon]) => (
          <article className="metric-card" key={label}>
            <div className={`metric-icon ${color}`}><Icon size={21} /></div>
            <span>{label}</span><strong>{value}</strong><small>{note}</small>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <Panel title="订单履约" action="查看订单" onAction={() => go("orders")}>
          <div className="fulfillment">
            <div className="donut" style={{ "--p": `${state.orders.length ? state.orders.filter((o) => o.status === "已发货").length / state.orders.length * 100 : 0}%` } as React.CSSProperties}><span>{state.orders.filter((o) => o.status === "已发货").length}<small>已发货</small></span></div>
            <div className="legend">
              <p><i className="dot blue" />订单总数 <b>{state.orders.length}</b></p>
              <p><i className="dot orange" />待发货 <b>{pending.length}</b></p>
              <p><i className="dot red" />异常订单 <b>{exceptions.length}</b></p>
            </div>
          </div>
        </Panel>
        <Panel title="库存健康" action="库存明细" onAction={() => go("inventory")}>
          <div className="health-list">
            {state.skus.slice(0, 4).map((sku) => {
              const stock = availableStock(state, sku.code);
              const percent = Math.min(100, Math.max(4, stock / Math.max(1, sku.safetyStock) * 100));
              return <div key={sku.id}><p><span>{sku.code}</span><b className={stock < 0 ? "danger-text" : ""}>{stock} 可用</b></p><div className="bar"><i style={{ width: `${percent}%` }} /></div></div>;
            })}
          </div>
        </Panel>
        <Panel title="待办事项" action="全部异常" onAction={() => go("exceptions")}>
          <div className="todo-list">
            <Todo color="red" title={`${exceptions.length} 个 SKU 映射异常`} note="需要人工关联统一 SKU" onClick={() => go("exceptions")} />
            <Todo color="orange" title={`${suggestions.length} 个 SKU 建议补货`} note="库存低于需求覆盖量" onClick={() => go("replenishment")} />
            <Todo color="blue" title={`${pending.length} 个订单待生成发货单`} note="请仓库人员及时处理" onClick={() => go("shipments")} />
          </div>
        </Panel>
        <Panel title="备货采购" action="采购管理" onAction={() => go("purchases")}>
          <div className="purchase-summary">
            <strong>{state.purchases.reduce((n, p) => n + p.quantity * p.unitPrice, 0).toLocaleString()}<small>采购金额 (CNY)</small></strong>
            {state.purchases.slice(0, 3).map((p) => <p key={p.id}><span>{p.purchaseNo}</span><b>{p.status}</b></p>)}
          </div>
        </Panel>
      </div>
    </>
  );
}

function Products({ state, setState, query = "", notify }: ModuleProps) {
  const [editing, setEditing] = useState<Sku | null>(null);
  const rows = state.skus.filter((s) => `${s.code}${s.sellerSku}${s.name}${s.sellerCode}`.toLowerCase().includes(query.toLowerCase()));
  function save(form: FormData) {
    const sku: Sku = {
      id: editing?.id || uid(), code: String(form.get("code")), sellerSku: String(form.get("sellerSku")),
      platformSku: String(form.get("platformSku") || ""), platformSkc: editing?.platformSkc || "", platformSpu: editing?.platformSpu || "",
      name: String(form.get("name")), spec: String(form.get("spec") || ""),
      sellerCode: String(form.get("sellerCode") || ""), shippingName: String(form.get("shippingName") || ""),
      shippingMethod: String(form.get("shippingMethod") || ""), imageUrl: String(form.get("imageUrl") || ""),
      supplier: String(form.get("supplier") || ""), purchaseLink: String(form.get("purchaseLink") || ""),
      purchasePrice: Number(form.get("purchasePrice") || 0), leadTimeDays: Number(form.get("leadTimeDays") || 15),
      safetyDays: editing?.safetyDays || 7, safetyStock: Number(form.get("safetyStock") || 0),
      reorderPoint: Number(form.get("reorderPoint") || 0), targetStock: Number(form.get("targetStock") || 0),
      confirmStatus: String(form.get("confirmStatus") || "已确认"), owner: String(form.get("owner") || ""),
    };
    setState((s) => ({ ...s, skus: editing ? s.skus.map((x) => x.id === editing.id ? sku : x) : [sku, ...s.skus] }));
    setEditing(null); notify("SKU 已保存");
  }
  return (
    <Panel title={`01 SKU 映射（${rows.length}）`} action="导出 Excel" onAction={() => exportRows("01_SKU映射.xlsx", "SKU映射", state.skus)}>
      <div className="table-toolbar"><button className="primary" onClick={() => setEditing({} as Sku)}><PackagePlus size={16} />新增 SKU</button><span>按 Excel 补充发货品名、发货方式、图片、供应商和补货参数</span></div>
      <DataTable headers={["统一SKU", "卖家SKU", "平台SKU", "商品名称", "规格", "卖家代码/货号", "发货品名", "发货方式", "商品图片", "供应商", "采购链接", "采购价", "交期", "补货点", "目标库存", "期初库存", "确认状态", "负责人", "操作"]}>
        {rows.map((sku) => {
          const initial = state.stocks.find((stock) => stock.skuCode === sku.code)?.quantity || 0;
          return <tr key={sku.id}><td><b>{sku.code}</b></td><td>{sku.sellerSku}</td><td>{sku.platformSku}</td><td className="wide">{sku.name}</td><td>{sku.spec}</td><td>{sku.sellerCode || "-"}</td><td>{sku.shippingName || "-"}</td><td>{sku.shippingMethod || "-"}</td><td>{sku.imageUrl ? <a className="link" href={sku.imageUrl} target="_blank">查看</a> : "-"}</td><td>{sku.supplier || "-"}</td><td>{sku.purchaseLink ? <a className="link" href={sku.purchaseLink} target="_blank">链接</a> : "-"}</td><td>{sku.purchasePrice || "-"}</td><td>{sku.leadTimeDays} 天</td><td>{sku.reorderPoint}</td><td>{sku.targetStock}</td><td>{initial}</td><td><Status value={sku.confirmStatus || "未确认"} /></td><td>{sku.owner || "-"}</td><td><button className="link" onClick={() => setEditing(sku)}>编辑</button></td></tr>;
        })}
      </DataTable>
      {editing && <Modal title={editing.id ? "编辑 SKU" : "新增 SKU"} close={() => setEditing(null)}><form action={save} className="form-grid">
        <Field label="统一 SKU" name="code" value={editing.code} required /><Field label="卖家 SKU" name="sellerSku" value={editing.sellerSku} required />
        <Field label="平台 SKU" name="platformSku" value={editing.platformSku} /><Field label="商品名称" name="name" value={editing.name} required />
        <Field label="规格" name="spec" value={editing.spec} /><Field label="卖家代码/货号" name="sellerCode" value={editing.sellerCode} />
        <Field label="发货品名" name="shippingName" value={editing.shippingName} /><Field label="发货方式" name="shippingMethod" value={editing.shippingMethod} />
        <Field label="商品图片" name="imageUrl" value={editing.imageUrl} /><Field label="供应商" name="supplier" value={editing.supplier} />
        <Field label="采购链接" name="purchaseLink" value={editing.purchaseLink} />
        <Field label="采购价" name="purchasePrice" type="number" value={editing.purchasePrice} /><Field label="采购交期（天）" name="leadTimeDays" type="number" value={editing.leadTimeDays || 15} />
        <Field label="安全库存" name="safetyStock" type="number" value={editing.safetyStock} /><Field label="补货点" name="reorderPoint" type="number" value={editing.reorderPoint} />
        <Field label="目标库存" name="targetStock" type="number" value={editing.targetStock} /><Field label="确认状态" name="confirmStatus" value={editing.confirmStatus || "已确认"} />
        <Field label="负责人" name="owner" value={editing.owner} />
        <div className="form-actions"><button type="button" onClick={() => setEditing(null)}>取消</button><button className="primary">保存</button></div>
      </form></Modal>}
    </Panel>
  );
}

function Orders({ state, setState, query = "", importClick }: ModuleProps & { importClick: () => void }) {
  const rows = state.orders.filter((o) => `${o.orderNo}${o.sellerSku}${o.productName}`.toLowerCase().includes(query.toLowerCase()));
  return <Panel title={`订单明细（${rows.length}）`} action="导出 Excel" onAction={() => exportRows("SHEIN订单.xlsx", "订单", state.orders)}>
    <div className="table-toolbar"><button className="primary" onClick={importClick}><Upload size={16} />上传 SHEIN Excel</button><span>自动去重并匹配卖家 SKU</span></div>
    <DataTable headers={["订单号", "创建时间", "要求发货", "卖家 SKU", "统一 SKU", "商品", "数量", "仓库", "状态"]}>
      {rows.map((o) => <tr key={o.id}><td><b>{o.orderNo}</b></td><td>{o.createdAt}</td><td>{o.shipBy}</td><td>{o.sellerSku}</td><td>{o.skuCode || <span className="danger-text">未匹配</span>}</td><td className="wide">{o.productName}</td><td>{o.quantity}</td><td><select value={o.warehouse} onChange={(e) => setState((s) => ({ ...s, orders: s.orders.map((x) => x.id === o.id ? { ...x, warehouse: e.target.value } : x) }))}>{state.warehouses.map((w) => <option key={w}>{w}</option>)}</select></td><td><Status value={o.status} /></td></tr>)}
    </DataTable>
  </Panel>;
}

function Shipments({ state, setState, notify }: ModuleProps) {
  const rows = state.orders.filter((o) => o.skuCode);
  function draftFor(orderId: string) {
    return state.shipmentDrafts.find((draft) => draft.orderId === orderId);
  }
  function patchDraft(orderId: string, patch: Partial<ErpState["shipmentDrafts"][number]>) {
    setState((s) => {
      const current = s.shipmentDrafts.find((draft) => draft.orderId === orderId) || {
        orderId,
        operationStore: s.orders.find((order) => order.id === orderId)?.warehouse || "",
        shipDate: "",
        shippingChannel: "",
        domesticTrackNo: "",
        issuedAt: "",
        operatedAt: "",
        internationalNo: "",
        weightKg: 0,
        remark: "",
        combinedLabel: "",
        outboundStatus: "待出库" as const,
        freight: 0,
      };
      return {
        ...s,
        shipmentDrafts: [
          ...s.shipmentDrafts.filter((draft) => draft.orderId !== orderId),
          { ...current, ...patch },
        ],
      };
    });
  }
  function confirm(orderId: string) {
    const order = state.orders.find((item) => item.id === orderId);
    if (!order?.skuCode) return notify("订单 SKU 未匹配，不能出库");
    if (order.status === "已发货") return notify("该订单已经出库，不能重复扣减");
    const skuCode = order.skuCode;
    const draft = draftFor(orderId);
    const warehouse = draft?.operationStore || order.warehouse;
    const shortage = (state.stocks.find((x) => x.warehouse === warehouse && x.skuCode === skuCode)?.quantity || 0) < order.quantity;
    const reason = shortage ? prompt("本次出库会产生负库存，请填写原因：") : "订单正常出库";
    if (!reason) return;
    setState((s) => {
      const nextStocks = [...s.stocks];
      const movements = [...s.movements];
      const index = nextStocks.findIndex((x) => x.warehouse === warehouse && x.skuCode === skuCode);
      if (index >= 0) nextStocks[index] = { ...nextStocks[index], quantity: nextStocks[index].quantity - order.quantity };
      else nextStocks.push({ warehouse, skuCode, quantity: -order.quantity });
      movements.unshift({ id: uid(), date: new Date().toLocaleString(), warehouse, skuCode, type: "订单出库", inbound: 0, outbound: order.quantity, referenceNo: order.orderNo, reason });
      return {
        ...s,
        stocks: nextStocks,
        movements,
        shipmentDrafts: [
          ...s.shipmentDrafts.filter((item) => item.orderId !== orderId),
          {
            ...(draft || {
              orderId,
              operationStore: warehouse,
              shipDate: "",
              shippingChannel: "",
              domesticTrackNo: "",
              issuedAt: "",
              internationalNo: "",
              weightKg: 0,
              remark: "",
              combinedLabel: "",
              freight: 0,
            }),
            operatedAt: new Date().toLocaleString(),
            outboundStatus: "已出库",
          },
        ],
        orders: s.orders.map((o) => o.id === orderId ? { ...o, status: "已发货", warehouse } : o),
        audits: [{ id: uid(), date: new Date().toLocaleString(), action: "确认出库", detail: `${order.orderNo}，${reason}` }, ...s.audits],
      };
    });
    notify("出库完成，库存流水已生成");
  }
  const exportData = rows.map((order) => {
    const sku = state.skus.find((item) => item.code === order.skuCode);
    const draft = draftFor(order.id);
    return {
      "运营+店铺名": draft?.operationStore || order.warehouse,
      "发货日期": draft?.shipDate || "",
      "订单号": order.orderNo,
      "统一SKU": order.skuCode,
      "卖家代码/货号": sku?.sellerCode || "",
      "供货商链接": sku?.purchaseLink || "",
      "供货商": sku?.supplier || "",
      "客人购买选项": order.spec,
      "采购选项/卖家SKU": order.sellerSku,
      "发货品名": sku?.shippingName || "",
      "产品单价": sku?.purchasePrice || "",
      "数量": order.quantity,
      "商品图片": sku?.imageUrl || "",
      "发货方式": sku?.shippingMethod || "",
      "发货渠道": draft?.shippingChannel || "",
      "国内运单号": draft?.domesticTrackNo || "",
      "出单日期": draft?.issuedAt || "",
      "操作发货时间": draft?.operatedAt || "",
      "国际单号": draft?.internationalNo || "",
      "重量KG": draft?.weightKg || "",
      "备注": draft?.remark || "",
      "联单": draft?.combinedLabel || "",
      "出库状态": draft?.outboundStatus || order.status,
      "国际运费": draft?.freight || "",
    };
  });
  return <Panel title={`03 仓库发货表（${rows.length}）`} action="导出 Excel" onAction={() => exportRows("03_仓库发货表.xlsx", "仓库发货表", exportData)}>
    <div className="table-toolbar"><button onClick={() => window.print()}><Download size={15} /> 打印当前列表</button><span>订单和 SKU 资料自动带入；仓库只补发货渠道、运单号、重量、备注等字段</span></div>
    <DataTable headers={["运营+店铺名", "发货日期", "订单号", "统一SKU", "卖家代码/货号", "供货商链接", "供货商", "客人购买选项", "采购选项/卖家SKU", "发货品名", "产品单价", "数量", "商品图片", "发货方式", "发货渠道", "国内运单号", "出单日期", "操作发货时间", "国际单号", "重量KG", "备注", "联单", "出库状态", "国际运费", "操作"]}>
      {rows.map((order) => {
        const sku = state.skus.find((item) => item.code === order.skuCode);
        const draft = draftFor(order.id);
        const disabled = order.status === "已发货";
        return <tr key={order.id}>
          <td><input className="cell-input" value={draft?.operationStore || order.warehouse} onChange={(e) => patchDraft(order.id, { operationStore: e.target.value })} /></td>
          <td><input className="cell-input" type="date" value={draft?.shipDate || ""} onChange={(e) => patchDraft(order.id, { shipDate: e.target.value })} /></td>
          <td><b>{order.orderNo}</b></td><td>{order.skuCode}</td><td>{sku?.sellerCode || "-"}</td><td>{sku?.purchaseLink ? <a className="link" href={sku.purchaseLink} target="_blank">链接</a> : "-"}</td><td>{sku?.supplier || "-"}</td><td>{order.spec}</td><td>{order.sellerSku}</td><td>{sku?.shippingName || "-"}</td><td>{sku?.purchasePrice || "-"}</td><td>{order.quantity}</td><td>{sku?.imageUrl ? <a className="link" href={sku.imageUrl} target="_blank">查看</a> : "-"}</td><td>{sku?.shippingMethod || "-"}</td>
          <td><input className="cell-input" value={draft?.shippingChannel || ""} onChange={(e) => patchDraft(order.id, { shippingChannel: e.target.value })} /></td>
          <td><input className="cell-input" value={draft?.domesticTrackNo || ""} onChange={(e) => patchDraft(order.id, { domesticTrackNo: e.target.value })} /></td>
          <td><input className="cell-input" type="date" value={draft?.issuedAt || ""} onChange={(e) => patchDraft(order.id, { issuedAt: e.target.value })} /></td>
          <td>{draft?.operatedAt || "-"}</td>
          <td><input className="cell-input" value={draft?.internationalNo || ""} onChange={(e) => patchDraft(order.id, { internationalNo: e.target.value })} /></td>
          <td><input className="cell-input short" type="number" value={draft?.weightKg || ""} onChange={(e) => patchDraft(order.id, { weightKg: Number(e.target.value) })} /></td>
          <td><input className="cell-input" value={draft?.remark || ""} onChange={(e) => patchDraft(order.id, { remark: e.target.value })} /></td>
          <td><input className="cell-input" value={draft?.combinedLabel || ""} onChange={(e) => patchDraft(order.id, { combinedLabel: e.target.value })} /></td>
          <td><Status value={disabled ? "已出库" : draft?.outboundStatus || "待出库"} /></td>
          <td><input className="cell-input short" type="number" value={draft?.freight || ""} onChange={(e) => patchDraft(order.id, { freight: Number(e.target.value) })} /></td>
          <td><button disabled={disabled} className="link" onClick={() => confirm(order.id)}>确认出库</button></td>
        </tr>;
      })}
    </DataTable>
  </Panel>;
}

function Inventory({ state, setState, query = "", notify }: ModuleProps) {
  const [adjust, setAdjust] = useState(false);
  const rows = state.stocks.filter((s) => `${s.skuCode}${s.warehouse}`.toLowerCase().includes(query.toLowerCase()));
  function save(form: FormData) {
    const warehouse = String(form.get("warehouse")), skuCode = String(form.get("skuCode")), inbound = Number(form.get("inbound") || 0), outbound = Number(form.get("outbound") || 0), reason = String(form.get("reason"));
    const businessType = String(form.get("businessType") || "盘点调整");
    const quantity = inbound - outbound;
    if (!quantity || !reason) return notify("请填写入库/出库数量和原因");
    if (inbound && outbound) return notify("入库数量和出库数量不能同时填写");
    setState((s) => {
      const existing = s.stocks.find((x) => x.warehouse === warehouse && x.skuCode === skuCode);
      const stocks = existing ? s.stocks.map((x) => x === existing ? { ...x, quantity: x.quantity + quantity } : x) : [...s.stocks, { warehouse, skuCode, quantity }];
      return { ...s, stocks, movements: [{ id: uid(), date: new Date().toLocaleString(), warehouse, skuCode, type: businessType, inbound, outbound, referenceNo: `IO-${Date.now().toString().slice(-6)}`, reason }, ...s.movements] };
    });
    setAdjust(false); notify("库存出入库登记完成");
  }
  return <>
    <div className="metric-grid compact">
      <MiniMetric label="现存库存" value={state.stocks.reduce((n, s) => n + s.quantity, 0)} icon={Boxes} />
      <MiniMetric label="负库存 SKU" value={state.stocks.filter((s) => s.quantity < 0).length} icon={AlertTriangle} />
      <MiniMetric label="库存流水" value={state.movements.length} icon={BarChart3} />
    </div>
    <Panel title="07 库存总览" action="导出 Excel" onAction={() => exportRows("07_库存总览.xlsx", "库存", state.stocks)}>
      <div className="table-toolbar"><button className="primary" onClick={() => setAdjust(true)}>新增出入库</button><span>现存库存包含期初、采购收货、订单出库和其他出入库</span></div>
      <DataTable headers={["仓库", "统一 SKU", "现存库存", "待发占用", "可用参考", "状态"]}>{rows.map((s) => {
        const pending = state.orders.filter((o) => o.warehouse === s.warehouse && o.skuCode === s.skuCode && o.status === "待发货").reduce((n, o) => n + o.quantity, 0);
        return <tr key={`${s.warehouse}-${s.skuCode}`}><td>{s.warehouse}</td><td><b>{s.skuCode}</b></td><td>{s.quantity}</td><td>{pending}</td><td>{s.quantity - pending}</td><td><Status value={s.quantity < 0 ? "负库存" : s.quantity - pending < 5 ? "需补货" : "正常"} /></td></tr>;
      })}</DataTable>
    </Panel>
    <Panel title="05 库存出入库" action="导出流水" onAction={() => exportRows("05_库存出入库.xlsx", "库存出入库", state.movements)}>
      <DataTable headers={["业务单号", "业务日期", "业务类型", "采购单号", "统一SKU", "入库数量", "出库数量", "不合格数量", "原因", "库位", "操作人", "备注"]}>{state.movements.map((m) => <tr key={m.id}><td>{m.referenceNo}</td><td>{m.date}</td><td>{m.type}</td><td>{m.type === "采购收货" ? m.referenceNo : "-"}</td><td>{m.skuCode}</td><td className="success-text">{m.inbound || "-"}</td><td className="danger-text">{m.outbound || "-"}</td><td>-</td><td>{m.reason}</td><td>{m.warehouse}</td><td>闫星宇</td><td>-</td></tr>)}</DataTable>
    </Panel>
    {adjust && <Modal title="05 库存出入库登记" close={() => setAdjust(false)}><form action={save} className="form-grid">
      <SelectField label="仓库" name="warehouse" options={state.warehouses} /><SelectField label="统一 SKU" name="skuCode" options={state.skus.map((s) => s.code)} />
      <SelectField label="业务类型" name="businessType" options={["采购收货", "退货入库", "样品出库", "报损出库", "盘点调整"]} />
      <Field label="入库数量" name="inbound" type="number" /><Field label="出库数量" name="outbound" type="number" />
      <Field label="不合格数量" name="rejected" type="number" value={0} /><Field label="原因" name="reason" required />
      <div className="form-actions"><button type="button" onClick={() => setAdjust(false)}>取消</button><button className="primary">确认登记</button></div>
    </form></Modal>}
  </>;
}

function recentOutbound(state: ErpState, skuCode: string) {
  return state.movements
    .filter((movement) => movement.skuCode === skuCode)
    .reduce((sum, movement) => sum + movement.outbound, 0);
}

function Replenishment({ state, setState, notify }: ModuleProps) {
  const rows = state.skus.map((sku) => ({ sku, available: availableStock(state, sku.code), transit: inTransit(state, sku.code), suggestion: suggestedQuantity(state, sku) })).sort((a, b) => b.suggestion - a.suggestion);
  function create(sku: Sku, quantity: number) {
    if (!quantity) return;
    const purchase: Purchase = { id: uid(), purchaseNo: `PO-${Date.now().toString().slice(-8)}`, skuCode: sku.code, quantity, receivedQty: 0, unitPrice: sku.purchasePrice, supplier: sku.supplier, expectedAt: new Date(Date.now() + sku.leadTimeDays * 86400000).toISOString().slice(0, 10), status: "草稿", carrier: "", domesticTrackNo: "", internationalNo: "" };
    setState((s) => ({ ...s, purchases: [purchase, ...s.purchases] })); notify("已生成采购草稿");
  }
  return <Panel title="07 库存总览 / 补货建议" action="导出 Excel" onAction={() => exportRows("07_库存总览.xlsx", "库存总览", rows.map((r) => ({ SKU: r.sku.code, 当前可用库存: r.available, 在途数量: r.transit, 补货点: r.sku.reorderPoint, 目标库存: r.sku.targetStock, 建议采购量: r.suggestion })))}>
    <div className="formula-note">建议采购量 = 当前可用库存 + 在途数量 &lt; 补货点时，补到目标库存；否则为 0。</div>
    <DataTable headers={["统一SKU", "商品名称", "当前可用库存", "累计出库", "补货点", "目标库存", "在途数量", "建议采购量", "采购单价", "供应商", "操作"]}>{rows.map(({ sku, available, transit, suggestion }) => <tr key={sku.id}><td><b>{sku.code}</b></td><td className="wide">{sku.name}</td><td>{available}</td><td>{recentOutbound(state, sku.code)}</td><td>{sku.reorderPoint}</td><td>{sku.targetStock}</td><td>{transit}</td><td><strong className={suggestion ? "danger-text" : "success-text"}>{suggestion}</strong></td><td>{sku.purchasePrice || "-"}</td><td>{sku.supplier || "-"}</td><td><button disabled={!suggestion} className="link" onClick={() => create(sku, suggestion)}>生成采购单</button></td></tr>)}</DataTable>
  </Panel>;
}

function Purchases({ state, setState, notify }: ModuleProps) {
  const [receipt, setReceipt] = useState<Purchase | null>(null);
  function receive(form: FormData) {
    if (!receipt) return;
    const quantity = Number(form.get("quantity")), warehouse = String(form.get("warehouse"));
    if (quantity <= 0 || quantity > receipt.quantity - receipt.receivedQty) return notify("到货数量超出未收数量");
    setState((s) => {
      const existing = s.stocks.find((x) => x.warehouse === warehouse && x.skuCode === receipt.skuCode);
      const stocks = existing ? s.stocks.map((x) => x === existing ? { ...x, quantity: x.quantity + quantity } : x) : [...s.stocks, { warehouse, skuCode: receipt.skuCode, quantity }];
      const receivedQty = receipt.receivedQty + quantity;
      return { ...s, stocks, purchases: s.purchases.map((p) => p.id === receipt.id ? { ...p, receivedQty, status: receivedQty === p.quantity ? "已完成" : "部分到货" } : p), movements: [{ id: uid(), date: new Date().toLocaleString(), warehouse, skuCode: receipt.skuCode, type: "采购入库", inbound: quantity, outbound: 0, referenceNo: receipt.purchaseNo, reason: "采购到货" }, ...s.movements] };
    });
    setReceipt(null); notify("到货登记完成，库存已增加");
  }
  return <Panel title="04 备货采购" action="导出 Excel" onAction={() => exportRows("04_备货采购.xlsx", "备货采购", state.purchases)}>
    <div className="formula-note">系统先给建议采购量；决定下单后补实际采购量、采购状态、采购单号、物流单号等黄色字段。</div>
    <DataTable headers={["统一SKU", "商品名称", "当前可用库存", "累计出库", "补货点", "目标库存", "在途数量", "建议采购量", "实际采购量", "采购状态", "采购单号", "下单日期", "采购单价", "采购总额", "供应商", "预计到货日", "国内运单号", "物流公司", "国际运单号", "重量KG", "联单", "负责人", "操作"]}>{state.purchases.map((p) => {
      const sku = state.skus.find((item) => item.code === p.skuCode);
      const available = availableStock(state, p.skuCode);
      const transit = inTransit(state, p.skuCode);
      return <tr key={p.id}><td><b>{p.skuCode}</b></td><td className="wide">{sku?.name || "-"}</td><td>{available}</td><td>{recentOutbound(state, p.skuCode)}</td><td>{sku?.reorderPoint || 0}</td><td>{sku?.targetStock || 0}</td><td>{transit}</td><td>{sku ? suggestedQuantity(state, sku) : 0}</td><td>{p.quantity}</td><td><Status value={p.status} /></td><td>{p.purchaseNo}</td><td>{p.expectedAt ? "-" : ""}</td><td>{p.unitPrice}</td><td>{p.quantity * p.unitPrice}</td><td>{p.supplier || "-"}</td><td>{p.expectedAt}</td><td>{p.domesticTrackNo || "-"}</td><td>{p.carrier || "-"}</td><td>{p.internationalNo || "-"}</td><td>-</td><td>-</td><td>闫星宇</td><td><button disabled={p.status === "已完成" || p.status === "已取消"} className="link" onClick={() => setReceipt(p)}>采购收货</button></td></tr>;
    })}</DataTable>
    {receipt && <Modal title={`登记到货 · ${receipt.purchaseNo}`} close={() => setReceipt(null)}><form action={receive} className="form-grid"><SelectField label="入库仓库" name="warehouse" options={state.warehouses} /><Field label={`合格数量（剩余 ${receipt.quantity - receipt.receivedQty}）`} name="quantity" type="number" required /><Field label="不合格数量" name="rejected" type="number" value={0} /><div className="form-actions"><button type="button" onClick={() => setReceipt(null)}>取消</button><button className="primary">确认入库</button></div></form></Modal>}
  </Panel>;
}

function Exceptions({ state, setState, notify }: ModuleProps) {
  const exceptions = state.orders.filter((o) => o.status === "异常");
  function map(orderId: string, skuCode: string) {
    const target = state.orders.find((o) => o.id === orderId);
    if (!target) return;
    setState((s) => ({ ...s, skus: s.skus.map((sku) => sku.code === skuCode ? { ...sku, sellerSku: target.sellerSku } : sku), orders: s.orders.map((o) => o.sellerSku === target.sellerSku ? { ...o, skuCode, status: "待发货" } : o), audits: [{ id: uid(), date: new Date().toLocaleString(), action: "修正 SKU 映射", detail: `${target.sellerSku} → ${skuCode}` }, ...s.audits] }));
    notify("映射已保存，后续订单将自动匹配");
  }
  return <div className="dashboard-grid">
    <Panel title={`SKU 映射异常（${exceptions.length}）`}>
      {exceptions.length ? <DataTable headers={["订单号", "卖家 SKU", "商品", "处理"]}>{exceptions.map((o) => <tr key={o.id}><td>{o.orderNo}</td><td className="danger-text">{o.sellerSku}</td><td>{o.productName}</td><td><select defaultValue="" onChange={(e) => map(o.id, e.target.value)}><option value="" disabled>选择统一 SKU</option>{state.skus.map((s) => <option key={s.id} value={s.code}>{s.code}</option>)}</select></td></tr>)}</DataTable> : <Empty text="当前没有 SKU 映射异常" />}
    </Panel>
    <Panel title="操作审计">
      <div className="audit-list">{state.audits.length ? state.audits.slice(0, 12).map((a) => <div key={a.id}><i /><p><b>{a.action}</b><span>{a.detail}</span><small>{a.date}</small></p></div>) : <Empty text="暂无操作记录" />}</div>
    </Panel>
  </div>;
}

type ModuleProps = { state: ErpState; setState: React.Dispatch<React.SetStateAction<ErpState>>; query?: string; notify: (s: string) => void };
function Panel({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode }) { return <section className="panel"><div className="panel-head"><h3>{title}</h3>{action && <button className="link" onClick={onAction}>{action} <ChevronRight size={15} /></button>}</div>{children}</section>; }
function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) { return <div className="table-wrap"><table><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function Status({ value }: { value: string }) { const tone = ["异常", "负库存", "已取消"].includes(value) ? "bad" : ["待发货", "待出库", "草稿", "部分到货", "需补货", "未确认"].includes(value) ? "warn" : "good"; return <span className={`status ${tone}`}>{value}</span>; }
function Todo({ color, title, note, onClick }: { color: string; title: string; note: string; onClick: () => void }) { return <button onClick={onClick}><i className={color}><AlertTriangle size={17} /></i><p><b>{title}</b><span>{note}</span></p><ChevronRight size={17} /></button>; }
function MiniMetric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Boxes }) { return <article className="metric-card"><div className="metric-icon blue"><Icon size={20} /></div><span>{label}</span><strong>{value}</strong></article>; }
function Empty({ text }: { text: string }) { return <div className="empty"><PackageCheck size={34} /><p>{text}</p></div>; }
function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" onMouseDown={close}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><div className="panel-head"><h3>{title}</h3><button onClick={close}>×</button></div>{children}</div></div>; }
function Field({ label, name, value, type = "text", required }: { label: string; name: string; value?: string | number; type?: string; required?: boolean }) { return <label className="field"><span>{label}</span><input name={name} type={type} defaultValue={value} required={required} /></label>; }
function SelectField({ label, name, options }: { label: string; name: string; options: string[] }) { return <label className="field"><span>{label}</span><select name={name}>{options.map((o) => <option key={o}>{o}</option>)}</select></label>; }
