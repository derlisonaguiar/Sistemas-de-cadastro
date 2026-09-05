"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { documentEntityLabels, documentStatusLabels, documentTypeLabels, type DocumentEntityKey } from "@/lib/document-labels";

type Choice = { id: string; name?: string; fullName?: string; title?: string };
const keys = Object.keys(documentEntityLabels) as DocumentEntityKey[];
const inputClass = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

export default function DocumentImportForm({ initialLinks }: { initialLinks: Record<string, string> }) {
  const router = useRouter();
  const [choices, setChoices] = useState<Record<DocumentEntityKey, Choice[]>>({ memberId: [], clientId: [], projectId: [], contractId: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [signed, setSigned] = useState(false);
  const [status, setStatus] = useState("ISSUED");
  const [duplicate, setDuplicate] = useState<{ id: string; title: string } | null>(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  useEffect(() => {
    async function load() {
      try {
        const responses = await Promise.all(["members", "clients", "projects", "contracts"].map(async (resource) => {
          const response = await fetch(`/api/${resource}`);
          const data = await response.json();
          if (!response.ok || !data.ok) throw new Error();
          return data[resource] as Choice[];
        }));
        const next = Object.fromEntries(keys.map((key, index) => [key, responses[index]])) as Record<DocumentEntityKey, Choice[]>;
        if (keys.some((key) => initialLinks[key] && !next[key].some((item) => item.id === initialLinks[key]))) {
          throw new Error();
        }
        setChoices(next);
        setLoaded(true);
      } catch { setError("Não foi possível carregar os vínculos. Recarregue a página."); }
      finally { setLoading(false); }
    }
    void load();
  }, [initialLinks]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !loaded) return;
    const fields = new FormData(event.currentTarget);
    const file = fields.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > 10 * 1024 * 1024) { setError("Envie um PDF ou DOCX de até 10 MB."); return; }
    const metadata = {
      title: fields.get("title"), type: fields.get("type"), description: fields.get("description"), documentDate: fields.get("documentDate"),
      status, signed, organizationDocument: fields.get("organizationDocument") === "on",
      ...Object.fromEntries(keys.map((key) => [key, fields.get(key) || null])),
      duplicateOfId: confirmDuplicate ? duplicate?.id : null,
      duplicateReason: confirmDuplicate ? fields.get("duplicateReason") : "",
    };
    const body = new FormData(); body.set("file", file); body.set("metadata", JSON.stringify(metadata));
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/documents/import", { method: "POST", body });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        if (data.duplicate) { setDuplicate(data.duplicate); setConfirmDuplicate(false); }
        setError(data.message || "Não foi possível importar o documento."); return;
      }
      router.push(`/admin/documentos/${data.document.id}`);
    } catch { setError("Falha no envio. Tente novamente; arquivos repetidos serão detectados."); }
    finally { setSaving(false); }
  }

  return <div className="max-w-3xl">
    <h1 className="text-2xl font-semibold text-gray-900">Importar documento</h1>
    <p className="mt-1 mb-6 text-sm text-gray-600">Envie um PDF ou DOCX pronto e informe seus vínculos.</p>
    <form onSubmit={submit} className="space-y-5 rounded-lg border border-gray-200 bg-white p-5">
      <fieldset disabled={saving || loading || !loaded} className="grid gap-4 md:grid-cols-2">
        <label className="text-sm md:col-span-2">Arquivo (PDF/DOCX, até 10 MB)
          <input required name="file" type="file" accept=".pdf,.docx" className={inputClass} onChange={() => { setDuplicate(null); setConfirmDuplicate(false); }} />
        </label>
        <label className="text-sm md:col-span-2">Título<input name="title" required maxLength={200} className={inputClass} /></label>
        <label className="text-sm">Tipo<select name="type" defaultValue="OTHER" className={inputClass}>{Object.entries(documentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-sm">Data real do documento<input required name="documentDate" type="date" className={inputClass} /></label>
        <label className="text-sm">Status<select value={status} onChange={(e) => { setStatus(e.target.value); if (e.target.value === "SIGNED") setSigned(true); }} className={inputClass}>
          {Object.entries(documentStatusLabels).filter(([value]) => !signed || ["SIGNED", "ARCHIVED", "CANCELED"].includes(value)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={signed} onChange={(e) => { setSigned(e.target.checked); setStatus(e.target.checked ? "SIGNED" : "ISSUED"); }} />Arquivo já assinado</label>
        <label className="text-sm md:col-span-2">Descrição / observação<textarea name="description" maxLength={3000} rows={3} className={inputClass} /></label>
        <p className="text-sm text-gray-600 md:col-span-2">Selecione os vínculos necessários. Deixe em branco para um documento administrativo geral.</p>
        {keys.map((key) => <label key={key} className="text-sm">{documentEntityLabels[key]}
          <select name={key} key={`${key}-${loaded}`} defaultValue={initialLinks[key] || ""} className={inputClass}>
            <option value="">Sem vínculo específico</option>
            {choices[key].map((choice) => <option key={choice.id} value={choice.id}>{choice.fullName || choice.name || choice.title}</option>)}
          </select>
        </label>)}
        <label className="flex items-center gap-2 text-sm md:col-span-2"><input name="organizationDocument" type="checkbox" />Documento institucional da organização</label>
        {duplicate && <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-4 md:col-span-2">
          <p className="text-sm">Arquivo já importado: <Link className="underline" href={`/admin/documentos/${duplicate.id}`} target="_blank">{duplicate.title}</Link>.</p>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmDuplicate} onChange={(e) => setConfirmDuplicate(e.target.checked)} />Preciso importar outra cópia e vou justificar.</label>
          {confirmDuplicate && <label className="block text-sm">Justificativa obrigatória<textarea name="duplicateReason" required minLength={10} maxLength={1000} className={inputClass} /></label>}
        </div>}
      </fieldset>
      {loading && <p className="text-sm">Carregando vínculos...</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-3">
        <Link href="/admin/documentos" className="rounded-md border px-4 py-2 text-sm">Cancelar</Link>
        <button disabled={saving || loading || !loaded || (!!duplicate && !confirmDuplicate)} type="submit" className="rounded-md bg-[var(--admin-primary)] px-4 py-2 text-sm text-[var(--admin-on-primary)] disabled:opacity-60">{saving ? "Importando..." : confirmDuplicate ? "Confirmar importação da cópia" : "Importar documento"}</button>
      </div>
    </form>
  </div>;
}
