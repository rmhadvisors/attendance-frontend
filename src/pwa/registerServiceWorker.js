export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return

  // In dev, a service worker only causes stale code: remove any that is registered.
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((reg) => reg.unregister()))
      .catch(() => {})
    if (window.caches) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key))).catch(() => {})
    }
    return
  }

  // Reload once when a new service worker takes over so users get the latest build.
  const hadController = !!navigator.serviceWorker.controller
  let reloading = false
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloading) return
    reloading = true
    window.location.reload()
  })

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js", { updateViaCache: "none" })
      .then((reg) => reg.update())
      .catch((error) => {
        console.error("Service worker registration failed", error)
      })
  })
}
