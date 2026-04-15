// ============================================================
// WhamBible — Push Notification Layer
// Mirrors Whamgame.base44.app notification matrix exactly
//
// SECRETS REQUIRED (set in Netlify environment variables):
//   FIREBASE_API_KEY          — Firebase project API key
//   FIREBASE_PROJECT_ID       — Firebase project ID
//   FIREBASE_MESSAGING_SENDER_ID — FCM sender ID
//   FIREBASE_APP_ID           — Firebase app ID
//   FIREBASE_VAPID_KEY        — FCM Web Push VAPID key
//
// HOW IT WORKS:
//   1. On first multiplayer login → request notification permission
//   2. Get FCM token → store in player profile (push_token field)
//   3. When a game event fires → call sendPush() with type + target token
//   4. Firebase Cloud Messaging delivers to opponent's device
// ============================================================

// ── Firebase Config (placeholders — fill in Netlify env vars) ──
const FIREBASE_CONFIG = {
  apiKey:            "%%FIREBASE_API_KEY%%",
  authDomain:        "%%FIREBASE_PROJECT_ID%%.firebaseapp.com",
  projectId:         "%%FIREBASE_PROJECT_ID%%",
  storageBucket:     "%%FIREBASE_PROJECT_ID%%.appspot.com",
  messagingSenderId: "%%FIREBASE_MESSAGING_SENDER_ID%%",
  appId:             "%%FIREBASE_APP_ID%%",
};

const VAPID_KEY = "%%FIREBASE_VAPID_KEY%%";

// ── Notification Type Matrix (mirrors Whamgame exactly) ────────
//
// TYPE                  TRIGGER                         MESSAGE
// ─────────────────────────────────────────────────────────────
// challenge_received    Picker selects a level/verse    "{name} issued a verse challenge — your turn! ⚔️"
// challenge_answered    Answerer submits answer         "{name} answered your verse! See the result 📖"
// challenge_recovered   Answerer recovers pts (future)  "{name} recovered your verse points! 🔥"
// game_completed        Final round answered            "Your battle with {name} is over! See who won 🏆"
// game_invite           New game created vs you         "{name} challenged you to a WhamBible battle! ⚔️"
//
const NOTIF_TYPES = {
  challenge_received:  (from) => `${from} issued a verse challenge — your turn! ⚔️`,
  challenge_answered:  (from) => `${from} answered your verse! See the result 📖`,
  challenge_recovered: (from) => `${from} recovered your verse points! 🔥`,
  game_completed:      (from) => `Your battle with ${from} is over! See who won 🏆`,
  game_invite:         (from) => `${from} challenged you to a WhamBible battle! ⚔️`,
};

// ── State ────────────────────────────────────────────────────────
let messaging = null;
let currentPushToken = null;

// ── Init Firebase Messaging ───────────────────────────────────────
async function initPushNotifications() {
  // Skip if placeholders not yet filled
  if (FIREBASE_CONFIG.apiKey.includes('%%')) {
    console.warn('[WhamBible Push] Firebase config not yet set — skipping push init');
    return false;
  }

  try {
    // Dynamically load Firebase SDK (modular v9+)
    const { initializeApp }    = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getMessaging, getToken, onMessage } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js');

    const app = initializeApp(FIREBASE_CONFIG);
    messaging = getMessaging(app);

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[WhamBible Push] Permission denied');
      return false;
    }

    // Get FCM token
    currentPushToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    console.log('[WhamBible Push] Token acquired:', currentPushToken.slice(0,12) + '...');

    // Save token to player profile
    savePushToken(currentPushToken);

    // Handle foreground messages
    onMessage(messaging, (payload) => {
      console.log('[WhamBible Push] Foreground message:', payload);
      showInAppNotification(payload.notification?.title, payload.notification?.body);
    });

    return true;
  } catch (err) {
    console.error('[WhamBible Push] Init error:', err);
    return false;
  }
}

// ── Save push token to player profile (localStorage for now) ─────
function savePushToken(token) {
  const profile = getLocalProfile();
  if (profile) {
    profile.push_token = token;
    saveLocalProfile(profile);
  }
  // When backend is wired: POST to /api/update-profile { push_token: token }
}

// ── Send Push Notification via FCM HTTP v1 API ────────────────────
// Called server-side via Netlify function — client triggers it
async function sendPushNotification(type, toToken, fromName, gameId) {
  if (!toToken || toToken.includes('%%')) return;

  const message = NOTIF_TYPES[type]?.(fromName);
  if (!message) return;

  try {
    // Call Netlify serverless function (see functions/send-push.js)
    const res = await fetch('/.netlify/functions/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token:   toToken,
        title:   'WhamBible ⚔️',
        body:    message,
        type,
        gameId,
        fromName,
      }),
    });

    if (!res.ok) throw new Error('Push send failed: ' + res.status);
    console.log('[WhamBible Push] Sent:', type, 'to', toToken.slice(0,12) + '...');
  } catch (err) {
    console.error('[WhamBible Push] Send error:', err);
  }
}

// ── In-App Notification Banner (foreground fallback) ─────────────
function showInAppNotification(title, body) {
  const banner = document.createElement('div');
  banner.className = 'push-banner';
  banner.innerHTML = `
    <div class="push-banner-icon">⚔️</div>
    <div class="push-banner-text">
      <strong>${title || 'WhamBible'}</strong>
      <span>${body || ''}</span>
    </div>
  `;
  document.body.appendChild(banner);
  setTimeout(() => banner.classList.add('show'), 10);
  setTimeout(() => {
    banner.classList.remove('show');
    setTimeout(() => banner.remove(), 400);
  }, 4000);
}

// ── Local Profile Helpers ─────────────────────────────────────────
function getLocalProfile() {
  const raw = localStorage.getItem('wb_player_profile');
  return raw ? JSON.parse(raw) : null;
}

function saveLocalProfile(profile) {
  localStorage.setItem('wb_player_profile', JSON.stringify(profile));
}

function getOpponentToken(gameCode) {
  // Looks up opponent's push token from game state
  // When real auth is wired: fetch from player profile DB
  const game = JSON.parse(localStorage.getItem('wb_game_' + gameCode) || '{}');
  return game.opponent_push_token || null;
}
