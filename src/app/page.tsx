import Board from "@/components/kanban/board";

export default function Page() {
  return (
    <main className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-7xl">
        <Board />
      </div>
    </main>
  );
}
