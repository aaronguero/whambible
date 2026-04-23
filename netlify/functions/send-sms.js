// ============================================================
// WhamBible — Netlify Function: send-sms
// Sends SMS notifications via Twilio — NO Firebase, NO FCM.
//
// SECRETS (set in Netlify → Site config → Env vars):
//   TWILIO_ACCOUNT_SID  — Twilio Account SID
//   TWILIO_AUTH_TOKEN   — Twilio Auth Token
//   TWILIO_PHONE        — Your Twilio phone number (e.g. +15005550006)
//
// ENDPOINT: /.netlify/functions/send-sms
// METHOD:   POST
// BODY:     { to, message, gameId }
// ============================================================

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const FROM_PHONE  = process.env.TWILIO_PHONE;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_PHONE) {
    console.warn("[send-sms] Twilio env vars not set — skipping SMS");
    return {
      statusCode: 200,
      body: JSON.stringify({ skipped: true, reason: "Twilio not configured" }),
    };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: "Invalid JSON" }; }

  const { to, message, gameId } = body;
  if (!to || !message) {
    return { statusCode: 400, body: "Missing required fields: to, message" };
  }

  const fullMsg = gameId
    ? `${message}\n\nhttps://whambible.com/challenge?game=${gameId}`
    : message;

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
  const encoded   = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");

  try {
    const res = await fetch(twilioUrl, {
      method:  "POST",
      headers: {
        "Authorization": `Basic ${encoded}`,
        "Content-Type":  "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: FROM_PHONE, Body: fullMsg }).toString(),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("[send-sms] Twilio error:", result);
      return { statusCode: res.status, body: JSON.stringify({ error: result.message || result }) };
    }

    console.log("[send-sms] SMS sent:", result.sid);
    return { statusCode: 200, body: JSON.stringify({ success: true, sid: result.sid }) };

  } catch (err) {
    console.error("[send-sms] Fetch error:", err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
