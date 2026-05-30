import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const NODE_ENV = process.env.NODE_ENV || "development";
const DATABASE_URL = process.env.DATABASE_URL || "";

const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    })
  : null;

let schemaReady = false;
let schemaError = null;

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

function databaseConfigured() {
  return Boolean(pool);
}

async function assertDbReady() {
  if (!pool) {
    const error = new Error("Railway PostgreSQL is not configured. Set DATABASE_URL in Railway.");
    error.status = 503;
    throw error;
  }

  if (schemaError) {
    const error = new Error(`Database schema initialization failed: ${schemaError.message}`);
    error.status = 503;
    throw error;
  }

  if (!schemaReady) {
    await ensureSchema();
  }
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
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

async function ensureSchema() {
  if (!pool) return;

  try {
    await pool.query(`
      create extension if not exists pgcrypto;

      create table if not exists sales (
        id uuid primary key default gen_random_uuid(),
        source text not null default 'shopify_csv',
        external_order_id text not null,
        external_order_name text,
        customer_name text,
        customer_email text,
        customer_phone text,
        city text,
        region text,
        financial_status text not null default 'unknown',
        fulfillment_status text not null default 'unfulfilled',
        payment_method text,
        payment_reference text,
        subtotal_amount numeric not null default 0,
        shipping_amount numeric not null default 0,
        tax_amount numeric not null default 0,
        total_amount numeric not null default 0,
        created_at_shopify timestamptz,
        paid_at timestamptz,
        notes text,
        risk_level text,
        invoice_status text not null default 'pendiente',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique (source, external_order_id)
      );

      create table if not exists sale_items (
        id uuid primary key default gen_random_uuid(),
        sale_id uuid not null references sales(id) on delete cascade,
        product_name text not null,
        sku text,
        quantity integer not null default 1,
        unit_price numeric not null default 0,
        created_at timestamptz not null default now()
      );

      create table if not exists payment_proofs (
        id uuid primary key default gen_random_uuid(),
        sale_id uuid not null references sales(id) on delete cascade,
        status text not null default 'pendiente',
        declared_amount numeric,
        payment_reference text,
        review_notes text,
        approved_at timestamptz,
        rejected_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique (sale_id)
      );

      create table if not exists invoices (
        id uuid primary key default gen_random_uuid(),
        sale_id uuid not null references sales(id) on delete cascade,
        provider text not null default 'lioren',
        document_type text,
        folio text,
        pdf_url text,
        status text not null default 'pendiente',
        error_message text,
        issued_at timestamptz,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique (sale_id)
      );

      create index if not exists idx_sales_source_order on sales(source, external_order_id);
      create index if not exists idx_sales_financial_status on sales(financial_status);
      create index if not exists idx_sales_fulfillment_status on sales(fulfillment_status);
      create index if not exists idx_sales_invoice_status on sales(invoice_status);
      create index if not exists idx_sales_created_at_shopify on sales(created_at_shopify desc);
      create index if not exists idx_sale_items_sale_id on sale_items(sale_id);
      create index if not exists idx_payment_proofs_sale_id on payment_proofs(sale_id);
      create index if not exists idx_invoices_sale_id on invoices(sale_id);
    `);
    schemaReady = true;
    schemaError = null;
  } catch (error) {
    schemaReady = false;
    schemaError = error;
    throw error;
  }
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
    invoiceStatus: row.invoice_status || row.real_invoice_status || "pendiente",
    paymentProofStatus: row.payment_proof_status || (isManualPayment(row) ? "pendiente" : "no requerido"),
    items: Array.isArray(row.items) ? row.items : []
  };
}

async function listSales() {
  await assertDbReady();

  const { rows } = await pool.query(`
    select
      s.*,
      coalesce(pp.status, case when lower(coalesce(s.payment_method, '')) like '%bank%' or lower(coalesce(s.payment_method, '')) like '%deposit%' or lower(coalesce(s.payment_method, '')) like '%transfer%' then 'pendiente' else 'no requerido' end) as payment_proof_status,
      coalesce(i.status, s.invoice_status) as real_invoice_status,
      coalesce(
        json_agg(
          json_build_object(
            'name', si.product_name,
            'sku', coalesce(si.sku, ''),
            'quantity', si.quantity,
            'unitPrice', si.unit_price
          ) order by si.created_at
        ) filter (where si.id is not null),
        '[]'::json
      ) as items
    from sales s
    left join sale_items si on si.sale_id = s.id
    left join payment_proofs pp on pp.sale_id = s.id
    left join invoices i on i.sale_id = s.id
    group by s.id, pp.status, i.status
    order by s.created_at_shopify desc nulls last, s.created_at desc
  `);

  return rows.map(toApiSale);
}

async function importSales(sales) {
  await assertDbReady();

  if (!Array.isArray(sales)) {
    const error = new Error("sales must be an array");
    error.status = 400;
    throw error;
  }

  const normalized = sales.map(toDbSale).filter((sale) => sale.external_order_id && sale.total_amount >= 0);
  if (!normalized.length) return { added: 0, updated: 0, total: 0, sales: await listSales() };

  const client = await pool.connect();
  let added = 0;
  let updated = 0;

  try {
    await client.query("begin");

    for (const originalSale of sales) {
      const sale = toDbSale(originalSale);
      if (!sale.external_order_id) continue;

      const exists = await client.query(
        "select id from sales where source = $1 and external_order_id = $2 limit 1",
        [sale.source, sale.external_order_id]
      );

      const upsert = await client.query(
        `insert into sales (
          source, external_order_id, external_order_name, customer_name, customer_email, customer_phone,
          city, region, financial_status, fulfillment_status, payment_method, payment_reference,
          subtotal_amount, shipping_amount, tax_amount, total_amount, created_at_shopify, paid_at,
          notes, risk_level, invoice_status, updated_at
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,now()
        )
        on conflict (source, external_order_id)
        do update set
          external_order_name = excluded.external_order_name,
          customer_name = excluded.customer_name,
          customer_email = excluded.customer_email,
          customer_phone = excluded.customer_phone,
          city = excluded.city,
          region = excluded.region,
          financial_status = excluded.financial_status,
          fulfillment_status = excluded.fulfillment_status,
          payment_method = excluded.payment_method,
          payment_reference = excluded.payment_reference,
          subtotal_amount = excluded.subtotal_amount,
          shipping_amount = excluded.shipping_amount,
          tax_amount = excluded.tax_amount,
          total_amount = excluded.total_amount,
          created_at_shopify = excluded.created_at_shopify,
          paid_at = excluded.paid_at,
          notes = excluded.notes,
          risk_level = excluded.risk_level,
          invoice_status = excluded.invoice_status,
          updated_at = now()
        returning id`,
        [
          sale.source,
          sale.external_order_id,
          sale.external_order_name,
          sale.customer_name,
          sale.customer_email,
          sale.customer_phone,
          sale.city,
          sale.region,
          sale.financial_status,
          sale.fulfillment_status,
          sale.payment_method,
          sale.payment_reference,
          sale.subtotal_amount,
          sale.shipping_amount,
          sale.tax_amount,
          sale.total_amount,
          sale.created_at_shopify,
          sale.paid_at,
          sale.notes,
          sale.risk_level,
          sale.invoice_status
        ]
      );

      const saleId = upsert.rows[0].id;
      if (exists.rowCount) updated++; else added++;

      await client.query("delete from sale_items where sale_id = $1", [saleId]);

      for (const item of originalSale.items || []) {
        const dbItem = toDbItem(saleId, item);
        await client.query(
          "insert into sale_items (sale_id, product_name, sku, quantity, unit_price) values ($1,$2,$3,$4,$5)",
          [dbItem.sale_id, dbItem.product_name, dbItem.sku, dbItem.quantity, dbItem.unit_price]
        );
      }

      if (isManualPayment(originalSale)) {
        await client.query(
          `insert into payment_proofs (sale_id, status, declared_amount, payment_reference, updated_at)
           values ($1, 'pendiente', $2, $3, now())
           on conflict (sale_id) do nothing`,
          [saleId, sale.total_amount, sale.payment_reference]
        );
      }

      if (String(sale.financial_status).toLowerCase() === "paid") {
        await client.query(
          `insert into invoices (sale_id, status, updated_at)
           values ($1, $2, now())
           on conflict (sale_id) do nothing`,
          [saleId, sale.invoice_status || "pendiente"]
        );
      }
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return { added, updated, total: normalized.length, sales: await listSales() };
}

async function findSaleByExternalId(externalOrderId) {
  await assertDbReady();
  const { rows } = await pool.query(
    "select * from sales where source = 'shopify_csv' and external_order_id = $1 limit 1",
    [externalOrderId]
  );
  const sale = rows[0];
  if (!sale) {
    const error = new Error("Sale not found");
    error.status = 404;
    throw error;
  }
  return sale;
}

async function approvePaymentProof(externalOrderId) {
  await assertDbReady();
  const sale = await findSaleByExternalId(externalOrderId);
  await pool.query(
    `insert into payment_proofs (sale_id, status, declared_amount, approved_at, updated_at)
     values ($1, 'aprobado', $2, now(), now())
     on conflict (sale_id) do update set
       status = 'aprobado',
       declared_amount = excluded.declared_amount,
       approved_at = now(),
       updated_at = now()`,
    [sale.id, sale.total_amount]
  );
  return { ok: true, sales: await listSales() };
}

async function markInvoiceIssued(externalOrderId) {
  await assertDbReady();
  const sale = await findSaleByExternalId(externalOrderId);
  await pool.query("update sales set invoice_status = 'facturada', updated_at = now() where id = $1", [sale.id]);
  await pool.query(
    `insert into invoices (sale_id, status, issued_at, updated_at)
     values ($1, 'facturada', now(), now())
     on conflict (sale_id) do update set
       status = 'facturada',
       issued_at = coalesce(invoices.issued_at, now()),
       updated_at = now()`,
    [sale.id]
  );
  return { ok: true, sales: await listSales() };
}

async function handleApi(req, res, url) {
  if (url.pathname === "/api/status" && req.method === "GET") {
    sendJson(res, 200, { ok: true, databaseConfigured: databaseConfigured(), schemaReady, schemaError: schemaError?.message || null });
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
      sendJson(res, 200, { status: "ok", service: "klinge-sales-admin", databaseConfigured: databaseConfigured(), schemaReady });
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
    console.error("Server error:", error.message);
    sendJson(res, error.status || 500, { error: error.message || "Internal server error" });
  }
});

server.listen(PORT, async () => {
  console.log(`Klinge Ventas Admin running on port ${PORT}`);
  if (pool) {
    try {
      await ensureSchema();
      console.log("Railway PostgreSQL schema ready");
    } catch (error) {
      console.error("Railway PostgreSQL schema error:", error.message);
    }
  }
});
