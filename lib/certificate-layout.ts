import { z } from "zod";
import { validateTemplateText } from "./template-fields.ts";

const color = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const coordinate = z.number().finite().min(-3000).max(3000);
const dimension = z.number().finite().min(1).max(3000);
const common = {
  id, x: coordinate, y: coordinate, width: dimension, height: dimension,
  rotation: z.number().finite().min(-360).max(360).default(0),
  opacity: z.number().finite().min(0).max(1).default(1),
};

const textElement = z.object({
  ...common, type: z.literal("TEXT"), text: z.string().max(4000),
  fontFamily: z.enum(["Helvetica", "TimesRoman", "Courier"]).default("Helvetica"),
  fontSize: z.number().finite().min(6).max(200), fontWeight: z.enum(["normal", "bold"]).default("normal"),
  italic: z.boolean().default(false), underline: z.boolean().default(false),
  textAlign: z.enum(["left", "center", "right"]).default("left"), color,
}).strict().superRefine((value, context) => {
  const result = validateTemplateText(value.text);
  if (!result.valid) context.addIssue({ code: "custom", path: ["text"], message: result.error! });
});
const imageElement = z.object({ ...common, type: z.literal("IMAGE"), assetId: id, lockAspectRatio: z.boolean().default(true) }).strict();
const lineElement = z.object({ ...common, type: z.literal("LINE"), color, strokeWidth: z.number().finite().min(1).max(40) }).strict();
const rectangleElement = z.object({ ...common, type: z.literal("RECTANGLE"), fill: color, borderColor: color, borderWidth: z.number().finite().min(0).max(40) }).strict();

export const certificateElementSchema = z.discriminatedUnion("type", [textElement, imageElement, lineElement, rectangleElement]);
export const certificateLayoutSchema = z.object({
  version: z.literal(1),
  page: z.discriminatedUnion("orientation", [
    z.object({ orientation: z.literal("landscape"), width: z.literal(1123), height: z.literal(794) }).strict(),
    z.object({ orientation: z.literal("portrait"), width: z.literal(794), height: z.literal(1123) }).strict(),
  ]),
  background: z.discriminatedUnion("type", [
    z.object({ type: z.literal("COLOR"), color }).strict(),
    z.object({ type: z.literal("IMAGE"), assetId: id, fit: z.enum(["cover", "contain"]), position: z.enum(["center", "top", "bottom"]).default("center") }).strict(),
  ]),
  elements: z.array(certificateElementSchema).max(100),
}).strict().superRefine((layout, context) => {
  const ids = layout.elements.map((element) => element.id);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", path: ["elements"], message: "IDs de elementos devem ser únicos." });
});

export type CertificateLayout = z.infer<typeof certificateLayoutSchema>;
export type CertificateElement = z.infer<typeof certificateElementSchema>;

export function createEmptyCertificateLayout(orientation: "landscape" | "portrait" = "landscape"): CertificateLayout {
  const page = orientation === "landscape"
    ? { orientation, width: 1123 as const, height: 794 as const }
    : { orientation, width: 794 as const, height: 1123 as const };
  return { version: 1, page, background: { type: "COLOR", color: "#FFFFFF" }, elements: [] };
}

export function certificateAssetIds(layout: CertificateLayout) {
  const ids = layout.elements.filter((item): item is Extract<CertificateElement, { type: "IMAGE" }> => item.type === "IMAGE").map((item) => item.assetId);
  if (layout.background.type === "IMAGE") ids.push(layout.background.assetId);
  return [...new Set(ids)];
}
