"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Database,
  FileInput,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  Warehouse,
  X,
} from "lucide-react";
import { type ChangeEvent, type CSSProperties, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { parseSheinOrderMappingExcel } from "@/lib/excel";
import type { PageKey, ProductSku, ProductWarehouseStock, SheinMappedRow, SheinOrderMappingResult } from "@/lib/types";

type Feature = {
  title: string;
  description: string;
  tag?: string;
};

type PageConfig = {
  key: PageKey;
  title: string;
  description: string;
  icon: typeof Package;
  action?: string;
  features: Feature[];
  tableTitle: string;
  tableColumns: string[];
};

type MenuSection = {
  title: string;
  accent: "emerald" | "amber" | "orange";
  items: PageConfig[];
};

type LogFilterType = "warehouse" | "company" | "sku";

type LogColumn = {
  label: string;
  key: string;
  width: number;
  filter?: LogFilterType;
};

type LogFilterState = Record<LogFilterType, string>;

const sheinMappedColumns: { label: string; key: keyof SheinMappedRow; width: number }[] = [
  { label: "公司名称", key: "companyName", width: 120 },
  { label: "店铺名称", key: "storeName", width: 132 },
  { label: "运营姓名", key: "operatorName", width: 112 },
  { label: "图片", key: "image", width: 92 },
  { label: "商品SKU", key: "productSku", width: 172 },
  { label: "数量", key: "quantity", width: 78 },
  { label: "订单号码", key: "orderNo", width: 180 },
  { label: "收件人姓名", key: "recipientName", width: 128 },
  { label: "收件人电话", key: "recipientPhone", width: 146 },
  { label: "收件人地址（一二三）", key: "recipientAddress", width: 280 },
  { label: "收件人邮编", key: "recipientPostalCode", width: 130 },
  { label: "商品品名", key: "productName", width: 260 },
  { label: "订单创建时间", key: "orderCreatedAt", width: 168 },
  { label: "订单签收日期", key: "orderSignedAt", width: 150 },
  { label: "订单操作时间", key: "orderOperatedAt", width: 150 },
  { label: "仓库名称", key: "warehouseName", width: 132 },
  { label: "发货渠道（投函/小包）", key: "shippingChannel", width: 170 },
  { label: "可筛选-处理状态（待打包/已...）", key: "processingStatus", width: 210 },
  { label: "物流单号", key: "logisticsNo", width: 170 },
  { label: "物流公司", key: "logisticsCompany", width: 132 },
  { label: "可筛选-单号回传状态（已处...）", key: "trackingUploadStatus", width: 220 },
  { label: "备注", key: "remark", width: 180 },
];

const productColumns: { label: string; key: keyof ProductSku; width: number }[] = [
  { label: "商品图片", key: "imageUrl", width: 110 },
  { label: "商品SKU", key: "sku", width: 176 },
  { label: "商品名称", key: "productName", width: 240 },
  { label: "发货品名", key: "shippingName", width: 190 },
  { label: "仓库库存", key: "warehouseStocks", width: 430 },
  { label: "商品单价", key: "unitPrice", width: 118 },
  { label: "供货商链接", key: "supplierLink", width: 190 },
  { label: "采购时效", key: "purchaseLeadTime", width: 118 },
  { label: "店铺名", key: "storeName", width: 132 },
  { label: "状态", key: "status", width: 112 },
];
const PRODUCT_ACTION_COLUMN_WIDTH = 196;

const inboundLogColumns: LogColumn[] = [
  { label: "仓库名称", key: "warehouseName", width: 150, filter: "warehouse" },
  { label: "公司名称", key: "companyName", width: 150, filter: "company" },
  { label: "箱唛号/运单号/借货", key: "referenceNo", width: 210 },
  { label: "商品SKU", key: "sku", width: 170, filter: "sku" },
  { label: "商品名称", key: "productName", width: 220 },
  { label: "入库数量", key: "quantity", width: 110 },
  { label: "操作人", key: "operator", width: 110 },
  { label: "操作时间", key: "operatedAt", width: 160 },
  { label: "备注", key: "remark", width: 220 },
];

const outboundLogColumns: LogColumn[] = [
  { label: "仓库名称", key: "warehouseName", width: 150, filter: "warehouse" },
  { label: "公司名称", key: "companyName", width: 150, filter: "company" },
  { label: "订单号/出给海外仓/借货", key: "referenceNo", width: 230 },
  { label: "商品SKU", key: "sku", width: 170, filter: "sku" },
  { label: "商品名称", key: "productName", width: 220 },
  { label: "出库数量", key: "quantity", width: 110 },
  { label: "操作人", key: "operator", width: 110 },
  { label: "操作时间", key: "operatedAt", width: 160 },
  { label: "备注", key: "remark", width: 220 },
];

const defaultLogFilters: LogFilterState = {
  warehouse: "全部仓库",
  company: "全部公司",
  sku: "全部SKU",
};

const sheinWarehouseRules = [
  {
    title: "燕郊前置仓",
    items: ["JIT：投函 / 小包，正常地区 T+2-3，偏远地区 T+4-5", "962：只发签收时效在 6 天内的关东 5 个地区"],
  },
  {
    title: "日本海外仓",
    items: ["黑猫：日本本土配送线路", "佐川：日本本土配送线路"],
  },
];

const PRODUCT_STORAGE_KEY = "bingyu-erp-product-skus-v1";
const SHEIN_IMPORT_STORAGE_KEY = "bingyu-erp-shein-import-v1";
const productWarehouseNames = ["燕郊前置仓", "日本海外仓"];

function nowText() {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

function createEmptyProductSku(): ProductSku {
  const timestamp = nowText();

  return {
    id: `product-${Date.now()}`,
    sku: "",
    imageUrl: "",
    productName: "",
    shippingName: "",
    warehouseStocks: defaultWarehouseStocks(),
    unitPrice: "",
    supplierLink: "",
    purchaseLeadTime: "",
    storeName: "",
    status: "已确认",
    source: "手动新增",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function defaultWarehouseStocks(seed?: Partial<ProductWarehouseStock>): ProductWarehouseStock[] {
  return productWarehouseNames.map((warehouseName, index) => ({
    warehouseName,
    totalStock: index === 0 ? seed?.totalStock || "" : "",
    transitStock: index === 0 ? seed?.transitStock || "" : "",
    warningStandard: index === 0 ? seed?.warningStandard || "" : "",
    stockStatus: index === 0 ? seed?.stockStatus || "" : "",
  }));
}

function normalizeProductSku(product: ProductSku): ProductSku {
  const oldProduct = product as ProductSku & Partial<ProductWarehouseStock> & { warehouseStocks?: ProductWarehouseStock[] };
  const currentStocks = Array.isArray(oldProduct.warehouseStocks) ? oldProduct.warehouseStocks : [];
  const warehouseStocks = productWarehouseNames.map((warehouseName, index) => {
    const existing =
      currentStocks.find((stock) => stock.warehouseName === warehouseName) ||
      (index === 0
        ? {
            warehouseName: oldProduct.warehouse || warehouseName,
            totalStock: oldProduct.totalStock || "",
            transitStock: oldProduct.transitStock || "",
            warningStandard: oldProduct.warningStandard || "",
            stockStatus: oldProduct.stockStatus || "",
          }
        : undefined);

    return {
      warehouseName,
      totalStock: existing?.totalStock || "",
      transitStock: existing?.transitStock || "",
      warningStandard: existing?.warningStandard || "",
      stockStatus: existing?.stockStatus || "",
    };
  });

  return {
    ...product,
    warehouseStocks,
  };
}

function updateWarehouseStock(
  product: ProductSku,
  warehouseName: string,
  field: keyof Omit<ProductWarehouseStock, "warehouseName">,
  value: string
) {
  return {
    ...product,
    warehouseStocks: normalizeProductSku(product).warehouseStocks.map((stock) =>
      stock.warehouseName === warehouseName ? { ...stock, [field]: value } : stock
    ),
  };
}

function mergeSheinProductDrafts(rows: SheinMappedRow[], products: ProductSku[]) {
  const existingSkus = new Set(products.map((product) => product.sku.trim()).filter(Boolean));
  const createdAt = nowText();
  const drafts: ProductSku[] = [];

  rows.forEach((row, index) => {
    const sku = row.productSku.trim();

    if (!sku || existingSkus.has(sku)) return;

    existingSkus.add(sku);
    drafts.push({
      id: `product-shein-${Date.now()}-${index}`,
      sku,
      imageUrl: "",
      productName: row.productName,
      shippingName: row.productName,
      warehouseStocks: defaultWarehouseStocks(),
      unitPrice: "",
      supplierLink: "",
      purchaseLeadTime: "",
      storeName: row.storeName,
      status: "待补全",
      source: "SHEIN订单",
      createdAt,
      updatedAt: createdAt,
    });
  });

  return { products: [...drafts, ...products], createdCount: drafts.length };
}

const menuSections: MenuSection[] = [
  {
    title: "产品管理",
    accent: "emerald",
    items: [
      {
        key: "productInfo",
        title: "产品信息",
        description: "维护产品档案、SKU 信息、库存数量、供货商和预警规则。",
        icon: Package,
        action: "新建产品",
        features: [
          { title: "产品SKU录入", description: "录入产品编码、规格、Fnsku、seller sku 等基础资料。", tag: "基础资料" },
          { title: "商品库存数量", description: "后续展示各仓商品库存、可用数量和待处理数量。", tag: "库存" },
          { title: "供货商信息", description: "沉淀供应商、采购链接、采购价和负责人。", tag: "采购" },
          { title: "库存预警", description: "为低库存、缺货、滞销商品提供预警入口。", tag: "预警" },
        ],
        tableTitle: "产品信息表",
        tableColumns: ["产品SKU", "商品名称", "库存数量", "供货商", "预警状态"],
      },
      {
        key: "inboundLog",
        title: "入库日志",
        description: "跟踪采购入库数量明细，后续用于核对平台与仓库入库数量。",
        icon: ArrowDownToLine,
        features: [
          { title: "采购入库数量明细", description: "记录阿里及拼多多采购入库数量明细。", tag: "入库明细" },
          { title: "后期核对入库数量", description: "预留入库数量核对、差异标记和复核入口。", tag: "核对" },
        ],
        tableTitle: "入库日志表",
        tableColumns: ["入库时间", "采购平台", "产品SKU", "入库数量", "核对状态"],
      },
      {
        key: "outboundLog",
        title: "出库日志",
        description: "记录采购出库、仓库扣减和后续出库数量核对。",
        icon: ArrowUpFromLine,
        features: [
          { title: "采购出库数量明细", description: "记录阿里及拼多多采购出库数量明细。", tag: "出库明细" },
          { title: "后期核对出库数量", description: "预留出库数量核对、异常差异和操作追踪入口。", tag: "核对" },
        ],
        tableTitle: "出库日志表",
        tableColumns: ["出库时间", "仓库", "产品SKU", "出库数量", "操作人"],
      },
    ],
  },
  {
    title: "订单管理",
    accent: "amber",
    items: [
      {
        key: "orderImport",
        title: "订单导入",
        description: "导入 SHEIN 订单 Excel 后，映射整理成冰域 ERP 订单处理模块表头。",
        icon: FileInput,
        action: "导入 Shein 订单",
        features: [
          { title: "后台导入订单信息", description: "上传 SHEIN 后台导出的订单 Excel，作为原始订单来源。", tag: "导入" },
          { title: "店铺授权到 ERP 同步订单", description: "后续接入店铺授权后，自动同步订单到冰域 ERP。", tag: "同步" },
          { title: "订单分配", description: "规则见附件，后续根据订单时效、地区和库存做仓库分配。", tag: "分配" },
          { title: "根据订单时效和库存分配不同仓库", description: "把燕郊前置仓、日本海外仓等规则放在同一个订单模块内管理。", tag: "分仓" },
        ],
        tableTitle: "Shein 订单映射结果表",
        tableColumns: [
          "公司名称",
          "店铺名称",
          "运营姓名",
          "图片",
          "商品SKU",
          "数量",
          "订单号码",
          "收件人姓名",
          "收件人电话",
          "收件人地址（一二三）",
          "收件人邮编",
          "商品品名",
          "订单创建时间",
          "订单签收日期",
          "订单操作时间",
          "仓库名称",
          "发货渠道（投函/小包）",
          "可筛选-处理状态（待打包/已...）",
          "物流单号",
          "物流公司",
          "可筛选-单号回传状态（已处...）",
          "备注",
        ],
      },
      {
        key: "trackingUpload",
        title: "单号回传",
        description: "按订单号将国际物流单号回传到后台。",
        icon: Send,
        action: "批量回传",
        features: [
          { title: "按订单号回传", description: "根据订单号匹配国际物流单号并回传后台。", tag: "回传" },
          { title: "回传结果追踪", description: "记录成功、失败和待重试状态。", tag: "状态" },
        ],
        tableTitle: "单号回传表",
        tableColumns: ["订单号", "国际物流单号", "回传状态", "回传时间", "失败原因"],
      },
      {
        key: "orderExceptions",
        title: "异常订单",
        description: "集中处理无库存、海关查验、物流转包等异常订单。",
        icon: AlertTriangle,
        features: [
          { title: "无库存产品", description: "提前出票或转入缺货处理区，同步采购建议入口。", tag: "库存异常" },
          { title: "海关查验件反馈", description: "由物流端操作填写查验反馈。", tag: "海关" },
          { title: "物流转包反馈", description: "由物流端操作填写转包信息和结果。", tag: "物流" },
        ],
        tableTitle: "异常订单表",
        tableColumns: ["订单号", "异常类型", "处理状态", "负责人", "更新时间"],
      },
      {
        key: "returns",
        title: "退货处理",
        description: "售后退货表头、平台退货板块对接和自动生成流程预留。",
        icon: RotateCcw,
        features: [
          { title: "退货表头", description: "预留退货登记字段和后续导出格式。", tag: "表头" },
          { title: "售后退货自动生成", description: "后期可对接平台售后退货板块并自动生成记录。", tag: "自动化" },
        ],
        tableTitle: "退货处理表",
        tableColumns: ["退货单号", "订单号", "产品SKU", "退货原因", "处理结果"],
      },
    ],
  },
  {
    title: "数据管理",
    accent: "orange",
    items: [
      {
        key: "stockValue",
        title: "库存价值",
        description: "后续连接店铺销售和采购金额，分析库存数量、价值和采购占比。",
        icon: Database,
        features: [
          { title: "库存剩余数量", description: "按店铺、仓库、SKU 汇总当前库存剩余数量。", tag: "库存" },
          { title: "库存价值", description: "结合采购价计算库存价值和资金占用。", tag: "价值" },
          { title: "采购占比分析", description: "连接销售数据及采购金额，分析采购占比。", tag: "占比" },
        ],
        tableTitle: "库存数量及价值表",
        tableColumns: ["店铺", "SKU", "剩余数量", "库存价值", "采购占比"],
      },
      {
        key: "skuSales",
        title: "销售分析",
        description: "形成销售数量曲线图，方便运营分析产品趋势。",
        icon: BarChart3,
        features: [
          { title: "销售数量曲线", description: "按时间生成 SKU 销售趋势曲线。", tag: "趋势" },
          { title: "产品趋势分析", description: "对爆品、平销、滞销 SKU 做运营判断。", tag: "分析" },
        ],
        tableTitle: "SKU销售数量表",
        tableColumns: ["SKU", "今日销量", "7日销量", "30日销量", "趋势"],
      },
      {
        key: "turnover",
        title: "库存周转率",
        description: "方便管理者分析产品库存周转和滞销情况。",
        icon: Activity,
        features: [
          { title: "库存周转率", description: "基于库存和销量计算周转效率。", tag: "周转" },
          { title: "滞销分析", description: "识别库存沉淀和长期无动销商品。", tag: "预警" },
        ],
        tableTitle: "库存周转率表",
        tableColumns: ["SKU", "库存数量", "销售数量", "周转率", "风险"],
      },
    ],
  },
];

const flatPages = menuSections.flatMap((section) => section.items);
const statCards = [
  { label: "产品资料", value: "0", icon: Package, tone: "blue" },
  { label: "待分配订单", value: "0", icon: ClipboardList, tone: "amber" },
  { label: "仓库规则", value: "0", icon: Warehouse, tone: "emerald" },
  { label: "数据报表", value: "0", icon: BarChart3, tone: "violet" },
];

export function ErpApp() {
  const [page, setPage] = useState<PageKey>("productInfo");
  const [productSkus, setProductSkus] = useState<ProductSku[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [productForm, setProductForm] = useState<ProductSku>(() => createEmptyProductSku());
  const [editingProduct, setEditingProduct] = useState<ProductSku | null>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productFormError, setProductFormError] = useState("");
  const [sheinImport, setSheinImport] = useState<SheinOrderMappingResult | null>(null);
  const [sheinError, setSheinError] = useState("");
  const [isSheinImporting, setIsSheinImporting] = useState(false);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const sheinInputRef = useRef<HTMLInputElement>(null);
  const current = flatPages.find((item) => item.key === page) || flatPages[0];
  const activeSection = menuSections.find((section) => section.items.some((item) => item.key === page)) || menuSections[0];
  const canImportShein = current.key === "orderImport";
  const isProductPage = current.key === "productInfo";

  useEffect(() => {
    try {
      const storedProducts = localStorage.getItem(PRODUCT_STORAGE_KEY);
      const storedSheinImport = localStorage.getItem(SHEIN_IMPORT_STORAGE_KEY);

      if (storedProducts) setProductSkus((JSON.parse(storedProducts) as ProductSku[]).map(normalizeProductSku));
      if (storedSheinImport) setSheinImport(JSON.parse(storedSheinImport) as SheinOrderMappingResult);
    } catch {
      localStorage.removeItem(PRODUCT_STORAGE_KEY);
      localStorage.removeItem(SHEIN_IMPORT_STORAGE_KEY);
    } finally {
      setIsStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isStorageReady) return;
    localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(productSkus));
  }, [isStorageReady, productSkus]);

  useEffect(() => {
    if (!isStorageReady) return;

    if (sheinImport) {
      localStorage.setItem(SHEIN_IMPORT_STORAGE_KEY, JSON.stringify(sheinImport));
    } else {
      localStorage.removeItem(SHEIN_IMPORT_STORAGE_KEY);
    }
  }, [isStorageReady, sheinImport]);

  async function handleSheinFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSheinImporting(true);
    setSheinError("");

    try {
      const result = await parseSheinOrderMappingExcel(file);
      setSheinImport(result);
      setProductSkus((currentProducts) => mergeSheinProductDrafts(result.rows, currentProducts).products);
    } catch (error) {
      setSheinImport(null);
      setSheinError(error instanceof Error ? error.message : "导入失败，请检查 Excel 文件。");
    } finally {
      setIsSheinImporting(false);
      event.target.value = "";
    }
  }

  function openSheinImport() {
    sheinInputRef.current?.click();
  }

  function openProductCreate() {
    setEditingProduct(null);
    setProductForm(createEmptyProductSku());
    setProductFormError("");
    setIsProductFormOpen(true);
  }

  function openProductEdit(product: ProductSku) {
    setEditingProduct(product);
    setProductForm({ ...product });
    setProductFormError("");
    setIsProductFormOpen(true);
  }

  function closeProductForm() {
    setIsProductFormOpen(false);
    setProductFormError("");
  }

  function updateProductForm(field: keyof ProductSku, value: ProductSku[keyof ProductSku]) {
    setProductForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  function renameSkuInSheinImport(oldSku: string, newProduct: ProductSku) {
    if (!oldSku || oldSku === newProduct.sku) return;

    setSheinImport((currentImport) => {
      if (!currentImport) return currentImport;

      return {
        ...currentImport,
        rows: currentImport.rows.map((row) =>
          row.productSku === oldSku
            ? {
                ...row,
                productSku: newProduct.sku,
                productName: newProduct.productName || row.productName,
                storeName: newProduct.storeName || row.storeName,
                warehouseName: newProduct.warehouseStocks[0]?.warehouseName || row.warehouseName,
              }
            : row
        ),
      };
    });
  }

  function saveProductSku(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const sku = productForm.sku.trim();
    if (!sku) {
      setProductFormError("商品SKU 必须填写。");
      return;
    }

    const duplicated = productSkus.some((product) => product.sku.trim() === sku && product.id !== productForm.id);
    if (duplicated) {
      setProductFormError(`商品SKU「${sku}」已存在，不能重复。`);
      return;
    }

    const timestamp = nowText();
    const savedProduct: ProductSku = {
      ...normalizeProductSku(productForm),
      sku,
      productName: productForm.productName.trim(),
      shippingName: productForm.shippingName.trim(),
      updatedAt: timestamp,
      createdAt: editingProduct?.createdAt || productForm.createdAt || timestamp,
      source: editingProduct?.source || productForm.source || "手动新增",
    };

    if (editingProduct) {
      setProductSkus((currentProducts) => currentProducts.map((product) => (product.id === savedProduct.id ? savedProduct : product)));
      renameSkuInSheinImport(editingProduct.sku, savedProduct);
    } else {
      setProductSkus((currentProducts) => [savedProduct, ...currentProducts]);
    }

    closeProductForm();
  }

  function deleteProductSku(product: ProductSku) {
    const referenced = sheinImport?.rows.some((row) => row.productSku === product.sku) || false;
    const confirmed = !referenced || window.confirm(`SKU「${product.sku}」已被当前 SHEIN 订单引用，确认仍然删除产品资料吗？订单行会保留原 SKU 文本。`);

    if (!confirmed) return;

    setProductSkus((currentProducts) => currentProducts.filter((item) => item.id !== product.id));
  }

  function handleTopAction() {
    if (isProductPage) {
      openProductCreate();
      return;
    }

    if (canImportShein) openSheinImport();
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-panel">
          <div className="brand-orb">冰</div>
          <div>
            <strong>冰域 ERP</strong>
            <span>发货ERP · 运营端</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="冰域 ERP 菜单">
          {menuSections.map((section) => (
            <section className="nav-section" key={section.title}>
              <div className="nav-section-head">
                <span className={`section-dot ${section.accent}`} />
                <div>
                  <b>{section.title}</b>
                </div>
              </div>
              <div className="nav-list">
                {section.items.map((item) => (
                  <button
                    className={item.key === page ? "active" : ""}
                    key={item.key}
                    onClick={() => setPage(item.key)}
                  >
                    <item.icon size={18} />
                    <span>{item.title}</span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>

      </aside>

      <main className="app-main">
        <header className="topbar">
          <div>
            <p>{activeSection.title}</p>
            <h1>{current.title}</h1>
          </div>
          <div className="topbar-actions">
            <label className="global-search">
              <Search size={16} />
              <input placeholder="搜索菜单、SKU、订单或报表" />
            </label>
            <button className="icon-button" aria-label="通知">
              <Bell size={18} />
            </button>
            <input
              ref={sheinInputRef}
              className="visually-hidden"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleSheinFileChange}
            />
            {current.action && (
              <button
                className="primary-action"
                disabled={(!canImportShein && !isProductPage) || isSheinImporting}
                onClick={handleTopAction}
              >
                {isProductPage ? <Plus size={17} /> : <Upload size={17} />}
                {isSheinImporting ? "导入中..." : current.action}
              </button>
            )}
          </div>
        </header>

        <section className="workspace">
          <ModulePage
            importError={sheinError}
            isImporting={isSheinImporting}
            onImportClick={openSheinImport}
            onProductCreate={openProductCreate}
            onProductDelete={deleteProductSku}
            onProductEdit={openProductEdit}
            page={current}
            productQuery={productQuery}
            productSkus={productSkus}
            section={activeSection}
            sheinImport={sheinImport}
            setProductQuery={setProductQuery}
          />
        </section>
      </main>
      {isProductFormOpen && (
        <ProductSkuModal
          error={productFormError}
          form={productForm}
          isEditing={Boolean(editingProduct)}
          onChange={updateProductForm}
          onClose={closeProductForm}
          onSubmit={saveProductSku}
        />
      )}
    </div>
  );
}

function ModulePage({
  importError,
  isImporting,
  onImportClick,
  onProductCreate,
  onProductDelete,
  onProductEdit,
  page,
  productQuery,
  productSkus,
  section,
  sheinImport,
  setProductQuery,
}: {
  importError: string;
  isImporting: boolean;
  onImportClick: () => void;
  onProductCreate: () => void;
  onProductDelete: (product: ProductSku) => void;
  onProductEdit: (product: ProductSku) => void;
  page: PageConfig;
  productQuery: string;
  productSkus: ProductSku[];
  section: MenuSection;
  sheinImport: SheinOrderMappingResult | null;
  setProductQuery: (query: string) => void;
}) {
  if (page.key === "productInfo") {
    return (
      <ProductInfoPage
        onCreate={onProductCreate}
        onDelete={onProductDelete}
        onEdit={onProductEdit}
        page={page}
        productQuery={productQuery}
        products={productSkus}
        section={section}
        setProductQuery={setProductQuery}
      />
    );
  }

  if (page.key === "orderImport") {
    return (
      <SheinOrderPage
        importError={importError}
        isImporting={isImporting}
        onImportClick={onImportClick}
        page={page}
        section={section}
        sheinImport={sheinImport}
      />
    );
  }

  if (page.key === "inboundLog" || page.key === "outboundLog") {
    return <InventoryLogPage page={page} products={productSkus} section={section} />;
  }

  return (
    <>
      <section className={`hero-section ${section.accent}`}>
        <div className="hero-copy">
          <div className="eyebrow">
            <span className={`section-dot ${section.accent}`} />
            {section.title}
          </div>
          <h2>{page.title}</h2>
          <p>{page.description}</p>
        </div>
        <div className="hero-visual">
          <page.icon size={34} />
        </div>
      </section>

      <section className="stats-grid">
        {statCards.map((card) => (
          <article className="stat-card" key={card.label}>
            <div className={`stat-icon ${card.tone}`}>
              <card.icon size={19} />
            </div>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <div className="feature-grid">
          {page.features.map((feature) => (
            <FeatureCard feature={feature} key={feature.title} />
          ))}
        </div>
        <PlaceholderTable page={page} />
      </section>
    </>
  );
}

function InventoryLogPage({ page, products, section }: { page: PageConfig; products: ProductSku[]; section: MenuSection }) {
  const isInbound = page.key === "inboundLog";

  return (
    <div className="shein-page product-page">
      <section className={`hero-section compact ${section.accent}`}>
        <div className="hero-copy">
          <div className="eyebrow">
            <span className={`section-dot ${section.accent}`} />
            {section.title}
          </div>
          <h2>{page.title}</h2>
          <p>{page.description}</p>
        </div>
        <div className="hero-visual">
          <page.icon size={34} />
        </div>
      </section>

      <section className="shein-import-grid">
        {page.features.map((feature) => (
          <FeatureCard feature={feature} key={feature.title} />
        ))}
        <article className="import-status-card">
          <div className="feature-topline">
            <span>筛选表头</span>
            <Search size={16} />
          </div>
          <h3>仓库 / 公司 / SKU</h3>
          <p>日志表头内置筛选下拉，后续接入真实日志后直接按这些字段过滤。</p>
        </article>
        <article className="import-status-card">
          <div className="feature-topline">
            <span>{isInbound ? "入库口径" : "出库口径"}</span>
            <ShieldCheck size={16} />
          </div>
          <h3>{isInbound ? "采购入库" : "仓库出库"}</h3>
          <p>当前先保留空表结构，视觉和产品信息页宽表保持一致。</p>
        </article>
      </section>

      <InventoryLogTable isInbound={isInbound} page={page} products={products} />
    </div>
  );
}

function ProductInfoPage({
  onCreate,
  onDelete,
  onEdit,
  page,
  productQuery,
  products,
  section,
  setProductQuery,
}: {
  onCreate: () => void;
  onDelete: (product: ProductSku) => void;
  onEdit: (product: ProductSku) => void;
  page: PageConfig;
  productQuery: string;
  products: ProductSku[];
  section: MenuSection;
  setProductQuery: (query: string) => void;
}) {
  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) =>
      [product.sku, product.productName, product.shippingName, product.storeName, product.supplierLink]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [productQuery, products]);
  const draftCount = products.filter((product) => product.status === "待补全").length;
  const sheinCount = products.filter((product) => product.source === "SHEIN订单").length;

  return (
    <div className="shein-page product-page">
      <section className={`hero-section compact ${section.accent}`}>
        <div className="hero-copy">
          <div className="eyebrow">
            <span className={`section-dot ${section.accent}`} />
            {section.title}
          </div>
          <h2>{page.title}</h2>
          <p>{page.description}</p>
        </div>
        <button className="hero-upload-action" onClick={onCreate}>
          <Plus size={18} />
          新建 SKU
        </button>
      </section>

      <section className="shein-import-grid">
        <article className="import-status-card">
          <div className="feature-topline">
            <span>SKU 总数</span>
            <Package size={16} />
          </div>
          <h3>{products.length} 个 SKU</h3>
          <p>系统以商品 SKU 作为唯一口径，订单、库存和发货后续都围绕它关联。</p>
        </article>
        <article className="import-status-card">
          <div className="feature-topline">
            <span>待补全</span>
            <ShieldCheck size={16} />
          </div>
          <h3>{draftCount} 个草稿</h3>
          <p>SHEIN 订单导入后自动生成的未知 SKU，会先进入待补全状态。</p>
        </article>
        <article className="import-status-card">
          <div className="feature-topline">
            <span>SHEIN 来源</span>
            <FileInput size={16} />
          </div>
          <h3>{sheinCount} 个 SKU</h3>
          <p>这些 SKU 来自 SHEIN 订单导入，可在这里继续修改和确认。</p>
        </article>
        <article className="import-status-card">
          <div className="feature-topline">
            <span>本地保存</span>
            <ShieldCheck size={16} />
          </div>
          <h3>localStorage</h3>
          <p>当前不接数据库，刷新浏览器后产品资料仍会保留在本机。</p>
        </article>
      </section>

      <ProductSkuTable
        onCreate={onCreate}
        onDelete={onDelete}
        onEdit={onEdit}
        productQuery={productQuery}
        products={filteredProducts}
        setProductQuery={setProductQuery}
        totalCount={products.length}
      />
    </div>
  );
}

function SheinOrderPage({
  importError,
  isImporting,
  onImportClick,
  page,
  section,
  sheinImport,
}: {
  importError: string;
  isImporting: boolean;
  onImportClick: () => void;
  page: PageConfig;
  section: MenuSection;
  sheinImport: SheinOrderMappingResult | null;
}) {
  return (
    <div className="shein-page">
      <section className={`hero-section compact ${section.accent}`}>
        <div className="hero-copy">
          <div className="eyebrow">
            <span className={`section-dot ${section.accent}`} />
            {section.title}
          </div>
          <h2>{page.title}</h2>
          <p>{page.description}</p>
        </div>
        <button className="hero-upload-action" disabled={isImporting} onClick={onImportClick}>
          <Upload size={18} />
          {isImporting ? "正在解析 Excel..." : "上传 SHEIN 订单 Excel"}
        </button>
      </section>

      <section className="shein-import-grid">
        {page.features.map((feature) => (
          <FeatureCard feature={feature} key={feature.title} />
        ))}
        <article className="import-status-card">
          <div className="feature-topline">
            <span>导入状态</span>
            <ShieldCheck size={16} />
          </div>
          {sheinImport ? (
            <>
              <h3>{sheinImport.filename}</h3>
              <p>
                已于 {sheinImport.importedAt} 导入，读取 {sheinImport.totalRows} 行，生成 {sheinImport.mappedRows} 条映射结果。
              </p>
            </>
          ) : (
            <>
              <h3>等待上传订单文件</h3>
              <p>支持 SHEIN 后台导出的 .xlsx / .xls 文件，导入后会生成下方目标表头。</p>
            </>
          )}
          {importError && <div className="import-error">{importError}</div>}
        </article>
      </section>

      <WarehouseRulesPanel />

      <SheinMappingTable page={page} result={sheinImport} />
    </div>
  );
}

function WarehouseRulesPanel() {
  return (
    <section className="warehouse-rules-panel">
      <div className="table-panel-head">
        <div>
          <h3>订单分配与仓库规则</h3>
          <p>Shein 订单导入、映射、分配属于同一个订单管理模块，规则先在这里集中展示。</p>
        </div>
        <span className="table-count">规则占位</span>
      </div>
      <div className="warehouse-rule-grid">
        {sheinWarehouseRules.map((group) => (
          <article className="warehouse-rule-card" key={group.title}>
            <h4>{group.title}</h4>
            <ul>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function InventoryLogTable({
  isInbound,
  page,
  products,
}: {
  isInbound: boolean;
  page: PageConfig;
  products: ProductSku[];
}) {
  const [filters, setFilters] = useState<LogFilterState>(defaultLogFilters);
  const columns = isInbound ? inboundLogColumns : outboundLogColumns;
  const tableWidth = columns.reduce((total, column) => total + column.width, 0);
  const skuOptions = useMemo(() => {
    const uniqueSkus = Array.from(new Set(products.map((product) => normalizeProductSku(product).sku.trim()).filter(Boolean)));
    return ["全部SKU", ...uniqueSkus];
  }, [products]);
  const filterOptions: Record<LogFilterType, string[]> = {
    warehouse: ["全部仓库", ...productWarehouseNames],
    company: ["全部公司"],
    sku: skuOptions,
  };
  const tableStyle = {
    "--table-min-width": `${tableWidth}px`,
  } as CSSProperties;

  function updateFilter(type: LogFilterType, value: string) {
    setFilters((current) => ({ ...current, [type]: value }));
  }

  return (
    <section className="table-panel mapping-table-panel">
      <div className="table-panel-head product-table-head">
        <div>
          <h3>{page.tableTitle}</h3>
          <p>{isInbound ? "记录采购入库、借货入库和运单核对。" : "记录订单出库、海外仓调拨和借货出库。"}</p>
        </div>
        <div className="product-table-actions log-table-actions">
          <LogFilterSelect label="仓库" options={filterOptions.warehouse} value={filters.warehouse} onChange={(value) => updateFilter("warehouse", value)} />
          <LogFilterSelect label="公司" options={filterOptions.company} value={filters.company} onChange={(value) => updateFilter("company", value)} />
          <LogFilterSelect label="SKU" options={filterOptions.sku} value={filters.sku} onChange={(value) => updateFilter("sku", value)} />
          <span className="table-count">0 条</span>
        </div>
      </div>
      <div className="mapping-table-scroll">
        <table className="mapping-data-table product-data-table log-data-table" style={tableStyle}>
          <colgroup>
            {columns.map((column) => (
              <col key={column.key} style={{ width: `${column.width}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="mapping-empty-cell" colSpan={columns.length}>
                <div className="mapping-empty">
                  {isInbound ? <ArrowDownToLine size={22} /> : <ArrowUpFromLine size={22} />}
                  <strong>{isInbound ? "还没有入库日志" : "还没有出库日志"}</strong>
                  <span>{isInbound ? "后续登记入库后，会按当前表头沉淀入库流水。" : "后续确认出库后，会按当前表头沉淀出库流水。"}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LogFilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isOpen]);

  function selectOption(option: string) {
    onChange(option);
    setIsOpen(false);
  }

  return (
    <div className={`log-filter-control ${isOpen ? "open" : ""}`} ref={dropdownRef}>
      <span>{label}</span>
      <button className="log-filter-trigger" type="button" onClick={() => setIsOpen((current) => !current)}>
        <b>{value}</b>
        <ChevronDown size={13} />
      </button>
      {isOpen && (
        <div className="log-filter-menu">
          {options.map((option) => {
            const selected = option === value;

            return (
              <button className={selected ? "selected" : ""} key={option} type="button" onClick={() => selectOption(option)}>
                <span>{option}</span>
                {selected && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductSkuTable({
  onCreate,
  onDelete,
  onEdit,
  productQuery,
  products,
  setProductQuery,
  totalCount,
}: {
  onCreate: () => void;
  onDelete: (product: ProductSku) => void;
  onEdit: (product: ProductSku) => void;
  productQuery: string;
  products: ProductSku[];
  setProductQuery: (query: string) => void;
  totalCount: number;
}) {
  const tableWidth = productColumns.reduce((total, column) => total + column.width, PRODUCT_ACTION_COLUMN_WIDTH);
  const tableStyle = {
    "--table-min-width": `${tableWidth}px`,
  } as CSSProperties;

  return (
    <section className="table-panel mapping-table-panel">
      <div className="table-panel-head product-table-head">
        <div>
          <h3>产品 SKU 表</h3>
          <p>管理唯一 SKU、商品资料、库存参考字段和供应商信息。</p>
        </div>
        <div className="product-table-actions">
          <label className="product-search">
            <Search size={15} />
            <input placeholder="搜索 SKU、商品名、店铺或供应商" value={productQuery} onChange={(event) => setProductQuery(event.target.value)} />
          </label>
          <button onClick={onCreate}>
            <Plus size={16} />
            新增 SKU
          </button>
          <span className="table-count">{products.length === totalCount ? `${totalCount} 个` : `${products.length}/${totalCount} 个`}</span>
        </div>
      </div>
      <div className="mapping-table-scroll">
        <table className="mapping-data-table product-data-table" style={tableStyle}>
          <colgroup>
            {productColumns.map((column) => (
              <col key={column.key} style={{ width: `${column.width}px` }} />
            ))}
            <col style={{ width: `${PRODUCT_ACTION_COLUMN_WIDTH}px` }} />
          </colgroup>
          <thead>
            <tr>
              {productColumns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {products.length ? (
              products.map((product) => {
                const normalizedProduct = normalizeProductSku(product);

                return (
                  <tr key={normalizedProduct.id}>
                    {productColumns.map((column) => (
                      <td
                        className={normalizedProduct[column.key] ? "" : "empty-cell"}
                        key={column.key}
                        title={column.key === "warehouseStocks" ? "" : String(normalizedProduct[column.key] || "")}
                      >
                        {renderProductCell(normalizedProduct, column.key)}
                      </td>
                    ))}
                    <td>
                      <div className="row-actions">
                        <button className="edit-action" onClick={() => onEdit(normalizedProduct)}>
                          <Pencil size={14} />
                          编辑
                        </button>
                        <button className="delete-action" onClick={() => onDelete(normalizedProduct)}>
                          <Trash2 size={14} />
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="mapping-empty-cell" colSpan={productColumns.length + 1}>
                  <div className="mapping-empty">
                    <Package size={22} />
                    <strong>还没有 SKU 资料</strong>
                    <span>可以手动新增 SKU，也可以先导入 SHEIN 订单，让系统自动生成待补全草稿。</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function renderProductCell(product: ProductSku, key: keyof ProductSku) {
  if (key === "warehouseStocks") {
    return <WarehouseStockCell stocks={product.warehouseStocks} />;
  }

  if (key === "status") {
    return (
      <div className="product-status-stack">
        <span className={`status-pill ${product.status === "已确认" ? "confirmed" : "draft"}`}>{product.status}</span>
        <span className="source-pill">{product.source}</span>
      </div>
    );
  }

  const value = product[key];

  return value ? String(value) : <span aria-hidden="true" />;
}

function WarehouseStockCell({ stocks }: { stocks: ProductWarehouseStock[] }) {
  return (
    <div className="warehouse-stock-cell">
      {stocks.map((stock) => (
        <div className="warehouse-stock-row" key={stock.warehouseName}>
          <strong>{stock.warehouseName}</strong>
          <span>在库 {stock.totalStock || "-"}</span>
          <span>路上 {stock.transitStock || "-"}</span>
          <span>预警 {stock.warningStandard || "-"}</span>
          <em>{stock.stockStatus || "未设置"}</em>
        </div>
      ))}
    </div>
  );
}

function ProductSkuModal({
  error,
  form,
  isEditing,
  onChange,
  onClose,
  onSubmit,
}: {
  error: string;
  form: ProductSku;
  isEditing: boolean;
  onChange: (field: keyof ProductSku, value: ProductSku[keyof ProductSku]) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const normalizedForm = normalizeProductSku(form);

  function onWarehouseChange(
    warehouseName: string,
    field: keyof Omit<ProductWarehouseStock, "warehouseName">,
    value: string
  ) {
    const updatedProduct = updateWarehouseStock(normalizedForm, warehouseName, field, value);
    onChange("warehouseStocks", updatedProduct.warehouseStocks);
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="sku-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={onSubmit}>
        <div className="sku-modal-head">
          <div>
            <span>{isEditing ? "编辑 SKU" : "新增 SKU"}</span>
            <h3>{isEditing ? form.sku || "编辑产品资料" : "创建产品 SKU"}</h3>
          </div>
          <button aria-label="关闭" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="import-error sku-form-error">{error}</div>}

        <div className="sku-form-grid">
          <FormField label="商品SKU" required value={form.sku} onChange={(value) => onChange("sku", value)} />
          <FormField label="商品名称" value={form.productName} onChange={(value) => onChange("productName", value)} />
          <FormField label="发货品名" value={form.shippingName} onChange={(value) => onChange("shippingName", value)} />
          <FormField label="商品图片链接" value={form.imageUrl} onChange={(value) => onChange("imageUrl", value)} />
          <FormField label="店铺名" value={form.storeName} onChange={(value) => onChange("storeName", value)} />
          <FormField label="商品单价" value={form.unitPrice} onChange={(value) => onChange("unitPrice", value)} />
          <FormField label="采购时效" value={form.purchaseLeadTime} onChange={(value) => onChange("purchaseLeadTime", value)} />
          <label className="sku-field wide-field">
            <span>供货商链接</span>
            <input value={form.supplierLink} onChange={(event) => onChange("supplierLink", event.target.value)} />
          </label>
          <section className="warehouse-form-section">
            <div className="warehouse-form-head">
              <span>仓库库存</span>
              <small>固定维护燕郊前置仓、日本海外仓两套库存参考字段</small>
            </div>
            {normalizedForm.warehouseStocks.map((stock) => (
              <div className="warehouse-form-card" key={stock.warehouseName}>
                <strong>{stock.warehouseName}</strong>
                <FormField
                  label="在库总库存"
                  value={stock.totalStock}
                  onChange={(value) => onWarehouseChange(stock.warehouseName, "totalStock", value)}
                />
                <FormField
                  label="路上库存"
                  value={stock.transitStock}
                  onChange={(value) => onWarehouseChange(stock.warehouseName, "transitStock", value)}
                />
                <FormField
                  label="库存预警标准"
                  value={stock.warningStandard}
                  onChange={(value) => onWarehouseChange(stock.warehouseName, "warningStandard", value)}
                />
                <FormField
                  label="库存状态"
                  value={stock.stockStatus}
                  onChange={(value) => onWarehouseChange(stock.warehouseName, "stockStatus", value)}
                />
              </div>
            ))}
          </section>
          <label className="sku-field">
            <span>状态</span>
            <select value={form.status} onChange={(event) => onChange("status", event.target.value)}>
              <option value="已确认">已确认</option>
              <option value="待补全">待补全</option>
            </select>
          </label>
        </div>

        <div className="sku-modal-actions">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary-action" type="submit">
            保存 SKU
          </button>
        </div>
      </form>
    </div>
  );
}

function FormField({
  label,
  onChange,
  required,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="sku-field">
      <span>
        {label}
        {required && <b>*</b>}
      </span>
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <article className="feature-card">
      <div className="feature-topline">
        <span>{feature.tag || "模块"}</span>
        <ShieldCheck size={16} />
      </div>
      <h3>{feature.title}</h3>
      <p>{feature.description}</p>
    </article>
  );
}

function PlaceholderTable({ page }: { page: PageConfig }) {
  const gridStyle = {
    "--column-count": page.tableColumns.length,
    "--table-min-width": `${Math.max(760, page.tableColumns.length * 152)}px`,
  } as CSSProperties;

  return (
    <section className="table-panel">
      <div className="table-panel-head">
        <div>
          <h3>{page.tableTitle}</h3>
          <p>当前为空壳结构，后续在这里接入真实数据。</p>
        </div>
        <button disabled>
          <Plus size={16} />
          新增记录
        </button>
      </div>
      <div className="placeholder-table" style={gridStyle}>
        <div className="placeholder-row header">
          {page.tableColumns.map((column) => (
            <span key={column}>{column}</span>
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, rowIndex) => (
          <div className="placeholder-row" key={rowIndex}>
            {page.tableColumns.map((column, colIndex) => (
              <i key={`${column}-${colIndex}`} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function SheinMappingTable({ page, result }: { page: PageConfig; result: SheinOrderMappingResult | null }) {
  const tableWidth = sheinMappedColumns.reduce((total, column) => total + column.width, 0);
  const tableStyle = {
    "--table-min-width": `${tableWidth}px`,
  } as CSSProperties;

  return (
    <section className="table-panel mapping-table-panel">
      <div className="table-panel-head">
        <div>
          <h3>{page.tableTitle}</h3>
          <p>{result ? "已按冰域 ERP 自定义运营表头生成预览。" : "导入 SHEIN 订单 Excel 后，会在这里展示完整映射结果。"}</p>
        </div>
        <span className="table-count">{result ? `${result.mappedRows} 条` : "未导入"}</span>
      </div>
      <div className="mapping-table-scroll">
        <table className="mapping-data-table" style={tableStyle}>
          <colgroup>
            {sheinMappedColumns.map((column) => (
              <col key={column.key} style={{ width: `${column.width}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr className="mapping-group-header">
              <th>物流部分配</th>
              <th colSpan={sheinMappedColumns.length - 1}>订单处理模块</th>
            </tr>
            <tr>
              {sheinMappedColumns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result ? (
              result.rows.map((row) => (
                <tr key={row.id}>
                  {sheinMappedColumns.map((column) => (
                    <td className={row[column.key] ? "" : "empty-cell"} key={column.key} title={row[column.key]}>
                      {row[column.key] || <span aria-hidden="true" />}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="mapping-empty-cell" colSpan={sheinMappedColumns.length}>
                  <div className="mapping-empty">
                    <FileInput size={22} />
                    <strong>还没有导入数据</strong>
                    <span>上传 SHEIN 订单 Excel 后，系统会把原始订单映射成这张运营表。</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
