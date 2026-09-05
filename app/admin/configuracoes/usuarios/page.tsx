"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
type User = { id: string; name: string | null; email: string | null; role: "ADMIN" | "USER"; active: boolean };
type UserEdit = { name: string; role: User["role"]; active: boolean };
export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [currentId, setCurrentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [editError, setEditError] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/users", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Erro ao carregar usuários.");
    setUsers(data.users); setCurrentId(data.currentUserId); setLoading(false);
  }, []);
  useEffect(() => {
    fetch("/api/users", { cache: "no-store" }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erro ao carregar usuários.");
      setUsers(data.users); setCurrentId(data.currentUserId);
    }).catch(error => setMessage(error.message)).finally(() => setLoading(false));
  }, []);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    await mutate("/api/users", "POST", values, () => form.reset());
  }
  async function mutate(url: string, method: string, body?: object, onSuccess?: () => void, isEdit = false) {
    setBusy(true); setMessage(""); setEditError("");
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível concluir a operação.");
      onSuccess?.(); setMessage(data.message || "Alteração realizada com sucesso.");
      if (method === "PATCH" && data.user?.id === currentId && (!data.user.active || data.user.role !== "ADMIN")) {
        router.replace("/admin"); router.refresh(); return;
      }
      await load();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Falha de conexão.";
      setMessage(text); if (isEdit) setEditError(text);
    }
    finally { setBusy(false); }
  }
  const lastAdmin = users.filter(user => user.active && user.role === "ADMIN").length === 1;
  const inputClass = "mt-1 h-8 w-full rounded-md border border-gray-200 px-2 text-xs focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100";
  return <div className="max-w-4xl space-y-4 text-xs text-gray-700">
    <div><h1 className="text-lg font-semibold text-gray-900">Usuários</h1><p className="mt-1 text-xs text-gray-500">ADMIN tem acesso completo. USER tem acesso somente de consulta.</p></div>
    {message && <p role="status" className="rounded-md border border-gray-200 bg-white px-3 py-2">{message}</p>}
    <form onSubmit={create} className="space-y-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <h2 className="text-sm font-medium text-gray-800">Cadastrar usuário</h2>
      <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label>Nome<input className={inputClass} name="name" required minLength={2} maxLength={150} autoComplete="name" /></label>
        <label>E-mail<input className={inputClass} name="email" type="email" required maxLength={254} autoComplete="off" /></label>
        <label>Senha inicial<input className={inputClass} name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /><span className="mt-1 block text-[11px] text-gray-400">Mínimo de 12 caracteres.</span></label>
        <label>Permissão<select className={inputClass} name="role" defaultValue="USER"><option>USER</option><option>ADMIN</option></select></label>
        <button className="w-fit rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs text-purple-700 hover:bg-purple-100 disabled:opacity-50 sm:col-span-2 lg:col-span-4" type="submit">{busy ? "Aguarde..." : "Cadastrar usuário"}</button>
      </fieldset>
    </form>
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left text-xs"><caption className="sr-only">Usuários da organização</caption><thead className="bg-gray-50 text-gray-500"><tr>{["Nome", "E-mail", "Permissão", "Status", "Ações"].map(title => <th scope="col" className="px-3 py-2 font-medium" key={title}>{title}</th>)}</tr></thead>
      <tbody>{users.map(user => {
        const protectedAdmin = lastAdmin && user.active && user.role === "ADMIN";
        return <tr className="border-t border-gray-100" key={user.id}>
          <td className="px-3 py-2">{user.name || "Nome não informado"}{user.id === currentId ? " (você)" : ""}</td><td className="px-3 py-2">{user.email || "—"}</td>
          <td className="px-3 py-2">{user.role}</td>
          <td className="px-3 py-2">{user.active ? "Ativo" : "Inativo"}</td>
          <td className="px-3 py-2"><div className="flex flex-wrap gap-x-3 gap-y-1"><button disabled={busy} className="text-purple-700 underline-offset-4 hover:underline disabled:opacity-40" onClick={() => { setEditError(""); setEditing(user); }}>Editar</button><button disabled={busy || protectedAdmin} className="text-purple-700 disabled:opacity-40"
            onClick={() => mutate(`/api/users/${user.id}`, "PATCH", { active: !user.active })}>{user.active ? "Desativar" : "Ativar"}</button>
            <button disabled={busy} className="text-purple-700 disabled:opacity-40" onClick={() => mutate(`/api/users/${user.id}/reset-password`, "POST")}>Recuperar senha</button></div>
            {protectedAdmin && <span className="mt-1 block text-[11px] text-gray-400">Último ADMIN ativo</span>}</td>
        </tr>;
      })}</tbody></table>
      {loading && <p className="px-3 py-3 text-gray-500">Carregando...</p>}
      {!loading && users.length === 0 && <p className="px-3 py-3 text-gray-500">Nenhum usuário disponível.</p>}
    </div>
    {editing && <EditUserDialog key={editing.id} user={editing} busy={busy} error={editError}
      protectedAdmin={lastAdmin && editing.active && editing.role === "ADMIN"}
      onClose={() => setEditing(null)}
      onSave={changes => mutate(`/api/users/${editing.id}`, "PATCH", changes, () => setEditing(null), true)} />}
  </div>;
}

function EditUserDialog({ user, protectedAdmin, busy, error, onClose, onSave }: {
  user: User; protectedAdmin: boolean; busy: boolean; error: string;
  onClose: () => void; onSave: (changes: UserEdit) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await onSave({ name: String(values.get("name")),
      role: protectedAdmin ? user.role : values.get("role") as User["role"],
      active: protectedAdmin ? user.active : values.get("active") === "true" });
  }
  const inputClass = "mt-1 h-8 w-full rounded-md border border-gray-200 px-2 text-xs focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-100 disabled:bg-gray-50 disabled:text-gray-500";
  return <dialog ref={dialog} aria-labelledby="edit-user-title" aria-describedby="edit-user-description"
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-700 shadow-lg backdrop:bg-black/20">
    <div className="mb-3">
      <h2 id="edit-user-title" className="text-sm font-semibold text-gray-900">Editar usuário</h2>
      <p id="edit-user-description" className="mt-1 text-gray-500">Atualize os dados e o acesso ao sistema.</p>
    </div>
    <form onSubmit={submit} className="space-y-3">
      <fieldset disabled={busy} className="space-y-3">
        <label className="block">Nome<input name="name" defaultValue={user.name || ""} required minLength={2} maxLength={150} className={inputClass} autoComplete="off" /></label>
        <label className="block">E-mail<input value={user.email || ""} readOnly className={`${inputClass} text-gray-500`} aria-describedby="email-readonly-note" />
          <span id="email-readonly-note" className="mt-1 block text-[11px] text-gray-400">Somente consulta. Vinculado ao Supabase Auth.</span></label>
        <div className="grid grid-cols-2 gap-3">
          <label>Permissão<select name="role" defaultValue={user.role} disabled={protectedAdmin} className={inputClass}><option>ADMIN</option><option>USER</option></select></label>
          <label>Status<select name="active" defaultValue={String(user.active)} disabled={protectedAdmin} className={inputClass}><option value="true">Ativo</option><option value="false">Inativo</option></select></label>
        </div>
        {protectedAdmin && <p className="text-[11px] text-gray-500">O último ADMIN ativo deve manter a permissão e o acesso.</p>}
      </fieldset>
      {error && <p role="alert" className="rounded bg-red-50 px-2 py-1.5 text-red-700">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
        <button type="button" disabled={busy} onClick={onClose} className="rounded-md border border-gray-200 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
        <button type="submit" disabled={busy} className="rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-purple-700 hover:bg-purple-100 disabled:opacity-50">{busy ? "Salvando..." : "Salvar alterações"}</button>
      </div>
    </form>
  </dialog>;
}
