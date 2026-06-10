import { useEffect, useRef, useState } from "react";

export function ok(data) {
  return { data, loading: false, error: null };
}

export function loadingState() {
  return { data: null, loading: true, error: null };
}

export function err(message) {
  return { data: null, loading: false, error: message };
}

function stableValueKey(value) {
  if (value == null) return "";
  if (typeof value !== "object") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Local demo data — no artificial delay (delayMs=0). */
export function useDelayedValue(value, delayMs = 0) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const valueKey = stableValueKey(value);
  const [state, setState] = useState(() => ok(value));

  useEffect(() => {
    if (delayMs <= 0) {
      setState(ok(valueRef.current));
      return;
    }
    setState(loadingState());
    const t = setTimeout(() => setState(ok(valueRef.current)), delayMs);
    return () => clearTimeout(t);
  }, [valueKey, delayMs]);

  return state;
}
