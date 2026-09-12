"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showCreateOrganization, setShowCreateOrganization] = useState(false);
  useEffect(() => { fetch("/api/setup/status").then(async response => { const data = await response.json(); if (response.ok) setShowCreateOrganization(data.showCreateOrganization === true); }).catch(() => undefined); }, []);

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      const next = new URLSearchParams(window.location.search).get("next");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          next: next === "/inscricao" ? next : undefined,
        }),
      });

      if (!response.ok) {
        setMessage(
          "E-mail ou senha inválidos."
        );

        return;
      }

      const data = await response.json();
      router.push(data.destination);
      router.refresh();
    } catch (error) {
      console.error(
        "Erro ao fazer login:",
        error
      );

      setMessage(
        "Não foi possível entrar no sistema."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Entrar
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Acesse o painel da sua organização.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              E-mail ou usuário
            </label>

            <input
              type="text"
              value={identifier}
              onChange={(event) =>
                setIdentifier(
                  event.target.value
                )
              }
              required
              autoComplete="username"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Senha
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {message && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-purple-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-60"
          >
            {loading
              ? "Entrando..."
              : "Entrar"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">Quer se inscrever? <Link href="/cadastro" className="font-medium text-purple-700">Criar conta</Link></p>
        {showCreateOrganization && <p className="mt-2 text-center text-sm text-gray-600"><Link href="/setup" className="font-medium text-purple-700">Criar organização</Link></p>}
      </div>
    </main>
  );
}
