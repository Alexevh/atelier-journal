import { useSyncExternalStore } from "react";

// App-wide grisaille view (set from any eyedropper's View selector). While it's
// "grey" or "bw", the image shows as value AND recipes are limited to the
// palette's white + black — a grisaille is mixed from those two only.
export type GrisailleView = "color" | "grey" | "bw";

let value: GrisailleView = "color";
const listeners = new Set<() => void>();

export function setGrisailleView(v: GrisailleView) {
  value = v;
  listeners.forEach((l) => l());
}

export function useGrisailleView(): GrisailleView {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => value,
    () => value
  );
}
