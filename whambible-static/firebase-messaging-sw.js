importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyBx5A9pWYf4RRGqBK9UL7YMEs_s5qwiSeQ",
  authDomain:        "wham-bible.firebaseapp.com",
  projectId:         "wham-bible",
  storageBucket:     "wham-bible.firebasestorage.app",
  messagingSenderId: "207184555743",
  appId:             "1:207184555743:web:0bd4b8350701d02f79836a"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const n = payload.notification || {};
  self.registration.showNotification(n.title || 'WhamBible', {
    body:  n.body  || '',
    icon:  '/icon-192.png',
    badge: '/icon-192.png',
    data:  payload.data || {}
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(clients.openWindow(url));
});
