import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont } from "pdf-lib";
import type { CertificateLayout } from "./certificate-layout.ts";
import { replaceTemplateText } from "./template-fields.ts";

function pdfColor(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let current = "";
    for (const word of paragraph.split(/\s+/)) {
      const next = current ? `${current} ${word}` : word;
      if (current && font.widthOfTextAtSize(next, size) > maxWidth) { lines.push(current); current = word; }
      else current = next;
    }
    lines.push(current);
  }
  return lines;
}

export type CertificateImage = { bytes: Uint8Array; mimeType: "image/png" | "image/jpeg"; width: number; height: number };

export async function renderCertificatePdf(layout: CertificateLayout, values: Record<string, string>, images: Map<string, CertificateImage> = new Map()) {
  const document = await PDFDocument.create();
  const landscape = layout.page.orientation === "landscape";
  const page = document.addPage(landscape ? [841.89, 595.28] : [595.28, 841.89]);
  const pageWidth = page.getWidth(); const pageHeight = page.getHeight();
  const sx = pageWidth / layout.page.width; const sy = pageHeight / layout.page.height;
  const fonts = new Map<string, PDFFont>();
  async function fontFor(family: string, bold: boolean, italic: boolean) {
    const key = `${family}:${bold}:${italic}`;
    if (fonts.has(key)) return fonts.get(key)!;
    const variants = family === "TimesRoman"
      ? [StandardFonts.TimesRoman, StandardFonts.TimesRomanBold, StandardFonts.TimesRomanItalic, StandardFonts.TimesRomanBoldItalic]
      : family === "Courier"
        ? [StandardFonts.Courier, StandardFonts.CourierBold, StandardFonts.CourierOblique, StandardFonts.CourierBoldOblique]
        : [StandardFonts.Helvetica, StandardFonts.HelveticaBold, StandardFonts.HelveticaOblique, StandardFonts.HelveticaBoldOblique];
    const embedded = await document.embedFont(variants[bold && italic ? 3 : bold ? 1 : italic ? 2 : 0]); fonts.set(key, embedded); return embedded;
  }
  async function drawImage(assetId: string, x: number, y: number, width: number, height: number, fit: "cover" | "contain" = "contain") {
    const source = images.get(assetId); if (!source) return;
    const embedded = source.mimeType === "image/png" ? await document.embedPng(source.bytes) : await document.embedJpg(source.bytes);
    const sourceRatio = source.width / source.height; const boxRatio = width / height;
    const drawWidth = fit === "contain" ? (sourceRatio > boxRatio ? width : height * sourceRatio) : (sourceRatio > boxRatio ? height * sourceRatio : width);
    const drawHeight = drawWidth / sourceRatio;
    page.drawImage(embedded, { x: x + (width - drawWidth) / 2, y: y + (height - drawHeight) / 2, width: drawWidth, height: drawHeight });
  }
  if (layout.background.type === "COLOR") page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: pdfColor(layout.background.color) });
  else await drawImage(layout.background.assetId, 0, 0, pageWidth, pageHeight, layout.background.fit);
  for (const element of layout.elements) {
    const x = element.x * sx; const width = element.width * sx; const height = element.height * sy;
    const y = pageHeight - element.y * sy - height; const rotation = degrees(-element.rotation);
    if (element.type === "RECTANGLE") page.drawRectangle({ x, y, width, height, color: pdfColor(element.fill), borderColor: pdfColor(element.borderColor), borderWidth: element.borderWidth * sx, rotate: rotation, opacity: element.opacity });
    if (element.type === "LINE") page.drawLine({ start: { x, y: y + height / 2 }, end: { x: x + width, y: y + height / 2 }, thickness: element.strokeWidth * sx, color: pdfColor(element.color), opacity: element.opacity });
    if (element.type === "IMAGE") await drawImage(element.assetId, x, y, width, height);
    if (element.type === "TEXT") {
      const font = await fontFor(element.fontFamily, element.fontWeight === "bold", element.italic);
      const size = element.fontSize * sy; const lineHeight = size * 1.18;
      const lines = wrapText(replaceTemplateText(element.text, values), font, size, width).slice(0, Math.max(1, Math.floor(height / lineHeight)));
      lines.forEach((line, index) => {
        const lineWidth = font.widthOfTextAtSize(line, size); const offset = element.textAlign === "center" ? (width - lineWidth) / 2 : element.textAlign === "right" ? width - lineWidth : 0;
        const lineY = y + height - lineHeight * (index + 1);
        page.drawText(line, { x: x + offset, y: lineY, size, font, color: pdfColor(element.color), rotate: rotation, opacity: element.opacity });
        if (element.underline) page.drawLine({ start: { x: x + offset, y: lineY - 1 }, end: { x: x + offset + lineWidth, y: lineY - 1 }, thickness: Math.max(0.5, size / 20), color: pdfColor(element.color) });
      });
    }
  }
  return Buffer.from(await document.save());
}
