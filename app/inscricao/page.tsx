"use client";
import { FormEvent, useEffect, useState } from "react";

const emptyForm = { fullName: "", cpf: "", email: "", phone: "", course: "", registration: "", nationality: "", maritalStatus: "", rg: "", rgIssuer: "", address: "", addressNumber: "", neighborhood: "", cep: "", city: "", state: "" };
const fields = [
  ["fullName", "Nome completo *", "text"], ["cpf", "CPF *", "text"], ["email", "E-mail", "email"], ["phone", "Telefone", "text"],
  ["course", "Curso", "text"], ["registration", "Matrícula", "text"], ["nationality", "Nacionalidade", "text"], ["maritalStatus", "Estado civil", "text"],
  ["rg", "RG", "text"], ["rgIssuer", "Órgão emissor", "text"], ["address", "Endereço", "text"], ["addressNumber", "Número", "text"],
  ["neighborhood", "Bairro", "text"], ["cep", "CEP", "text"], ["city", "Cidade", "text"], ["state", "Estado", "text"],
] as const;

type Application = typeof emptyForm & { id: string; status: "PENDING" | "APPROVED" | "REJECTED"; rejectionReason?: string | null; photoUrl?: string | null };

export default function InscricaoPage() {
  const [form, setForm] = useState(emptyForm);
  const [application, setApplication] = useState<Application | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/member-applications/me").then(r => r.json()).then(data => { if (data.application) { setApplication(data.application); setForm(Object.fromEntries(Object.keys(emptyForm).map(key => [key, data.application[key] || ""])) as typeof emptyForm); } }).finally(() => setLoading(false)); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/member-applications/me", { method: application ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) return setMessage(data.message || "Não foi possível enviar a inscrição.");
      if (photo) { const body = new FormData(); body.set("file", photo); const upload = await fetch("/api/member-applications/me/photo", { method: "POST", body }); const uploadData = await upload.json(); if (!upload.ok) return setMessage(`${data.message} Foto não enviada: ${uploadData.message}`); data.application.photoUrl = uploadData.photoUrl; }
      setApplication(data.application); setMessage(data.message);
    } catch { setMessage("Não foi possível enviar a inscrição."); } finally { setSaving(false); }
  }
  if (loading) return <main className="min-h-screen bg-gray-50 p-8 text-sm text-gray-600">Carregando inscrição...</main>;
  const editable = !application || application.status === "PENDING";
  const statusText = application?.status === "APPROVED" ? "Sua inscrição foi aprovada. Seu acesso de membro está ativo." : application?.status === "REJECTED" ? `Sua inscrição foi rejeitada.${application.rejectionReason ? ` Motivo: ${application.rejectionReason}` : ""}` : application ? "Sua inscrição está pendente e aguarda análise da administração." : "Preencha seus dados para solicitar a entrada como membro.";
  return <main className="min-h-screen bg-gray-50 px-4 py-10"><div className="mx-auto max-w-4xl">
    <h1 className="text-2xl font-semibold text-gray-900">Inscrição de membro</h1><div className={`mt-4 rounded-lg border p-4 text-sm ${application?.status === "REJECTED" ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}>{statusText}</div>
    <form onSubmit={submit} className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"><div className="grid gap-4 md:grid-cols-2">
      {fields.map(([key,label,type]) => <label key={key} className={`block text-sm font-medium text-gray-700 ${key === "fullName" || key === "address" ? "md:col-span-2" : ""}`}>{label}<input type={type} required={key === "fullName" || key === "cpf"} disabled={!editable} value={form[key]} onChange={e => setForm(current => ({ ...current, [key]: e.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-100" /></label>)}
      <label className="block text-sm font-medium text-gray-700 md:col-span-2">Foto (opcional)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={!editable} onChange={e => setPhoto(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm" /><span className="mt-1 block text-xs text-gray-500">JPG, PNG ou WebP, até 2 MB.</span></label>
    </div>{message && <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div>}{editable && <button disabled={saving} className="mt-6 rounded-md bg-purple-700 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">{saving ? "Enviando..." : application ? "Salvar alterações" : "Enviar inscrição"}</button>}</form>
  </div></main>;
}
