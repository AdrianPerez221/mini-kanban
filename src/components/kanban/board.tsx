"use client";

import Link from "next/link";
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMemo, useState } from "react";
import type { Status, Task } from "@/types";
import { useBoard } from "@/components/providers/board-provider";
import Column from "./column";
import TaskDialog from "./task-dialog";
import SearchBar from "./search-bar";
import IntegrityDialog from "./integrity-dialog";
import GodPanel from "./god-panel";
import { TaskCardOverlay } from "./task-card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { parseQuery, applyQuery, sortByOrder } from "@/lib/query";
import { downloadJson } from "@/lib/utils";
import { exportState, importStateStrict } from "@/lib/storage";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type ActiveModal = { mode: "create"; status: Status } | { mode: "edit"; taskId: string } | null;

export default function Board() {
  const { state, dispatch } = useBoard();
  const [modal, setModal] = useState<ActiveModal>(null);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const ast = useMemo(() => parseQuery(query), [query]);
  const allTasks = useMemo(() => Object.values(state.tasks), [state.tasks]);
  const filteredIds = useMemo(() => new Set(applyQuery(allTasks, ast).map((t) => t.id)), [allTasks, ast]);
  const activeTask = activeId ? state.tasks[activeId] : null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const tasksByStatus = (status: Status): Task[] => {
    const tasks = Object.values(state.tasks).filter((t) => t.estado === status && filteredIds.has(t.id));
    return sortByOrder(tasks, state.order[status]);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const activeId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;

    if (!overId) return;

    // droppable ids: "col:todo" / "col:doing" / "col:done" o task ids
    const overIsCol = overId.startsWith("col:");
    const to: Status | null = overIsCol ? (overId.replace("col:", "") as Status) : null;

    const activeTask = state.tasks[activeId];
    if (!activeTask) return;

    if (to) {
      dispatch({ type: "MOVE_TASK", id: activeId, to, index: 0 });
      toast.success("Tarea movida");
      return;
    }

    // si se arrastra sobre otra tarea, inferimos columna destino por esa tarea
    const overTask = state.tasks[overId];
    if (!overTask) return;
    const toStatus = overTask.estado;

    // calcular índice destino dentro de esa columna, usando el orden actual
    const list = state.order[toStatus].filter((x) => x !== activeId);
    const idx = list.indexOf(overId);
    const insertIndex = idx === -1 ? 0 : idx;

    dispatch({ type: "MOVE_TASK", id: activeId, to: toStatus, index: insertIndex });
    toast.success("Tarea movida");
  };

  const handleExport = () => {
    const payload = exportState(state);
    downloadJson(`kanban-export-${new Date().toISOString().slice(0, 10)}.json`, payload);
    toast.success("Exportado a JSON");
  };

  const [importErrors, setImportErrors] = useState<string[] | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const res = importStateStrict(state.audit, json);
      if (!res.ok) {
        setImportErrors(res.errors);
        setImportOpen(true);
        toast.error("Importación fallida");
        return;
      }
      dispatch({ type: "IMPORT_STATE", state: res.state });
      toast.success("Importación completada");
    } catch {
      setImportErrors(["Archivo inválido o JSON mal formado"]);
      setImportOpen(true);
      toast.error("Importación fallida");
    }
  };

  const openImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) void handleImportFile(file);
    };
    input.click();
  };

  const openCreate = (status: Status) => setModal({ mode: "create", status });
  const openEdit = (id: string) => setModal({ mode: "edit", taskId: id });

  const title = "Órdenes de mantenimiento (mini Kanban)";

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">
              Tablero tipo Trello para organizar órdenes de mantenimiento por estado, con búsqueda avanzada, auditoría de cambios y Modo Dios para revisión y seguimiento.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/audit">Auditoría</Link>
            </Button>
            <Button variant="outline" onClick={handleExport} aria-label="Exportar JSON">
              Exportar
            </Button>
            <Button variant="outline" onClick={openImport} aria-label="Importar JSON">
              Importar
            </Button>
          </div>
        </header>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <SearchBar value={query} onChange={setQuery} warnings={ast.warnings} />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={state.settings.godMode}
                onCheckedChange={(v) => dispatch({ type: "SET_GODMODE", value: v })}
                aria-label="Activar Modo Dios"
              />
              <span className="text-sm">Modo Dios</span>
            </div>
            <IntegrityDialog />
          </div>
        </div>
      </div>

      {state.settings.godMode ? <GodPanel /> : null}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <DndContext
          sensors={sensors}
          onDragStart={({ active }) => setActiveId(String(active.id))}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={onDragEnd}
        >
          {(["todo", "doing", "done"] as Status[]).map((status) => {
            const ids = state.order[status].filter((id) => filteredIds.has(id));
            return (
              <SortableContext key={status} items={ids} strategy={verticalListSortingStrategy}>
                <Column
                  status={status}
                  tasks={tasksByStatus(status)}
                  onCreate={() => openCreate(status)}
                  onEdit={openEdit}
                />
              </SortableContext>
            );
          })}
          <DragOverlay>
            {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      <TaskDialog
        open={modal !== null}
        mode={modal?.mode ?? "create"}
        status={modal?.mode === "create" ? modal.status : undefined}
        taskId={modal?.mode === "edit" ? modal.taskId : undefined}
        onOpenChange={(o) => setModal(o ? modal : null)}
      />

      <AlertDialog open={importOpen} onOpenChange={setImportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No se pudo importar</AlertDialogTitle>
            <AlertDialogDescription>
              {importErrors?.length ? (
                <div className="mt-2 max-h-56 overflow-auto rounded border p-2 text-xs">
                  <ul className="list-disc pl-5 space-y-1">
                    {importErrors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Cerrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
