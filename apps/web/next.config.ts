import path from "path";
import type { NextConfig } from "next";

// Standalone is required for Docker (Linux). On Windows, `next build` fails with
// EPERM when creating symlinks unless Developer Mode / admin is enabled.
const nextConfig: NextConfig = {
  ...(process.platform !== "win32" ? { output: "standalone" as const } : {}),
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
