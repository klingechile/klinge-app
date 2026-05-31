export const staticRoutes = [
  { path: "/", file: "public/index.html", contentType: "text/html; charset=utf-8" },
  { path: "/index.html", file: "public/index.html", contentType: "text/html; charset=utf-8" },
  { path: "/app.js", file: "public/app.js", contentType: "application/javascript; charset=utf-8" },
  { path: "/styles.css", file: "public/styles.css", contentType: "text/css; charset=utf-8" }
];

export function findStaticRoute(pathname) {
  return staticRoutes.find((route) => route.path === pathname) || null;
}
