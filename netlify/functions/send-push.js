// ============================================================
// WhamBible — Netlify Serverless Function: send-push
// Fires FCM push notifications server-side
//
// SECRETS REQUIRED (set in Netlify → Site config → Env vars):
//   FIREBASE_PROJECT_ID       — Firebase project ID
//   FIREBASE_SERVICE_ACCOUNT  — Full Firebase service account JSON (stringified)
//
// DEPLOY PATH: netlify/functions/send-push.js
// ENDPOINT:    /.netlify/functions/send-push
// ============================================================

const FIREBASE_PROJECT_ID    = process.env.FIREBASE_PROJECT_ID;     // %%FIREBASE_PROJECT_ID%%
const FIREBASE_SERVICE_ACCT  = process.env.FIREBASE_SERVICE_ACCOUNT; // %%FIREBASE_SERVICE_ACCOUNT%%

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // ── Validate secrets are present ─────────────────────────────
  if (!FIREBASE_PROJECT_ID || !FIREBASE_SERVICE_ACCT) {
    console.error('[send-push] Missing Firebase env vars');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Push notifications not configured yet' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { token, title, body: msgBody, type, gameId, fromName } = body;

  if (!token || !title || !msgBody) {
    return { statusCode: 400, body: 'Missing required fields: token, title, body' };
  }

  // ── Get OAuth2 access token from service account ─────────────
  let accessToken;
  try {
    accessToken = await getAccessToken(JSON.parse(FIREBASE_SERVICE_ACCT));
  } catch (err) {
    console.error('[send-push] Auth error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: 'FCM auth failed' }) };
  }

  // ── Build FCM message ─────────────────────────────────────────
  const fcmMessage = {
    message: {
      token,
      notification: { title, body: msgBody },
      data: {
        type:     type     || '',
        gameId:   gameId   || '',
        fromName: fromName || '',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      webpush: {
        notification: {
          title,
          body: msgBody,
          icon:  '/icon-192.png',
          badge: '/badge-72.png',
          click_action: 'https://whambible.com',
        },
        fcm_options: {
          link: `https://whambible.com/challenge.html${gameId ? '?game=' + gameId : ''}`,
        },
      },
    },
  };

  // ── Send via FCM HTTP v1 ──────────────────────────────────────
  try {
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`;
    const res    = await fetch(fcmUrl, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(fcmMessage),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('[send-push] FCM error:', result);
      return { statusCode: res.status, body: JSON.stringify(result) };
    }

    console.log('[send-push] Sent OK:', result.name);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, messageId: result.name }),
    };
  } catch (err) {
    console.error('[send-push] Fetch error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

// ── Google OAuth2 JWT token for FCM HTTP v1 ───────────────────────
async function getAccessToken(serviceAccount) {
  const { client_email, private_key } = serviceAccount;
  const now = Math.floor(Date.now() / 1000);

  const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss:   client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  }));

  const signingInput = `${header}.${payload}`;
  const signature    = await signRS256(signingInput, private_key);
  const jwt          = `${signingInput}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('No access token: ' + JSON.stringify(tokenData));
  return tokenData.access_token;
}

function b64url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function signRS256(data, privateKey) {
  const { createSign } = require('crypto');
  const sign = createSign('RSA-SHA256');
  sign.update(data);
  return b64url(sign.sign(privateKey));
}
