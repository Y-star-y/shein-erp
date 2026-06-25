import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@shein-erp/shared",
    "@shein-erp/company-sku",
    "@shein-erp/platform-mapping",
    "@shein-erp/ops-console",
    "@shein-erp/core",
  ],
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
