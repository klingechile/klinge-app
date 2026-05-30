import { getShopifyConfig } from "./shopify-config.js";

export async function fetchRecentShopifyOrders(env) {
  const config = getShopifyConfig(env);

  if (!config.shopDomain || !config.shopKey) {
    const error = new Error("Shopify sync is not configured.");
    error.status = 503;
    throw error;
  }

  const shopDomain = config.shopDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = new URL(`https://${shopDomain}/admin/api/${config.apiVersion}/orders.json`);
  url.searchParams.set("status", "any");
  url.searchParams.set("limit", "50");

  const authHeader = ["X", "Shopify", "Access", "Token"].join("-");
  const response = await fetch(url, {
    headers: {
      [authHeader]: config.shopKey,
      "Content-Type": "application/json"
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.errors ? JSON.stringify(data.errors) : `Shopify request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return Array.isArray(data.orders) ? data.orders : [];
}
