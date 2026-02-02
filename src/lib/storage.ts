import { z } from "zod";
import type { AuditEvent, BoardState, ImportPayload, Task } from "@/types";
import { clamp, nowISO, safeTrim, uuid } from "./utils";

const StatusSchema = z.enum(["todo", "doing", "done"]);
const PrioritySchema = z.enum(["low", "medium", "high"]);

export const TaskSchema: z.ZodType<Task> = z.object({
  id: z.string().min(1),
  titulo: z.string().min(3),
  descripcion: z.string().optional(),
  prioridad: PrioritySchema,
  tags: z.array(z.string()),
  estimacionMin: z.number(),
  fechaCreacion: z.string(),
  fechaLimite: z.string().optional(),
  estado: StatusSchema,

  observacionesJavi: z.string().optional(),
  rubricaScore: z.number().optional(),
  rubricaComentario: z.string().optional(),
});

export const AuditEventSchema: z.ZodType<AuditEvent> = z.object({
  timestamp: z.string(),
  accion: z.enum(["CREATE", "UPDATE", "DELETE", "MOVE", "IMPORT_FIXUP"]),
  taskId: z.string().min(1),
  diff: z.object({
    before: z.any().optional(),
    after: z.any().optional(),
  }),
  userLabel: z.literal("Alumno/a"),
});

export const BoardOrderSchema = z.object({
  todo: z.array(z.string()),
  doing: z.array(z.string()),
  done: z.array(z.string()),
});

export const BoardSettingsSchema = z.object({
  godMode: z.boolean(),
});

export const BoardStateSchema: z.ZodType<BoardState> = z.object({
  tasks: z.record(z.string(), TaskSchema),
  order: BoardOrderSchema,
  audit: z.array(AuditEventSchema),
  settings: BoardSettingsSchema,
});

export const ImportPayloadSchema: z.ZodType<ImportPayload> = z.object({
  version: z.literal(1),
  tasks: z.record(z.string(), TaskSchema),
  order: BoardOrderSchema,
  audit: z.array(AuditEventSchema),
  settings: BoardSettingsSchema,
});

const STORAGE_KEY = "mini_kanban_v1";

export function defaultState(): BoardState {
  return {
    tasks: {},
    order: { todo: [], doing: [], done: [] },
    audit: [],
    settings: { godMode: false },
  };
}

export function saveState(state: BoardState): void {
  try {
    const payload: ImportPayload = { version: 1, ...state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // si localStorage falla, no rompemos la app
  }
}

export function loadState(): BoardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const res = ImportPayloadSchema.safeParse(parsed);
    if (!res.success) return defaultState();
    return stripOrphanedOrder(res.data);
  } catch {
    return defaultState();
  }
}

function stripOrphanedOrder(payload: ImportPayload): BoardState {
  const ids = new Set(Object.keys(payload.tasks));
  const order = {
    todo: payload.order.todo.filter((id) => ids.has(id)),
    doing: payload.order.doing.filter((id) => ids.has(id)),
    done: payload.order.done.filter((id) => ids.has(id)),
  };
  return { tasks: payload.tasks, order, audit: payload.audit, settings: payload.settings };
}

export function exportState(state: BoardState): ImportPayload {
  return { version: 1, ...state };
}

/**
 * Importa, valida y:
 * - si faltan campos: devuelve errores y no importa
 * - si IDs duplicados: regenera y registra IMPORT_FIXUP por tarea afectada
 */
export function importStateStrict(
  currentAudit: AuditEvent[],
  json: unknown
): { ok: true; state: BoardState; auditAppended: AuditEvent[] } | { ok: false; errors: string[] } {
  const res = ImportPayloadSchema.safeParse(json);
  if (!res.success) {
    const errors = res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return { ok: false, errors };
  }

  const payload = res.data;
  const tasksEntries = Object.entries(payload.tasks);

  // Detectar duplicados por claves (en objeto no puede haber) pero por seguridad, verificamos que id interno coincida y sea único
  const seen = new Set<string>();
  const fixups: AuditEvent[] = [];
  const newTasks: Record<string, Task> = {};
  const idMap = new Map<string, string>(); // old -> new

  for (const [key, task] of tasksEntries) {
    const internalId = safeTrim(task.id);
    let finalId = internalId;

    const keyMismatch = key !== internalId;
    const already = seen.has(finalId);

    if (keyMismatch || already) {
      const regenerated = uuid();
      idMap.set(internalId, regenerated);
      finalId = regenerated;

      fixups.push({
        timestamp: nowISO(),
        accion: "IMPORT_FIXUP",
        taskId: finalId,
        diff: {
          before: { id: internalId },
          after: { id: finalId },
        },
        userLabel: "Alumno/a",
      });
    }

    seen.add(finalId);

    const cleaned: Task = {
      ...task,
      id: finalId,
      titulo: safeTrim(task.titulo),
      tags: task.tags.map((t) => safeTrim(t)).filter((t) => t.length > 0),
      estimacionMin: Number.isFinite(task.estimacionMin) ? Math.max(0, task.estimacionMin) : 0,
      rubricaScore:
        task.rubricaScore === undefined ? undefined : clamp(task.rubricaScore, 0, 10),
    };

    newTasks[finalId] = cleaned;
  }

  const remapList = (ids: string[]) =>
    ids
      .map((id) => idMap.get(id) ?? id)
      .filter((id) => typeof id === "string" && id.length > 0)
      .filter((id, idx, arr) => arr.indexOf(id) === idx)
      .filter((id) => newTasks[id] !== undefined);

  const order = {
    todo: remapList(payload.order.todo),
    doing: remapList(payload.order.doing),
    done: remapList(payload.order.done),
  };

  // Meter tareas no presentes en order al final de su estado
  const inOrder = new Set([...order.todo, ...order.doing, ...order.done]);
  for (const t of Object.values(newTasks)) {
    if (!inOrder.has(t.id)) {
      order[t.estado].push(t.id as string);
    }
  }

  const mergedAudit = [...payload.audit, ...fixups];
  const appended = fixups;

  const state: BoardState = {
    tasks: newTasks,
    order,
    audit: mergedAudit,
    settings: payload.settings,
  };

  return { ok: true, state, auditAppended: appended };
}

export function buildInitialDemoState(): BoardState {
  // Demo de “incidencias de mantenimiento industrial”
  const base = defaultState();
  const mk = (partial: Omit<Task, "id" | "fechaCreacion"> & { id?: string }): Task => {
    const id = partial.id ?? uuid();
    return {
      id,
      fechaCreacion: nowISO(),
      ...partial,
      titulo: safeTrim(partial.titulo),
      tags: partial.tags.map((t) => safeTrim(t)).filter(Boolean),
    };
  };

  const t1 = mk({
    titulo: "Revisar vibración anómala en compresor C-12",
    descripcion: "Ruido metálico al arrancar. Posible desalineación o rodamiento.",
    prioridad: "high",
    tags: ["mecánica", "seguridad", "compresor"],
    estimacionMin: 90,
    fechaLimite: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    estado: "todo",
  });

  const t2 = mk({
    titulo: "Actualizar firmware PLC línea 3",
    descripcion: "Ventana de mantenimiento aprobada. Verificar backup antes.",
    prioridad: "medium",
    tags: ["IT/OT", "PLC", "backup"],
    estimacionMin: 60,
    fechaLimite: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString(),
    estado: "doing",
  });

  const t3 = mk({
    titulo: "Calibración sensor de peso estación empaquetado",
    descripcion: "Desviación de 1.2%. Registrar certificado y lote.",
    prioridad: "low",
    tags: ["calidad", "metrología"],
    estimacionMin: 45,
    estado: "done",
  });

  base.tasks[t1.id] = t1;
  base.tasks[t2.id] = t2;
  base.tasks[t3.id] = t3;

  base.order.todo.push(t1.id);
  base.order.doing.push(t2.id);
  base.order.done.push(t3.id);

  return base;
}
