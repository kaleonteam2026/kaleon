import { useEffect, useRef } from "react";

/**
 * Provides an AbortController that is automatically aborted when the
 * component unmounts. Use `getSignal()` to produce fresh AbortSignals
 * for long-lived fetch calls that should be cancelled on unmount.
 *
 * @example
 * ```tsx
 * const getSignal = useRequestCleanup();
 *
 * const handleSubmit = async () => {
 *   const res = await fetchWithTimeout("/api/generate", {}, getSignal());
 *   // ...
 * };
 * ```
 */
export function useRequestCleanup(): () => AbortSignal {
  const controllerRef = useRef<AbortController>(new AbortController());

  useEffect(() => {
    const ctrl = controllerRef.current;
    return () => ctrl.abort();
  }, []);

  return () => {
    // Return the current controller's signal. On unmount this controller
    // is aborted, so any in-flight fetch using this signal will reject.
    return controllerRef.current.signal;
  };
}
