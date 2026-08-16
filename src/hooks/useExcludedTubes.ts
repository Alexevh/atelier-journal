import { useSyncExternalStore } from "react";

// Excluded tubes: pigment ids the painter wants kept OUT of every suggestion
// (recipes, coach, variations…). The mirror of useRequiredTubes — e.g. exclude
// black so mixes reach darks/greys chromatically instead of reaching for it.
// Persisted like the other recipe options (and so it rides cloud sync via the
// colour-data snapshot). Ids absent from the active palette are simply ignored.

const KEY = "pigment-match.excludedTubes.v1";

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

let value: string[] = read();
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function write(next: string[]) {
  value = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export function addExcludedTube(id: string) {
  if (!value.includes(id)) write([...value, id]);
}

export function removeExcludedTube(id: string) {
  write(value.filter((x) => x !== id));
}

export function useExcludedTubes(): string[] {
  return useSyncExternalStore(
    subscribe,
    () => value,
    () => value
  );
}
