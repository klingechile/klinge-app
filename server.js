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

function unauthorized(res) {
  res.writeHead(401, {
    "WWW-Authenticate": 'Basic realm="Klinge Admin"',
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

const server = http.createServer((req, res) => {
  try {
    setSecurityHeaders(res);

    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ status: "ok", service: "klinge-app" }));
      return;
    }

    if (!isAuthorized(req)) {
      unauthorized(res);
      return;
    }

    if (req.method !== "GET") {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Method not allowed");
      return;
    }

    if (req.url === "/" || req.url === "/index.html") {
      serveFile(res, path.join(__dirname, "index.html"), "text/html; charset=utf-8");
      return;
    }

    if (req.url === "/mvp" || req.url === "/mvp.html") {
      serveFile(res, path.join(__dirname, "public", "index.html"), "text/html; charset=utf-8");
      return;
    }

    if (req.url === "/app.js") {
      serveFile(res, path.join(__dirname, "public", "app.js"), "application/javascript; charset=utf-8");
      return;
    }

    if (req.url === "/styles.css") {
      serveFile(res, path.join(__dirname, "public", "styles.css"), "text/css; charset=utf-8");
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  } catch (error) {
    console.error("Server error:", error.message);
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
});

server.listen(PORT, () => {
  console.log(`Klinge App running on port ${PORT}`);
});
