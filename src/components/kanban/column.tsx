"use client";

import { useDndContext, useDroppable } from "@dnd-kit/core";
import type { Status, Task } from "@/types";
import TaskCard from "./task-card";
import { Button } from "@/components/ui/button";

const labels: Record<Status, string> = {
  todo: "To do",
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
  const { over } = useDndContext();
  const overId = over?.id ? String(over.id) : null;
  const isOverColumn = isOver || (overId ? tasks.some((t) => t.id === overId) : false);

  return (
    <section
      ref={setNodeRef}
      className={`relative overflow-hidden rounded-xl border bg-card p-3 shadow-sm space-y-3 ${isOverColumn ? "ring-2 ring-ring after:absolute after:inset-0 after:rounded-xl after:bg-muted/40 after:content-[''] after:pointer-events-none" : ""}`}
      aria-label={`Columna ${labels[status]}`}
    >
      <header className="flex items-center justify-between gap-2 border-b pb-2">
        <div className={isOverColumn ? "text-sm font-semibold" : "text-sm font-medium text-muted-foreground"}>
          {labels[status]}
        </div>
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
        <div className="space-y-3">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} onEdit={() => onEdit(t.id)} />
          ))}
        </div>
      )}
    </section>
  );
}
