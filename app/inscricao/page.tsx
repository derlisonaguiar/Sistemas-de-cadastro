"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import FileUploadField from "@/components/FileUploadField";

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

  useEffect(() => {
    let active = true;
    async function loadApplication() {
      try {
        const response = await fetch("/api/member-applications/me");
        const data = await response.json();
        if (!active || !data.application) return;
        setApplication(data.application);
        setForm(Object.fromEntries(Object.keys(emptyForm).map(key => [key, data.application[key] || ""])) as typeof emptyForm);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadApplication();
    const interval = setInterval(() => { void loadApplication(); }, 15_000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/member-applications/me", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) return setMessage(data.message || "Não foi possível enviar a inscrição.");
      if (photo) {
        const body = new FormData();
        body.set("file", photo);
        const upload = await fetch("/api/member-applications/me/photo", { method: "POST", body });
        const uploadData = await upload.json();
        if (!upload.ok) return setMessage(`${data.message} Foto não enviada: ${uploadData.message}`);
        data.application.photoUrl = uploadData.photoUrl;
      }
      setApplication(data.application);
      setMessage(data.message);
    } catch {
      setMessage("Não foi possível enviar a inscrição.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-gray-50 p-8 text-sm text-gray-600">Carregando inscrição...</main>;

  const statusText = application?.status === "APPROVED"
    ? "Sua inscrição foi aprovada. Agora você já pode entrar com sua conta."
    : application?.status === "REJECTED"
      ? `Sua inscrição foi rejeitada.${application.rejectionReason ? ` Motivo: ${application.rejectionReason}` : ""}`
      : application
        ? "Sua inscrição está pendente e aguarda análise da administração."
        : "Preencha seus dados para solicitar a entrada como membro.";
  const statusClasses = application?.status === "REJECTED"
    ? "border-red-200 bg-red-50 text-red-800"
    : application?.status === "APPROVED"
      ? "border-green-200 bg-green-50 text-green-800"
      : "border-blue-200 bg-blue-50 text-blue-800";

  return <main className="min-h-screen bg-gray-50 px-4 py-10"><div className="mx-auto max-w-4xl">
    <h1 className="text-2xl font-semibold text-gray-900">Inscrição de membro</h1>
    <div className={`mt-4 rounded-lg border p-4 text-sm ${statusClasses}`}>{statusText}</div>
    {application ? <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {application.status === "PENDING" && <p className="text-sm text-gray-600">Você receberá acesso após a aprovação da administração. Esta página será atualizada automaticamente.</p>}
      {application.status === "APPROVED" && <Link href="/login" className="inline-flex rounded-md bg-purple-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-800">Ir para o login</Link>}
      {application.status === "REJECTED" && <p className="text-sm text-gray-600">Não é possível acessar a organização com uma inscrição rejeitada.</p>}
    </div> : <form onSubmit={submit} className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"><div className="grid gap-4 md:grid-cols-2">
      {fields.map(([key, label, type]) => <label key={key} className={`block text-sm font-medium text-gray-700 ${key === "fullName" || key === "address" ? "md:col-span-2" : ""}`}>{label}<input type={type} required={key === "fullName" || key === "cpf"} value={form[key]} onChange={e => setForm(current => ({ ...current, [key]: e.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>)}
      <div className="md:col-span-2"><p className="mb-1 text-sm font-medium text-gray-700">Foto (opcional)</p><FileUploadField action="Selecionar foto" hint="JPG, PNG ou WebP, até 2 MB" accept="image/jpeg,image/png,image/webp" onChange={e => setPhoto(e.target.files?.[0] || null)} /></div>
    </div>{message && <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div>}<button disabled={saving} className="mt-6 rounded-md bg-purple-700 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">{saving ? "Enviando..." : "Enviar inscrição"}</button></form>}
  </div></main>;
}
