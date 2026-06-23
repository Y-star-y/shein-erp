# 冰域 ERP

轻量跨境电商 ERP V1，覆盖 SHEIN Excel 订单导入、SKU 映射、发货出库、多仓库存、补货建议、采购物流、分批到货、异常中心和 Excel 导出。

## 本地启动

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。默认使用浏览器本地存储，可直接体验全部业务流程。

## PostgreSQL 部署

```bash
cp .env.example .env
docker compose up --build
```

Prisma 数据模型位于 `prisma/schema.prisma`。接入服务端数据库时执行：

```bash
npm run db:generate
npm run db:migrate
```

## Excel 导入

支持 SHEIN 原始订单模板，也支持本项目参考工作簿中的 `02_SHEIN订单粘贴` 工作表。必须包含 `GSP订单号`、`卖家SKU`、`商品名称` 等字段。

参考工作簿更新后，可重新生成初始化数据：

```bash
python3 scripts/extract_reference.py "/完整路径/跨境电商ERP_WPS完整业务版.xlsx"
```

## 角色

数据模型预设管理员、运营、仓库和采购四种角色。当前演示版以管理员身份展示全部模块。
