"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function InitialSetupForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", shortName: "", legalName: "", email: "", adminName: "", adminUsername: "", adminEmail: "", adminEmailConfirmation: "", adminPassword: "", adminPasswordConfirmation: "" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [entryCode, setEntryCode] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) return setMessage(data.message || "Não foi possível concluir o setup.");
      setEntryCode(data.entryCode);
    } catch {
      setMessage("Não foi possível concluir o setup.");
    } finally {
      setSaving(false);
    }
  }

  if (entryCode) return <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4"><div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm"><h1 className="text-2xl font-semibold text-gray-900">Setup concluído</h1><p className="mt-2 text-sm text-gray-600">Guarde este código de ingresso: ele será mostrado somente agora.</p><code className="mt-4 block break-all rounded bg-gray-100 p-3 text-sm">{entryCode}</code><button onClick={() => { router.replace("/admin"); router.refresh(); }} className="mt-5 w-full rounded-md bg-purple-700 px-4 py-2.5 text-sm font-medium text-white">Ir para o painel</button></div></main>;
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4"><div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
    <h1 className="text-2xl font-semibold text-gray-900">Configuração inicial</h1>
    <p className="mt-1 text-sm text-gray-600">Cadastre a organização da instalação e ative sua conta como administradora.</p>
    <form onSubmit={submit} className="mt-6 space-y-4">
      {[{ key: "name", label: "Nome da organização *", required: true }, { key: "shortName", label: "Nome curto / sigla" }, { key: "legalName", label: "Razão social" }, { key: "email", label: "E-mail institucional", type: "email" }, { key: "adminName", label: "Nome do primeiro ADMIN *", required: true }, { key: "adminUsername", label: "Nome de usuário *", required: true }, { key: "adminEmail", label: "E-mail do primeiro ADMIN *", type: "email", required: true }, { key: "adminEmailConfirmation", label: "Confirmar e-mail *", type: "email", required: true }, { key: "adminPassword", label: "Senha do primeiro ADMIN *", type: "password", required: true }, { key: "adminPasswordConfirmation", label: "Confirmar senha *", type: "password", required: true }].map(({ key, label, required, type = "text" }) => <label key={key} className="block text-sm font-medium text-gray-700">{label}<input type={type} required={required} minLength={key === "adminPassword" || key === "adminPasswordConfirmation" ? 8 : undefined} value={form[key as keyof typeof form]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />{key === "adminPassword" && <span className="mt-1 block text-xs text-gray-500">Mínimo de 8 caracteres, com maiúscula, minúscula, número e caractere especial.</span>}</label>)}
      {message && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>}
      <button disabled={saving} className="w-full rounded-md bg-purple-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">{saving ? "Configurando..." : "Concluir configuração"}</button>
    </form>
  </div></main>;
}
