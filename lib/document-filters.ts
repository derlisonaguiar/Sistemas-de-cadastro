import { z } from "zod";
import type { Prisma } from "@/lib/generated/prisma/client";
import { documentStatuses, documentTypes } from "@/lib/document-import-validation";

const id = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/).optional();
export const documentFiltersSchema = z.object({
  memberId: id, clientId: id, projectId: id, contractId: id,
  origin: z.enum(["GENERATED", "IMPORTED"]).optional(),
  type: z.enum(documentTypes).optional(), status: z.enum(documentStatuses).optional(),
  documentDate: z.iso.date().optional(),
}).strict();

export function documentWhere(organizationId: string, filters: z.infer<typeof documentFiltersSchema>): Prisma.DocumentWhereInput {
  const { documentDate, ...rest } = filters;
  // Existing generated documents keep their issueDate without rewriting old data.
  const date = documentDate ? new Date(documentDate + "T00:00:00Z") : null;
  return { organizationId, ...rest, ...(date ? { OR: [
    { documentDate: date },
    { documentDate: null, issueDate: { gte: date, lt: new Date(date.getTime() + 86_400_000) } },
  ] } : {}) };
}
