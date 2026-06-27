"use client";

import { appTheme } from "@/lib/antd-theme";
import { ConfigProvider } from "antd";
import type { ReactNode } from "react";

export function AntdRootProvider({ children }: { children: ReactNode }) {
  return <ConfigProvider theme={appTheme}>{children}</ConfigProvider>;
}
