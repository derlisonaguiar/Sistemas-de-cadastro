import test from "node:test";
import assert from "node:assert/strict";
import PizZip from "pizzip";
import { PDFParse } from "pdf-parse";
import { validateDocx, validatePdf } from "../lib/file-security.ts";

const docxMime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
function file(name: string, type: string, data: Buffer) { return new File([new Uint8Array(data)], name, { type }); }
function docx(extra?: (zip: PizZip) => void) {
  const zip = new PizZip();
  zip.file("[Content_Types].xml", "<Types/>");
  zip.file("word/document.xml", "<w:document/>");
  extra?.(zip);
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}

test("accepts structurally valid DOCX", () => {
  const data = docx();
  assert.equal(validateDocx(data, file("model.docx", docxMime, data)).kind, "DOCX");
});

test("rejects renamed fake DOCX", () => {
  const data = Buffer.from("not a zip");
  assert.throws(() => validateDocx(data, file("model.docx", docxMime, data)));
});

test("rejects unsafe ZIP path", () => {
  const data = docx((zip) => zip.file("../escape.xml", "bad"));
  assert.throws(() => validateDocx(data, file("model.docx", docxMime, data)));
});

test("rejects suspicious compression ratio", () => {
  const data = docx((zip) => zip.file("word/large.xml", "0".repeat(2_000_000)));
  assert.throws(() => validateDocx(data, file("model.docx", docxMime, data)));
});

test("accepts PDF signature with EOF", () => {
  const data = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF");
  assert.equal(validatePdf(data, file("model.pdf", "application/pdf", data)).kind, "PDF");
});

test("rejects renamed fake PDF", () => {
  const data = Buffer.from("not a pdf");
  assert.throws(() => validatePdf(data, file("model.pdf", "application/pdf", data)));
});

function textualPdf() {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Length 42 >>\nstream\nBT /F1 12 Tf 72 720 Td (Nome: Teste) Tj ET\nendstream",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(body)); body += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body);
}

test("extracts text from a valid textual PDF", async () => {
  const data = textualPdf();
  validatePdf(data, file("model.pdf", "application/pdf", data));
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    assert.match(result.text, /Nome: Teste/);
  } finally {
    await parser.destroy();
  }
});
