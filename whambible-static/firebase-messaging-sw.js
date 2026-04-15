// ============================================================
// WhamBible — Firebase Messaging Service Worker
// Required for background push notifications on web
//
// This file MUST be at the root of the site (/)
// Firebase will automatically detect it at /firebase-messaging-sw.js
//
// SECRETS: Replace %% placeholders when Firebase project is created
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "%%FIREBASE_API_KEY%%",
  authDomain:        "%%FIREBASE_PROJECT_ID%%.firebaseapp.com",
  projectId:         "%%FIREBASE_PROJECT_ID%%",
  storageBucket:     "%%FIREBASE_PROJECT_ID%%.appspot.com",
  messagingSenderId: "%%FIREBASE_MESSAGING_SENDER_ID%%",
  appId:             "%%FIREBASE_APP_ID%%",
});

const messaging = firebase.messaging();

// ── Background message handler ────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  console.log('[WhamBible SW] Background message:', payload);

  const { title, body } = payload.notification || {};
  const { type, gameId } = payload.data || {};

  // Build notification
  const notifTitle   = title || 'WhamBible ⚔️';
  const notifOptions = {
    body:    body || 'Your battle awaits!',
    icon:    '/icon-192.png',
    badge:   '/badge-72.png',
    tag:     `whambible-${gameId || 'game'}`,
    renotify: true,
    data: { type, gameId, url: `/challenge.html${gameId ? '?game=' + gameId : ''}` },
    actions: [
      { action: 'open',    title: '⚔️ Play Now' },
      { action: 'dismiss', title: 'Later' },
    ],
  };

  self.registration.showNotification(notifTitle, notifOptions);
});

// ── Notification click handler ────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/challenge.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes('whambible') && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new tab
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
