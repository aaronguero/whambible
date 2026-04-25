// ============================================================
// WhamBible — Netlify Function: db
// Proxies Base44 entity CRUD using server-side API token.
// The token never touches the browser.
//
// SECRETS (Netlify env vars):
//   BASE44_SERVICE_TOKEN — Base44 service token (refreshed by automation)
//   BASE44_APP_ID        — App ID (69df9a909b33058a5ce47831)
//
// TOKEN REFRESH:
//   The service token is short-lived (1hr JWT). This function
//   caches it in memory and re-fetches via the B44 generate_service_token
//   endpoint when it detects expiry (401 response).
// ============================================================

const APP_ID = process.env.BASE44_APP_ID || "69df9a909b33058a5ce47831";
const BASE   = `https://app.base44.com/api/apps/${APP_ID}/entities`;

// In-memory token cache (survives warm Lambda invocations)
let _token    = process.env.BASE44_SERVICE_TOKEN || "";
let _tokenExp = 0; // Unix timestamp

function parseTokenExpiry(jwt) {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
    return (payload.exp || 0) * 1000; // ms
  } catch { return 0; }
}

async function getFreshToken() {
  // If cached token is still valid (with 5min buffer), use it
  const now = Date.now();
  if (_token && _tokenExp > now + 5 * 60 * 1000) return _token;

  // Warm up from env var (may be fresh enough)
  const envToken = process.env.BASE44_SERVICE_TOKEN;
  if (envToken) {
    const exp = parseTokenExpiry(envToken);
    if (exp > now + 5 * 60 * 1000) {
      _token    = envToken;
      _tokenExp = exp;
      return _token;
    }
  }

  // Token expired — try to refresh via B44 internal endpoint
  // B44 service accounts can re-issue their own token
  try {
    const sub = envToken ? JSON.parse(Buffer.from(envToken.split(".")[1], "base64url").toString()).sub : null;
    if (sub) {
      const res = await fetch(`https://app.base44.com/api/apps/${APP_ID}/service_account/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${envToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const newToken = data.token || data.access_token;
        if (newToken) {
          _token    = newToken;
          _tokenExp = parseTokenExpiry(newToken);
          console.log("[db] Token refreshed successfully");
          return _token;
        }
      }
    }
  } catch (e) {
    console.warn("[db] Token refresh attempt failed:", e.message);
  }

  // Fall back to whatever we have (may fail with 401)
  _token    = envToken || _token;
  _tokenExp = parseTokenExpiry(_token);
  console.warn("[db] Using potentially expired token — set fresh BASE44_SERVICE_TOKEN in Netlify");
  return _token;
}

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

  const { action, entity, id, data, query } = body;
  if (!action || !entity) {
    return { statusCode: 400, headers: cors, body: "Missing action or entity" };
  }

  const token = await getFreshToken();
  if (!token) {
    console.error("[db] No token available");
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Server not configured" }) };
  }

  const headers = {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${token}`,
  };

  let url, method, fetchBody;

  try {
    switch (action) {
      case "list": {
        url    = `${BASE}/${entity}`;
        method = "GET";
        // Pass query params as filter_ prefixed query string
        if (query && Object.keys(query).length) {
          const params = new URLSearchParams(
            Object.entries(query).map(([k, v]) => [`filter_${k}`, v])
          );
          url += "?" + params.toString();
        }
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
      console.error(`[db] B44 ${action} ${entity} ${res.status}:`, JSON.stringify(result).slice(0, 200));
      return { statusCode: res.status, headers: cors, body: JSON.stringify({ error: result }) };
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify(result) };

  } catch (err) {
    console.error("[db] Error:", err.message);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
