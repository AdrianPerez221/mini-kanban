"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useBoard } from "@/components/providers/board-provider";
import type { AuditAction, AuditEvent } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";

const actions: Array<AuditAction | "ALL"> = ["ALL", "CREATE", "UPDATE", "DELETE", "MOVE", "IMPORT_FIXUP"];

function summarize(audit: AuditEvent[]): string {
  if (audit.length === 0) return "Auditoría vacía.";

  const sorted = [...audit].sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  const from = sorted[0].timestamp;
  const to = sorted[sorted.length - 1].timestamp;

  const byAction = new Map<string, number>();
  const byTask = new Map<string, number>();

  for (const e of audit) {
    byAction.set(e.accion, (byAction.get(e.accion) ?? 0) + 1);
    byTask.set(e.taskId, (byTask.get(e.taskId) ?? 0) + 1);
  }

  const topTasks = [...byTask.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const last = [...audit].slice(0, 8); // audit está en orden “más reciente primero” (en nuestro reducer)
  const lastLines = last.map((e) => {
    const diffKeys = [
      ...Object.keys(e.diff.before ?? {}),
      ...Object.keys(e.diff.after ?? {}),
    ].filter((k, i, arr) => arr.indexOf(k) === i && k !== "id");

    return `- [${e.timestamp}] ${e.accion} task=${e.taskId} cambios=${diffKeys.slice(0, 6).join(", ") || "—"}`;
  });

  const actionLines = [...byAction.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v}`);

  const taskLines = topTasks.map(([id, n]) => `- ${id}: ${n} eventos`);

  return [
    `REPORTE DE AUDITORÍA`,
    `Rango: ${from} → ${to}`,
    ``,
    `Eventos por acción:`,
    ...actionLines,
    ``,
    `Top tareas más modificadas:`,
    ...taskLines,
    ``,
    `Últimos eventos:`,
    ...lastLines,
  ].join("\n");
}

export default function AuditTable() {
  const { state } = useBoard();
  const [action, setAction] = useState<AuditAction | "ALL">("ALL");
  const [taskId, setTaskId] = useState("");

  const filtered = useMemo(() => {
    return state.audit.filter((e) => {
      if (action !== "ALL" && e.accion !== action) return false;
      if (taskId.trim() && !e.taskId.includes(taskId.trim())) return false;
      return true;
    });
  }, [state.audit, action, taskId]);

  const copy = async () => {
    const text = summarize(filtered);
    await copyToClipboard(text);
    toast.success("Resumen copiado");
  };

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Auditoría</h1>
          <p className="text-sm text-muted-foreground">
            Filtros por acción / taskId y resumen copiable.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">Volver al tablero</Link>
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={action} onValueChange={(v) => setAction(v as AuditAction | "ALL")}>
          <SelectTrigger className="w-48" aria-label="Filtrar por acción">
            <SelectValue placeholder="Acción" />
          </SelectTrigger>
          <SelectContent>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          placeholder="Filtrar por taskId…"
          className="w-64"
          aria-label="Filtrar por taskId"
        />

        <Button onClick={copy} aria-label="Copiar resumen de auditoría">
          Copiar resumen
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No hay eventos con esos filtros.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>TaskId</TableHead>
                <TableHead>Diff (keys)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 200).map((e, idx) => {
                const keys = [
                  ...Object.keys(e.diff.before ?? {}),
                  ...Object.keys(e.diff.after ?? {}),
                ].filter((k, i, arr) => arr.indexOf(k) === i && k !== "id");

                return (
                  <TableRow key={`${e.timestamp}-${idx}`}>
                    <TableCell className="font-mono text-xs">{e.timestamp}</TableCell>
                    <TableCell>{e.accion}</TableCell>
                    <TableCell className="font-mono text-xs">{e.taskId}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {keys.length ? keys.join(", ") : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtered.length > 200 ? (
            <div className="p-2 text-xs text-muted-foreground">
              Mostrando 200 de {filtered.length} (limite UI).
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
