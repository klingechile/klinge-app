import { getCoreStatus, getTableCounts } from "../db/diagnostics.js";

export async function handleAdminRoute(req, res, url) {
  if (url.pathname === "/api/admin/db/status" && req.method === "GET") {
    return sendJson(res, 200, await getCoreStatus());
  }

  if (url.pathname === "/api/admin/db/counts" && req.method === "GET") {
    return sendJson(res, 200, await getTableCounts());
  }

  return false;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}
