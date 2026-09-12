type Field = { key: string; label: string; mappedPath: string | null; required: boolean; updatedAt?: Date };
type ReviewDocument = {
  origin: string;
  content: string | null;
  generatedDocxUrl: string | null;
  memberId: string | null;
  createdAt: Date;
};
type ReviewTemplate = {
  active: boolean;
  sourceType: string;
  processingStatus: string;
  originalFileUrl: string | null;
  updatedAt: Date;
  fields: Field[];
};

export function reviewTemplateVersion(template: ReviewTemplate) {
  return new Date(
    Math.max(template.updatedAt.getTime(), ...template.fields.map((field) => field.updatedAt?.getTime() || 0))
  ).toISOString();
}

export function isManualReviewField(field: Field) {
  return (
    (!field.mappedPath || field.mappedPath === "manual") &&
    !/^(member|representative|organization|system|client|project|contract)\./.test(field.key) &&
    !["__proto__", "prototype", "constructor"].includes(field.key)
  );
}

export function getDocumentReview(document: ReviewDocument, template: ReviewTemplate | null) {
  if (
    document.origin !== "GENERATED" ||
    !document.generatedDocxUrl ||
    !document.memberId ||
    !template?.active ||
    template.sourceType !== "DOCX" ||
    template.processingStatus !== "READY" ||
    !template.originalFileUrl
  )
    return null;
  try {
    const content = JSON.parse(document.content || "null");
    if (
      !content ||
      !content.member ||
      !content.organization ||
      !content.manual ||
      typeof content.manual !== "object" ||
      Array.isArray(content.manual)
    )
      return null;
    // Without template version storage, reject models changed since generation.
    if (
      content._reviewTemplateUpdatedAt
        ? content._reviewTemplateUpdatedAt !== reviewTemplateVersion(template)
        : new Date(reviewTemplateVersion(template)) > document.createdAt
    )
      return null;
    const fields = template.fields
      .filter(isManualReviewField)
      .map(({ key, label, required }) => ({ key, label, required }));
    if (!fields.length) return null;
    return {
      fields,
      values: Object.fromEntries(fields.map(({ key }) => [key, String(content.manual[key] ?? "")])),
      content,
    };
  } catch {
    return null;
  }
}
