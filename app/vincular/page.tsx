"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LinkAccountPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || "Não foi possível usar o convite.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setMessage("Não foi possível usar o convite.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Vincular conta</h1>
        <p className="mt-1 text-sm text-gray-600">
          Entre primeiro com sua conta e informe o convite enviado pelo administrador.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Código do convite
            </label>
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
              autoComplete="off"
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
            {loading ? "Vinculando..." : "Vincular conta"}
          </button>
        </form>
      </div>
    </main>
  );
}
