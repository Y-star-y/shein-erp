# 冰域 ERP

轻量跨境电商 ERP V1，覆盖 SHEIN Excel 订单导入、SKU 映射、发货出库、多仓库存、补货建议、采购物流、分批到货、异常中心和 Excel 导出。

## Monorepo 结构

```
apps/web                    Next.js 壳应用（路由、布局、组装各模块）
packages/
  shared                    共享类型、UI 组件、全局状态（ErpProvider）
  ops-console               运营台（仪表盘、指标、维护记录）
  company-sku               公司 SKU（主档 CRUD、校验）
  platform-mapping          平台映射（关联公司 SKU、SHEIN 字段）
  core                      通用业务逻辑与 Excel 解析
```

### 模块依赖

```
apps/web
  ├── ops-console ──┬── company-sku ── shared
  │                 └── platform-mapping ──┘
  └── core
```

三个业务包通过 `@shein-erp/shared` 的 `ErpProvider` 共享状态（公司 SKU、平台映射、维护记录、Toast 等），并相互引用：

- **运营台** 读取公司 SKU / 平台映射统计，跳转至对应模块
- **平台映射** 引用 `company-sku` 的 `resolveCompanySkuState` 校验关联 SKU 状态
- **公司 SKU** 列表展示各 SKU 的映射数量

## 本地启动

```bash
pnpm install
cp apps/web/.env.example apps/web/.env
pnpm dev
```

`apps/web/.env.example` 已默认指向局域网共享 PostgreSQL：

```env
DATABASE_URL="postgresql://erp:erp@192.168.110.16:5432/shein_db?schema=public"
```

打开 `http://localhost:3000`。如果 3000 端口被占用，Next.js 会自动切换到其他端口。

## PostgreSQL 部署

本项目的 Next.js / Prisma 应用读取 `apps/web/.env` 中的 `DATABASE_URL`。`pnpm dev` 本地开发时，请确保数据库名为 `shein_db`，不是旧示例中的 `shein_erp`。

验证当前机器能连接共享 PostgreSQL：

```powershell
Test-NetConnection 192.168.110.16 -Port 5432
pnpm --filter @shein-erp/web exec prisma migrate status --schema .\prisma\schema.prisma
```

Docker Compose 是独立部署方案，会启动自己的 PostgreSQL 容器，不会默认连接局域网共享数据库：

```bash
cp .env.example .env
docker compose up --build
```

Prisma 数据模型位于 `apps/web/prisma/schema.prisma`。接入服务端数据库时执行：

```bash
pnpm db:generate
pnpm db:migrate
```

## Excel 导入

支持 SHEIN 原始订单模板，也支持本项目参考工作簿中的 `02_SHEIN订单粘贴` 工作表。必须包含 `GSP订单号`、`卖家SKU`、`商品名称` 等字段。

参考工作簿更新后，可重新生成初始化数据：

```bash
python3 scripts/extract_reference.py "/完整路径/跨境电商ERP_WPS完整业务版.xlsx"
```

## 角色

数据模型预设管理员、运营、仓库和采购四种角色。当前演示版以管理员身份展示全部模块。
