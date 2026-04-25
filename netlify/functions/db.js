// ============================================================
// WhamBible — Netlify Function: db  (v3 — permanent proxy)
// Forwards all entity CRUD to the B44 dbProxy backend function,
// which uses createClientFromRequest + asServiceRole.
//
// WHY: B44 service tokens expire in 1hr. The B44 backend function
// has PERMANENT service-role access with no token management needed.
//
// B44_PROXY_URL (Netlify env var):
//   https://designer-5ce47831.base44.app/functions/dbProxy
//
// BODY: { action, entity, id?, data?, query? }
// ============================================================

const PROXY_URL = process.env.B44_PROXY_URL ||
  "https://designer-5ce47831.base44.app/functions/dbProxy";

const cors = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: "Method Not Allowed" };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: cors, body: "Invalid JSON" }; }

  const { action, entity } = body;
  if (!action || !entity) {
    return { statusCode: 400, headers: cors, body: "Missing action or entity" };
  }

  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await res.text();

    if (!res.ok) {
      console.error(`[db] proxy ${action} ${entity} ${res.status}:`, result.slice(0, 200));
      return {
        statusCode: res.status,
        headers: cors,
        body: result,
      };
    }

    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: result,
    };

  } catch (err) {
    console.error("[db] fetch error:", err.message);
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
