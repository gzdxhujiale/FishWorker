import { useMemo } from "react"

interface ThrottleSettings {
  leading?: boolean | undefined
  trailing?: boolean | undefined
}

const defaultOptions: ThrottleSettings = {
  leading: false,
  trailing: true,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createThrottle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: ThrottleSettings = defaultOptions
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastArgs: any[] | null = null;
  let lastCallTime: number | null = null;

  const leading = options.leading ?? false;
  const trailing = options.trailing ?? true;

  function cancel() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    lastArgs = null;
    lastCallTime = null;
  }

  function flush() {
    if (timeout && lastArgs) {
      func(...lastArgs);
      cancel();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function throttled(this: any, ...args: Parameters<T>): ReturnType<T> | undefined {
    const now = Date.now();
    const isFirstCall = lastCallTime === null;

    lastArgs = args;

    if (isFirstCall && !leading) {
      lastCallTime = now;
    }

    const remaining = wait - (lastCallTime !== null ? now - lastCallTime : 0);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastCallTime = now;
      return func(...args);
    } else if (!timeout && trailing) {
      timeout = setTimeout(() => {
        lastCallTime = leading ? Date.now() : null;
        timeout = null;
        if (lastArgs) {
          func(...lastArgs);
          lastArgs = null;
        }
      }, remaining);
    }
  }

  throttled.cancel = cancel;
  throttled.flush = flush;
  return throttled;
}

/**
 * A hook that returns a throttled callback function.
 *
 * @param fn The function to throttle
 * @param wait The time in ms to wait before calling the function
 * @param dependencies The dependencies to watch for changes
 * @param options The throttle options
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useThrottledCallback<T extends (...args: any[]) => any>(
  fn: T,
  wait = 250,
  dependencies: React.DependencyList = [],
  options: ThrottleSettings = defaultOptions
): {
  (this: ThisParameterType<T>, ...args: Parameters<T>): ReturnType<T>
  cancel: () => void
  flush: () => void
} {
  const handler = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => createThrottle<T>(fn, wait, options) as any,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    dependencies
  )

  return handler
}

export default useThrottledCallback
