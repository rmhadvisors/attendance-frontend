const CACHE_NAME = "glr-attendance-pwa-v4"

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/icons/maskable-icon.svg"
]

const API_PREFIXES = [
  "/auth",
  "/dashboard",
  "/employees",
  "/attendance",
  "/face",
  "/locations",
  "/export",
  "/company",
  "/leave",
  "/payroll",
  "/push"
]


self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

// self.addEventListener('push', (event) => {
//   let data = {};
//   if (event.data) {
//     try {
//       data = event.data.json();
//     } catch (e) {
//       data = { title: 'Check in Reminder ⏰', body: event.data.text() };
//     }
//   }
//   const title = data.title || 'Check in Reminder ⏰';
//   const options = {
//     body: data.body || 'You forgot to check in today!',
//     vibrate: [200, 100, 200]
//   };

//   event.waitUntil(self.registration.showNotification(title, options));
// })

// self.addEventListener("push", (event) => {
//   let data = {};

//   if (event.data) {
//     try {
//       data = event.data.json();
//     } catch (error) {
//       console.error("Failed to parse push data:", error);

//       data = {
//         title: "Check in Reminder ⏰",
//         body: event.data.text()
//       };
//     }
//   }

//   const title =
//     data.title || "Check in Reminder ⏰";

//   const options = {
//     body:
//       data.body ||
//       "You forgot to check in today!",
//     vibrate: [200, 100, 200]
//   };

//   event.waitUntil(
//     self.registration
//       .showNotification(title, options)
//       .then(() => {
//         console.log("✅ Notification displayed");
//       })
//       .catch((error) => {
//         console.error(
//           "❌ Failed to display notification:",
//           error
//         );
//       })
//   );
// });

self.addEventListener("push", (event) => {
  console.log("🔥 PUSH EVENT RECEIVED");

  event.waitUntil(
    self.registration
      .showNotification("Check in Reminder ⏰", {
        body: "You forgot to check in today!",
        vibrate: [200, 100, 200]
      })
      .then(() => {
        console.log("✅ showNotification() succeeded");
      })
      .catch((error) => {
        console.error(
          "❌ showNotification() FAILED:",
          error
        );
      })
  );
});


self.addEventListener("fetch", (event) => {
  const { request } = event

  if (request.method !== "GET") {
    event.respondWith(fetch(request))
    return
  }

  const url = new URL(request.url)
  const isSameOrigin = url.origin === self.location.origin
  const isApiRequest = isSameOrigin && API_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))

  if (isApiRequest) {
    event.respondWith(fetch(request))
    return
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match("/index.html"))
    )
    return
  }

  event.respondWith(
    caches.match(request)
      .then((cached) => cached || fetch(request).then((response) => {
        if (!isSameOrigin || !response || response.status !== 200) {
          return response
        }

        const responseClone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone))
        return response
      }))
  )
})
