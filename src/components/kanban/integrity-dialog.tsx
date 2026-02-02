"use client";

import { useMemo, useState } from "react";
import { useBoard } from "@/components/providers/board-provider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { safeTrim } from "@/lib/utils";
import type { Task } from "@/types";

type Issue = {
  id: string;
  title: string;
  detail: string;
  fixable: boolean;
  patch?: Partial<Task>;
};

export default function IntegrityDialog() {
  const { state, dispatch } = useBoard();
  const [open, setOpen] = useState(false);

  const issues = useMemo<Issue[]>(() => {
    const out: Issue[] = [];
    for (const t of Object.values(state.tasks)) {
      const titulo = safeTrim(t.titulo);

      if (titulo.length < 3) {
        out.push({
          id: t.id,
          title: "Título demasiado corto",
          detail: `“${t.titulo}”`,
          fixable: true,
          patch: { titulo: "Sin título (revisar)" },
        });
      }

      if (!Number.isFinite(t.estimacionMin) || t.estimacionMin < 0) {
        out.push({
          id: t.id,
          title: "Estimación inválida",
          detail: `estimacionMin=${String(t.estimacionMin)}`,
          fixable: true,
          patch: { estimacionMin: 0 },
        });
      }

      const cleanTags = t.tags.map((x) => safeTrim(x)).filter(Boolean);
      if (cleanTags.length !== t.tags.length) {
        out.push({
          id: t.id,
          title: "Tags con valores vacíos",
          detail: `tags=[${t.tags.join(", ")}]`,
          fixable: true,
          patch: { tags: cleanTags },
        });
      }

      if (t.fechaLimite) {
        const due = new Date(t.fechaLimite).getTime();
        const created = new Date(t.fechaCreacion).getTime();
        if (!Number.isNaN(due) && !Number.isNaN(created) && due < created) {
          // auto-fix: quitar fecha limite (preferible a inventar)
          out.push({
            id: t.id,
            title: "Fecha límite anterior a creación",
            detail: `creación=${t.fechaCreacion} / límite=${t.fechaLimite}`,
            fixable: true,
            patch: { fechaLimite: undefined },
          });
        }
      }
    }
    return out;
  }, [state.tasks]);

  const fixable = issues.filter((i) => i.fixable && i.patch);

  const applyFix = () => {
    if (!fixable.length) {
      toast.message("No hay nada que arreglar");
      return;
    }

    // agrupar por id (por si múltiples issues del mismo id)
    const byId = new Map<string, Partial<Task>>();
    for (const i of fixable) {
      const prev = byId.get(i.id) ?? {};
      byId.set(i.id, { ...prev, ...(i.patch ?? {}) });
    }

    dispatch({
      type: "INTEGRITY_AUTOFIX",
      updates: Array.from(byId.entries()).map(([id, patch]) => ({ id, patch })),
    });

    toast.success("Auto-fix aplicado y auditado");
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" aria-label="Qué hace el Integrity Checker">
            Integrity
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="font-medium">Integrity Checker</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Detecta incoherencias (fechas, tags vacíos, estimación negativa, título corto) y ofrece auto-fix.
            Cada corrección se registra en auditoría.
          </div>
        </PopoverContent>
      </Popover>

      <Button onClick={() => setOpen(true)} aria-label="Abrir Integrity Checker">
        Validar ({issues.length})
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-label="Integrity Checker">
          <DialogHeader>
            <DialogTitle>Integrity Checker</DialogTitle>
          </DialogHeader>

          {issues.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Sin problemas detectados. ✅
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto">
              {issues.map((i, idx) => (
                <div key={`${i.id}-${idx}`} className="rounded-md border p-3">
                  <div className="font-medium">{i.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{i.detail}</div>
                  <div className="text-xs mt-2">
                    {i.fixable ? (
                      <span className="text-foreground">Auto-fix disponible</span>
                    ) : (
                      <span className="text-destructive">No auto-fix</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} aria-label="Cerrar">
              Cerrar
            </Button>
            <Button onClick={applyFix} disabled={fixable.length === 0} aria-label="Aplicar auto-fix">
              Auto-fix ({fixable.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
