"use client";

import dynamic from "next/dynamic";

const AuditTable = dynamic(() => import("@/components/audit/audit-table"), {
  ssr: false,
  loading: () => (
    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      Cargando auditoría…
    </div>
  ),
});

export default function AuditClient() {
  return <AuditTable />;
}
