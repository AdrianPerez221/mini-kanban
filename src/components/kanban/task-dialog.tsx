"use client";

import { useEffect, useMemo } from "react";
import type { Priority, Status } from "@/types";
import { useBoard } from "@/components/providers/board-provider";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clamp, safeTrim } from "@/lib/utils";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const FormSchema = z.object({
  titulo: z.string().min(3, "Mínimo 3 caracteres"),
  descripcion: z.string().optional(),
  prioridad: z.enum(["low", "medium", "high"]),
  tags: z.string().optional(), // coma separada
  estimacionMin: z.number().min(0),
  fechaLimite: z.string().optional(), // ISO o vacío

  observacionesJavi: z.string().optional(),
  rubricaScore: z.number().optional(),
  rubricaComentario: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

export default function TaskDialog({
  open,
  mode,
  status,
  taskId,
  onOpenChange,
}: {
  open: boolean;
  mode: "create" | "edit";
  status?: Status;
  taskId?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, dispatch } = useBoard();
  const task = taskId ? state.tasks[taskId] : undefined;

  const defaultValues: FormValues = useMemo(() => {
    if (mode === "edit" && task) {
      return {
        titulo: task.titulo,
        descripcion: task.descripcion ?? "",
        prioridad: task.prioridad,
        tags: task.tags.join(", "),
        estimacionMin: task.estimacionMin,
        fechaLimite: task.fechaLimite ?? "",

        observacionesJavi: task.observacionesJavi ?? "",
        rubricaScore: task.rubricaScore,
        rubricaComentario: task.rubricaComentario ?? "",
      };
    }
    return {
      titulo: "",
      descripcion: "",
      prioridad: "medium",
      tags: "",
      estimacionMin: 30,
      fechaLimite: "",

      observacionesJavi: "",
      rubricaScore: undefined,
      rubricaComentario: "",
    };
  }, [mode, task]);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues,
    mode: "onChange",
  });

  const prioridad = useWatch({ control: form.control, name: "prioridad" });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const submit = (v: FormValues) => {
    const tags = (v.tags ?? "")
      .split(",")
      .map((t) => safeTrim(t))
      .filter((t) => t.length > 0);

    const input = {
      titulo: safeTrim(v.titulo),
      descripcion: v.descripcion?.trim() || undefined,
      prioridad: v.prioridad as Priority,
      tags,
      estimacionMin: Math.max(0, v.estimacionMin),
      fechaLimite: v.fechaLimite?.trim() ? new Date(v.fechaLimite).toISOString() : undefined,

      observacionesJavi: v.observacionesJavi?.trim() || undefined,
      rubricaScore: v.rubricaScore === undefined ? undefined : clamp(v.rubricaScore, 0, 10),
      rubricaComentario: v.rubricaComentario?.trim() || undefined,
    };

    if (mode === "create") {
      dispatch({ type: "CREATE_TASK", status: status ?? "todo", input });
      toast.success("Tarea creada");
    } else if (mode === "edit" && taskId) {
      dispatch({ type: "UPDATE_TASK", id: taskId, input });
      toast.success("Tarea actualizada");
    }

    onOpenChange(false);
  };

  const title = mode === "create" ? "Nueva orden" : "Editar orden";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-label={title}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(submit)}
        >
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" {...form.register("titulo")} aria-label="Título" />
            {form.formState.errors.titulo ? (
              <div className="text-xs text-destructive">{form.formState.errors.titulo.message}</div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea id="descripcion" {...form.register("descripcion")} aria-label="Descripción" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select
                value={prioridad}
                onValueChange={(v) =>
                  form.setValue("prioridad", v as FormValues["prioridad"], { shouldValidate: true })
                }
              >
                <SelectTrigger aria-label="Prioridad">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">low</SelectItem>
                  <SelectItem value="medium">medium</SelectItem>
                  <SelectItem value="high">high</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimacionMin">Estimación (min)</Label>
              <Input
                id="estimacionMin"
                type="number"
                {...form.register("estimacionMin", { valueAsNumber: true })}
                aria-label="Estimación en minutos"
              />
              {form.formState.errors.estimacionMin ? (
                <div className="text-xs text-destructive">{String(form.formState.errors.estimacionMin.message)}</div>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (separados por coma)</Label>
            <Input id="tags" {...form.register("tags")} aria-label="Tags" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaLimite">Fecha límite (opcional)</Label>
            <Input id="fechaLimite" type="datetime-local" {...form.register("fechaLimite")} aria-label="Fecha límite" />
          </div>

          {state.settings.godMode ? (
            <div className="rounded-md border p-3 space-y-3">
              <div className="text-sm font-medium">Modo Dios</div>
              <div className="space-y-2">
                <Label htmlFor="observacionesJavi">Observaciones de Javi</Label>
                <Textarea id="observacionesJavi" {...form.register("observacionesJavi")} aria-label="Observaciones de Javi" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="rubricaScore">Rúbrica (0–10)</Label>
                  <Input id="rubricaScore" type="number" step="1" {...form.register("rubricaScore", { valueAsNumber: true, setValueAs: (v) => (v === "" ? undefined : Number(v)) })} aria-label="Rúbrica" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rubricaComentario">Comentario</Label>
                  <Input id="rubricaComentario" {...form.register("rubricaComentario")} aria-label="Comentario rúbrica" />
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} aria-label="Cancelar">
              Cancelar
            </Button>
            <Button type="submit" aria-label="Guardar">
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

