"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Status, Task } from "@/types";
import TaskCard from "./task-card";
import { Button } from "@/components/ui/button";

const labels: Record<Status, string> = {
  todo: "Todo",
  doing: "Doing",
  done: "Done",
};

export default function Column({
  status,
  tasks,
  onCreate,
  onEdit,
}: {
  status: Status;
  tasks: Task[];
  onCreate: () => void;
  onEdit: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });

  return (
    <section
      ref={setNodeRef}
      className={`rounded-lg border p-3 space-y-3 ${isOver ? "ring-2 ring-ring" : ""}`}
      aria-label={`Columna ${labels[status]}`}
    >
      <header className="flex items-center justify-between">
        <div className="font-semibold">{labels[status]}</div>
        <Button size="sm" onClick={onCreate} aria-label={`Crear tarea en ${labels[status]}`}>
          + Crear
        </Button>
      </header>

      {tasks.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          <div className="font-medium text-foreground">Nada aquí todavía</div>
          <div className="mt-1">
            Crea una orden o arrastra una tarea a esta columna.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} onEdit={() => onEdit(t.id)} />
          ))}
        </div>
      )}
    </section>
  );
}
