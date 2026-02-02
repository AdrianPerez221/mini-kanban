import { v4 as uuidv4 } from "uuid";
import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function nowISO(): string {
  return new Date().toISOString();
}

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function uuid(): string {
  return uuidv4();
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function safeTrim(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function isValidISODate(s: string): boolean {
  const d = new Date(s);
  return !Number.isNaN(d.getTime()) && s.includes("T");
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
