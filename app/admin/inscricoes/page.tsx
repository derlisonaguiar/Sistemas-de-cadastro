"use client";
import { useEffect, useState } from "react";

type Application = { id: string; fullName: string; cpf: string; email: string | null; phone: string | null; course: string | null; registration: string | null; nationality: string | null; maritalStatus: string | null; rg: string | null; rgIssuer: string | null; address: string | null; addressNumber: string | null; neighborhood: string | null; cep: string | null; city: string | null; state: string | null; photoUrl: string | null; status: string; directorateId: string | null; positionId: string | null; rejectionReason: string | null; createdAt: string; memberId: string | null };
type Option = { id: string; name: string; directorateId?: string | null };
const editableKeys = ["fullName", "cpf", "email", "phone", "course", "registration", "nationality", "maritalStatus", "rg", "rgIssuer", "address", "addressNumber", "neighborhood", "cep", "city", "state"] as const;
const labels: Record<string, string> = { fullName: "Nome", cpf: "CPF", email: "E-mail", phone: "Telefone", course: "Curso", registration: "Matrícula", nationality: "Nacionalidade", maritalStatus: "Estado civil", rg: "RG", rgIssuer: "Órgão emissor", address: "Endereço", addressNumber: "Número", neighborhood: "Bairro", cep: "CEP", city: "Cidade", state: "Estado" };

export default function InscricoesPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [directorates, setDirectorates] = useState<Option[]>([]);
  const [positions, setPositions] = useState<Option[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  async function load() {
    const [a, d, p] = await Promise.all([fetch("/api/member-applications"), fetch("/api/directorates"), fetch("/api/positions")]);
    const [ad, dd, pd] = await Promise.all([a.json(), d.json(), p.json()]);
    if (!a.ok) return setMessage(ad.message || "Não foi possível carregar as inscrições.");
    setApplications(ad.applications); setDirectorates(dd.directorates || []); setPositions(pd.positions || []);
  }
  useEffect(() => { load(); }, []);
  function change(id: string, key: keyof Application, value: string) { setApplications(current => current.map(item => item.id === id ? { ...item, [key]: value || null } : item)); }
  function reviewPayload(item: Application) { const keys: readonly (keyof Application)[] = [...editableKeys, "directorateId", "positionId"]; return Object.fromEntries(keys.map(key => [key, item[key] || null])); }
  async function save(item: Application) { setBusy(item.id); setMessage(""); try { const r = await fetch(`/api/member-applications/${item.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reviewPayload(item)) }); const d = await r.json(); setMessage(d.message); if (r.ok) await load(); } finally { setBusy(""); } }
  async function decide(item: Application, action: "APPROVE" | "REJECT") { const reason = action === "REJECT" ? window.prompt("Motivo da rejeição (opcional):") : null; if (action === "REJECT" && reason === null) return; setBusy(item.id); setMessage(""); try { if (action === "APPROVE") { const saved = await fetch(`/api/member-applications/${item.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(reviewPayload(item)) }); const savedData = await saved.json(); if (!saved.ok) { setMessage(savedData.message); return; } } const r = await fetch(`/api/member-applications/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, rejectionReason: reason }) }); const d = await r.json(); setMessage(d.message); if (r.ok) await load(); } finally { setBusy(""); } }
  return <div><div className="mb-6"><h1 className="text-2xl font-semibold text-gray-900">Inscrições de membros</h1><p className="mt-1 text-sm text-gray-600">Revise, corrija e defina diretoria e cargo antes da aprovação.</p></div>
    {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div>}
    <div className="space-y-5">{applications.length === 0 && <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">Nenhuma inscrição encontrada.</div>}{applications.map(item => <section key={item.id} className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-4"><div className="flex gap-3">{item.photoUrl && <img src={item.photoUrl} alt="" className="h-14 w-14 rounded-full object-cover" />}<div><h2 className="font-semibold text-gray-900">{item.fullName}</h2><p className="text-xs text-gray-500">Enviada em {new Date(item.createdAt).toLocaleDateString("pt-BR")}</p></div></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">{item.status}</span></div>
      {item.status === "PENDING" ? <><div className="grid gap-3 md:grid-cols-3">{editableKeys.map(key => <label key={key} className="text-xs font-medium text-gray-600">{labels[key]}<input value={item[key] || ""} onChange={e => change(item.id, key, e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" /></label>)}
        <label className="text-xs font-medium text-gray-600">Diretoria<select value={item.directorateId || ""} onChange={e => { change(item.id, "directorateId", e.target.value); change(item.id, "positionId", ""); }} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="">Sem diretoria</option>{directorates.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label className="text-xs font-medium text-gray-600">Cargo<select value={item.positionId || ""} onChange={e => change(item.id, "positionId", e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"><option value="">Sem cargo</option>{positions.filter(o => !o.directorateId || o.directorateId === item.directorateId).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label></div>
        <div className="mt-5 flex flex-wrap gap-2"><button disabled={busy === item.id} onClick={() => save(item)} className="rounded-md border px-4 py-2 text-sm">Salvar correções</button><button disabled={busy === item.id} onClick={() => decide(item, "APPROVE")} className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white">Aprovar</button><button disabled={busy === item.id} onClick={() => decide(item, "REJECT")} className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white">Rejeitar</button></div></> : <p className="text-sm text-gray-600">{item.status === "APPROVED" ? "Membro criado e acesso ativado." : `Mantida no histórico.${item.rejectionReason ? ` Motivo: ${item.rejectionReason}` : ""}`}</p>}
    </section>)}</div></div>;
}
