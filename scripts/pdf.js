// npm run pdf – renders the print pages in _site to PDF with headless Chrome:
// _site/pdf/<print.pdfFilename>.pdf for each language. Run after the Eleventy build.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer";
import config from "../site.config.js";
import { loadContent, ROOT } from "../lib/content.js";
import { printTargets } from "../lib/site.js";

const OUTPUT = path.join(ROOT, "_site");
const prefix = new URL(config.siteUrl).pathname;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff2": "font/woff2",
};

if (!fs.existsSync(path.join(OUTPUT, "print"))) {
  console.error("No print pages in _site. Run the build first: npm run build");
  process.exit(1);
}

// Serves _site under the same path prefix as GitHub Pages, so all links resolve.
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  let file = pathname.startsWith(prefix) ? path.join(OUTPUT, pathname.slice(prefix.length)) : null;
  if (file && fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!file || !file.startsWith(OUTPUT) || !fs.existsSync(file)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(response);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

// GitHub's Ubuntu runners do not allow Chrome's sandbox.
const browser = await puppeteer.launch({ args: process.env.CI ? ["--no-sandbox"] : [] });
try {
  fs.mkdirSync(path.join(OUTPUT, "pdf"), { recursive: true });
  for (const target of printTargets(loadContent())) {
    const page = await browser.newPage();
    const response = await page.goto(`${origin}${prefix}${target.printPath}`, { waitUntil: "networkidle0" });
    if (!response?.ok()) throw new Error(`Could not open ${target.printPath} (HTTP ${response?.status()})`);
    await page.evaluate(() => document.fonts.ready);
    // A sheet whose content does not fit would be cut off in the PDF – stop instead.
    const overflowing = await page.$$eval(".page", (sheets) =>
      sheets.map((sheet, i) => (sheet.scrollHeight > sheet.clientHeight + 1 ? i + 1 : null)).filter(Boolean),
    );
    if (overflowing.length) throw new Error(`${target.printPath}: content does not fit on sheet ${overflowing.join(", ")} – adjust src/_data/printLayout.js`);
    const file = path.join(OUTPUT, "pdf", target.pdfFile);
    await page.pdf({
      path: file,
      format: "A4",
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
    });
    await page.close();
    console.log(`PDF: ${path.relative(ROOT, file)}`);
  }
} finally {
  await browser.close();
  server.close();
}
