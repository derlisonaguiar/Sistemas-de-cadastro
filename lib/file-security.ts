import PizZip from "pizzip";

const MAX_ENTRIES = 500;
const MAX_ENTRY_SIZE = 15 * 1024 * 1024;
const MAX_TOTAL_UNCOMPRESSED = 50 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 100;

export type SafeUpload = { kind: "DOCX" | "PDF"; mime: string; extension: ".docx" | ".pdf" };

function hasUnsafePath(name: string) {
  return name.startsWith("/") || name.startsWith("\\") || /^[A-Za-z]:/.test(name) ||
    name.split(/[\\/]/).includes("..");
}

export function validateDocx(buffer: Buffer, file: File): SafeUpload {
  if (!file.name.toLowerCase().endsWith(".docx")) throw new Error("INVALID_DOCX_EXTENSION");
  if (file.type && file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    throw new Error("INVALID_DOCX_MIME");
  }
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) throw new Error("INVALID_DOCX_SIGNATURE");

  let zip: PizZip;
  try { zip = new PizZip(buffer); } catch { throw new Error("INVALID_DOCX_ZIP"); }
  const entries = Object.values(zip.files);
  if (entries.length > MAX_ENTRIES) throw new Error("DOCX_TOO_MANY_ENTRIES");
  if (!zip.file("[Content_Types].xml") || !zip.file("word/document.xml")) throw new Error("INVALID_DOCX_STRUCTURE");

  let total = 0;
  for (const entry of entries) {
    if (hasUnsafePath(entry.name)) throw new Error("UNSAFE_ZIP_PATH");
    if (entry.dir) continue;
    const metadata = entry as typeof entry & { _data?: { uncompressedSize?: number; compressedSize?: number } };
    const size = metadata._data?.uncompressedSize;
    const compressedSize = metadata._data?.compressedSize;
    if (typeof size !== "number" || typeof compressedSize !== "number") throw new Error("INVALID_ZIP_METADATA");
    if (size > MAX_ENTRY_SIZE) throw new Error("DOCX_ENTRY_TOO_LARGE");
    if (compressedSize > 0 && size / compressedSize > MAX_COMPRESSION_RATIO) throw new Error("DOCX_SUSPICIOUS_COMPRESSION");
    total += size;
    if (total > MAX_TOTAL_UNCOMPRESSED) throw new Error("DOCX_UNCOMPRESSED_TOO_LARGE");
  }
  if (buffer.length > 0 && total / buffer.length > MAX_COMPRESSION_RATIO) throw new Error("DOCX_SUSPICIOUS_COMPRESSION");
  return { kind: "DOCX", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: ".docx" };
}

export function validatePdf(buffer: Buffer, file: File): SafeUpload {
  if (!file.name.toLowerCase().endsWith(".pdf")) throw new Error("INVALID_PDF_EXTENSION");
  if (file.type && file.type !== "application/pdf") throw new Error("INVALID_PDF_MIME");
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("INVALID_PDF_SIGNATURE");
  if (!buffer.subarray(Math.max(0, buffer.length - 2048)).includes(Buffer.from("%%EOF"))) throw new Error("INVALID_PDF_EOF");
  return { kind: "PDF", mime: "application/pdf", extension: ".pdf" };
}

export function validateTemplateUpload(file: File, maxBytes: number) {
  if (file.size <= 0 || file.size > maxBytes) throw new Error("FILE_SIZE_INVALID");
  return file.arrayBuffer().then((value) => {
    const buffer = Buffer.from(value);
    return { buffer, safe: file.name.toLowerCase().endsWith(".pdf") ? validatePdf(buffer, file) : validateDocx(buffer, file) };
  });
}

export function validateImageUpload(buffer: Buffer, file: File) {
  const maxPixels = 25_000_000;
  let width = 0;
  let height = 0;
  let extension: ".png" | ".jpg" | ".webp";
  let mime: string;

  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    width = buffer.readUInt32BE(16); height = buffer.readUInt32BE(20); extension = ".png"; mime = "image/png";
  } else if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    extension = ".jpg"; mime = "image/jpeg";
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        height = buffer.readUInt16BE(offset + 5); width = buffer.readUInt16BE(offset + 7); break;
      }
      if (length < 2) break;
      offset += 2 + length;
    }
  } else if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    extension = ".webp"; mime = "image/webp";
    const kind = buffer.subarray(12, 16).toString("ascii");
    if (kind === "VP8X" && buffer.length >= 30) {
      width = 1 + buffer.readUIntLE(24, 3); height = 1 + buffer.readUIntLE(27, 3);
    }
  } else {
    throw new Error("INVALID_IMAGE_SIGNATURE");
  }

  if (file.type && file.type !== mime) throw new Error("INVALID_IMAGE_MIME");
  if (width <= 0 || height <= 0 || width * height > maxPixels) throw new Error("INVALID_IMAGE_DIMENSIONS");
  return { extension, mime, width, height };
}
