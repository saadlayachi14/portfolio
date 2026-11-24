// Screenshots of the projects shown on saadlayachi.com, and of the site itself to check it.
// Usage, from PowerShell (headless Edge does not start from Git Bash):
//   node tools/captures.mjs projets      -> tools/captures/<project>.png and <project>-mobile.png
//   node tools/captures.mjs site <dir>   -> <dir>/site-<width>-<n>.png, the local index.html cut in screens
// puppeteer-core is borrowed from the mak-mam tools folder: no install needed here.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const desktop = path.join(here, "..", "..");
const { default: puppeteer } = await import(pathToFileURL(path.join(desktop, "mak-mam", "tools", "node_modules", "puppeteer-core", "lib", "esm", "puppeteer", "puppeteer-core.js")).href);

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain" };
function serve(folder) {
  const server = http.createServer((request, response) => {
    let file = path.normalize(path.join(folder, decodeURIComponent(request.url.split("?")[0])));
    if (!file.startsWith(folder)) { response.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) { response.writeHead(404).end("404"); return; }
    response.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const edge = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: edge, headless: true, args: ["--hide-scrollbars"] });
async function open(url, width, height, mobile = false) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 900));
  return page;
}

const [, , mode = "projets", target = path.join(here, "verif")] = process.argv;
if (mode === "projets") {
  const out = path.join(here, "captures");
  fs.mkdirSync(out, { recursive: true });
  const cafe = await serve(path.join(desktop, "mak-mam", "site"));
  const projects = [
    ["mak-mam", `http://127.0.0.1:${cafe.address().port}/?lang=fr`],
    ["plume", "https://plume-terrain.netlify.app/"],
    ["pharmacie", "https://pharmacielamosquee.netlify.app/"],
  ];
  for (const [name, url] of projects) {
    for (const [suffix, width, height, mobile] of [["", 1440, 900, false], ["-mobile", 390, 780, true]]) {
      const page = await open(url, width, height, mobile);
      // the host's "Powered by" badge floats over the page: it is not part of the project
      await page.evaluate(() => document.querySelectorAll("#nl-badge-frame").forEach((el) => el.remove()));
      await page.screenshot({ path: path.join(out, `${name}${suffix}.png`) });
      await page.close();
      console.log(`${name}${suffix}.png`);
    }
  }
  cafe.close();
} else {
  fs.mkdirSync(target, { recursive: true });
  const site = await serve(path.join(here, "..", "public"));
  for (const [width, height, mobile] of [[1440, 900, false], [390, 780, true]]) {
    const page = await open(`http://127.0.0.1:${site.address().port}/`, width, height, mobile);
    // everything revealed, as after a full scroll
    await page.evaluate(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in")));
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let n = 0;
    for (let y = 0; y < total; y += height - (mobile ? 60 : 80)) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await new Promise((r) => setTimeout(r, 250));
      await page.screenshot({ path: path.join(target, `site-${width}-${String(++n).padStart(2, "0")}.png`) });
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(`${width} px : ${n} ecrans, hauteur ${total}px, debordement horizontal ${overflow}px, erreurs : ${errors.join(" | ") || "aucune"}`);
    await page.close();
  }
  site.close();
}
await browser.close();
