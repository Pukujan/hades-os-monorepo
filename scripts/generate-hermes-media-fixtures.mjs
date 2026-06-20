import fs from "node:fs";
import path from "node:path";

// Permanent E2E fixtures: regenerate deterministically, but do not delete
// neighboring files in this directory.
const outDir = path.resolve("file-exchange/hermes-media-fixtures");
fs.mkdirSync(outDir, { recursive: true });

function write(name, data) {
  const filePath = path.join(outDir, name);
  fs.writeFileSync(filePath, data);
  return filePath;
}

function chunk(id, payload) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  const pad = body.length % 2 ? Buffer.from([0]) : Buffer.alloc(0);
  const header = Buffer.alloc(8);
  header.write(id, 0, 4, "ascii");
  header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body, pad]);
}

function list(type, payload) {
  return chunk("LIST", Buffer.concat([Buffer.from(type, "ascii"), payload]));
}

function riff(type, payload) {
  return chunk("RIFF", Buffer.concat([Buffer.from(type, "ascii"), payload]));
}

function createWav() {
  const sampleRate = 16000;
  const seconds = 1;
  const channels = 1;
  const bitsPerSample = 16;
  const samples = sampleRate * seconds;
  const pcm = Buffer.alloc(samples * 2);

  for (let i = 0; i < samples; i += 1) {
    const value = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.22;
    pcm.writeInt16LE(Math.round(value * 32767), i * 2);
  }

  const fmt = Buffer.alloc(16);
  fmt.writeUInt16LE(1, 0);
  fmt.writeUInt16LE(channels, 2);
  fmt.writeUInt32LE(sampleRate, 4);
  fmt.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 8);
  fmt.writeUInt16LE(channels * bitsPerSample / 8, 12);
  fmt.writeUInt16LE(bitsPerSample, 14);

  return riff("WAVE", Buffer.concat([chunk("fmt ", fmt), chunk("data", pcm)]));
}

function createPng() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAdElEQVR4nO3QsQ3AIBADwQn7r2xKx0JQ0i0LqKQX8e7pvfHcAAAgH7fbwAAwN8JgAABEiBAAgRIgAABEiBAAgRIgAABEiBAAgRIgAABEiBAAgRIgAABEiBAAgRIgAABEiBAAgRIgAABEiBAAgRIgAABEiBAAgRIgAABEiBAAgRI4AIB4wMu1uB2vwAAAABJRU5ErkJggg==",
    "base64"
  );
}

function createPdf() {
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    "4 0 obj\n<< /Length 76 >>\nstream\nBT /F1 18 Tf 36 90 Td (Hermes media upload PDF fixture.) Tj 0 -28 Td (Safe tiny test file.) Tj ET\nendstream\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body, "utf8"));
    body += obj;
  }
  const xrefOffset = Buffer.byteLength(body, "utf8");
  body += "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(body, "utf8");
}

function createAvi() {
  const width = 2;
  const height = 2;
  const rowStride = 8;
  const frameSize = rowStride * height;
  const frame = Buffer.from([
    0x00, 0x00, 0xff, 0x00, 0xff, 0x00, 0x00, 0x00,
    0xff, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00,
  ]);

  const avih = Buffer.alloc(56);
  avih.writeUInt32LE(1000000, 0);
  avih.writeUInt32LE(frameSize, 4);
  avih.writeUInt32LE(0, 8);
  avih.writeUInt32LE(0x10, 12);
  avih.writeUInt32LE(1, 16);
  avih.writeUInt32LE(0, 20);
  avih.writeUInt32LE(1, 24);
  avih.writeUInt32LE(frameSize, 28);
  avih.writeUInt32LE(width, 32);
  avih.writeUInt32LE(height, 36);

  const strh = Buffer.alloc(56);
  strh.write("vids", 0, 4, "ascii");
  strh.write("DIB ", 4, 4, "ascii");
  strh.writeUInt32LE(0, 8);
  strh.writeUInt16LE(0, 12);
  strh.writeUInt16LE(0, 14);
  strh.writeUInt32LE(0, 16);
  strh.writeUInt32LE(1, 20);
  strh.writeUInt32LE(1, 24);
  strh.writeUInt32LE(0, 28);
  strh.writeUInt32LE(1, 32);
  strh.writeUInt32LE(frameSize, 36);
  strh.writeInt32LE(-1, 40);
  strh.writeUInt32LE(0, 44);
  strh.writeInt16LE(0, 48);
  strh.writeInt16LE(0, 50);
  strh.writeInt16LE(width, 52);
  strh.writeInt16LE(height, 54);

  const strf = Buffer.alloc(40);
  strf.writeUInt32LE(40, 0);
  strf.writeInt32LE(width, 4);
  strf.writeInt32LE(height, 8);
  strf.writeUInt16LE(1, 12);
  strf.writeUInt16LE(24, 14);
  strf.writeUInt32LE(0, 16);
  strf.writeUInt32LE(frameSize, 20);

  const hdrl = list("hdrl", Buffer.concat([
    chunk("avih", avih),
    list("strl", Buffer.concat([chunk("strh", strh), chunk("strf", strf)])),
  ]));
  const movi = list("movi", chunk("00db", frame));

  const idx1 = Buffer.alloc(16);
  idx1.write("00db", 0, 4, "ascii");
  idx1.writeUInt32LE(0x10, 4);
  idx1.writeUInt32LE(4, 8);
  idx1.writeUInt32LE(frame.length, 12);

  return riff("AVI ", Buffer.concat([hdrl, movi, chunk("idx1", idx1)]));
}

const files = [
  write("sample-image.png", createPng()),
  write("sample-audio.wav", createWav()),
  write("sample-video.avi", createAvi()),
  write("sample-document.pdf", createPdf()),
];

for (const filePath of files) {
  const stats = fs.statSync(filePath);
  console.log(`${path.relative(process.cwd(), filePath)} ${stats.size} bytes`);
}
