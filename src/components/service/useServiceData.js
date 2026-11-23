import { useCallback, useEffect, useRef, useState } from "react";
export function useServiceData(load, interval = 0, key = "") {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  const current = useRef(load);
  current.current = load;
  const reload = useRef(async () => {});
  const refresh = useCallback(() => reload.current(), []);
  useEffect(() => {
    let active = true,
      busy = false;
    setData(null);
    setError("");
    async function fetchData() {
      if (busy) return;
      busy = true;
      try {
        const next = await current.current();
        if (active) {
          setData(next);
          setError("");
        }
      } catch (e) {
        if (active) {
          if ([401, 403, 404].includes(e.status)) setData(null);
          setError(e.message || "The service could not be reached.");
        }
      } finally {
        busy = false;
      }
    }
    reload.current = fetchData;
    void fetchData();
    const timer = interval
      ? setInterval(() => {
          if (!document.hidden) void fetchData();
        }, interval)
      : null;
    const focus = () => void fetchData();
    window.addEventListener("focus", focus);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [interval, key]);
  return { data, error, refresh };
}
