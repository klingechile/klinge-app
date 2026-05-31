import { readJsonBody } from "./body.js";
import { deleteMany, insertRow, listRows, updateMany, upsertRow } from "../db/data-repository.js";

export async function handleRestCompatRoute(req, res, url) {
  const match = url.pathname.match(/^\/rest\/v1\/([a-zA-Z_][a-zA-Z0-9_]*)$/);
  if (!match) return false;

  const table = match[1];

  if (req.method === "GET") {
    return sendJson(res, 200, await listRows(table, url.searchParams));
  }

  if (req.method === "POST") {
    const body = await readJsonBody(req);
    const prefer = req.headers.prefer || "";
    if (prefer.includes("resolution=merge-duplicates")) {
      return sendJson(res, 200, await upsertRow(table, body));
    }
    return sendJson(res, 201, await insertRow(table, body));
  }

  if (req.method === "PATCH") {
    const body = await readJsonBody(req);
    return sendJson(res, 200, await updateMany(table, url.searchParams, body));
  }

  if (req.method === "DELETE") {
    return sendJson(res, 200, await deleteMany(table, url.searchParams));
  }

  return sendJson(res, 405, { error: "Method not allowed" });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}
