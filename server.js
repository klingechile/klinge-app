import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const NODE_ENV = process.env.NODE_ENV || "development";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none';"
  );
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function unauthorized(res) {
  res.writeHead(401, {
    "WWW-Authenticate": 'Basic realm="Klinge Ventas Admin"',
    "Content-Type": "text/plain; charset=utf-8"
  });
  res.end("Unauthorized");
}

function isAuthorized(req) {
  if (NODE_ENV !== "production") return true;

  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Basic ")) return false;

  const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return false;

  const user = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  return user === ADMIN_USER && password === ADMIN_PASSWORD;
}

function serveFile(res, filePath, contentType) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "Content-Type": contentType });
  res.end(content);
}

function supabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function assertSupabaseConfigured() {
  if (!supabaseConfigured()) {
    const error = new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Railway.");
    error.status = 503;
    throw error;
  }
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

async function supabaseFetch(resource, options = {}) {
  assertSupabaseConfigured();

  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1${resource}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const error = new Error(typeof data === "object" && data?.message ? data.message : `Supabase request failed: ${response.status}`);
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

function nullable(value) {
  return value === undefined || value === null || value === "" ? null : value;
}

function numberOrZero(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isManualPayment(sale) {
  const method = String(sale.paymentMethod || sale.payment_method || "").toLowerCase();
  return method.includes("bank") || method.includes("deposit") || method.includes("transfer") || method.includes("transferencia");
}

function toDbSale(sale) {
  return {
    source: sale.source || "shopify_csv",
    external_order_id: String(sale.id || sale.externalOrderId || sale.external_order_id),
    external_order_name: sale.name || sale.externalOrderName || sale.external_order_name || null,
    customer_name: sale.customer || sale.customerName || sale.customer_name || null,
    customer_email: sale.email || sale.customerEmail || sale.customer_email || null,
    customer_phone: sale.phone || sale.customerPhone || sale.customer_phone || null,
    city: sale.city || null,
    region: sale.region || null,
    financial_status: sale.financialStatus || sale.financial_status || "unknown",
    fulfillment_status: sale.fulfillmentStatus || sale.fulfillment_status || "unfulfilled",
    payment_method: sale.paymentMethod || sale.payment_method || null,
    payment_reference: sale.paymentReference || sale.payment_reference || null,
    subtotal_amount: numberOrZero(sale.subtotal || sale.subtotal_amount),
    shipping_amount: numberOrZero(sale.shipping || sale.shipping_amount),
    tax_amount: numberOrZero(sale.taxes || sale.tax_amount),
    total_amount: numberOrZero(sale.total || sale.total_amount),
    created_at_shopify: nullable(sale.createdAt || sale.created_at_shopify),
    paid_at: nullable(sale.paidAt || sale.paid_at),
    notes: sale.notes || null,
    risk_level: sale.riskLevel || sale.risk_level || null,
    invoice_status: sale.invoiceStatus || sale.invoice_status || "pendiente"
  };
}

function toDbItem(saleId, item) {
  return {
    sale_id: saleId,
    product_name: item.name || item.product_name || "Producto sin nombre",
    sku: item.sku || null,
    quantity: numberOrZero(item.quantity || 1),
    unit_price: numberOrZero(item.unitPrice || item.unit_price)
  };
}

function toApiSale(row) {
  const paymentProof = Array.isArray(row.payment_proofs) ? row.payment_proofs[0] : null;
  const invoice = Array.isArray(row.invoices) ? row.invoices[0] : null;

  return {
    dbId: row.id,
    id: row.external_order_id,
    name: row.external_order_name || row.external_order_id,
    customer: row.customer_name || "Cliente sin nombre",
    email: row.customer_email || "",
    phone: row.customer_phone || "",
    city: row.city || "",
    region: row.region || "",
    financialStatus: row.financial_status || "unknown",
    fulfillmentStatus: row.fulfillment_status || "unfulfilled",
    paymentMethod: row.payment_method || "Sin método",
    paymentReference: row.payment_reference || "",
    subtotal: Number(row.subtotal_amount || 0),
    shipping: Number(row.shipping_amount || 0),
    taxes: Number(row.tax_amount || 0),
    total: Number(row.total_amount || 0),
    createdAt: row.created_at_shopify || "",
    paidAt: row.paid_at || "",
    notes: row.notes || "",
    riskLevel: row.risk_level || "",
    source: row.source || "shopify_csv",
    invoiceStatus: invoice?.status || row.invoice_status || "pendiente",
    paymentProofStatus: paymentProof?.status || (isManualPayment(row) ? "pendiente" : "no requerido"),
    items: (row.sale_items || []).map((item) => ({
      name: item.product_name,
      sku: item.sku || "",
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unit_price || 0)
    }))
  };
}

async function listSales() {
  const rows = await supabaseFetch("/sales?select=*,sale_items(*),payment_proofs(*),invoices(*)&order=created_at_shopify.desc.nullslast,created_at.desc");
  return (rows || []).map(toApiSale);
}

function quoteInValue(value) {
  return `\"${String(value).replaceAll("\"", "\"\"")}\"`;
}

async function importSales(sales) {
  if (!Array.isArray(sales)) {
    const error = new Error("sales must be an array");
    error.status = 400;
    throw error;
  }

  const normalized = sales.map(toDbSale).filter((sale) => sale.external_order_id && sale.total_amount >= 0);
  if (!normalized.length) return { added: 0, updated: 0, total: 0, sales: await listSales() };

  const ids = normalized.map((sale) => sale.external_order_id);
  const existing = await supabaseFetch(`/sales?select=external_order_id&source=eq.shopify_csv&external_order_id=in.(${ids.map(quoteInValue).join(",")})`);
  const existingSet = new Set((existing || []).map((row) => row.external_order_id));

  const upserted = await supabaseFetch("/sales?on_conflict=source,external_order_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(normalized)
  });

  const byExternalId = new Map((upserted || []).map((row) => [row.external_order_id, row]));
  const saleIds = (upserted || []).map((row) => row.id);

  if (saleIds.length) {
    await supabaseFetch(`/sale_items?sale_id=in.(${saleIds.map(quoteInValue).join(",")})`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" }
    });
  }

  const items = [];
  const proofs = [];
  const invoices = [];

  for (const sale of sales) {
    const dbSale = byExternalId.get(String(sale.id || sale.externalOrderId || sale.external_order_id));
    if (!dbSale) continue;

    for (const item of sale.items || []) {
      items.push(toDbItem(dbSale.id, item));
    }

    if (isManualPayment(sale)) {
      proofs.push({
        sale_id: dbSale.id,
        status: "pendiente",
        declared_amount: numberOrZero(sale.total || sale.total_amount),
        payment_reference: sale.paymentReference || sale.payment_reference || null
      });
    }

    if (String(sale.financialStatus || sale.financial_status).toLowerCase() === "paid") {
      invoices.push({
        sale_id: dbSale.id,
        status: sale.invoiceStatus || sale.invoice_status || "pendiente"
      });
    }
  }

  if (items.length) {
    await supabaseFetch("/sale_items", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(items)
    });
  }

  if (proofs.length) {
    await supabaseFetch("/payment_proofs?on_conflict=sale_id", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify(proofs)
    });
  }

  if (invoices.length) {
    await supabaseFetch("/invoices?on_conflict=sale_id", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify(invoices)
    });
  }

  return {
    added: normalized.filter((sale) => !existingSet.has(sale.external_order_id)).length,
    updated: normalized.filter((sale) => existingSet.has(sale.external_order_id)).length,
    total: normalized.length,
    sales: await listSales()
  };
}

async function findSaleByExternalId(externalOrderId) {
  const rows = await supabaseFetch(`/sales?select=*&source=eq.shopify_csv&external_order_id=eq.${encodeURIComponent(externalOrderId)}&limit=1`);
  const sale = rows?.[0];
  if (!sale) {
    const error = new Error("Sale not found");
    error.status = 404;
    throw error;
  }
  return sale;
}

async function approvePaymentProof(externalOrderId) {
  const sale = await findSaleByExternalId(externalOrderId);
  await supabaseFetch("/payment_proofs?on_conflict=sale_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      sale_id: sale.id,
      status: "aprobado",
      declared_amount: sale.total_amount,
      approved_at: new Date().toISOString()
    })
  });
  return { ok: true, sales: await listSales() };
}

async function markInvoiceIssued(externalOrderId) {
  const sale = await findSaleByExternalId(externalOrderId);
  await supabaseFetch(`/sales?id=eq.${sale.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ invoice_status: "facturada", updated_at: new Date().toISOString() })
  });
  await supabaseFetch("/invoices?on_conflict=sale_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      sale_id: sale.id,
      status: "facturada",
      issued_at: new Date().toISOString()
    })
  });
  return { ok: true, sales: await listSales() };
}

async function handleApi(req, res, url) {
  if (url.pathname === "/api/status" && req.method === "GET") {
    sendJson(res, 200, { ok: true, supabaseConfigured: supabaseConfigured() });
    return;
  }

  if (url.pathname === "/api/sales" && req.method === "GET") {
    sendJson(res, 200, { sales: await listSales() });
    return;
  }

  if (url.pathname === "/api/shopify/import-csv" && req.method === "POST") {
    const body = await readJsonBody(req);
    sendJson(res, 200, await importSales(body.sales));
    return;
  }

  const proofMatch = url.pathname.match(/^\/api\/payment-proofs\/(.+)\/approve$/);
  if (proofMatch && req.method === "PATCH") {
    sendJson(res, 200, await approvePaymentProof(decodeURIComponent(proofMatch[1])));
    return;
  }

  const invoiceMatch = url.pathname.match(/^\/api\/invoices\/(.+)\/mark-issued$/);
  if (invoiceMatch && req.method === "PATCH") {
    sendJson(res, 200, await markInvoiceIssued(decodeURIComponent(invoiceMatch[1])));
    return;
  }

  sendJson(res, 404, { error: "API route not found" });
}

const server = http.createServer(async (req, res) => {
  try {
    setSecurityHeaders(res);
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/health") {
      sendJson(res, 200, { status: "ok", service: "klinge-sales-admin", supabaseConfigured: supabaseConfigured() });
      return;
    }

    if (!isAuthorized(req)) {
      unauthorized(res);
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    if (req.method !== "GET") {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Method not allowed");
      return;
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      serveFile(res, path.join(__dirname, "public", "index.html"), "text/html; charset=utf-8");
      return;
    }

    if (url.pathname === "/app.js") {
      serveFile(res, path.join(__dirname, "public", "app.js"), "application/javascript; charset=utf-8");
      return;
    }

    if (url.pathname === "/styles.css") {
      serveFile(res, path.join(__dirname, "public", "styles.css"), "text/css; charset=utf-8");
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (error) {
    console.error("Server error:", error.message, error.details || "");
    sendJson(res, error.status || 500, { error: error.message || "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Klinge Ventas Admin running on port ${PORT}`);
});
