import initialContent from "./data/content.json";

const PUBLIC_PAGES = new Set(["/", "/index.html", "/portfolio.html", "/about.html", "/services.html", "/achievements.html", "/contact.html"]);
const SESSION_MS = 12 * 60 * 60 * 1000;
const encoder = new TextEncoder();

function headersBase() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
  };
}
function json(data, status=200, extra={}) {
  return new Response(JSON.stringify(data), {status, headers:{...headersBase(), "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", ...extra}});
}
function text(body, status=200, type="text/plain; charset=utf-8", extra={}) {
  return new Response(body, {status, headers:{...headersBase(), "Content-Type":type, ...extra}});
}
function b64url(bytes) {
  let s=""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
function fromB64url(s) {
  const padded = s.replace(/-/g,"+").replace(/_/g,"/") + "===".slice((s.length+3)%4);
  const raw = atob(padded); return Uint8Array.from(raw, c => c.charCodeAt(0));
}
async function sha256(textValue) {
  return b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(textValue))));
}
async function hashPassword(password, saltBytes=crypto.getRandomValues(new Uint8Array(16)), iterations=100000) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({name:"PBKDF2", salt:saltBytes, iterations, hash:"SHA-256"}, key, 256);
  return `pbkdf2$${iterations}$${b64url(saltBytes)}$${b64url(new Uint8Array(bits))}`;
}
async function verifyPassword(password, stored) {
  const [algorithm, iterText, saltText, expectedText] = String(stored||"").split("$");
  if (algorithm !== "pbkdf2" || !iterText || !saltText || !expectedText) return false;
  const actual = await hashPassword(password, fromB64url(saltText), Number(iterText));
  const a = actual.split("$")[3], b = expectedText;
  if (a.length !== b.length) return false;
  let diff=0; for(let i=0;i<a.length;i++) diff |= a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
async function init(env) {
  if (!env.DB) throw new Error("Missing D1 binding DB. Add it in Worker Settings → Bindings.");
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS site_content (id INTEGER PRIMARY KEY CHECK (id = 1), content_json TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_account (id INTEGER PRIMARY KEY CHECK (id = 1), username TEXT NOT NULL, password_hash TEXT NOT NULL, default_password INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS admin_sessions (token_hash TEXT PRIMARY KEY, username TEXT NOT NULL, expires_at INTEGER NOT NULL)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS login_attempts (ip_hash TEXT PRIMARY KEY, failures INTEGER NOT NULL, reset_at INTEGER NOT NULL)").run();
  const row = await env.DB.prepare("SELECT id FROM site_content WHERE id=1").first();
  if (!row) await env.DB.prepare("INSERT INTO site_content (id, content_json, updated_at) VALUES (1, ?, ?)").bind(JSON.stringify(initialContent), new Date().toISOString()).run();
  const admin = await env.DB.prepare("SELECT id FROM admin_account WHERE id=1").first();
  if (!admin) {
    const passwordHash = await hashPassword("Admin@123");
    await env.DB.prepare("INSERT INTO admin_account (id, username, password_hash, default_password, updated_at) VALUES (1, ?, ?, 1, ?)").bind("admin", passwordHash, new Date().toISOString()).run();
  }
}
async function getContent(env) {
  const row = await env.DB.prepare("SELECT content_json FROM site_content WHERE id=1").first();
  return row ? JSON.parse(row.content_json) : initialContent;
}
async function getAdmin(env) { return await env.DB.prepare("SELECT username,password_hash,default_password FROM admin_account WHERE id=1").first(); }
function parseCookies(request) {
  const result={};
  for (const item of (request.headers.get("Cookie")||"").split(";")) {
    const i=item.indexOf("="); if(i>0) result[item.slice(0,i).trim()] = decodeURIComponent(item.slice(i+1).trim());
  }
  return result;
}
async function getSession(request, env) {
  const token=parseCookies(request).usman_admin; if(!token) return null;
  const tokenHash=await sha256(token), now=Date.now();
  const row=await env.DB.prepare("SELECT token_hash,username,expires_at FROM admin_sessions WHERE token_hash=?").bind(tokenHash).first();
  if(!row || row.expires_at<=now) { if(row) await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash=?").bind(tokenHash).run(); return null; }
  const expires=now+SESSION_MS;
  await env.DB.prepare("UPDATE admin_sessions SET expires_at=? WHERE token_hash=?").bind(expires,tokenHash).run();
  return {token, tokenHash, username:row.username, expiresAt:expires};
}
function cookie(token, maxAge) { return `usman_admin=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`; }
async function requireAuth(request, env) { return await getSession(request, env); }
async function readJson(request, limit=4*1024*1024) {
  const length=Number(request.headers.get("Content-Length")||0);
  if(length>limit) throw Object.assign(new Error("Request is too large."),{status:413});
  const raw=await request.text(); if(new TextEncoder().encode(raw).length>limit) throw Object.assign(new Error("Request is too large."),{status:413});
  try { return JSON.parse(raw||"{}"); } catch { throw Object.assign(new Error("Invalid JSON request."),{status:400}); }
}
function injectContent(html, content) {
  const safe=JSON.stringify(content).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029");
  const theme=String(content.global?.theme||"charcoal-orange").replace(/[^a-z-]/g,"");
  return html.replace("<!-- SITE_CONTENT -->",`<script>window.__SITE_CONTENT__=${safe};</script>`).replace('data-theme="charcoal-orange"',`data-theme="${theme}"`);
}
async function serveStatic(request, env, pathname, content=null) {
  const url=new URL(request.url); url.pathname=pathname;
  const upstream=new Request(url.toString(), request);
  const response=await env.ASSETS.fetch(upstream);
  if(!response.ok) return response;
  const isHtml=/\.html$/.test(pathname)||pathname==="/";
  if(isHtml && content) {
    const html=injectContent(await response.text(),content);
    return new Response(html,{status:200,headers:{...headersBase(),"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
  }
  const h=new Headers(response.headers); Object.entries(headersBase()).forEach(([k,v])=>h.set(k,v));
  if(pathname.startsWith("/assets/")) h.set("Cache-Control","public, max-age=31536000, immutable");
  return new Response(request.method==="HEAD"?null:response.body,{status:response.status,headers:h});
}
async function handleApi(request, env, pathname) {
  if(pathname==="/api/public/content" && request.method==="GET") return json(await getContent(env));
  if(pathname==="/api/public/events" && request.method==="GET") {
    return new Response(`retry: 60000\nevent: ready\ndata: {}\n\n`,{headers:{...headersBase(),"Content-Type":"text/event-stream","Cache-Control":"no-cache","Connection":"keep-alive"}});
  }
  if(pathname==="/api/admin/login" && request.method==="POST") {
    const body=await readJson(request,32768), ip=await sha256(request.headers.get("CF-Connecting-IP")||"unknown");
    const attempt=await env.DB.prepare("SELECT failures,reset_at FROM login_attempts WHERE ip_hash=?").bind(ip).first();
    if(attempt && attempt.reset_at>Date.now() && attempt.failures>=8) return json({ok:false,error:"Too many attempts. Please wait 15 minutes and try again."},429);
    const admin=await getAdmin(env), username=String(body.username||"").trim(), password=String(body.password||"");
    const valid=username===admin.username && await verifyPassword(password,admin.password_hash);
    if(!valid) {
      const failures=!attempt||attempt.reset_at<=Date.now()?1:attempt.failures+1, reset=!attempt||attempt.reset_at<=Date.now()?Date.now()+15*60*1000:attempt.reset_at;
      await env.DB.prepare("INSERT INTO login_attempts (ip_hash,failures,reset_at) VALUES (?,?,?) ON CONFLICT(ip_hash) DO UPDATE SET failures=excluded.failures, reset_at=excluded.reset_at").bind(ip,failures,reset).run();
      return json({ok:false,error:"Invalid username or password."},401);
    }
    await env.DB.prepare("DELETE FROM login_attempts WHERE ip_hash=?").bind(ip).run();
    const token=b64url(crypto.getRandomValues(new Uint8Array(32))), tokenHash=await sha256(token), expires=Date.now()+SESSION_MS;
    await env.DB.prepare("INSERT INTO admin_sessions (token_hash,username,expires_at) VALUES (?,?,?)").bind(tokenHash,username,expires).run();
    return json({ok:true,user:{username},defaultPassword:Boolean(admin.default_password) },200,{"Set-Cookie":cookie(token,SESSION_MS/1000)});
  }
  if(pathname.startsWith("/api/admin/")) {
    const session=await requireAuth(request,env);
    if(pathname==="/api/admin/logout" && request.method==="POST") {
      if(session) await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash=?").bind(session.tokenHash).run();
      return json({ok:true},200,{"Set-Cookie":cookie("",0)});
    }
    if(!session) return json({ok:false,error:"Authentication required."},401);
    if(pathname==="/api/admin/session" && request.method==="GET") {
      const admin=await getAdmin(env); return json({ok:true,user:{username:session.username},defaultPassword:Boolean(admin.default_password),expiresAt:new Date(session.expiresAt).toISOString()});
    }
    if(request.headers.get("X-Requested-With")!=="XMLHttpRequest") return json({ok:false,error:"Write request protection failed."},403);
    if(pathname==="/api/admin/content" && request.method==="GET") return json(await getContent(env));
    if(pathname==="/api/admin/content" && request.method==="PUT") {
      const body=await readJson(request), incoming=body.content||body;
      const allowed=["global","home","pageContent","projects","services","achievements","about","contact","media","seo","portfolioCategories"], next={};
      for(const key of allowed) { if(incoming[key]===undefined) return json({ok:false,error:`Missing content section: ${key}`},400); next[key]=incoming[key]; }
      if(!Array.isArray(next.projects)||!Array.isArray(next.services)||!Array.isArray(next.achievements)||!Array.isArray(next.media)||!next.home||!Array.isArray(next.home.brands)||!Array.isArray(next.home.testimonials)) return json({ok:false,error:"Invalid content structure."},400);
      const old=await getContent(env); next.meta={version:Number(old.meta?.version||0)+1,updatedAt:new Date().toISOString()};
      await env.DB.prepare("UPDATE site_content SET content_json=?,updated_at=? WHERE id=1").bind(JSON.stringify(next),next.meta.updatedAt).run();
      return json({ok:true,content:next});
    }
    if(pathname==="/api/admin/upload" && request.method==="POST") {
      if(!env.UPLOADS) return json({ok:false,error:"Missing R2 binding UPLOADS. Add it in Worker Settings → Bindings."},500);
      const body=await readJson(request,12*1024*1024), match=String(body.data||body.dataUrl||"").match(/^data:image\/(png|jpeg|webp|svg\+xml);base64,([A-Za-z0-9+/=]+)$/);
      if(!match) return json({ok:false,error:"Upload a PNG, JPEG, WebP or SVG image."},400);
      const binary=atob(match[2]), bytes=new Uint8Array(binary.length); for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
      if(!bytes.length||bytes.length>7*1024*1024) return json({ok:false,error:"Optimized image must be smaller than 7 MB."},413);
      const ext=match[1]==="jpeg"?"jpg":match[1]==="svg+xml"?"svg":match[1], filename=`${Date.now()}-${b64url(crypto.getRandomValues(new Uint8Array(9))).replace(/[^a-zA-Z0-9]/g,"")}.${ext}`, key=`assets/uploads/${filename}`;
      const types={png:"image/png",jpg:"image/jpeg",webp:"image/webp",svg:"image/svg+xml"};
      await env.UPLOADS.put(key, JSON.stringify({
      type: types[ext] || "application/octet-stream",
      data: match[2]
       }));
      const media={id:`media-${filename.replace(/\.[^.]+$/,"")}`,name:String(body.name||"Uploaded image").trim().slice(0,120)||"Uploaded image",kind:"other",url:key,uploadedAt:new Date().toISOString()};
      return json({ok:true,url:key,media},201);
    }
    if(pathname==="/api/admin/delete-upload" && request.method==="POST") {
      if(!env.UPLOADS) return json({ok:false,error:"Missing R2 binding UPLOADS."},500);
      const body=await readJson(request,32768), key=String(body.url||"");
      if(!/^assets\/uploads\/[a-zA-Z0-9.-]+\.(png|jpe?g|webp|svg)$/.test(key)) return json({ok:false,error:"Only uploaded image files can be deleted from storage."},400);
      await env.UPLOADS.delete(key); return json({ok:true});
    }
    if(pathname==="/api/admin/credentials" && request.method==="POST") {
      const body=await readJson(request,32768), admin=await getAdmin(env);
      if(!await verifyPassword(String(body.currentPassword||""),admin.password_hash)) return json({ok:false,error:"Current password is incorrect."},401);
      const username=String(body.username||"").trim(), newPassword=String(body.newPassword||"");
      if(!/^[A-Za-z0-9_.-]{3,32}$/.test(username)) return json({ok:false,error:"Username must be 3–32 letters, numbers, dots, dashes or underscores."},400);
      if(newPassword&&(newPassword.length<8||newPassword.length>128)) return json({ok:false,error:"New password must be between 8 and 128 characters."},400);
      const passwordHash=newPassword?await hashPassword(newPassword):admin.password_hash, defaultPassword=newPassword?0:admin.default_password;
      await env.DB.prepare("UPDATE admin_account SET username=?,password_hash=?,default_password=?,updated_at=? WHERE id=1").bind(username,passwordHash,defaultPassword,new Date().toISOString()).run();
      await env.DB.prepare("UPDATE admin_sessions SET username=? WHERE token_hash=?").bind(username,session.tokenHash).run();
      await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash<>?").bind(session.tokenHash).run();
      return json({ok:true,user:{username},defaultPassword:Boolean(defaultPassword)});
    }
    return json({ok:false,error:"API route not found."},404);
  }
  return json({ok:false,error:"API route not found."},404);
}
export default {
  async fetch(request, env) {
    try {
      await init(env);
      const url=new URL(request.url), pathname=url.pathname.replace(/\/$/,"")||"/";
      if(pathname.startsWith("/api/")) return await handleApi(request,env,pathname);
    
      
      if (pathname.startsWith("/assets/uploads/")) {
        if (env.UPLOADS) {
          const key = pathname.slice(1);
          const value = await env.UPLOADS.get(key);

          if (value) {
            try {
              const saved = JSON.parse(value);
              const binary = atob(saved.data);
              const bytes = Uint8Array.from(
                binary,
                c => c.charCodeAt(0)
              );

              return new Response(
                request.method === "HEAD" ? null : bytes,
                {
                  headers: {
                    ...headersBase(),
                    "Content-Type":
                      saved.type || "application/octet-stream",
                    "Cache-Control": "public, max-age=86400"
                  }
                }
              );
            } catch (error) {
              console.error("KV upload read error:", error);
              return text("Invalid uploaded image data", 500);
            }
          }
        }

        return text("Upload not found", 404);
      }

      if (
        pathname === "/admin/login" ||
        pathname === "/admin/login.html"
      ) {
        if (await getSession(request, env)) {
          return Response.redirect(
            new URL("/admin", request.url),
            302
          );
        }

        return await serveStatic(
          request,
          env,
          "/admin/login.html"
        );
      }


      if (
        pathname === "/admin/login" ||
        pathname === "/admin/login.html"
      ) {
        if (await getSession(request, env)) {
          return Response.redirect(
            new URL("/admin", request.url),
            302
          );
        }

        return await serveStatic(
          request,
          env,
          "/admin/login.html"
        );
      }

      if (
        pathname === "/admin" ||
        pathname === "/admin/index.html" ||
        pathname.startsWith("/admin/")
      ) {
        const session = await getSession(request, env);

        if (!session) {
          return Response.redirect(
            new URL("/admin/login", request.url),
            302
          );
        }

        if (
          pathname === "/admin" ||
          pathname === "/admin/index.html" ||
          !pathname.split("/").pop().includes(".")
        ) {
          return await serveStatic(
            request,
            env,
            "/admin/index.html"
          );
        }

        return text("Not found", 404);
      }

      if (pathname === "/admin-login") {
        return Response.redirect(
          new URL("/admin/login", request.url),
          302
        );
      }

      if (PUBLIC_PAGES.has(pathname)) {
        return await serveStatic(
          request,
          env,
          pathname,
          await getContent(env)
        );
      }

      if (pathname.startsWith("/assets/")) {
        return await serveStatic(request, env, pathname);
      }

      return text("Page not found", 404);
    } catch (error) {
      console.error(error);
      return json(
        {
          ok: false,
          error: error?.message || "Server error. Please try again."
        },
        500
      );
    }
  }
};
