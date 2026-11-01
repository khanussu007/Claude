"use strict";

/**
 * Usman Khan website + Admin Panel
 * Dependency-free Node.js server with persistent JSON storage, scrypt password
 * hashing, HTTP-only sessions, protected Admin APIs and optimized upload storage.
 */
const http = require("node:http");
const fs = require("node:fs");
const fsp = fs.promises;
const path = require("node:path");
const crypto = require("node:crypto");
const { promisify } = require("node:util");

const scrypt = promisify(crypto.scrypt);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const CONTENT_FILE = path.join(DATA_DIR, "content.json");
const SEED_FILE = path.join(DATA_DIR, "seed-content.json");
const ADMIN_FILE = path.join(DATA_DIR, "admin.json");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "assets", "uploads");
const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "0.0.0.0";
const SESSION_MS = Math.max(1, Number(process.env.SESSION_HOURS || 12)) * 60 * 60 * 1000;
const IDLE_MS = Math.max(5, Number(process.env.ADMIN_IDLE_SECONDS || 1800)) * 1000; // 30 min inactivity (env override is for dev testing only)
const ADMIN_PREVIEW = process.argv.includes("--admin-preview");
const sessions = new Map();
const loginAttempts = new Map();
const eventClients = new Set();
let siteContent;
let adminAccount;
let writeQueue = Promise.resolve();

const PUBLIC_PAGES = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/portfolio.html", "portfolio.html"],
  ["/about.html", "about.html"],
  ["/services.html", "services.html"],
  ["/achievements.html", "achievements.html"],
  ["/contact.html", "contact.html"]
]);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function securityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

function noStore(res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
}

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}

function text(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location, "Cache-Control": "no-store" });
  res.end();
}

async function atomicWrite(file, value) {
  const temp = `${file}.${process.pid}.tmp`;
  await fsp.writeFile(temp, JSON.stringify(value, null, 2) + "\n", "utf8");
  await fsp.rename(temp, file);
}

async function readJson(file) {
  return JSON.parse(await fsp.readFile(file, "utf8"));
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [algorithm, salt, expectedHex] = String(stored || "").split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const actual = await scrypt(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

async function initializeStorage() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.mkdir(UPLOAD_DIR, { recursive: true });
  try {
    await fsp.access(CONTENT_FILE);
  } catch {
    await fsp.copyFile(SEED_FILE, CONTENT_FILE);
  }
  siteContent = await readJson(CONTENT_FILE);

  try {
    adminAccount = await readJson(ADMIN_FILE);
  } catch {
    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "Admin@123";
    adminAccount = {
      username,
      passwordHash: await hashPassword(password),
      defaultPassword: true,
      updatedAt: new Date().toISOString()
    };
    await atomicWrite(ADMIN_FILE, adminAccount);
  }
}

function parseCookies(req) {
  const cookies = {};
  String(req.headers.cookie || "").split(";").forEach((part) => {
    const index = part.indexOf("=");
    if (index < 0) return;
    cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  });
  return cookies;
}

function getSession(req) {
  const token = parseCookies(req).usman_admin;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return { token, ...session };
}

// Only genuine admin actions call this; plain reads and background requests never extend a session.
function touchSession(session) {
  const stored = sessions.get(session.token);
  if (stored) stored.expiresAt = session.expiresAt = Date.now() + IDLE_MS;
}

function createSession(username) {
  const token = crypto.randomBytes(32).toString("hex");
  const session = { username, expiresAt: Date.now() + IDLE_MS };
  sessions.set(token, session);
  return { token, ...session };
}

function sessionCookie(req, token, maxAgeSeconds) {
  const secure = req.headers["x-forwarded-proto"] === "https" || req.socket.encrypted;
  return `usman_admin=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}${secure ? "; Secure" : ""}`;
}

function requireApiAuth(req, res) {
  const session = getSession(req);
  if (!session) {
    const stale = Boolean(parseCookies(req).usman_admin);
    if (stale) res.setHeader("Set-Cookie", sessionCookie(req, "", 0));
    json(res, 401, { ok: false, error: "Authentication required.", code: stale ? "session_expired" : "unauthenticated" });
    return null;
  }
  if (req.method !== "GET") touchSession(session);
  return session;
}

function requireWriteProtection(req, res) {
  if (req.headers["x-requested-with"] !== "XMLHttpRequest") {
    json(res, 403, { ok: false, error: "Write request protection failed." });
    return false;
  }
  return true;
}

async function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error("Request is too large."), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJsonBody(req, maxBytes = 3 * 1024 * 1024) {
  const body = await readBody(req, maxBytes);
  try {
    return JSON.parse(body.toString("utf8") || "{}");
  } catch {
    throw Object.assign(new Error("Invalid JSON request."), { status: 400 });
  }
}

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
}

function loginAllowed(ip) {
  const record = loginAttempts.get(ip);
  if (!record || record.resetAt <= Date.now()) return true;
  return record.failures < 8;
}

function recordLoginFailure(ip) {
  const current = loginAttempts.get(ip);
  const record = !current || current.resetAt <= Date.now()
    ? { failures: 0, resetAt: Date.now() + 15 * 60 * 1000 }
    : current;
  record.failures += 1;
  loginAttempts.set(ip, record);
}

function publicContent() {
  // Only website content is exposed. admin.json and sessions never leave the server.
  return siteContent;
}

function broadcastContent() {
  const payload = `event: content\ndata: ${JSON.stringify({ version: siteContent.meta.version })}\n\n`;
  for (const res of eventClients) {
    try { res.write(payload); } catch { eventClients.delete(res); }
  }
}

function queueContentSave(incoming) {
  // Recover the queue after a rejected save so one invalid request cannot block later writes.
  writeQueue = writeQueue.catch(() => {}).then(async () => {
    const allowed = ["global", "home", "pageContent", "projects", "services", "achievements", "about", "contact", "media", "seo", "portfolioCategories"];
    const next = {};
    for (const key of allowed) {
      if (incoming[key] === undefined) throw Object.assign(new Error(`Missing content section: ${key}`), { status: 400 });
      next[key] = incoming[key];
    }
    if (!Array.isArray(next.projects) || !Array.isArray(next.services) || !Array.isArray(next.achievements) || !Array.isArray(next.media) || !next.home || !Array.isArray(next.home.brands) || !Array.isArray(next.home.testimonials)) {
      throw Object.assign(new Error("Invalid content structure."), { status: 400 });
    }
    next.meta = {
      version: Number(siteContent.meta?.version || 0) + 1,
      updatedAt: new Date().toISOString()
    };
    await atomicWrite(CONTENT_FILE, next);
    siteContent = next;
    broadcastContent();
    return next;
  });
  return writeQueue;
}

async function handleApi(req, res, pathname) {
  if (pathname === "/api/public/content" && req.method === "GET") {
    noStore(res);
    return json(res, 200, publicContent());
  }

  if (pathname === "/api/public/events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });
    res.write(`event: ready\ndata: ${JSON.stringify({ version: siteContent.meta.version })}\n\n`);
    eventClients.add(res);
    req.on("close", () => eventClients.delete(res));
    return;
  }

  if (pathname === "/api/admin/login" && req.method === "POST") {
    noStore(res);
    const ip = clientIp(req);
    if (!loginAllowed(ip)) return json(res, 429, { ok: false, error: "Too many attempts. Please wait 15 minutes and try again." });
    const body = await readJsonBody(req, 32 * 1024);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const valid = username === adminAccount.username && await verifyPassword(password, adminAccount.passwordHash);
    if (!valid) {
      recordLoginFailure(ip);
      return json(res, 401, { ok: false, error: "Invalid username or password." });
    }
    loginAttempts.delete(ip);
    const session = createSession(username);
    res.setHeader("Set-Cookie", sessionCookie(req, session.token, Math.floor(SESSION_MS / 1000)));
    return json(res, 200, { ok: true, user: { username }, defaultPassword: adminAccount.defaultPassword });
  }

  if (pathname.startsWith("/api/admin/")) noStore(res);

  if (pathname === "/api/admin/session" && req.method === "GET") {
    const session = requireApiAuth(req, res);
    if (!session) return;
    return json(res, 200, {
      ok: true,
      user: { username: session.username },
      defaultPassword: adminAccount.defaultPassword,
      expiresAt: new Date(session.expiresAt).toISOString(),
      idleTimeoutMs: IDLE_MS,
      idleRemainingMs: Math.max(0, session.expiresAt - Date.now())
    });
  }

  if (pathname === "/api/admin/activity" && req.method === "POST") {
    const session = requireApiAuth(req, res);
    if (!session || !requireWriteProtection(req, res)) return;
    return json(res, 200, { ok: true, idleTimeoutMs: IDLE_MS, idleRemainingMs: IDLE_MS });
  }

  if (pathname === "/api/admin/logout" && req.method === "POST") {
    const session = getSession(req);
    if (session) sessions.delete(session.token);
    res.setHeader("Set-Cookie", sessionCookie(req, "", 0));
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/admin/content" && req.method === "GET") {
    if (!requireApiAuth(req, res)) return;
    return json(res, 200, publicContent());
  }

  if (pathname === "/api/admin/content" && req.method === "PUT") {
    if (!requireApiAuth(req, res) || !requireWriteProtection(req, res)) return;
    const body = await readJsonBody(req, 4 * 1024 * 1024);
    const saved = await queueContentSave(body.content || body);
    return json(res, 200, { ok: true, content: saved });
  }

  if (pathname === "/api/admin/upload" && req.method === "POST") {
    if (!requireApiAuth(req, res) || !requireWriteProtection(req, res)) return;
    const body = await readJsonBody(req, 12 * 1024 * 1024);
    const match = String(body.data || body.dataUrl || "").match(/^data:image\/(png|jpeg|webp|svg\+xml);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return json(res, 400, { ok: false, error: "Upload a PNG, JPEG, WebP or SVG image." });
    const buffer = Buffer.from(match[2], "base64");
    if (!buffer.length || buffer.length > 7 * 1024 * 1024) return json(res, 413, { ok: false, error: "Optimized image must be smaller than 7 MB." });
    const extension = match[1] === "jpeg" ? "jpg" : match[1] === "svg+xml" ? "svg" : match[1];
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${extension}`;
    await fsp.writeFile(path.join(UPLOAD_DIR, filename), buffer, { flag: "wx" });
    const url = `assets/uploads/${filename}`;
    const media = {
      id: `media-${filename.replace(/\.[^.]+$/, "")}`,
      name: String(body.name || "Uploaded image").trim().slice(0, 120) || "Uploaded image",
      kind: "other",
      url,
      uploadedAt: new Date().toISOString()
    };
    return json(res, 201, { ok: true, url, media });
  }

  if (pathname === "/api/admin/delete-upload" && req.method === "POST") {
    if (!requireApiAuth(req, res) || !requireWriteProtection(req, res)) return;
    const body = await readJsonBody(req, 32 * 1024);
    const url = String(body.url || "");
    if (!/^assets\/uploads\/[a-zA-Z0-9.-]+\.(png|jpe?g|webp|svg)$/.test(url)) {
      return json(res, 400, { ok: false, error: "Only uploaded image files can be deleted from storage." });
    }
    const file = path.join(PUBLIC_DIR, url);
    if (!file.startsWith(UPLOAD_DIR + path.sep)) return json(res, 403, { ok: false, error: "Invalid file path." });
    try { await fsp.unlink(file); } catch (error) { if (error.code !== "ENOENT") throw error; }
    return json(res, 200, { ok: true });
  }

  if (pathname === "/api/admin/credentials" && req.method === "POST") {
    const session = requireApiAuth(req, res);
    if (!session || !requireWriteProtection(req, res)) return;
    const body = await readJsonBody(req, 32 * 1024);
    const currentPassword = String(body.currentPassword || "");
    if (!await verifyPassword(currentPassword, adminAccount.passwordHash)) {
      return json(res, 401, { ok: false, error: "Current password is incorrect." });
    }
    const username = String(body.username || "").trim();
    const newPassword = String(body.newPassword || "");
    if (!/^[A-Za-z0-9_.-]{3,32}$/.test(username)) {
      return json(res, 400, { ok: false, error: "Username must be 3–32 letters, numbers, dots, dashes or underscores." });
    }
    if (newPassword && (newPassword.length < 8 || newPassword.length > 128)) {
      return json(res, 400, { ok: false, error: "New password must be between 8 and 128 characters." });
    }
    const passwordChanged = Boolean(newPassword);
    adminAccount = {
      username,
      passwordHash: passwordChanged ? await hashPassword(newPassword) : adminAccount.passwordHash,
      defaultPassword: passwordChanged ? false : adminAccount.defaultPassword,
      updatedAt: new Date().toISOString()
    };
    await atomicWrite(ADMIN_FILE, adminAccount);
    for (const [token, other] of sessions) {
      if (token !== session.token) sessions.delete(token);
    }
    session.username = username;
    sessions.set(session.token, { username, expiresAt: session.expiresAt });
    return json(res, 200, { ok: true, user: { username }, defaultPassword: adminAccount.defaultPassword });
  }

  return json(res, 404, { ok: false, error: "API route not found." });
}

function injectPublicContent(html) {
  const safeJson = JSON.stringify(publicContent())
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const theme = String(siteContent.global?.theme || "charcoal-orange").replace(/[^a-z-]/g, "");
  return html
    .replace("<!-- SITE_CONTENT -->", `<script>window.__SITE_CONTENT__=${safeJson};</script>`)
    .replace('data-theme="charcoal-orange"', `data-theme="${theme}"`);
}

async function serveHtml(res, file, inject = false, head = false) {
  let html = await fsp.readFile(file, "utf8");
  if (inject) html = injectPublicContent(html);
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Length": Buffer.byteLength(html) });
  res.end(head ? "" : html);
}

async function serveAsset(res, pathname, head = false) {
  const decoded = decodeURIComponent(pathname);
  if (decoded.includes("..") || decoded.includes("\\") || decoded.includes("\0")) return text(res, 403, "Forbidden");
  const file = path.join(PUBLIC_DIR, decoded);
  if (!file.startsWith(path.join(PUBLIC_DIR, "assets") + path.sep)) return text(res, 403, "Forbidden");
  const extension = path.extname(file).toLowerCase();
  if (!MIME[extension] || extension === ".html") return text(res, 404, "Not found");
  try {
    const stat = await fsp.stat(file);
    if (!stat.isFile()) return text(res, 404, "Not found");
    res.setHeader("Content-Type", MIME[extension]);
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Cache-Control", extension === ".html" ? "no-store" : "public, max-age=3600");
    if (head) { res.writeHead(200); return res.end(); }
    fs.createReadStream(file).pipe(res);
  } catch {
    return text(res, 404, "Not found");
  }
}

async function requestHandler(req, res) {
  securityHeaders(res);
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname.replace(/\/$/, "") || "/";

  if (pathname.startsWith("/api/")) return handleApi(req, res, pathname);

  if (pathname === "/admin" || pathname === "/admin/index.html" || pathname.startsWith("/admin/")) {
    noStore(res);
    if (pathname === "/admin/login" || pathname === "/admin/login.html") {
      if (getSession(req)) return redirect(res, "/admin");
      return serveHtml(res, path.join(PUBLIC_DIR, "admin", "login.html"), false, req.method === "HEAD");
    }
    if (!getSession(req)) {
      const stale = Boolean(parseCookies(req).usman_admin);
      if (stale) res.setHeader("Set-Cookie", sessionCookie(req, "", 0));
      return redirect(res, stale ? "/admin/login?expired=1" : "/admin/login");
    }
    if (pathname === "/admin" || pathname === "/admin/index.html" || !path.extname(pathname)) {
      return serveHtml(res, path.join(PUBLIC_DIR, "admin", "index.html"), false, req.method === "HEAD");
    }
    return text(res, 404, "Not found");
  }

  if (pathname === "/admin-login") return redirect(res, "/admin/login");

  if (PUBLIC_PAGES.has(pathname)) {
    noStore(res);
    if (pathname === "/" && ADMIN_PREVIEW) return redirect(res, "/admin");
    return serveHtml(res, path.join(PUBLIC_DIR, PUBLIC_PAGES.get(pathname)), true, req.method === "HEAD");
  }

  if (pathname.startsWith("/assets/")) return serveAsset(res, pathname, req.method === "HEAD");

  return text(res, 404, "Page not found");
}

const heartbeat = setInterval(() => {
  for (const res of eventClients) {
    try { res.write(": heartbeat\n\n"); } catch { eventClients.delete(res); }
  }
  const now = Date.now();
  for (const [token, session] of sessions) if (session.expiresAt <= now) sessions.delete(token);
}, 25000);
heartbeat.unref();

initializeStorage()
  .then(() => {
    const server = http.createServer((req, res) => {
      requestHandler(req, res).catch((error) => {
        console.error(error);
        if (!res.headersSent) json(res, error.status || 500, { ok: false, error: error.status ? error.message : "Server error. Please try again." });
        else res.end();
      });
    });
    server.listen(PORT, HOST, () => {
      console.log(`Usman Khan website running at http://${HOST}:${PORT}`);
      console.log(`Admin Panel: http://${HOST}:${PORT}/admin`);
    });
    const shutdown = () => {
      clearInterval(heartbeat);
      for (const res of eventClients) res.end();
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 2000).unref();
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  })
  .catch((error) => {
    console.error("Unable to initialize website storage:", error);
    process.exit(1);
  });
