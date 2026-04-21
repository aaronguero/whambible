// WhamBible — sendPushNotification
// Uses FCM Legacy HTTP API — no service account JSON needed, just FIREBASE_SERVER_KEY.
// Get it: Firebase Console → Project Settings → Cloud Messaging → "Server key" (Legacy)
//
// Secrets required:
//   FIREBASE_SERVER_KEY  — the "Server key" from Cloud Messaging tab (NOT the API key)

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SERVER_KEY = Deno.env.get("FIREBASE_SERVER_KEY");

Deno.serve(async (req) => {
  try {
    // ── Flag: verify push URL is reachable ────────────────
    if (req.method === "GET") {
      const configured = !!SERVER_KEY;
      return Response.json({
        ok: true,
        configured,
        message: configured
          ? "✅ sendPushNotification ready — FIREBASE_SERVER_KEY is set"
          : "⚠️ FIREBASE_SERVER_KEY not set — pushes will be skipped",
      });
    }

    if (!SERVER_KEY) {
      console.warn("[sendPushNotification] FIREBASE_SERVER_KEY not set — skipping push");
      return Response.json({ skipped: true, reason: "FIREBASE_SERVER_KEY not configured" }, { status: 200 });
    }

    const body = await req.json().catch(() => ({}));
    const { token, title, body: msgBody, gameId, fromName, type } = body;

    if (!token || !title || !msgBody) {
      return Response.json({ error: "Missing required fields: token, title, body" }, { status: 400 });
    }

    const deepLink = gameId
      ? `https://whambible.com/challenge.html?game=${gameId}`
      : "https://whambible.com";

    // ── FCM Legacy HTTP API ───────────────────────────────
    const fcmRes = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Authorization": `key=${SERVER_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title,
          body: msgBody,
          icon:  "/icon-192.png",
          click_action: deepLink,
        },
        data: {
          type:     type     || "game_update",
          gameId:   gameId   || "",
          fromName: fromName || "",
          url:      deepLink,
        },
        webpush: {
          fcm_options: { link: deepLink },
        },
      }),
    });

    const result = await fcmRes.json();

    if (!fcmRes.ok || result.failure > 0) {
      console.error("[sendPushNotification] FCM error:", result);
      return Response.json({ error: result }, { status: fcmRes.ok ? 200 : fcmRes.status });
    }

    console.log("[sendPushNotification] Sent OK:", result.message_id || result);
    return Response.json({ success: true, result });

  } catch (error) {
    console.error("[sendPushNotification] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
