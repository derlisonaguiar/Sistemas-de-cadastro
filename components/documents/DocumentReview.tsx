"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AdminOnly } from "@/components/AccessProvider";

export type ReviewableDocument = {
  id: string;
  origin: string;
  templateId: string | null;
  memberId: string | null;
  fileUrl: string | null;
  generatedPdfUrl: string | null;
  generatedDocxUrl: string | null;
  importedMimeType: string | null;
  review: { fields: { key: string; label: string; required: boolean }[]; values: Record<string, string> } | null;
};

export default function DocumentReview({
  document,
  editing = false,
}: {
  document: ReviewableDocument;
  editing?: boolean;
}) {
  const router = useRouter();
  const frame = useRef<HTMLIFrameElement>(null);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [values, setValues] = useState(document.review?.values || {});
  const url = `/api/documents/${document.id}/download`;
  const hasFile = document.fileUrl || document.generatedPdfUrl || document.generatedDocxUrl;
  const pdf = document.fileUrl ? document.importedMimeType === "application/pdf" : !!document.generatedPdfUrl;
  const docx = document.fileUrl ? document.importedMimeType?.includes("wordprocessingml") : !!document.generatedDocxUrl;
  const canEdit = document.origin === "GENERATED" && document.review;

  async function download() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = window.document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${document.id}.${pdf ? "pdf" : docx ? "docx" : "bin"}`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setMessage("Não foi possível baixar o documento. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function renderDocx() {
    const target = frame.current?.contentDocument;
    if (!target) return;
    setBusy(true);
    setMessage("");
    try {
      const [response, { renderAsync }] = await Promise.all([
        fetch(url, { cache: "no-store" }),
        import("docx-preview"),
      ]);
      if (!response.ok) throw new Error();
      await renderAsync(await response.blob(), target.body, target.head, {
        renderAltChunks: false,
        useBase64URL: true,
      });
    } catch {
      setMessage("Não foi possível visualizar. Tente novamente ou baixe o arquivo.");
    } finally {
      setBusy(false);
    }
  }

  async function regenerate(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The server obtains the template, member, representative and entity
        // links from the prior document. The browser can change only manual values.
        body: JSON.stringify({ revisionOfId: document.id, manualValues: values }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || "Não foi possível regenerar.");
      router.push(`/admin/documentos/${data.document.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível regenerar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-6 space-y-4 rounded-lg border bg-white p-5">
      <div className="flex flex-wrap items-center gap-3">
        {hasFile && (
          <>
            <button type="button" className="rounded border px-4 py-2 text-sm" onClick={() => setPreview(!preview)}>
              {preview ? "Fechar preview" : "Visualizar"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void download()}
              className="rounded border px-4 py-2 text-sm disabled:opacity-50"
            >
              Baixar
            </button>
          </>
        )}
        {canEdit && !editing && (
          <AdminOnly>
            <Link href={`/admin/documentos/${document.id}/editar`} className="rounded border px-4 py-2 text-sm">
              Editar
            </Link>
          </AdminOnly>
        )}
      </div>
      {preview &&
        (pdf ? (
          <iframe title="Visualização do documento PDF" src={url} className="h-[600px] w-full rounded border" />
        ) : docx ? (
          <iframe
            ref={frame}
            title="Visualização do documento DOCX"
            sandbox="allow-same-origin"
            srcDoc={
              "<!doctype html><html><head><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; font-src data: blob:\"></head><body></body></html>"
            }
            onLoad={() => void renderDocx()}
            className="h-[600px] w-full rounded border"
          />
        ) : (
          <p className="text-sm text-gray-600">Preview indisponível para este formato. Use Baixar.</p>
        ))}
      {busy && (
        <p role="status" className="text-sm">
          Processando...
        </p>
      )}
      {canEdit && editing && (
        <AdminOnly>
          <form onSubmit={regenerate} className="space-y-4">
            <p className="text-sm text-gray-600">
              Edite os campos manuais. Regenerar cria uma nova versão e mantém a anterior.
            </p>
            {document.review!.fields.map((field) => (
              <label key={field.key} className="block text-sm">
                {field.label}
                {field.required ? " *" : ""}
                <textarea
                  required={field.required}
                  maxLength={5000}
                  rows={3}
                  className="mt-1 block w-full rounded border p-2"
                  value={values[field.key] || ""}
                  onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
                />
              </label>
            ))}
            <div className="flex gap-3">
              <button disabled={busy} className="rounded border px-4 py-2 text-sm disabled:opacity-50">
                Regenerar
              </button>
              <Link className="px-4 py-2 text-sm" href={`/admin/documentos/${document.id}`}>
                Cancelar
              </Link>
            </div>
          </form>
        </AdminOnly>
      )}
      {document.origin === "GENERATED" && !canEdit && (
        <p className="text-sm text-gray-600">
          Revisão indisponível: requer DOCX, dados de geração e campos manuais em um modelo original ativo e não
          alterado.
        </p>
      )}
      {message && (
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
    </section>
  );
}
