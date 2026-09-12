import "server-only";
import { mkdir, readFile, rename, rm, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ROOT = path.resolve(process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), "storage", "private"));
const PREFIX = "local://";
function safePath(objectPath: string) {
  const normalized = objectPath.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!normalized || normalized.split("/").some(part => !part || part === "." || part === "..") || !/^organizations\/[A-Za-z0-9_-]+\//.test(normalized)) throw new Error("Caminho de armazenamento inválido.");
  const resolved = path.resolve(ROOT, normalized);
  if (!resolved.startsWith(`${ROOT}${path.sep}`)) throw new Error("Caminho de armazenamento inválido.");
  return { normalized, resolved };
}
export function storageReference(_bucket: string, objectPath: string) { return `${PREFIX}${safePath(objectPath).normalized}`; }
export function parseStorageReference(reference: string | null | undefined) { if (!reference?.startsWith(PREFIX)) return null; try { return { path: safePath(reference.slice(PREFIX.length)).normalized }; } catch { return null; } }
export async function uploadPrivateObject(objectPath: string, data: Buffer, _contentType: string) {
  const target = safePath(objectPath); await mkdir(path.dirname(target.resolved), { recursive: true }); const temporary = `${target.resolved}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, data, { flag: "wx", mode: 0o600 }); await rename(temporary, target.resolved); } catch { await rm(temporary, { force: true }).catch(() => undefined); throw new Error("Falha ao armazenar arquivo privado."); }
  return `${PREFIX}${target.normalized}`;
}
export async function uploadPublicObject(objectPath: string, data: Buffer, contentType: string) { return createPrivateFileUrl(await uploadPrivateObject(objectPath, data, contentType)); }
export async function downloadStorageObject(reference: string) { const parsed = parseStorageReference(reference); if (!parsed) return null; try { return await readFile(safePath(parsed.path).resolved); } catch { throw new Error("Arquivo privado não encontrado."); } }
export function createPrivateFileUrl(reference: string) { if (!parseStorageReference(reference)) throw new Error("Referência de arquivo inválida."); return `/api/files?ref=${encodeURIComponent(reference)}`; }
/** @deprecated Local compatibility name; returns an authenticated local route, never a signed URL. */
export async function createSignedStorageUrl(reference: string, _expiresIn = 300) { return createPrivateFileUrl(reference); }
export async function removeStorageObject(reference: string) { const parsed = parseStorageReference(reference); if (parsed) await rm(safePath(parsed.path).resolved, { force: true }); }
