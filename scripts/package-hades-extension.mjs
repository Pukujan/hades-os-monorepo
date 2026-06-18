import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateRawSync } from "node:zlib";

import { fileURLToPath } from "node:url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(__dirname, "..");
const extensionRoot = join(repoRoot, "extension");
const distDir = join(extensionRoot, "dist");
const zipPath = join(distDir, "extension.zip");

const files = [
  { src: "popup.html", name: "popup.html" },
  { src: "public/manifest.json", name: "manifest.json" },
  { src: "src/popup.jsx", name: "src/popup.jsx" },
  { src: "src/hades-extension.css", name: "src/hades-extension.css" },
  { src: "src/surfaces/HadesExtensionApp.jsx", name: "src/surfaces/HadesExtensionApp.jsx" },
  { src: "src/surfaces/HadesChatPanel.jsx", name: "src/surfaces/HadesChatPanel.jsx" },
  { src: "src/surfaces/WorkflowListPanel.jsx", name: "src/surfaces/WorkflowListPanel.jsx" },
  { src: "src/surfaces/ContextUploadPanel.jsx", name: "src/surfaces/ContextUploadPanel.jsx" },
  { src: "src/surfaces/TextContextSpacesPanel.jsx", name: "src/surfaces/TextContextSpacesPanel.jsx" },
  { src: "src/surfaces/PageCapturePanel.jsx", name: "src/surfaces/PageCapturePanel.jsx" },
  { src: "src/surfaces/ApprovalQueuePanel.jsx", name: "src/surfaces/ApprovalQueuePanel.jsx" },
  { src: "src/api/hadesExtensionClient.js", name: "src/api/hadesExtensionClient.js" },
];

function crc32(buf) {
  let c = 0xffffffff;
  const table = [];
  for (let n = 0; n < 256; n++) {
    let v = n;
    for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
    table[n] = v;
  }
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(v) { const b = Buffer.alloc(2); b.writeUInt16LE(v, 0); return b; }
function u32(v) { const b = Buffer.alloc(4); b.writeUInt32LE(v, 0); return b; }

function buildZip() {
  if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });

  const entries = [];
  let localHeaderOffset = 0;

  for (const file of files) {
    const absPath = join(extensionRoot, file.src);
    if (!existsSync(absPath)) {
      console.warn(`WARN: ${file.src} not found, skipping`);
      continue;
    }

    const data = readFileSync(absPath);
    const compressed = deflateRawSync(data);
    const crc = crc32(data);
    const name = Buffer.from(file.name, "utf8");

    const localHeader = Buffer.concat([
      Buffer.from("PK\x03\x04"),
      u16(20), u16(0), u16(8), u16(0),
      u16(0), u32(crc),
      u32(compressed.length),
      u32(data.length),
      u16(name.length), u16(0),
      name,
      compressed,
    ]);

    entries.push({
      name,
      crc,
      compressedSize: compressed.length,
      uncompressedSize: data.length,
      localHeaderOffset,
      data: localHeader,
    });

    localHeaderOffset += localHeader.length;
  }

  let centralOffset = localHeaderOffset;
  const centralEntries = [];

  for (const e of entries) {
    const central = Buffer.concat([
      Buffer.from("PK\x01\x02"),
      u16(20), u16(20), u16(0), u16(8),
      u16(0), u16(0),
      u32(e.crc),
      u32(e.compressedSize),
      u32(e.uncompressedSize),
      u16(e.name.length), u16(0), u16(0), u16(0),
      u16(0), u32(0),
      u32(e.localHeaderOffset),
      e.name,
    ]);

    centralEntries.push(central);
  }

  const centralDir = Buffer.concat(centralEntries);
  const eocd = Buffer.concat([
    Buffer.from("PK\x05\x06"),
    u16(0), u16(0),
    u16(entries.length), u16(entries.length),
    u32(centralDir.length),
    u32(centralOffset),
    u16(0),
  ]);

  const zip = Buffer.concat([
    ...entries.map((e) => e.data),
    centralDir,
    eocd,
  ]);

  writeFileSync(zipPath, zip);
  console.log(`Created extension/dist/extension.zip (${zip.length} bytes, ${entries.length} files)`);
}

buildZip();
