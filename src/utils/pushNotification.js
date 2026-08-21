import api from "../api/axios"

// function urlBase64ToUint8Array(base64String) {
//     const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
//     const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
//     const rawData = window.atob(base64)
//     const outputArray = new Uint8Array(rawData.length)
//     for (let i = 0; i < rawData.length; ++i) {
//         outputArray[i] = rawData.charCodeAt(i)
//     }
//     return outputArray
// }

// export async function requestAndSubscribePush() {
//     if (!("serviceWorker" in navigator) || !("PushManager" in window)) return

//     try {
//         let reg = await navigator.serviceWorker.getRegistration()
//         if (!reg) {
//             reg = await navigator.serviceWorker.register("/service-worker.js")
//         }
//         await navigator.serviceWorker.ready

//         const perm = await Notification.requestPermission()
//         if (perm !== "granted") {
//             console.warn("Notification permission not granted:", perm)
//             return
//         }

//         const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || "BMLGWOfhqPBQj8veDNsJ5Y9D-udG7CQGfTd7ayBy0crB768TJ3Y6g9_ubqWIeQa_78ruh091hOySKShnGOeVpSE"

//         // Reuse existing active subscription, or subscribe if none exists
//         let sub = await reg.pushManager.getSubscription()
//         if (!sub) {
//             sub = await reg.pushManager.subscribe({
//                 userVisibleOnly: true,
//                 applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
//             })
//         }

//         // Send to backend
//         const payload = sub.toJSON ? sub.toJSON() : sub
//         await api.post("/push/subscribe", payload)
//         console.log("🎉 Push notification auto-subscribed successfully!")
//     } catch (err) {
//         console.error("Push subscription failed:", err)
//     }
// }

function urlBase64ToUint8Array(base64String) {
    const padding =
        "=".repeat((4 - (base64String.length % 4)) % 4)

    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/")

    const rawData = window.atob(base64)

    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }

    return outputArray
}

export async function requestAndSubscribePush() {
    if (!("serviceWorker" in navigator) ||
        !("PushManager" in window)) {
        console.warn("Push API is not supported")
        return
    }

    try {
        let reg = await navigator.serviceWorker.getRegistration()

        if (!reg) {
            reg = await navigator.serviceWorker.register(
                "/service-worker.js"
            )
        }

        await navigator.serviceWorker.ready

        console.log(
            "Service Worker:",
            reg.active?.scriptURL
        )

        const perm = await Notification.requestPermission()

        if (perm !== "granted") {
            console.warn(
                "Notification permission not granted:",
                perm
            )
            return
        }

        const vapidPublicKey =
            import.meta.env.VITE_VAPID_PUBLIC_KEY ||
            "BMLGWOfhqPBQj8veDNsJ5Y9D-udG7CQGfTd7ayBy0crB768TJ3Y6g9_ubqWIeQa_78ruh091hOySKShnGOeVpSE"

        // Reuse existing subscription if present, otherwise create a new one
        let sub = await reg.pushManager.getSubscription()
        if (!sub) {
            console.log("No existing push subscription found. Creating new subscription...")
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            })
            console.log("🆕 NEW subscription created:", sub)
        } else {
            console.log("✅ Using existing active push subscription:", sub)
        }

        console.log(
            "Subscription JSON:",
            JSON.stringify(
                sub.toJSON(),
                null,
                2
            )
        )

        // Send subscription to backend
        const payload =
            sub.toJSON ? sub.toJSON() : sub

        const response =
            await api.post(
                "/push/subscribe",
                payload
            )

        console.log(
            "Backend subscription response:",
            response.data
        )

        console.log(
            "🎉 Push notification subscribed successfully!"
        )

    } catch (err) {
        console.error(
            "Push subscription failed:",
            err
        )
    }
}