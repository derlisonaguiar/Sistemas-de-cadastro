"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    emailConfirmation: "",
    password: "",
    passwordConfirmation: "",
    entryCode: "",
  });
  const [codeValidated, setCodeValidated] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function validateCode() {
    setLoading(true); setMessage("");
    try { const response = await fetch("/api/auth/entry-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entryCode: form.entryCode }) }); const data = await response.json(); if (!response.ok) return setMessage(data.message || "Código inválido."); setCodeValidated(true); } catch { setMessage("Não foi possível validar o código."); } finally { setLoading(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (form.email.trim().toLowerCase() !== form.emailConfirmation.trim().toLowerCase()) {
      setMessage("Os e-mails não coincidem.");
      return;
    }
    if (form.password !== form.passwordConfirmation) {
      setMessage("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) {
        const issue = data.issues && Object.values(data.issues).flat().find((value): value is string => typeof value === "string");
        return setMessage(issue || data.message || "Não foi possível criar a conta.");
      }
      if (data.requiresConfirmation) return setMessage(data.message);
      router.replace("/inscricao"); router.refresh();
    } catch { setMessage("Não foi possível criar a conta."); } finally { setLoading(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4"><div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
    <h1 className="text-2xl font-semibold text-gray-900">Criar conta</h1><p className="mt-1 text-sm text-gray-600">Crie seu acesso para enviar a inscrição de membro.</p>
    <form onSubmit={submit} className="mt-6 space-y-4">
      {!codeValidated ? <><label className="block text-sm font-medium text-gray-700">Código de ingresso<input required minLength={6} maxLength={6} value={form.entryCode} onChange={e => setForm(current => ({ ...current, entryCode: e.target.value.toUpperCase() }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label><button type="button" onClick={validateCode} disabled={loading} className="w-full rounded-md bg-purple-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">{loading ? "Validando..." : "Validar código"}</button></> : <>
        <label className="block text-sm font-medium text-gray-700">Nome completo<input type="text" required autoComplete="name" value={form.name} onChange={e => setForm(current => ({ ...current, name: e.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
        <label className="block text-sm font-medium text-gray-700">Usuário<input type="text" required minLength={3} maxLength={64} autoComplete="username" value={form.username} onChange={e => setForm(current => ({ ...current, username: e.target.value.toLowerCase() }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /><span className="mt-1 block text-xs font-normal text-gray-500">Use letras minúsculas, números, ponto, hífen ou sublinhado.</span></label>
        <label className="block text-sm font-medium text-gray-700">E-mail<input type="email" required autoComplete="email" value={form.email} onChange={e => setForm(current => ({ ...current, email: e.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
        <label className="block text-sm font-medium text-gray-700">Confirmar e-mail<input type="email" required autoComplete="email" value={form.emailConfirmation} onChange={e => setForm(current => ({ ...current, emailConfirmation: e.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
        <label className="block text-sm font-medium text-gray-700">Senha<input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={e => setForm(current => ({ ...current, password: e.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /><span className="mt-1 block text-xs font-normal text-gray-500">Mínimo de 8 caracteres.</span></label>
        <label className="block text-sm font-medium text-gray-700">Confirmar senha<input type="password" required minLength={8} autoComplete="new-password" value={form.passwordConfirmation} onChange={e => setForm(current => ({ ...current, passwordConfirmation: e.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
        <button disabled={loading} className="w-full rounded-md bg-purple-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">{loading ? "Criando..." : "Criar conta"}</button>
      </>}
      {message && <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div>}
    </form><p className="mt-4 text-center text-sm text-gray-600">Já tem conta? <Link href="/login?next=/inscricao" className="font-medium text-purple-700">Entrar</Link></p>
  </div></main>;
}
