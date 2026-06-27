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
# 编辑 .env，设置 AUTH_SECRET（可用 openssl rand -base64 32 生成）
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`apps/web/.env.example` 已默认指向局域网共享 PostgreSQL，并包含鉴权相关变量：

```env
DATABASE_URL="postgresql://erp:erp@192.168.110.16:5432/shein_db?schema=public"
AUTH_SECRET="replace-with-a-random-secret"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="change-me-on-first-login"
ADMIN_NAME="超级管理员"
```

打开 `http://localhost:3000`，未登录时会自动跳转到 `/login`。使用 seed 创建的超管账号登录（默认 `admin@example.com` / `change-me-on-first-login`，可在 `.env` 中修改后重新执行 `pnpm db:seed`）。

`pnpm dev` 会自动执行 `prisma generate` 生成 Prisma Client。若需要单独排查 Prisma Client，可手动运行：

```bash
pnpm db:generate
```

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
pnpm db:seed
```

## 登录与鉴权

基于 [Auth.js v5](https://authjs.dev)（JWT Session，默认 8 小时）实现邮箱密码登录：

- 登录页：`/login`（可选企业微信 SSO，见 `.env.example` 中 `WEWORK_*`）
- 忘记密码：`/forgot-password` → 内网未配 `SMTP_HOST` 时，重置链接显示在页面及服务端终端（链接主机取自 `AUTH_URL`，请设为局域网地址如 `http://192.168.x.x:3000`）；配置 SMTP 后改为发邮件，不再在页面暴露链接
- 首登/管理员重置后强制改密：`/change-password-required`
- 登录成功/失败、退出、重置密码等写入 PostgreSQL 审计日志
- 连续 5 次密码错误锁定 15 分钟
- 登录失败 1 次后需输入验证码（按邮箱 + 浏览器 Cookie）；同一邮箱 1 小时内密码错误 3 次则锁定至窗口结束，管理员可在员工管理页「解除锁定」
- 路由保护：Middleware 拦截未登录访问，业务 API 额外校验 Session
- 内置超管：通过 `pnpm db:seed` 写入，角色为 `ADMIN`，首次登录需改密

**首次部署建议：**

1. 在 `.env` 中设置强随机 `AUTH_SECRET`
2. 修改 `ADMIN_PASSWORD` 后执行 `pnpm db:seed`
3. 生产环境请尽快修改默认超管密码

如果 3000 端口被占用，Next.js 会自动切换到其他端口。

## Excel 导入

支持 SHEIN 原始订单模板，也支持本项目参考工作簿中的 `02_SHEIN订单粘贴` 工作表。必须包含 `GSP订单号`、`卖家SKU`、`商品名称` 等字段。

参考工作簿更新后，可重新生成初始化数据：

```bash
python3 scripts/extract_reference.py "/完整路径/跨境电商ERP_WPS完整业务版.xlsx"
```

## 角色与员工管理

系统角色分为三类：

| 角色 | 说明 |
|------|------|
| `ADMIN` | 超级管理员，可访问全部模块及「员工管理」 |
| `OPERATIONS` | 运营部员工 |
| `LOGISTICS` | 物流部员工 |

管理员在 **系统管理 → 员工管理** 中创建员工账户，分配部门与模块权限：

- **运营部默认**：商品管理、店铺管理、库存管理、订单管理、SHEIN映射
- **物流部默认**：仓库管理
- 创建时可勾选/取消模块，覆盖部门默认

权限变更后员工需 **重新登录** 后生效（JWT Session）。禁用账户后 **立即失效** 其现有会话（约 5 秒内自动跳转登录页，API 请求即时拒绝）。
