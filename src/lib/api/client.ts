export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class TimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: unknown }).error)
        : res.statusText || "Request failed";
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

/**
 * fetch wrapper with a configurable timeout via AbortController.
 *
 * @param url     - The URL to fetch
 * @param options - Standard RequestInit plus a `timeout` field (in ms, default 180_000)
 * @param cancelSignal - Optional external AbortSignal for component-level cancellation
 *                      (e.g. from useRequestCleanup, wired via useEffect cleanup)
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {},
  cancelSignal?: AbortSignal,
): Promise<Response> {
  const timeout = options.timeout ?? 180_000;
  const timeoutController = new AbortController();

  const timer = setTimeout(() => timeoutController.abort(), timeout);

  // Combine the timeout signal with the optional cancel signal.
  // The overall signal aborts when EITHER the timeout fires OR
  // the parent component cancels (e.g. on unmount).
  const combinedSignal = cancelSignal
    ? combineAbortSignals(timeoutController.signal, cancelSignal)
    : timeoutController.signal;

  const { timeout: _ignored, ...fetchOptions } = options;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: combinedSignal,
    });
    return response;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      // Determine whether the timeout or the cancel signal fired
      if (cancelSignal?.aborted) {
        throw new Error("Request cancelled");
      }
      throw new TimeoutError(`Request timed out after ${timeout}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Combine two AbortSignals into one. The returned signal aborts when
 * either input signal aborts.
 */
function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  const onAbort = () => {
    controller.abort();
    for (const s of signals) s.removeEventListener("abort", onAbort);
  };

  for (const s of signals) {
    if (s.aborted) {
      onAbort();
      break;
    }
    s.addEventListener("abort", onAbort, { once: true });
  }

  return controller.signal;
}
