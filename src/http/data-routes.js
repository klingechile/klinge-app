import { readJsonBody } from "./body.js";
import { deleteRow, insertRow, listRows, updateRow, upsertRow } from "../db/data-repository.js";

export async function handleDataRoute(req, res, url) {
  const match = url.pathname.match(/^\/api\/data\/([a-zA-Z_][a-zA-Z0-9_]*)(?:\/([^/]+))?$/);
  if (!match) return false;

  const table = match[1];
  const id = match[2] ? decodeURIComponent(match[2]) : null;

  if (req.method === "GET" && !id) {
    return sendJson(res, 200, await listRows(table, url.searchParams));
  }

  if (req.method === "POST" && !id) {
    const body = await readJsonBody(req);
    const prefer = req.headers.prefer || "";
    if (prefer.includes("resolution=merge-duplicates")) {
      return sendJson(res, 200, await upsertRow(table, body));
    }
    return sendJson(res, 201, await insertRow(table, body));
  }

  if (req.method === "PATCH" && id) {
    const body = await readJsonBody(req);
    return sendJson(res, 200, await updateRow(table, id, body));
  }

  if (req.method === "DELETE" && id) {
    return sendJson(res, 200, await deleteRow(table, id));
  }

  return sendJson(res, 405, { error: "Method not allowed" });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}
