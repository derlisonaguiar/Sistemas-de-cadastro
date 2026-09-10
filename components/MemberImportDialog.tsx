"use client";

import { useEffect, useRef, useState } from "react";

type PreviewRow = { line: number; fullName: string; valid: boolean; errors: string[]; warnings: string[] };
type Preview = { total: number; valid: number; invalid: number; rows: PreviewRow[] };

export default function MemberImportDialog({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ imported: number; failures: { line: number; error: string }[] } | null>(null);

  useEffect(() => { dialog.current?.showModal(); }, []);

  async function send(action: "preview" | "confirm") {
    if (!file || busy) return;
    setBusy(true); setError("");
    try {
      const form = new FormData(); form.set("file", file); form.set("action", action);
      const response = await fetch("/api/members/import", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok || !data.ok) { setError(data.message || "Não foi possível importar o arquivo."); return; }
      if (action === "preview") { setPreview(data.preview); setResult(null); }
      else {
        setResult({ imported: data.imported, failures: data.failures || [] });
        onImported();
        if ((data.failures || []).length === 0) onClose();
      }
    } catch { setError("Não foi possível importar o arquivo."); }
    finally { setBusy(false); }
  }

  return <dialog ref={dialog} aria-labelledby="member-import-title" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} className="fixed inset-0 m-auto w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-xl backdrop:bg-black/40">
    <div className="space-y-5">
      <div><h2 id="member-import-title" className="text-lg font-semibold">Importar membros</h2><p className="mt-1 text-sm text-gray-600">Baixe o modelo, preencha os dados e valide antes de confirmar.</p></div>
      <div className="flex flex-wrap gap-2"><a href="/api/members/import/template?format=csv" className="rounded-md border px-3 py-2 text-sm">Baixar modelo CSV</a><a href="/api/members/import/template?format=xlsx" className="rounded-md border px-3 py-2 text-sm">Baixar modelo XLSX</a></div>
      <label className="block text-sm font-medium">Planilha CSV ou XLSX<input type="file" accept=".csv,.xlsx" disabled={busy} onChange={(event) => { setFile(event.target.files?.[0] || null); setPreview(null); setResult(null); setError(""); }} className="mt-1 block w-full text-sm font-normal" /></label>
      {preview && <div className="rounded-md border p-4 text-sm"><p><strong>{preview.total}</strong> linhas: <strong className="text-green-700">{preview.valid} válidas</strong> e <strong className="text-red-700">{preview.invalid} inválidas</strong>.</p><div className="mt-3 max-h-48 overflow-y-auto space-y-2">{preview.rows.map((row) => <div key={row.line}><span className="font-medium">Linha {row.line}: {row.fullName || "Sem nome"}</span>{row.errors.length > 0 && <span className="text-red-700"> — {row.errors.join("; ")}</span>}{row.warnings.length > 0 && <span className="text-amber-700"> — {row.warnings.join("; ")}</span>}</div>)}</div></div>}
      {result && <div className="rounded-md border p-4 text-sm"><p><strong>{result.imported}</strong> membro(s) importado(s).</p>{result.failures.length > 0 && <div className="mt-2 text-red-700">{result.failures.map((failure) => <p key={failure.line}>Linha {failure.line}: {failure.error}</p>)}</div>}</div>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-md border px-3 py-2 text-sm">Cancelar</button>{!preview ? <button type="button" disabled={!file || busy} onClick={() => send("preview")} className="rounded-md bg-[var(--admin-primary)] px-3 py-2 text-sm text-[var(--admin-on-primary)] disabled:opacity-60">{busy ? "Validando..." : "Validar e visualizar"}</button> : <button type="button" disabled={preview.valid === 0 || busy} onClick={() => send("confirm")} className="rounded-md bg-[var(--admin-primary)] px-3 py-2 text-sm text-[var(--admin-on-primary)] disabled:opacity-60">{busy ? "Importando..." : `Confirmar importação (${preview.valid})`}</button>}</div>
    </div>
  </dialog>;
}
