import { useSyncExternalStore } from "react";
import { rgbToHex, type RGB } from "@/lib/color";

// A small memory of recently picked colours, so you can compare the colour you
// just sampled against the previous one (midtone → shadow, etc.). Hybrid: the
// last few picks are remembered automatically, and any of them can be PINNED so
// it isn't pushed out (e.g. keep your midtone while you probe the shadows).
//
// Persisted under the synced "pigment-match." prefix, so the memory rides the
// optional cloud snapshot like every other colour-tool setting.

export interface MemColor {
  id: string;
  hex: string;
  pinned: boolean;
}

const KEY = "pigment-match.colorMemory.v1";
const MAX_RECENT = 6; // unpinned entries kept; pinned are always kept

let counter = 0;
function makeId(hex: string): string {
  counter += 1;
  return `${hex}-${counter}`;
}

function read(): MemColor[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((e) => e && typeof e.hex === "string")
      .map((e) => ({
        id: typeof e.id === "string" ? e.id : makeId(e.hex),
        hex: e.hex,
        pinned: !!e.pinned,
      }));
  } catch {
    return [];
  }
}

let value: MemColor[] = read();
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function write(next: MemColor[]) {
  value = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

// Trim unpinned entries beyond the cap, keeping order (newest first).
function trim(list: MemColor[]): MemColor[] {
  let kept = 0;
  return list.filter((e) => {
    if (e.pinned) return true;
    kept += 1;
    return kept <= MAX_RECENT;
  });
}

/** Remember a colour as the newest entry (no-op if it equals the newest one). */
export function rememberColor(rgb: RGB) {
  const hex = rgbToHex(rgb).toLowerCase();
  const newest = value[0];
  if (newest && newest.hex.toLowerCase() === hex) return;
  // if this hex already exists elsewhere, move it to front (keep its pin/id)
  const existing = value.find((e) => e.hex.toLowerCase() === hex);
  const rest = value.filter((e) => e.hex.toLowerCase() !== hex);
  const entry: MemColor = existing ?? { id: makeId(hex), hex, pinned: false };
  write(trim([entry, ...rest]));
}

export function pinColor(id: string, pinned: boolean) {
  write(value.map((e) => (e.id === id ? { ...e, pinned } : e)));
}

export function removeColor(id: string) {
  write(value.filter((e) => e.id !== id));
}

export function clearUnpinned() {
  write(value.filter((e) => e.pinned));
}

export function useColorMemory(): MemColor[] {
  return useSyncExternalStore(
    subscribe,
    () => value,
    () => value
  );
}
