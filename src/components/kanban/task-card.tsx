"use client";

import { useMemo, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBoard } from "@/components/providers/board-provider";
import MoveMenu from "./move-menu";

function priorityVariant(p: Task["prioridad"]): "secondary" | "default" | "destructive" {
  if (p === "low") return "secondary";
  if (p === "medium") return "default";
  return "destructive";
}

type DueLabel = { text: string; tone: "destructive" | "default" | "secondary" };

function getDueLabel(task: Task, now: number): DueLabel | null {
  if (!task.fechaLimite) return null;
  const d = new Date(task.fechaLimite);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.ceil((d.getTime() - now) / (24 * 3600 * 1000));
  if (days < 0) return { text: `Vencida (${Math.abs(days)}d)`, tone: "destructive" };
  if (days <= 3) return { text: `Vence en ${days}d`, tone: "default" };
  return { text: `Vence en ${days}d`, tone: "secondary" };
}

export default function TaskCard({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const { state, dispatch } = useBoard();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const [now] = useState(() => Date.now());

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const dueLabel = useMemo(() => getDueLabel(task, now), [task, now]);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="rounded-md border bg-background p-3 shadow-sm focus-within:ring-2 focus-within:ring-ring"
      aria-label={`Tarea ${task.titulo}`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          className="text-left flex-1"
          onClick={onEdit}
          aria-label="Editar tarea"
        >
          <div className="font-medium leading-snug">{task.titulo}</div>
          {task.descripcion ? (
            <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {task.descripcion}
            </div>
          ) : null}
        </button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Arrastrar tarea"
            {...attributes}
            {...listeners}
          >
            ⠿
          </Button>
          <MoveMenu task={task} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant={priorityVariant(task.prioridad)}>{task.prioridad}</Badge>
        <Badge variant="outline">{task.estimacionMin} min</Badge>
        {dueLabel ? <Badge variant={dueLabel.tone}>{dueLabel.text}</Badge> : null}
      </div>

      {task.tags.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.slice(0, 6).map((t) => (
            <Badge key={t} variant="secondary">
              #{t}
            </Badge>
          ))}
        </div>
      ) : null}

      {state.settings.godMode ? (
        <div className="mt-3 rounded-md border p-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <div className="font-medium text-foreground">Observaciones de Javi</div>
            <div>
              {task.rubricaScore === undefined ? (
                <span className="text-destructive">Sin evaluar</span>
              ) : (
                <span className="text-foreground">Score: {task.rubricaScore}/10</span>
              )}
            </div>
          </div>
          {task.observacionesJavi ? <div className="mt-1">{task.observacionesJavi}</div> : <div className="mt-1 italic">—</div>}
          {task.rubricaComentario ? <div className="mt-1">📝 {task.rubricaComentario}</div> : null}
        </div>
      ) : null}

      <div className="mt-3 flex justify-end">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => dispatch({ type: "DELETE_TASK", id: task.id })}
          aria-label="Borrar tarea"
        >
          Borrar
        </Button>
      </div>
    </article>
  );
}

export function TaskCardOverlay({ task }: { task: Task }) {
  const [now] = useState(() => Date.now());
  const dueLabel = useMemo(() => getDueLabel(task, now), [task, now]);

  return (
    <article className="rounded-md border bg-background p-3 shadow-md">
      <div className="font-medium leading-snug">{task.titulo}</div>
      {task.descripcion ? (
        <div className="mt-1 text-sm text-muted-foreground line-clamp-2">
          {task.descripcion}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant={priorityVariant(task.prioridad)}>{task.prioridad}</Badge>
        <Badge variant="outline">{task.estimacionMin} min</Badge>
        {dueLabel ? <Badge variant={dueLabel.tone}>{dueLabel.text}</Badge> : null}
      </div>

      {task.tags.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.slice(0, 6).map((t) => (
            <Badge key={t} variant="secondary">
              #{t}
            </Badge>
          ))}
        </div>
      ) : null}
    </article>
  );
}
