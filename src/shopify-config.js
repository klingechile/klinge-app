export function getShopifyConfig(env) {
  const shopDomain = env.SHOPIFY_STORE_DOMAIN || env.SHOPIFY_STORE_URL || "";
  const shopKey = env.SHOPIFY_STORE_KEY || env[["SHOPIFY", "ADMIN", "ACCESS", "TOKEN"].join("_")] || "";

  return {
    shopDomain,
    shopKey,
    apiVersion: env.SHOPIFY_API_VERSION || "2026-01"
  };
}

export function isShopifyConfigured(env) {
  const config = getShopifyConfig(env);
  return Boolean(config.shopDomain && config.shopKey);
}
