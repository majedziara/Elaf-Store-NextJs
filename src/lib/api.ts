"use client";
import { useCallback, useEffect, useRef, useState } from "react";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields: Record<string, string[]> = {},
  ) {
    super(message);
  }
}
type Options = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};
let csrf: Promise<void> | null = null;
async function warmCsrf() {
  if (!csrf)
    csrf = fetch("/api/store/csrf-cookie", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok)
          throw new ApiError(
            "Could not initialize the secure session.",
            r.status,
          );
      })
      .finally(() => {
        csrf = null;
      });
  return csrf;
}
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const method = options.method || "GET";
  const write = method !== "GET";
  if (write) await warmCsrf();
  const h = new Headers({ Accept: "application/json", ...options.headers });
  if (write) h.set("X-Store-Request", "1");
  const form = options.body instanceof FormData;
  if (options.body !== undefined && !form)
    h.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch("/api/store/" + path, {
      method,
      headers: h,
      body:
        options.body === undefined
          ? undefined
          : form
            ? (options.body as FormData)
            : JSON.stringify(options.body),
      credentials: "same-origin",
      cache: "no-store",
      signal: options.signal || AbortSignal.timeout(65000),
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(
      "Connection interrupted. Check the current status before repeating a payment or refund.",
      0,
    );
  }
  if (response.status === 204) return undefined as T;
  const j = await response
    .json()
    .catch(() => ({ message: "Unexpected store response." }));
  if (!response.ok)
    throw new ApiError(
      j.message || "The request could not be completed.",
      response.status,
      j.errors || {},
    );
  return j as T;
}
export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState<ApiError | null>(null),
    [loading, setLoading] = useState(!!path),
    [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((v) => v + 1), []);
  useEffect(() => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    const c = new AbortController();
    setLoading(true);
    setError(null);
    setData(null);
    api<T>(path, { signal: c.signal })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [path, tick]);
  return { data, error, loading, reload, setData };
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<ApiError | null>(null),
    [message, setMessage] = useState("");
  const running = useRef(false);
  const run = async <T>(
    fn: () => Promise<T>,
    success = "Saved.",
  ): Promise<T | undefined> => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const out = await fn();
      setMessage(success);
      return out;
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e
          : new ApiError(
              (e as Error).message || "Could not complete this action.",
              0,
            ),
      );
      return undefined;
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return { busy, error, message, run };
}
