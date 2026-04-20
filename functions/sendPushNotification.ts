// WhamBible — sendPushNotification
// Calls Firebase Cloud Messaging HTTP v1 API server-side.
// Called via Base44 SDK: base44.functions.invoke("sendPushNotification", { token, title, body, gameId, fromName })
// Secrets required in Base44 env:
//   FIREBASE_PROJECT_ID       — e.g. "wham-bible"
//   FIREBASE_SERVICE_ACCOUNT  — full service account JSON, stringified

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PROJECT_ID   = Deno.env.get("FIREBASE_PROJECT_ID");
const SERVICE_ACCT = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");

Deno.serve(async (req) => {
  try {
    // ── Validate secrets present ──────────────────────────
    if (!PROJECT_ID || !SERVICE_ACCT) {
      console.warn("[sendPushNotification] Missing Firebase env vars");
      return Response.json(
        { error: "Push notifications not configured — set FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT env vars" },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { token, title, body: msgBody, gameId, fromName, type } = body;

    if (!token || !title || !msgBody) {
      return Response.json(
        { error: "Missing required fields: token, title, body" },
        { status: 400 }
      );
    }

    // ── Get FCM OAuth access token ──────────────────────────
    let accessToken: string;
    try {
      accessToken = await getAccessToken(JSON.parse(SERVICE_ACCT));
    } catch (err) {
      console.error("[sendPushNotification] Auth error:", err);
      return Response.json({ error: "FCM auth failed: " + err.message }, { status: 500 });
    }

    // ── Build FCM message ──────────────────────────────────
    const deepLink = gameId
      ? `https://whambible.com/challenge.html?game=${gameId}`
      : "https://whambible.com";

    const fcmMessage = {
      message: {
        token,
        notification: { title, body: msgBody },
        data: {
          type:      type      || "game_update",
          gameId:    gameId    || "",
          fromName:  fromName  || "",
        },
        webpush: {
          notification: {
            title,
            body: msgBody,
            icon:  "/icon-192.png",
            badge: "/badge-72.png",
          },
          fcm_options: {
            link: deepLink,
          },
        },
        android: {
          notification: { title, body: msgBody, icon: "ic_notification" },
          data: { gameId: gameId || "", type: type || "game_update" },
        },
        apns: {
          payload: {
            aps: { alert: { title, body: msgBody }, sound: "default", badge: 1 },
            gameId: gameId || "",
          },
        },
      },
    };

    // ── Send via FCM HTTP v1 ───────────────────────────────
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
    const fcmRes = await fetch(fcmUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(fcmMessage),
    });

    const result = await fcmRes.json();

    if (!fcmRes.ok) {
      console.error("[sendPushNotification] FCM error:", result);
      return Response.json({ error: result }, { status: fcmRes.status });
    }

    console.log("[sendPushNotification] Sent OK:", result.name);
    return Response.json({ success: true, messageId: result.name });

  } catch (error) {
    console.error("[sendPushNotification] Unhandled error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ── Google OAuth2 JWT → FCM access token ─────────────────
async function getAccessToken(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const { client_email, private_key } = serviceAccount;
  const now = Math.floor(Date.now() / 1000);

  const header  = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss:   client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud:   "https://oauth2.googleapis.com/token",
    iat:   now,
    exp:   now + 3600,
  }));

  const signingInput = `${header}.${payload}`;
  const signature    = await signRS256(signingInput, private_key);
  const jwt          = `${signingInput}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error("No access token: " + JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}

function b64url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function signRS256(data: string, privateKey: string): Promise<string> {
  // Import PEM private key
  const pemContents = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const encoder  = new TextEncoder();
  const sigBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(data)
  );

  return btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
