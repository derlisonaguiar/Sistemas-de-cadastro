import "server-only";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

const ENTRY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ENTRY_CODE_LENGTH = 6;

export function createOrganizationEntryCode() {
  const code = Array.from(
    { length: ENTRY_CODE_LENGTH },
    () => ENTRY_CODE_ALPHABET[randomInt(ENTRY_CODE_ALPHABET.length)],
  ).join("");
  return { code, hash: hashOrganizationEntryCode(code) };
}

export function hashOrganizationEntryCode(code: string) {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export async function resolveOrganizationEntryCode(code: string) {
  const hash = hashOrganizationEntryCode(code);
  const organizations = await prisma.organization.findMany({ where: { entryCodeHash: { not: null } }, select: { id: true, entryCodeHash: true } });
  const matches = organizations.filter((organization) => organization.entryCodeHash && organization.entryCodeHash.length === hash.length && timingSafeEqual(Buffer.from(organization.entryCodeHash), Buffer.from(hash)));
  if (matches.length !== 1) throw new OrganizationEntryCodeError();
  return matches[0].id;
}

export class OrganizationEntryCodeError extends Error {
  constructor() { super("Código de ingresso inválido."); this.name = "OrganizationEntryCodeError"; }
}
