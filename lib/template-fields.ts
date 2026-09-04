import allowedFields from "../document_engine/allowed_fields.json" with { type: "json" };

export const TEMPLATE_FIELDS = allowedFields as readonly string[];
export const TEMPLATE_FIELD_SET = new Set<string>(TEMPLATE_FIELDS);

const placeholderPattern = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+)\s*\}\}/g;

export function validateTemplateText(text: string) {
  if (text.includes("{%") || text.includes("{#") || text.includes("%}") || text.includes("#}")) {
    return { valid: false, fields: [] as string[], error: "Blocos Jinja não são permitidos." };
  }
  const fields = Array.from(text.matchAll(placeholderPattern), (match) => match[1]);
  const remainder = text.replace(placeholderPattern, "");
  if (remainder.includes("{{") || remainder.includes("}}")) {
    return { valid: false, fields, error: "Expressão de template não permitida." };
  }
  if (fields.some((field) => !TEMPLATE_FIELD_SET.has(field))) {
    return { valid: false, fields, error: "O texto contém uma variável não permitida." };
  }
  return { valid: true, fields: [...new Set(fields)], error: null };
}

export function replaceTemplateText(text: string, values: Record<string, string>) {
  return text.replace(placeholderPattern, (_match, key: string) => values[key] ?? "");
}
