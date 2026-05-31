import { readJsonBody } from "./body.js";

export async function handleProxyRoute(req, res, url) {
  if (url.pathname === "/api/lumi/message" && req.method === "POST") {
    const body = await readJsonBody(req);
    const baseUrl = process.env.LUMI_API_BASE || "https://lumi-klinge-bot-production.up.railway.app";
    const adminKey = process.env.LUMI_ADMIN_KEY;
    if (!adminKey) return sendJson(res, 503, { error: "LUMI_ADMIN_KEY is not configured" });

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/admin/mensaje`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey
      },
      body: JSON.stringify(body || {})
    });

    return forwardJson(res, response);
  }

  if (url.pathname === "/api/dte/facturas" && req.method === "POST") {
    const body = await readJsonBody(req);
    const baseUrl = process.env.DTE_API_BASE || "https://generar-dte-production.up.railway.app";

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/facturas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(body || {})
    });

    return forwardJson(res, response);
  }

  if (url.pathname === "/api/ai/messages" && req.method === "POST") {
    const body = await readJsonBody(req);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return sendJson(res, 503, { error: "ANTHROPIC_API_KEY is not configured" });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body || {})
    });

    return forwardJson(res, response);
  }

  return false;
}

async function forwardJson(res, response) {
  const text = await response.text();
  res.writeHead(response.status, { "Content-Type": response.headers.get("content-type") || "application/json; charset=utf-8" });
  res.end(text);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}
