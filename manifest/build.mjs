import { mkdirSync, copyFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "dist");

mkdirSync(dist, { recursive: true });

for (const file of ["prod.json", "staging.json"]) {
  copyFileSync(join(here, file), join(dist, file));
}

const publicDir = join(here, "public");
function copyTree(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const d = join(dst, entry);
    if (statSync(s).isDirectory()) copyTree(s, d);
    else copyFileSync(s, d);
  }
}
copyTree(publicDir, dist);

console.log("manifest built ->", dist);
