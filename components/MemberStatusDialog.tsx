"use client";

import { useEffect, useRef, useState } from "react";

export const memberStatusLabels = {
  ACTIVE: "Ativo", INACTIVE: "Inativo", LEAVE: "Afastado", ALUMNI: "Egresso", POS_JR: "Pós-Jr",
};

export default function MemberStatusDialog<T extends { id: string; fullName: string; status: keyof typeof memberStatusLabels }>({
  member, onClose, onUpdated,
}: { member: T; onClose: () => void; onUpdated: (member: T) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState(member.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { dialog.current?.showModal(); }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || status === member.status) return;
    const form = event.currentTarget;
    const password = form.elements.namedItem("password") as HTMLInputElement;
    const body = JSON.stringify({ status, password: password.value });
    password.value = "";
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/members/${member.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body,
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.message || "Não foi possível confirmar a alteração.");
        return;
      }
      onUpdated(data.member);
    } catch {
      setError("Não foi possível confirmar a alteração.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialog} aria-labelledby="status-dialog-title"
      onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}
      className="fixed inset-0 m-auto w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-xl backdrop:bg-black/40">
      <form onSubmit={submit} className="space-y-4">
        <h2 id="status-dialog-title" className="text-lg font-semibold">Alterar status</h2>
        <p className="text-sm text-gray-600">{member.fullName} — atual: {memberStatusLabels[member.status]}</p>
        <div>
          <label htmlFor="quick-status" className="block text-sm font-medium">Novo status</label>
          <select autoFocus id="quick-status" value={status} disabled={saving}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="mt-1 w-full rounded-md border border-gray-300 p-2">
            {Object.entries(memberStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        {status === "POS_JR" && <p className="text-sm text-gray-600">O membro deixará de ocupar cargo e diretoria. Histórico e documentos serão preservados.</p>}
        <div>
          <label htmlFor="admin-current-password" className="block text-sm font-medium">Sua senha atual de ADMIN</label>
          <input id="admin-current-password" name="password" type="password" autoComplete="current-password"
            required maxLength={1024} disabled={saving} className="mt-1 w-full rounded-md border border-gray-300 p-2" />
        </div>
        <p className="text-sm text-gray-600">Confirme a alteração para {memberStatusLabels[status]} com sua senha.</p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-md border px-3 py-2 text-sm">Cancelar</button>
          <button type="submit" disabled={saving || status === member.status} className="rounded-md bg-[var(--admin-primary)] px-3 py-2 text-sm text-[var(--admin-on-primary)] disabled:opacity-60">
            {saving ? "Confirmando..." : "Confirmar alteração"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
