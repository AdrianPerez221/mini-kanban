export type Status = "todo" | "doing" | "done";
export type Priority = "low" | "medium" | "high";

export type Task = {
  id: string; // uuid
  titulo: string; // min 3
  descripcion?: string;
  prioridad: Priority;
  tags: string[];
  estimacionMin: number;
  fechaCreacion: string; // ISO
  fechaLimite?: string; // ISO
  estado: Status;

  // Modo Dios (solo se usa si settings.godMode === true, pero el dato puede existir)
  observacionesJavi?: string;
  rubricaScore?: number; // 0..10
  rubricaComentario?: string;
};

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "MOVE" | "IMPORT_FIXUP";

export type AuditDiff = {
  before?: Partial<Task> & { id: string };
  after?: Partial<Task> & { id: string };
};

export type AuditEvent = {
  timestamp: string; // ISO
  accion: AuditAction;
  taskId: string;
  diff: AuditDiff;
  userLabel: "Alumno/a";
};

export type BoardOrder = Record<Status, string[]>;

export type BoardSettings = {
  godMode: boolean;
};

export type BoardState = {
  tasks: Record<string, Task>;
  order: BoardOrder;
  audit: AuditEvent[];
  settings: BoardSettings;
};

export type ImportPayload = BoardState & {
  version: 1;
};
