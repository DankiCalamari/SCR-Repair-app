import { readdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "..", "dist");
const assetsDir = join(distDir, "assets");

function hashDir(srcDir) {
  const hash = createHash("md5");
  if (existsSync(srcDir)) {
    const entries = readdirSync(srcDir, { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => join(e.parentPath, e.name))
      .sort();
    for (const file of entries) {
      hash.update(readFileSync(file));
    }
  }
  return hash.digest("hex").slice(0, 8);
}

const contentHash = hashDir(join(__dirname, "..", "src"));
const assets = readdirSync(assetsDir);

const renamedFiles = [];

for (const file of assets) {
  if (file.startsWith("index-") && (file.endsWith(".js") || file.endsWith(".css"))) {
    const ext = file.endsWith(".js") ? ".js" : ".css";
    const newName = `index-${contentHash}${ext}`;
    if (file !== newName) {
      renameSync(join(assetsDir, file), join(assetsDir, newName));
      renamedFiles.push({ oldName: file, newName });
    }
  }
}

if (renamedFiles.length > 0) {
  for (const { oldName, newName } of renamedFiles) {
    for (const file of readdirSync(assetsDir)) {
      if (file.endsWith(".js") && !file.startsWith("index-")) {
        const filePath = join(assetsDir, file);
        const content = readFileSync(filePath, "utf8");
        if (content.includes(oldName)) {
          writeFileSync(filePath, content.split(oldName).join(newName));
        }
      }
    }
  }

  const htmlPath = join(distDir, "index.html");
  let html = readFileSync(htmlPath, "utf8");
  for (const { oldName, newName } of renamedFiles) {
    html = html.split(oldName).join(newName);
  }
  writeFileSync(htmlPath, html);

  console.log(`Renamed assets with content hash: ${contentHash}`);
}
