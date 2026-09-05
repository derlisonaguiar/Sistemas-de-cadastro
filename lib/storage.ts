import "server-only";
import { createClient } from "@supabase/supabase-js";

export const PRIVATE_BUCKET = process.env.SUPABASE_PRIVATE_BUCKET || "private-documents";
export const PUBLIC_ASSETS_BUCKET = process.env.SUPABASE_PUBLIC_ASSETS_BUCKET || "public-assets";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase Storage não configurado no servidor.");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function storageReference(bucket: string, objectPath: string) {
  return `storage://${bucket}/${objectPath}`;
}

export function parseStorageReference(reference: string | null | undefined) {
  if (!reference?.startsWith("storage://")) return null;
  const value = reference.slice("storage://".length);
  const separator = value.indexOf("/");
  if (separator < 1) return null;
  return { bucket: value.slice(0, separator), path: value.slice(separator + 1) };
}

export async function uploadPrivateObject(objectPath: string, data: Buffer, contentType: string) {
  const { error } = await adminClient().storage.from(PRIVATE_BUCKET).upload(objectPath, data, {
    contentType, upsert: false, cacheControl: "private, max-age=0",
  });
  if (error) throw new Error("Falha ao armazenar arquivo privado.");
  return storageReference(PRIVATE_BUCKET, objectPath);
}

export async function uploadPublicObject(objectPath: string, data: Buffer, contentType: string) {
  const client = adminClient();
  const { error } = await client.storage.from(PUBLIC_ASSETS_BUCKET).upload(objectPath, data, {
    contentType, upsert: true, cacheControl: "public, max-age=3600",
  });
  if (error) throw new Error("Falha ao armazenar arquivo público.");
  return client.storage.from(PUBLIC_ASSETS_BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

export async function downloadStorageObject(reference: string) {
  let parsed = parseStorageReference(reference);
  // Logos uploaded by this application are public Supabase assets, not local files.
  if (!parsed && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const url = new URL(reference);
      const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
      const prefix = `/storage/v1/object/public/${PUBLIC_ASSETS_BUCKET}/`;
      if (url.origin === base.origin && url.pathname.startsWith(prefix)) {
        parsed = { bucket: PUBLIC_ASSETS_BUCKET, path: decodeURIComponent(url.pathname.slice(prefix.length)) };
      }
    } catch { return null; }
  }
  if (!parsed) return null;
  const { data, error } = await adminClient().storage.from(parsed.bucket).download(parsed.path);
  if (error || !data) throw new Error("Arquivo privado não encontrado.");
  return Buffer.from(await data.arrayBuffer());
}

export async function createSignedStorageUrl(reference: string, expiresIn = 300) {
  const parsed = parseStorageReference(reference);
  if (!parsed) throw new Error("Arquivo privado legado precisa ser migrado para Storage.");
  const { data, error } = await adminClient().storage.from(parsed.bucket).createSignedUrl(parsed.path, expiresIn);
  if (error || !data) throw new Error("Não foi possível autorizar o download.");
  return data.signedUrl;
}

export async function removeStorageObject(reference: string) {
  const parsed = parseStorageReference(reference);
  if (!parsed) return;
  const { error } = await adminClient().storage.from(parsed.bucket).remove([parsed.path]);
  if (error) throw new Error("Não foi possível remover o arquivo privado.");
}
