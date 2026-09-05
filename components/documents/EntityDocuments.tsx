"use client";
import { AdminOnly } from "@/components/AccessProvider";
import Link from "next/link";
import { useEffect, useState } from "react";
import { documentStatusLabels, type DocumentEntityKey } from "@/lib/document-labels";

type Item = { id: string; title: string; origin: string; status: keyof typeof documentStatusLabels; documentDate: string | null; issueDate: string | null };
export default function EntityDocuments({ entityKey, entityId }: { entityKey: DocumentEntityKey; entityId: string }) {
  const [documents, setDocuments] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/documents?${new URLSearchParams({ [entityKey]: entityId })}`);
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error();
        if (active) setDocuments(data.documents);
      } catch { if (active) setError("Não foi possível carregar os documentos."); }
      finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; };
  }, [entityKey, entityId]);
  return <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-semibold text-gray-900">Documentos</h2>
      <AdminOnly><Link href={`/admin/documentos/importar?${new URLSearchParams({ [entityKey]: entityId })}`} className="rounded-md border px-4 py-2 text-sm">Importar documento</Link></AdminOnly>
    </div>
    {loading ? <p className="text-sm text-gray-500">Carregando documentos...</p> : error ? <p role="alert" className="text-sm text-red-700">{error}</p> : !documents.length ? <p className="text-sm text-gray-500">Nenhum documento encontrado.</p> :
      <ul className="divide-y divide-gray-200">{documents.map((document) => <li key={document.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm">
        <Link href={`/admin/documentos/${document.id}`} className="text-[var(--admin-ink)] underline">{document.title}</Link>
        <span>{document.origin === "IMPORTED" ? "Importado" : "Gerado"} · {documentStatusLabels[document.status]} · {(document.documentDate || document.issueDate)?.slice(0, 10).split("-").reverse().join("/") || "Sem data"}</span>
      </li>)}</ul>}
  </section>;
}
