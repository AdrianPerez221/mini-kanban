"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SearchBar({
  value,
  onChange,
  warnings,
}: {
  value: string;
  onChange: (v: string) => void;
  warnings: string[];
}) {
  const examples = [
    "tag:seguridad p:high",
    "PLC due:week",
    "due:overdue",
    "est:<60",
    "tag:calidad est:>=45",
  ];

  return (
    <div className="flex items-center gap-2 min-w-[320px] flex-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder='Buscar… (ej: tag:seguridad p:high est:<60)'
        aria-label="Búsqueda avanzada"
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" aria-label="Ayuda de búsqueda">
            ?
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="text-sm font-medium">Operadores</div>
          <div className="mt-2 text-sm text-muted-foreground space-y-1">
            <div><code>tag:react</code> · <code>p:high</code></div>
            <div><code>due:overdue</code> · <code>due:week</code></div>
            <div><code>est:&lt;60</code> · <code>est:&gt;=120</code></div>
          </div>

          <div className="mt-3 text-sm font-medium">Ejemplos clicables</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {examples.map((ex) => (
              <Button key={ex} variant="secondary" size="sm" onClick={() => onChange(ex)}>
                {ex}
              </Button>
            ))}
          </div>

          {warnings.length ? (
            <div className="mt-3 rounded border p-2 text-xs text-destructive">
              <div className="font-medium">Warnings</div>
              <ul className="list-disc pl-4">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
