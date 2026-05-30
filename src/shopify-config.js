export function getShopifyConfig(env) {
  return {
    shopDomain: env.SHOPIFY_STORE_DOMAIN || "",
    shopKey: env.SHOPIFY_STORE_KEY || "",
    apiVersion: env.SHOPIFY_API_VERSION || "2026-01"
  };
}

export function isShopifyConfigured(env) {
  const config = getShopifyConfig(env);
  return Boolean(config.shopDomain && config.shopKey);
}
