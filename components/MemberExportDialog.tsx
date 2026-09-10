"use client";

import {
  memberExportFields,
  memberStatusLabels,
  type MemberExportField,
  type MemberExportStatus,
} from "@/lib/member-export";
import { useEffect, useRef, useState } from "react";

const defaultFields = memberExportFields.map((field) => field.key);

export default function MemberExportDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<MemberExportStatus | "">("");
  const [fields, setFields] = useState<MemberExportField[]>(defaultFields);
  const [format, setFormat] = useState<"csv" | "xlsx" | "pdf">("csv");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  function toggleField(field: MemberExportField) {
    setFields((current) =>
      current.includes(field)
        ? current.filter((item) => item !== field)
        : [...current, field]
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (fields.length === 0 || exporting) return;

    setExporting(true);
    setError("");
    try {
      const response = await fetch("/api/members/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status || undefined, fields, format }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.message || "Não foi possível exportar os membros.");
        return;
      }

      const blob = await response.blob();
      const filename = response.headers
        .get("Content-Disposition")
        ?.match(/filename="?([^";]+)"?/)?.[1] || `membros.${format}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      setError("Não foi possível exportar os membros.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="member-export-title"
      onCancel={(event) => { event.preventDefault(); if (!exporting) onClose(); }}
      className="fixed inset-0 m-auto w-full max-w-lg rounded-lg border border-gray-200 bg-white p-6 shadow-xl backdrop:bg-black/40"
    >
      <form onSubmit={submit} className="space-y-5">
        <div>
          <h2 id="member-export-title" className="text-lg font-semibold">Exportar membros</h2>
          <p className="mt-1 text-sm text-gray-600">Escolha os membros e as informações que serão incluídas no arquivo.</p>
        </div>

        <label className="block text-sm font-medium text-gray-700">
          Filtro de membros
          <select value={status} disabled={exporting} onChange={(event) => setStatus(event.target.value as MemberExportStatus | "")} className="mt-1 block w-full rounded-md border border-gray-300 p-2 font-normal">
            <option value="">Todos</option>
            {Object.entries(memberStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-gray-700">Campos</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {memberExportFields.map((field) => <label key={field.key} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={fields.includes(field.key)} disabled={exporting} onChange={() => toggleField(field.key)} />
              {field.label}
            </label>)}
          </div>
          {fields.length === 0 && <p role="alert" className="mt-2 text-sm text-red-700">Selecione ao menos um campo.</p>}
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-gray-700">Formato</legend>
          <div className="mt-2 flex gap-4">
            {(["csv", "xlsx", "pdf"] as const).map((value) => <label key={value} className="flex items-center gap-2 text-sm text-gray-700"><input type="radio" name="format" value={value} checked={format === value} disabled={exporting} onChange={() => setFormat(value)} />{value.toUpperCase()}</label>)}
          </div>
        </fieldset>

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" disabled={exporting} onClick={onClose} className="rounded-md border px-3 py-2 text-sm">Cancelar</button>
          <button type="submit" disabled={exporting || fields.length === 0} className="rounded-md bg-[var(--admin-primary)] px-3 py-2 text-sm text-[var(--admin-on-primary)] disabled:opacity-60">{exporting ? "Exportando..." : "Exportar"}</button>
        </div>
      </form>
    </dialog>
  );
}
