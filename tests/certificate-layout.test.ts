import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { certificateLayoutSchema, createEmptyCertificateLayout } from "../lib/certificate-layout.ts";
import { renderCertificatePdf } from "../lib/certificate-renderer.ts";

function validLayout() {
  const layout = createEmptyCertificateLayout();
  layout.elements.push({ id: "title", type: "TEXT", x: 100, y: 200, width: 900, height: 100, rotation: 0, opacity: 1, text: "Certificamos {{ member.fullName }}", fontFamily: "Helvetica", fontSize: 36, fontWeight: "bold", italic: false, underline: false, textAlign: "center", color: "#000000" });
  return layout;
}

test("aceita layout válido e placeholder da allowlist", () => assert.equal(certificateLayoutSchema.safeParse(validLayout()).success, true));
test("rejeita elemento com dimensão absurda", () => { const layout = validLayout(); layout.elements[0].width = 99999; assert.equal(certificateLayoutSchema.safeParse(layout).success, false); });
test("rejeita placeholder fora da allowlist", () => { const layout = validLayout(); if (layout.elements[0].type === "TEXT") layout.elements[0].text = "{{ process.env }}"; assert.equal(certificateLayoutSchema.safeParse(layout).success, false); });
test("rejeita sintaxe Jinja executável", () => { const layout = validLayout(); if (layout.elements[0].type === "TEXT") layout.elements[0].text = "{% for x in items %}"; assert.equal(certificateLayoutSchema.safeParse(layout).success, false); });
test("gera PDF A4 vetorial carregável", async () => { const bytes = await renderCertificatePdf(validLayout(), { "member.fullName": "Maria da Silva" }); assert.equal(bytes.subarray(0, 5).toString(), "%PDF-"); const pdf = await PDFDocument.load(bytes); assert.equal(pdf.getPageCount(), 1); assert.ok(Math.abs(pdf.getPage(0).getWidth() - 841.89) < 0.1); });
