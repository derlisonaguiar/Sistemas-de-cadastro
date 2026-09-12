"use client";
import { useState } from "react";
export default function OrganizationEntryCode() {
  const [code, setCode] = useState<string | null>(null); const [message, setMessage] = useState("");
  async function regenerate() { if (!window.confirm("Regenerar o código invalida o anterior. Continuar?")) return; const response = await fetch("/api/organization/entry-code", { method: "POST" }); const data = await response.json(); if (!response.ok) return setMessage(data.message || "Não foi possível regenerar."); setCode(data.entryCode); setMessage("Novo código gerado. Guarde-o agora."); }
  return <section className="rounded-lg border border-gray-200 bg-white p-5"><h2 className="font-semibold text-gray-900">Código de ingresso</h2><p className="mt-1 text-sm text-gray-500">Use este código para liberar novos cadastros. A regeneração invalida o anterior.</p><button type="button" onClick={regenerate} className="mt-3 rounded-md border px-3 py-2 text-sm">Regenerar código</button>{code && <code className="mt-3 block break-all rounded bg-gray-100 p-3 text-sm">{code}</code>}{message && <p className="mt-2 text-sm text-gray-600">{message}</p>}</section>;
}
