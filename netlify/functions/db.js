// ============================================================
// WhamBible — Netlify Function: db
// Proxies Base44 entity CRUD using server-side API token.
// The token never touches the browser.
//
// SECRETS (Netlify env vars):
//   BASE44_SERVICE_TOKEN — Base44 service token (JWT)
//   BASE44_APP_ID        — App ID (69df9a909b33058a5ce47831)
//
// ENDPOINT: /.netlify/functions/db
// METHOD:   POST
// BODY:     { action, entity, id, data, query }
//   action: "list" | "get" | "create" | "update"
//
// FIXED 2026-04-25:
//   - BASE URL: app.base44.com (was api.base44.com — 404'd)
//   - AUTH: Authorization: Bearer (was x-api-key — 403'd)
// ============================================================

const TOKEN  = process.env.BASE44_SERVICE_TOKEN;
const APP_ID = process.env.BASE44_APP_ID || "69df9a909b33058a5ce47831";
const BASE   = `https://app.base44.com/api/apps/${APP_ID}/entities`;

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: cors, body: "Method Not Allowed" };
  }
  if (!TOKEN) {
    console.error("[db] BASE44_SERVICE_TOKEN not set");
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Server not configured" }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers: cors, body: "Invalid JSON" }; }

  const { action, entity, id, data, query } = body;
  if (!action || !entity) {
    return { statusCode: 400, headers: cors, body: "Missing action or entity" };
  }

  // Auth header: Authorization: Bearer <token>
  const headers = {
    "Content-Type":   "application/json",
    "Authorization":  `Bearer ${TOKEN}`,
  };

  let url, method, fetchBody;

  try {
    switch (action) {
      case "list": {
        url    = `${BASE}/${entity}`;
        method = "GET";
        break;
      }
      case "get": {
        if (!id) return { statusCode: 400, headers: cors, body: "Missing id" };
        url    = `${BASE}/${entity}/${id}`;
        method = "GET";
        break;
      }
      case "create": {
        if (!data) return { statusCode: 400, headers: cors, body: "Missing data" };
        url       = `${BASE}/${entity}`;
        method    = "POST";
        fetchBody = JSON.stringify(data);
        break;
      }
      case "update": {
        if (!id || !data) return { statusCode: 400, headers: cors, body: "Missing id or data" };
        url       = `${BASE}/${entity}/${id}`;
        method    = "PUT";
        fetchBody = JSON.stringify(data);
        break;
      }
      default:
        return { statusCode: 400, headers: cors, body: `Unknown action: ${action}` };
    }

    const res    = await fetch(url, { method, headers, body: fetchBody });
    const result = await res.json();

    if (!res.ok) {
      console.error(`[db] B44 ${action} ${entity} ${res.status}:`, JSON.stringify(result).slice(0,200));
      return { statusCode: res.status, headers: cors, body: JSON.stringify({ error: result }) };
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify(result) };

  } catch (err) {
    console.error("[db] Error:", err.message);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
