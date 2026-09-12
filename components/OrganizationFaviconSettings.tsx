"use client";
import { useState } from "react";
export default function OrganizationFaviconSettings() {
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function upload(file: File | undefined) { if (!file) return; setBusy(true); setMessage(""); const body = new FormData(); body.set("file", file); try { const response = await fetch("/api/organization/favicon", { method: "POST", body }); const data = await response.json(); if (!response.ok) return setMessage(data.message || "Não foi possível atualizar o favicon."); let link = document.querySelector<HTMLLinkElement>("link[rel='icon']"); if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); } link.href = data.faviconUrl; setMessage("Favicon atualizado com sucesso."); } catch { setMessage("Não foi possível atualizar o favicon."); } finally { setBusy(false); } }
  return <section className="rounded-lg border border-gray-200 bg-white p-5"><h2 className="font-semibold text-gray-900">Favicon</h2><p className="mt-1 text-sm text-gray-500">Ícone exibido na aba do navegador. PNG, JPG ou WebP, até 2 MB.</p><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => upload(event.target.files?.[0])} className="mt-3 block text-sm" />{message && <p className="mt-2 text-sm text-gray-600">{message}</p>}</section>;
}
