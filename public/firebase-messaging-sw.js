// Firebase Messaging Service Worker
// This file MUST be at the root of your public directory (served at /firebase-messaging-sw.js)

/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js')

// Config must match src/firebase/config.js – project bunny-5c403
firebase.initializeApp({
    apiKey: "AIzaSyD-GozHKGEvzqhF-WAi01u40VV75GDWKvw",
    authDomain: "bunny-5c403.firebaseapp.com",
    projectId: "bunny-5c403",
    storageBucket: "bunny-5c403.firebasestorage.app",
    messagingSenderId: "877928513764",
    appId: "1:877928513764:web:373c37feff43c818522cf1",
    measurementId: "G-K4V2PBWGVF"
})

const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload)

    const notificationTitle = payload.notification?.title || payload.data?.title || 'Bunny'
    const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || '',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: payload.data || {},
        tag: 'bunny-notification',
    }

    self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Focus existing window or open new one
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus()
                }
            }
            return clients.openWindow('/')
        })
    )
})
