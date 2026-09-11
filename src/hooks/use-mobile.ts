import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * MediaQuery-backed viewport breakpoint (audit SEC-201 fix).
 *
 * `useSyncExternalStore` is the React-blessed way to subscribe to an
 * external system: no setState-in-effect (which the react-hooks compiler
 * rules flag as a cascading-render hazard), hydration-safe via the server
 * snapshot, and the listener only fires on actual media-query changes.
 */
function subscribe(onChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    // SSR / prerendered shell: desktop layout until hydration (the previous
    // implementation also rendered `false` on its first pass).
    () => false,
  )
}
