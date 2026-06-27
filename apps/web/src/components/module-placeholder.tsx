"use client";

import { EmptyBlock, Panel } from "@shein-erp/shared";
import { Construction } from "lucide-react";

export function ModulePlaceholder({
  title,
  text,
}: {
  title: string;
  text?: string;
}) {
  return (
    <div className="page-stack">
      <Panel title={title}>
        <EmptyBlock
          icon={<Construction size={22} />}
          title="功能开发中"
          text={text ?? "该模块将在后续版本开放，权限已预留。"}
        />
      </Panel>
    </div>
  );
}