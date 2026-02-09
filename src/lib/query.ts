import type { Priority, Status, Task } from "@/types";

export type DueFilter = "overdue" | "week";

export type EstComparator = "<" | "<=" | ">" | ">=" | "=";

export type QueryAst = {
  text: string; // texto libre
  tags: string[];
  priority?: Priority;
  due?: DueFilter;
  est?: { op: EstComparator; value: number };
  warnings: string[];
};


function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function parseQuery(input: string): QueryAst {
  const raw = input.trim();
  const tokens = raw.length ? raw.split(/\s+/g) : [];
  const warnings: string[] = [];

  const tags: string[] = [];
  let priority: Priority | undefined;
  let due: DueFilter | undefined;
  let est: QueryAst["est"] | undefined;

  const textParts: string[] = [];

  for (const tok of tokens) {
    if (tok.startsWith("tag:")) {
      const v = tok.slice(4).trim();
      if (!v) warnings.push(`tag vacío en "${tok}"`);
      else tags.push(normalizeText(v));
      continue;
    }
    if (tok.startsWith("p:")) {
      const v = tok.slice(2).trim().toLowerCase();
      if (v === "low" || v === "medium" || v === "high") priority = v;
      else warnings.push(`prioridad inválida en "${tok}"`);
      continue;
    }
    if (tok.startsWith("due:")) {
      const v = tok.slice(4).trim().toLowerCase();
      if (v === "overdue" || v === "week") due = v as DueFilter;
      else warnings.push(`due inválido en "${tok}"`);
      continue;
    }
    if (tok.startsWith("est:")) {
      const expr = tok.slice(4).trim();
      const m = expr.match(/^(<=|>=|<|>|=)?\s*(\d+)$/);
      if (!m) {
        warnings.push(`est inválido en "${tok}"`);
        continue;
      }
      const op = (m[1] ?? "=") as EstComparator;
      const value = Number(m[2]);
      if (!Number.isFinite(value)) warnings.push(`est no numérico en "${tok}"`);
      else est = { op, value };
      continue;
    }

    textParts.push(tok);
  }

  return {
    text: normalizeText(textParts.join(" ")),
    tags,
    priority,
    due,
    est,
    warnings,
  };
}

export function applyQuery(tasks: Task[], ast: QueryAst): Task[] {
  const now = Date.now();

  const withinWeek = (iso: string): boolean => {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return false;
    const delta = t - now;
    return delta >= 0 && delta <= 7 * 24 * 3600 * 1000;
  };

  const isOverdue = (iso: string): boolean => {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return false;
    return t < now;
  };

  const matchEst = (n: number, op: EstComparator, value: number): boolean => {
    if (!Number.isFinite(n)) return false;
    switch (op) {
      case "<":
        return n < value;
      case "<=":
        return n <= value;
      case ">":
        return n > value;
      case ">=":
        return n >= value;
      case "=":
      default:
        return n === value;
    }
  };

  return tasks.filter((t) => {
    if (ast.text) {
      const hay = normalizeText(`${t.titulo ?? ""} ${t.descripcion ?? ""}`);
      if (!hay.includes(ast.text)) return false;
    }
    if (ast.tags.length) {
      const normalizedTags = t.tags.map((x) => normalizeText(x));
      for (const tag of ast.tags) {
        if (!normalizedTags.some((tTag) => tTag.includes(tag))) return false;
      }
    }

    if (ast.priority && t.prioridad !== ast.priority) return false;

    if (ast.due) {
      if (!t.fechaLimite) return false;
      if (ast.due === "overdue" && !isOverdue(t.fechaLimite)) return false;
      if (ast.due === "week" && !withinWeek(t.fechaLimite)) return false;
    }

    if (ast.est) {
      if (!matchEst(t.estimacionMin, ast.est.op, ast.est.value)) return false;
    }

    return true;
  });
}

export function sortByOrder(tasks: Task[], orderIds: string[]): Task[] {
  const idx = new Map<string, number>();
  orderIds.forEach((id, i) => idx.set(id, i));
  return [...tasks].sort((a, b) => (idx.get(a.id) ?? 999999) - (idx.get(b.id) ?? 999999));
}

export function tasksInStatus(tasks: Task[], status: Status): Task[] {
  return tasks.filter((t) => t.estado === status);
}

