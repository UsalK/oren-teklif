/* ==========================================================
   server.js — yerel sunucu + JSON veri tabani
   Bagimlilik yok, sadece Node'un kendi modulleri.

   Calistirma:  node server.js
   Adres:       http://localhost:8787
   Veri:        data/storage.json  (gunluk yedek: data/backups/)
   ========================================================== */

const http = require("node:http");
const fs   = require("node:fs");
const fsp  = require("node:fs/promises");
const path = require("node:path");

const PORT      = Number(process.env.PORT) || 8787;
const HOST      = "127.0.0.1";
const ROOT      = __dirname;
const DATA_DIR  = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "storage.json");
const TMP_FILE  = path.join(DATA_DIR, "storage.tmp.json");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const MAX_BODY  = 32 * 1024 * 1024;   // 32 MB (logolar data URL olarak gomulu)

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff2": "font/woff2"
};

/* ---------- Yardimcilar ---------- */
function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function todayStamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

async function ensureDirs() {
  await fsp.mkdir(DATA_DIR,   { recursive: true });
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
}

/* Yazma sirasinda kesinti olursa dosya bozulmasin diye once gecici
   dosyaya yazip sonra yerine tasiyoruz. */
async function writeData(text) {
  await ensureDirs();
  await fsp.writeFile(TMP_FILE, text, "utf8");
  await fsp.rename(TMP_FILE, DATA_FILE);
  // Gun icinde tek yedek: ayni gun tekrar yazilirsa uzerine biner.
  await fsp.writeFile(path.join(BACKUP_DIR, "storage-" + todayStamp() + ".json"), text, "utf8");
  await pruneBackups(30);
}

/* En yeni N yedegi birak, gerisini sil */
async function pruneBackups(keep) {
  try {
    const files = (await fsp.readdir(BACKUP_DIR))
      .filter(f => f.startsWith("storage-") && f.endsWith(".json"))
      .sort();
    const extra = files.slice(0, Math.max(0, files.length - keep));
    await Promise.all(extra.map(f => fsp.unlink(path.join(BACKUP_DIR, f)).catch(() => {})));
  } catch (e) { /* yedek klasoru yoksa sorun degil */ }
}

/* hedef yolu klasorun GERCEKTEN icinde mi? ("proje" ile "proje-baska"
   karismasin diye ayirac kontrollu karsilastirma) */
function icerideMi(klasor, hedef) {
  const rel = path.relative(klasor, hedef);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", c => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error("Gövde çok büyük")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/* ---------- Statik dosyalar ---------- */
function serveStatic(req, res) {
  let rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (rel === "/" || rel === "") rel = "/index.html";

  const filePath = path.join(ROOT, path.normalize(rel).replace(/^([/\\])+/, ""));
  // Proje klasoru disina cikilmasini engelle
  if (!icerideMi(ROOT, filePath)) { res.writeHead(403).end("Yasak"); return; }
  // Veri klasoru tarayiciya acilmasin
  if (icerideMi(DATA_DIR, filePath)) { res.writeHead(403).end("Yasak"); return; }

  fs.readFile(filePath, (err, buf) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Bulunamadı"); return; }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    res.end(buf);
  });
}

/* ---------- Sunucu ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");

  if (url.pathname === "/api/info") {
    return json(res, 200, { mode: "server", file: DATA_FILE, backups: BACKUP_DIR });
  }

  if (url.pathname === "/api/data") {
    if (req.method === "GET") {
      try {
        const text = await fsp.readFile(DATA_FILE, "utf8");
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
        return res.end(text);
      } catch (e) {
        return json(res, 200, null);          // henuz veri yok
      }
    }

    if (req.method === "PUT" || req.method === "POST") {
      try {
        const text = await readBody(req);
        JSON.parse(text);                      // bozuk veriyi diske yazma
        await writeData(text);
        return json(res, 200, { ok: true, file: DATA_FILE, bytes: Buffer.byteLength(text) });
      } catch (e) {
        console.error("Kayıt hatası:", e.message);
        return json(res, 400, { ok: false, error: e.message });
      }
    }

    res.writeHead(405).end();
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405).end(); return; }
  serveStatic(req, res);
});

server.listen(PORT, HOST, async () => {
  await ensureDirs();
  console.log("");
  console.log("  Fiyat Teklifi calisiyor");
  console.log("  Adres : http://localhost:" + PORT);
  console.log("  Veri  : " + DATA_FILE);
  console.log("  Yedek : " + BACKUP_DIR);
  console.log("");
  console.log("  Kapatmak icin bu pencereyi kapatin veya Ctrl+C.");
  console.log("");
});

server.on("error", err => {
  if (err.code === "EADDRINUSE") {
    console.error("HATA: " + PORT + " portu kullaniliyor. Uygulama zaten acik olabilir.");
  } else {
    console.error("HATA:", err.message);
  }
  process.exit(1);
});
