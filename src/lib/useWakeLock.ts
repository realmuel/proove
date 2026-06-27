"use client";

import { useEffect } from "react";

/* Keep the device screen awake while a component is mounted (e.g. while
   following a recipe or running a meal). Uses the Screen Wake Lock API where
   available and silently no-ops elsewhere. Re-acquires the lock when the tab
   becomes visible again, since the browser releases it on tab switch. */
export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const acquire = async () => {
      try {
        sentinel = await (navigator as Navigator).wakeLock.request("screen");
        // If the browser drops it on its own, try to grab it again.
        sentinel.addEventListener("release", () => {
          sentinel = null;
        });
      } catch {
        // Denied (e.g. low battery) or unsupported — nothing we can do.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !sentinel && !released) {
        acquire();
      }
    };

    acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisibility);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
