import { z } from "zod";
import { certificateLayoutSchema } from "@/lib/certificate-layout";

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => z.union([trimmed(max), z.null()]).optional();
const requiredText = (max: number) => trimmed(max).min(1);

export const idSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
export const optionalIdSchema = z.union([idSchema, z.literal(""), z.null()]).optional()
  .transform((value) => value || null);

const optionalEmail = z.union([z.string().trim().email().max(254), z.literal(""), z.null()])
  .optional().transform((value) => value || null);
const optionalUrl = z.union([z.string().trim().url().max(2048), z.literal(""), z.null()])
  .optional().transform((value) => value || null);
const optionalDate = z.union([z.coerce.date(), z.literal(""), z.null()])
  .optional().transform((value) => value === "" || value == null ? null : value);
const optionalMoney = z.union([
  z.coerce.number().finite().nonnegative().max(9999999999.99),
  z.literal(""),
  z.null(),
]).optional().transform((value) => value === "" || value == null ? null : value);

export function normalizeTaxId(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidCpfCnpj(value: string) {
  const digits = normalizeTaxId(value);
  return digits.length === 11 || digits.length === 14;
}

const optionalTaxId = z.union([z.string(), z.null()]).optional()
  .transform((value) => value ? normalizeTaxId(value) : null)
  .refine((value) => !value || isValidCpfCnpj(value), "CPF/CNPJ deve ter 11 ou 14 dígitos.");
const optionalCpf = z.union([z.string(), z.null()]).optional()
  .transform((value) => value ? normalizeTaxId(value) : null)
  .refine((value) => !value || value.length === 11, "CPF deve ter 11 dígitos.");

export const organizationSchema = z.object({
  name: requiredText(160).optional(),
  shortName: optionalText(80), legalName: optionalText(200), tradeName: optionalText(200),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  cnpj: optionalTaxId, email: optionalEmail, phone: optionalText(30), website: optionalUrl,
  address: optionalText(250), addressNumber: optionalText(30), neighborhood: optionalText(120),
  cep: optionalText(12), addressComplement: optionalText(120), city: optionalText(120),
  state: optionalText(120), stateCode: z.union([z.string().trim().length(2), z.literal(""), z.null()]).optional(),
  documentHeaderText: optionalText(2000),
}).strict();

export const memberSchema = z.object({
  fullName: requiredText(200), email: optionalEmail, cpf: optionalCpf, phone: optionalText(30),
  course: optionalText(160), registration: optionalText(80), nationality: optionalText(80),
  maritalStatus: optionalText(50), rg: optionalText(30), rgIssuer: optionalText(30),
  address: optionalText(250), addressNumber: optionalText(30), neighborhood: optionalText(120),
  cep: optionalText(12), city: optionalText(120), state: optionalText(120),
  entryDate: optionalDate, exitDate: optionalDate,
  status: z.enum(["ACTIVE", "INACTIVE", "LEAVE", "ALUMNI"]).default("ACTIVE"),
  directorateId: optionalIdSchema, positionId: optionalIdSchema,
}).strict().refine((data) => !data.entryDate || !data.exitDate || data.exitDate >= data.entryDate, {
  message: "A data de saída não pode ser anterior à entrada.", path: ["exitDate"],
});

export const directorateSchema = z.object({
  name: requiredText(120), description: optionalText(1000), active: z.boolean().optional(),
}).strict();

export const positionSchema = z.object({
  name: requiredText(120), description: optionalText(1000),
  role: z.enum(["PRESIDENT", "VICE_PRESIDENT", "DIRECTOR", "MANAGER", "MEMBER", "OTHER"]).default("OTHER"),
  active: z.boolean().optional(),
}).strict();

export const clientSchema = z.object({
  name: requiredText(200), companyName: optionalText(200), cpfCnpj: optionalTaxId,
  email: optionalEmail, phone: optionalText(30), contactName: optionalText(200),
  address: optionalText(300), notes: optionalText(3000), active: z.boolean().optional(),
}).strict();

export const projectSchema = z.object({
  name: requiredText(200), description: optionalText(3000), clientId: optionalIdSchema,
  startDate: optionalDate, endDate: optionalDate,
  status: z.enum(["PLANNING", "ACTIVE", "PAUSED", "COMPLETED", "CANCELED"]).default("PLANNING"),
  budget: optionalMoney,
}).strict().refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
  message: "A data final não pode ser anterior à inicial.", path: ["endDate"],
});

export const contractSchema = z.object({
  clientId: idSchema, projectId: optionalIdSchema, title: requiredText(200),
  description: optionalText(3000), contractNumber: optionalText(80), value: optionalMoney,
  startDate: optionalDate, endDate: optionalDate,
  status: z.enum(["DRAFT", "PENDING_SIGNATURE", "ACTIVE", "COMPLETED", "CANCELED"]).default("DRAFT"),
  signatureDate: optionalDate, notes: optionalText(3000),
}).strict().refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
  message: "A data final não pode ser anterior à inicial.", path: ["endDate"],
});

export const documentSchema = z.object({
  title: requiredText(200),
  type: z.enum(["VOLUNTEER_TERM", "TERMINATION_TERM", "CERTIFICATE", "DECLARATION", "CONTRACT", "PROJECT", "CLIENT", "OTHER"]),
  status: z.enum(["DRAFT", "PENDING", "SIGNED", "ISSUED", "ARCHIVED", "CANCELED"]).default("DRAFT"),
  memberId: optionalIdSchema, clientId: optionalIdSchema, projectId: optionalIdSchema, contractId: optionalIdSchema,
  description: optionalText(3000), issueDate: optionalDate, signatureDate: optionalDate,
}).strict();

export const documentTemplateSchema = z.object({
  name: requiredText(200), description: optionalText(1000),
  type: z.enum(["VOLUNTEER_TERM", "TERMINATION_TERM", "CERTIFICATE", "DECLARATION", "CONTRACT", "PROJECT", "CLIENT", "OTHER"]),
}).strict();

export const templateFieldSchema = z.object({
  fieldId: idSchema, label: requiredText(160).optional(),
  type: z.enum(["TEXT", "NUMBER", "DATE", "CPF", "CNPJ", "EMAIL", "PHONE", "ADDRESS", "CURRENCY", "BOOLEAN"]).optional(),
  required: z.boolean().optional(), mappedPath: z.string().trim().max(160).optional(),
}).strict();

export const documentGenerationSchema = z.object({
  templateId: idSchema, memberId: idSchema, representativeId: optionalIdSchema,
  manualValues: z.record(z.string().max(160), z.string().max(5000))
    .refine((value) => Object.keys(value).length <= 100, "Máximo de 100 valores manuais.")
    .default({}),
}).strict();

export const invitationSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254), role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
}).strict();
export const linkInvitationSchema = z.object({ token: z.string().trim().min(32).max(256) }).strict();
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(6).max(256),
}).strict();

export const routeIdSchema = z.object({ id: idSchema }).strict();

export const certificateTemplateCreateSchema = z.object({
  name: requiredText(200),
  description: optionalText(1000),
  orientation: z.enum(["landscape", "portrait"]).default("landscape"),
}).strict();
export const certificateTemplateUpdateSchema = z.object({
  name: requiredText(200), description: optionalText(1000), layout: certificateLayoutSchema,
}).strict();
export const certificateGenerateSchema = z.object({
  memberId: idSchema, representativeId: optionalIdSchema,
}).strict();
