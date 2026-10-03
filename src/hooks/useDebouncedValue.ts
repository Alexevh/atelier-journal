import { useEffect, useState } from "react";

// Returns `value` only after it has stopped changing for `ms`. Used to keep the
// heavy recipe search from running on every slider tick (dozens per second on a
// drag), which saturated phones/tablets.
export function useDebouncedValue<T>(value: T, ms = 200): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return settled;
}
