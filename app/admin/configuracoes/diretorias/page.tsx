"use client";

import { FormEvent, useEffect, useState } from "react";

type Directorate = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

export default function DiretoriasPage() {
  const [directorates, setDirectorates] = useState<Directorate[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadDirectorates() {
    try {
      const response = await fetch("/api/directorates");
      const data = await response.json();

      if (data.ok) {
        setDirectorates(data.directorates);
      }
    } catch (error) {
      console.error("Erro ao carregar diretorias:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDirectorates();
  }, []);

  function resetForm() {
    setName("");
    setDescription("");
    setEditingId(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      const url = editingId
        ? `/api/directorates/${editingId}`
        : "/api/directorates";

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(data.message || "Erro ao salvar diretoria.");
        return;
      }

      setMessage(
        editingId
          ? "Diretoria atualizada com sucesso."
          : "Diretoria cadastrada com sucesso."
      );

      resetForm();
      await loadDirectorates();
    } catch (error) {
      console.error("Erro ao salvar diretoria:", error);
      setMessage("Erro ao salvar diretoria.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(directorate: Directorate) {
    setEditingId(directorate.id);
    setName(directorate.name);
    setDescription(directorate.description ?? "");
    setMessage("");
  }

  async function handleToggle(directorate: Directorate) {
    try {
      const response = await fetch(
        `/api/directorates/${directorate.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: directorate.name,
            description: directorate.description,
            active: !directorate.active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(data.message || "Erro ao alterar diretoria.");
        return;
      }

      await loadDirectorates();
    } catch (error) {
      console.error("Erro ao alterar diretoria:", error);
      setMessage("Erro ao alterar diretoria.");
    }
  }

  async function handleDelete(directorate: Directorate) {
    const confirmed = window.confirm(
      `Deseja realmente excluir a diretoria "${directorate.name}"?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/directorates/${directorate.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(data.message || "Erro ao excluir diretoria.");
        return;
      }

      setMessage("Diretoria excluída com sucesso.");

      if (editingId === directorate.id) {
        resetForm();
      }

      await loadDirectorates();
    } catch (error) {
      console.error("Erro ao excluir diretoria:", error);
      setMessage("Erro ao excluir diretoria.");
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Diretorias
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Cadastre e gerencie as diretorias da organização.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="h-fit rounded-lg border border-gray-200 bg-white"
        >
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              {editingId ? "Editar diretoria" : "Nova diretoria"}
            </h2>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nome *
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Descrição
              </label>

              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            {message && (
              <p className="text-sm text-gray-700">
                {message}
              </p>
            )}

            <div className="flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-md bg-[var(--admin-primary)] px-4 py-2 text-sm font-medium text-[var(--admin-on-primary)] hover:bg-[var(--admin-primary)] disabled:opacity-60"
              >
                {saving
                  ? "Salvando..."
                  : editingId
                  ? "Salvar alterações"
                  : "Cadastrar diretoria"}
              </button>
            </div>
          </div>
        </form>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Diretorias cadastradas
            </h2>
          </div>

          {loading ? (
            <div className="p-5 text-sm text-gray-600">
              Carregando...
            </div>
          ) : directorates.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Nenhuma diretoria cadastrada.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {directorates.map((directorate) => (
                <div
                  key={directorate.id}
                  className="flex items-start justify-between gap-4 px-5 py-4"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {directorate.name}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {directorate.description || "Sem descrição"}
                    </p>

                    <span
                      className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${
                        directorate.active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {directorate.active ? "Ativa" : "Inativa"}
                    </span>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(directorate)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggle(directorate)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {directorate.active ? "Desativar" : "Ativar"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(directorate)}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}