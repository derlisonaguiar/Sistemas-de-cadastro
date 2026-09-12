"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) return setMessage(data.message || "Não foi possível criar a conta.");
      if (data.requiresConfirmation) return setMessage(data.message);
      router.replace("/inscricao"); router.refresh();
    } catch { setMessage("Não foi possível criar a conta."); } finally { setLoading(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4"><div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
    <h1 className="text-2xl font-semibold text-gray-900">Criar conta</h1><p className="mt-1 text-sm text-gray-600">Crie seu acesso para enviar a inscrição de membro.</p>
    <form onSubmit={submit} className="mt-6 space-y-4">
      {[{ key: "name", label: "Nome completo", type: "text" }, { key: "email", label: "E-mail", type: "email" }, { key: "password", label: "Senha (mínimo de 8 caracteres)", type: "password" }].map(({key,label,type}) => <label key={key} className="block text-sm font-medium text-gray-700">{label}<input type={type} required minLength={key === "password" ? 8 : undefined} value={form[key as keyof typeof form]} onChange={e => setForm(current => ({ ...current, [key]: e.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>)}
      {message && <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{message}</div>}
      <button disabled={loading} className="w-full rounded-md bg-purple-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">{loading ? "Criando..." : "Criar conta"}</button>
    </form><p className="mt-4 text-center text-sm text-gray-600">Já tem conta? <Link href="/login?next=/inscricao" className="font-medium text-purple-700">Entrar</Link></p>
  </div></main>;
}
