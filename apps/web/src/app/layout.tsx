import { AntdRootProvider } from "@/components/antd-root-provider";
import { AppSessionProvider } from "@/components/session-provider";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import type { Metadata } from "next";
import "antd/dist/reset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "冰域 ERP",
  description: "轻量跨境电商 ERP",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body suppressHydrationWarning>
        <AppSessionProvider>
          <AntdRegistry>
            <AntdRootProvider>{children}</AntdRootProvider>
          </AntdRegistry>
        </AppSessionProvider>
      </body>
    </html>
  );
}
