import fs from "node:fs";

const sourcePath = new URL("./server.js", import.meta.url);
const runtimePath = new URL("./.runtime-server.js", import.meta.url);

let source = fs.readFileSync(sourcePath, "utf8");

source = source.replace(
  'import pg from "pg";',
  'import pg from "pg";\nimport { isShopifyConfigured } from "./src/shopify-config.js";\nimport { fetchRecentShopifyOrders } from "./src/shopify-client.js";\nimport { normalizeShopifyOrder } from "./src/shopify-normalize.js";'
);

source = source.replace(
  'function databaseConfigured() {\n  return Boolean(pool);\n}',
  'function databaseConfigured() {\n  return Boolean(pool);\n}\n\nfunction shopifyConfigured() {\n  return isShopifyConfigured(process.env);\n}'
);

source = source.replace(
  'async function findSaleByExternalId(externalOrderId) {',
  'async function syncShopifyOrders() {\n  const orders = await fetchRecentShopifyOrders(process.env);\n  const sales = orders.map(normalizeShopifyOrder);\n  return { ...(await importSales(sales)), pulled: orders.length };\n}\n\nasync function findSaleByExternalId(externalOrderId) {'
);

source = source.replace(
  'sendJson(res, 200, { ok: true, databaseConfigured: databaseConfigured(), schemaReady, schemaError: schemaError?.message || null });',
  'sendJson(res, 200, { ok: true, databaseConfigured: databaseConfigured(), schemaReady, schemaError: schemaError?.message || null, shopifyConfigured: shopifyConfigured() });'
);

source = source.replace(
  'sendJson(res, 200, { status: "ok", service: "klinge-sales-admin", databaseConfigured: databaseConfigured(), schemaReady });',
  'sendJson(res, 200, { status: "ok", service: "klinge-sales-admin", databaseConfigured: databaseConfigured(), schemaReady, shopifyConfigured: shopifyConfigured() });'
);

source = source.replace(
  '  const proofMatch = url.pathname.match(/^\\/api\\/payment-proofs\\/(.+)\\/approve$/);',
  '  if (url.pathname === "/api/shopify/sync-orders" && req.method === "POST") {\n    sendJson(res, 200, await syncShopifyOrders());\n    return;\n  }\n\n  const proofMatch = url.pathname.match(/^\\/api\\/payment-proofs\\/(.+)\\/approve$/);'
);

fs.writeFileSync(runtimePath, source);
await import(runtimePath.href);
