import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const content = fs.readFileSync(path.join(__dirname, "llms-full.txt"), "utf8");
const DOCS_DIR = __dirname;
const SOURCE_RE = /<!-- source: website\/docs\/(.+?)\.md -->/g;

let match;
let lastEnd = 0;
const sections = [];

while ((match = SOURCE_RE.exec(content)) !== null) {
  if (lastEnd > 0) {
    sections[sections.length - 1].text = content.slice(sections[sections.length - 1].start, match.index).trim();
  }
  sections.push({ source: match[1], start: match.index, text: "" });
  lastEnd = match.index;
}
sections[sections.length - 1].text = content.slice(sections[sections.length - 1].start).trim();

for (const section of sections) {
  const filePath = path.join(DOCS_DIR, section.source + ".md");
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, section.text, "utf8");
  console.log(`  ${section.source}.md`);
}

console.log(`\nSplit ${sections.length} pages.`);
