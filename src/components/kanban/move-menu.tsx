"use client";

import type { Status, Task } from "@/types";
import { useBoard } from "@/components/providers/board-provider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const options: Array<{ label: string; value: Status }> = [
  { label: "Mover a Todo", value: "todo" },
  { label: "Mover a Doing", value: "doing" },
  { label: "Mover a Done", value: "done" },
];

export default function MoveMenu({ task }: { task: Task }) {
  const { dispatch } = useBoard();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Mover tarea (menú accesible)">
          ⇄
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-2">
        <div className="text-xs text-muted-foreground mb-2">
          Alternativa accesible a Drag & Drop
        </div>
        <div className="flex flex-col gap-1">
          {options.map((o) => (
            <Button
              key={o.value}
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: "MOVE_TASK", id: task.id, to: o.value, index: 0 })}
              aria-label={o.label}
            >
              {o.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
