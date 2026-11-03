import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "./toast.jsx";

// Loads data when the screen opens. Returns [data, reload].
// data is null until the first answer arrives.
export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true; // re-set on mount: React StrictMode mounts, unmounts and mounts again in development
    return () => { alive.current = false; };
  }, []);

  const reload = useCallback(
    () =>
      fnRef.current()
        .then((d) => { if (alive.current) setData(d); })
        .catch((e) => toast(e.message, true)),
    []
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [reload, ...deps]);
  return [data, reload];
}
