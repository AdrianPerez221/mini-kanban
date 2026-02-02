"use client";

import { useMemo } from "react";
import { useBoard } from "@/components/providers/board-provider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function GodPanel() {
  const { state } = useBoard();
  const tasks = useMemo(() => Object.values(state.tasks), [state.tasks]);

  const scored = tasks.filter((t) => typeof t.rubricaScore === "number");
  const unscored = tasks.filter((t) => t.rubricaScore === undefined);

  const avg =
    scored.length === 0
      ? null
      : Math.round((scored.reduce((a, b) => a + (b.rubricaScore ?? 0), 0) / scored.length) * 10) / 10;

  return (
    <section className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold">Panel resumen (Modo Dios)</div>
          <div className="text-sm text-muted-foreground mt-1">
            Media y pendientes de evaluación.
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => toast.message("Tip", { description: "Evalúa desde Editar orden → Rúbrica (0–10)." })}
          aria-label="Ayuda del panel Modo Dios"
        >
          Ayuda
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Media</div>
          <div className="text-2xl font-semibold">{avg === null ? "—" : avg}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Evaluadas</div>
          <div className="text-2xl font-semibold">{scored.length}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">Sin evaluar</div>
          <div className="text-2xl font-semibold">{unscored.length}</div>
        </div>
      </div>

      {unscored.length ? (
        <div className="mt-3 rounded-md border p-3">
          <div className="font-medium">Sin evaluar</div>
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground space-y-1">
            {unscored.slice(0, 6).map((t) => (
              <li key={t.id}>{t.titulo}</li>
            ))}
          </ul>
          {unscored.length > 6 ? (
            <div className="mt-2 text-xs text-muted-foreground">…y {unscored.length - 6} más</div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Todo evaluado. 👌
        </div>
      )}
    </section>
  );
}
