"use client";

import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import type { AuditAction, AuditEvent, BoardState, Priority, Status, Task } from "@/types";
import { buildInitialDemoState, defaultState, loadState, saveState } from "@/lib/storage";
import { clamp, nowISO, safeTrim, uuid } from "@/lib/utils";

type TaskInput = {
  titulo: string;
  descripcion?: string;
  prioridad: Priority;
  tags: string[];
  estimacionMin: number;
  fechaLimite?: string;
  observacionesJavi?: string;
  rubricaScore?: number;
  rubricaComentario?: string;
};

type Action =
  | { type: "INIT"; state: BoardState }
  | { type: "SET_GODMODE"; value: boolean }
  | { type: "CREATE_TASK"; status: Status; input: TaskInput }
  | { type: "UPDATE_TASK"; id: string; input: TaskInput }
  | { type: "DELETE_TASK"; id: string }
  | { type: "MOVE_TASK"; id: string; to: Status; index?: number }
  | { type: "IMPORT_STATE"; state: BoardState }
  | { type: "INTEGRITY_AUTOFIX"; updates: Array<{ id: string; patch: Partial<Task> }> };

const Ctx = createContext<{
  state: BoardState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

function auditEvent(accion: AuditAction, taskId: string, diff: AuditEvent["diff"]): AuditEvent {
  return {
    timestamp: nowISO(),
    accion,
    taskId,
    diff,
    userLabel: "Alumno/a",
  };
}

function removeFromAll(order: BoardState["order"], id: string): BoardState["order"] {
  return {
    todo: order.todo.filter((x) => x !== id),
    doing: order.doing.filter((x) => x !== id),
    done: order.done.filter((x) => x !== id),
  };
}

function reducer(state: BoardState, action: Action): BoardState {
  switch (action.type) {
    case "INIT":
      return action.state;

    case "SET_GODMODE":
      return { ...state, settings: { ...state.settings, godMode: action.value } };

    case "CREATE_TASK": {
      const id = uuid();
      const created: Task = {
        id,
        titulo: safeTrim(action.input.titulo),
        descripcion: action.input.descripcion?.trim() || undefined,
        prioridad: action.input.prioridad,
        tags: action.input.tags.map((t) => safeTrim(t)).filter(Boolean),
        estimacionMin: Math.max(0, action.input.estimacionMin),
        fechaCreacion: nowISO(),
        fechaLimite: action.input.fechaLimite || undefined,
        estado: action.status,

        observacionesJavi: action.input.observacionesJavi?.trim() || undefined,
        rubricaScore:
          action.input.rubricaScore === undefined
            ? undefined
            : clamp(action.input.rubricaScore, 0, 10),
        rubricaComentario: action.input.rubricaComentario?.trim() || undefined,
      };

      const tasks = { ...state.tasks, [id]: created };
      const order = { ...state.order, [action.status]: [id, ...state.order[action.status]] };

      const audit = [auditEvent("CREATE", id, { after: created }), ...state.audit];

      return { ...state, tasks, order, audit };
    }

    case "UPDATE_TASK": {
      const prev = state.tasks[action.id];
      if (!prev) return state;

      const next: Task = {
        ...prev,
        titulo: safeTrim(action.input.titulo),
        descripcion: action.input.descripcion?.trim() || undefined,
        prioridad: action.input.prioridad,
        tags: action.input.tags.map((t) => safeTrim(t)).filter(Boolean),
        estimacionMin: Math.max(0, action.input.estimacionMin),
        fechaLimite: action.input.fechaLimite || undefined,

        observacionesJavi: action.input.observacionesJavi?.trim() || undefined,
        rubricaScore:
          action.input.rubricaScore === undefined
            ? undefined
            : clamp(action.input.rubricaScore, 0, 10),
        rubricaComentario: action.input.rubricaComentario?.trim() || undefined,
      };

      const tasks = { ...state.tasks, [action.id]: next };
      const audit = [
        auditEvent("UPDATE", action.id, {
          before: { id: action.id, ...pickTaskDiff(prev, next) },
          after: { id: action.id, ...pickTaskDiff(next, prev) },
        }),
        ...state.audit,
      ];

      return { ...state, tasks, audit };
    }

    case "DELETE_TASK": {
      const prev = state.tasks[action.id];
      if (!prev) return state;

      const tasks = { ...state.tasks };
      delete tasks[action.id];

      const order = removeFromAll(state.order, action.id);

      const audit = [
        auditEvent("DELETE", action.id, {
          before: { ...prev },
        }),
        ...state.audit,
      ];

      return { ...state, tasks, order, audit };
    }

    case "MOVE_TASK": {
      const prev = state.tasks[action.id];
      if (!prev) return state;

      if (prev.estado === action.to) {
        // solo reorder dentro de la misma columna
        const current = state.order[action.to].filter((x) => x !== action.id);
        const idx = action.index ?? 0;
        const nextIds = insertAt(current, action.id, idx);
        const order = { ...state.order, [action.to]: nextIds };
        return { ...state, order };
      }

      const tasks = {
        ...state.tasks,
        [action.id]: { ...prev, estado: action.to },
      };

      const from = prev.estado;
      const cleaned = removeFromAll(state.order, action.id);
      const base = cleaned[action.to];
      const idx = action.index ?? 0;
      const nextTo = insertAt(base, action.id, idx);

      const order = { ...cleaned, [action.to]: nextTo };

      const audit = [
        auditEvent("MOVE", action.id, {
          before: { id: action.id, estado: from },
          after: { id: action.id, estado: action.to },
        }),
        ...state.audit,
      ];

      return { ...state, tasks, order, audit };
    }

    case "IMPORT_STATE": {
      return action.state;
    }

    case "INTEGRITY_AUTOFIX": {
      const tasks = { ...state.tasks };
      const auditEvents: AuditEvent[] = [];

      for (const u of action.updates) {
        const prev = tasks[u.id];
        if (!prev) continue;
        const next = { ...prev, ...u.patch };
        tasks[u.id] = next;

        auditEvents.push(
          auditEvent("UPDATE", u.id, {
            before: { id: u.id, ...pickTaskDiff(prev, next) },
            after: { id: u.id, ...pickTaskDiff(next, prev) },
          })
        );
      }

      const audit = [...auditEvents.reverse(), ...state.audit];
      return { ...state, tasks, audit };
    }

    default:
      return state;
  }
}

// diff parcial: solo devuelve campos que cambian (para before/after)
function pickTaskDiff(a: Task, b: Task): Partial<Task> {
  const diff: Partial<Task> = {};
  const out = diff as Record<keyof Task, Task[keyof Task]>;
  const keys: Array<keyof Task> = [
    "titulo",
    "descripcion",
    "prioridad",
    "tags",
    "estimacionMin",
    "fechaLimite",
    "estado",
    "observacionesJavi",
    "rubricaScore",
    "rubricaComentario",
  ];
  for (const k of keys) {
    const va = a[k];
    const vb = b[k];
    const same =
      Array.isArray(va) && Array.isArray(vb)
        ? va.join("|") === vb.join("|")
        : va === vb;

    if (!same) out[k] = va;
  }
  return diff;
}

function insertAt(arr: string[], id: string, index: number): string[] {
  const idx = Math.max(0, Math.min(index, arr.length));
  return [...arr.slice(0, idx), id, ...arr.slice(idx)];
}

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = loadState();
    // si está vacío, metemos demo para que no sea "empty" de inicio (lo puedes borrar)
    const isEmpty =
      Object.keys(loaded.tasks).length === 0 &&
      loaded.order.todo.length === 0 &&
      loaded.order.doing.length === 0 &&
      loaded.order.done.length === 0;

    dispatch({ type: "INIT", state: isEmpty ? buildInitialDemoState() : loaded });
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveState(state);
  }, [state, ready]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBoard() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBoard must be used within BoardProvider");
  return ctx;
}







