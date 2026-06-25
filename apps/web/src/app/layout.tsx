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
      <body>{children}</body>
    </html>
  );
}
