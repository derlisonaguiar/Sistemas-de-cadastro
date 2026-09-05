"use client";

import { FormEvent, useEffect, useState } from "react";

type PositionRole =
  | "PRESIDENT"
  | "VICE_PRESIDENT"
  | "DIRECTOR"
  | "MANAGER"
  | "MEMBER"
  | "OTHER";

type Position = {
  id: string;
  name: string;
  description: string | null;
  role: PositionRole;
  directorateId: string | null;
  active: boolean;
};

const roleLabels: Record<PositionRole, string> = {
  PRESIDENT: "Presidência",
  VICE_PRESIDENT: "Vice-Presidência",
  DIRECTOR: "Diretoria",
  MANAGER: "Gerência",
  MEMBER: "Membro",
  OTHER: "Outro",
};

async function fetchPositionOptions() {
  const [response, directoratesResponse] = await Promise.all([fetch("/api/positions"), fetch("/api/directorates")]);
  const [data, directoratesData] = await Promise.all([response.json(), directoratesResponse.json()]);
  if (!response.ok || !data.ok || !directoratesResponse.ok || !directoratesData.ok) {
    throw new Error("Erro ao carregar cargos e diretorias.");
  }
  return { positions: data.positions as Position[], directorates: directoratesData.directorates as Array<{ id: string; name: string }> };
}

export default function CargosPage() {
  const [positions, setPositions] = useState<Position[]>([]);

  const [directorates, setDirectorates] = useState<Array<{ id: string; name: string }>>([]);
  const [directorateId, setDirectorateId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [role, setRole] = useState<PositionRole>("OTHER");

  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  async function loadPositions() {
    try {
      const data = await fetchPositionOptions();
      setDirectorates(data.directorates);
      setPositions(data.positions);
    } catch (error) {
      console.error("Erro ao carregar cargos:", error);
      setMessage("Erro ao carregar cargos e diretorias.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetchPositionOptions().then((data) => {
      if (cancelled) return;
      setDirectorates(data.directorates);
      setPositions(data.positions);
    }).catch(() => {
      if (!cancelled) setMessage("Erro ao carregar cargos e diretorias.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  function resetForm() {
    setName("");
    setDescription("");
    setRole("OTHER");
    setDirectorateId("");
    setEditingId(null);
    setMessage("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      const url = editingId
        ? `/api/positions/${editingId}`
        : "/api/positions";

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          role,
          directorateId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(data.message || "Erro ao salvar cargo.");
        return;
      }

      setMessage(
        editingId
          ? "Cargo atualizado com sucesso."
          : "Cargo cadastrado com sucesso."
      );

      setName("");
      setDescription("");
      setRole("OTHER");
      setDirectorateId("");
      setEditingId(null);

      await loadPositions();
    } catch (error) {
      console.error("Erro ao salvar cargo:", error);
      setMessage("Erro ao salvar cargo.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(position: Position) {
    setEditingId(position.id);
    setName(position.name);
    setDescription(position.description ?? "");
    setRole(position.role ?? "OTHER");
    setDirectorateId(position.directorateId || "");
    setMessage("");
  }

  async function handleToggle(position: Position) {
    try {
      setMessage("");

      const response = await fetch(
        `/api/positions/${position.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: position.name,
            description: position.description,
            role: position.role,
            directorateId: position.directorateId,
            active: !position.active,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(data.message || "Erro ao alterar cargo.");
        return;
      }

      await loadPositions();
    } catch (error) {
      console.error("Erro ao alterar cargo:", error);
      setMessage("Erro ao alterar cargo.");
    }
  }

  async function handleDelete(position: Position) {
    const confirmed = window.confirm(
      `Deseja realmente excluir o cargo "${position.name}"?`
    );

    if (!confirmed) return;

    try {
      setMessage("");

      const response = await fetch(
        `/api/positions/${position.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(data.message || "Erro ao excluir cargo.");
        return;
      }

      setMessage("Cargo excluído com sucesso.");

      if (editingId === position.id) {
        resetForm();
      }

      await loadPositions();
    } catch (error) {
      console.error("Erro ao excluir cargo:", error);
      setMessage("Erro ao excluir cargo.");
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Cargos
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Cadastre e gerencie os cargos da organização.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="h-fit rounded-lg border border-gray-200 bg-white"
        >
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              {editingId ? "Editar cargo" : "Novo cargo"}
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
                placeholder="Ex.: Diretor de Projetos"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tipo do cargo *
              </label>

              <select
                value={role}
                onChange={(event) =>
                  setRole(event.target.value as PositionRole)
                }
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="PRESIDENT">
                  Presidência
                </option>

                <option value="VICE_PRESIDENT">
                  Vice-Presidência
                </option>

                <option value="DIRECTOR">
                  Diretoria
                </option>

                <option value="MANAGER">
                  Gerência
                </option>

                <option value="MEMBER">
                  Membro
                </option>

                <option value="OTHER">
                  Outro
                </option>
              </select>

              <p className="mt-1 text-xs text-gray-500">
                Essa classificação é usada pelo sistema para identificar
                presidência, diretoria e outras funções.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Descrição
              </label>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="position-directorate" className="mb-1 block text-sm font-medium text-gray-700">Diretoria do cargo</label>
              <select id="position-directorate" value={directorateId} onChange={(event) => setDirectorateId(event.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Sem vínculo específico</option>
                {directorates.map((directorate) => <option key={directorate.id} value={directorate.id}>{directorate.name}</option>)}
              </select>
              <p className="mt-1 text-xs text-gray-500">Quando vinculado, o cargo só pode ser atribuído a membros desta diretoria.</p>
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
                  : "Cadastrar cargo"}
              </button>
            </div>
          </div>
        </form>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Cargos cadastrados
            </h2>
          </div>

          {loading ? (
            <div className="p-5 text-sm text-gray-600">
              Carregando...
            </div>
          ) : positions.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Nenhum cargo cadastrado.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {positions.map((position) => (
                <div
                  key={position.id}
                  className="flex items-start justify-between gap-4 px-5 py-4"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {position.name}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {position.description || "Sem descrição"}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-block rounded-full bg-[var(--admin-soft)] px-2 py-1 text-xs font-medium text-[var(--admin-ink)]">
                        {roleLabels[position.role] ?? "Outro"}{position.directorateId ? ` · ${directorates.find((item) => item.id === position.directorateId)?.name || "Diretoria"}` : ""}
                      </span>

                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                          position.active
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {position.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(position)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggle(position)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {position.active ? "Desativar" : "Ativar"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(position)}
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
