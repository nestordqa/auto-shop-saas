// Regenera public/docs/torkeos-manual.pdf desde docs/manual/manual.html con Chrome headless.
// Uso: npm run docs:pdf   (CHROME_PATH=... para otra ruta de Chrome)
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const candidates = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].filter(Boolean);
const chrome = candidates.find((path) => existsSync(path));
if (!chrome) throw new Error("No se encontró Chrome. Define CHROME_PATH.");

const output = resolve("public/docs/torkeos-manual.pdf");
execFileSync(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--no-pdf-header-footer",
  "--allow-file-access-from-files",
  `--print-to-pdf=${output}`,
  pathToFileURL(resolve("docs/manual/manual.html")).href,
], { stdio: "inherit" });
console.log(`PDF generado: ${output}`);
