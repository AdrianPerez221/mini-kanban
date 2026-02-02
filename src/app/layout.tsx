import "./globals.css";
import type { Metadata } from "next";
import { BoardProvider } from "@/components/providers/board-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Mini Kanban - Mantenimiento",
  description: "Kanban con auditoría, búsqueda avanzada y modo Dios",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <BoardProvider>
          {children}
          <Toaster />
        </BoardProvider>
      </body>
    </html>
  );
}
