"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Client = {
  id: string;
  name: string;
  companyName: string | null;
  active: boolean;
};

export default function EditarProjetoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    clientId: "",
    startDate: "",
    endDate: "",
    status: "PLANNING",
    budget: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [projectResponse, clientsResponse] =
          await Promise.all([
            fetch(`/api/projects/${id}`),
            fetch("/api/clients"),
          ]);

        const projectData = await projectResponse.json();
        const clientsData = await clientsResponse.json();

        if (!projectResponse.ok || !projectData.ok) {
          setMessage(
            projectData.message || "Erro ao carregar projeto."
          );
          return;
        }

        const project = projectData.project;

        setForm({
          name: project.name || "",
          description: project.description || "",
          clientId: project.client?.id || "",
          startDate: project.startDate
            ? project.startDate.slice(0, 10)
            : "",
          endDate: project.endDate
            ? project.endDate.slice(0, 10)
            : "",
          status: project.status || "PLANNING",
          budget: project.budget || "",
        });

        if (clientsData.ok) {
          setClients(clientsData.clients);
        }
      } catch (error) {
        console.error("Erro ao carregar projeto:", error);
        setMessage("Erro ao carregar projeto.");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

  function updateField(field: string, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(data.message || "Erro ao atualizar projeto.");
        return;
      }

      router.push(`/admin/projetos/${id}`);
    } catch (error) {
      console.error("Erro ao atualizar projeto:", error);
      setMessage("Erro ao atualizar projeto.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-600">
        Carregando projeto...
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Editar projeto
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Atualize as informações do projeto.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Dados do projeto
            </h2>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nome do projeto *
              </label>

              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  updateField("name", e.target.value)
                }
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Cliente
              </label>

              <select
                value={form.clientId}
                onChange={(e) =>
                  updateField("clientId", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Sem cliente</option>

                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                    {!client.active ? " (inativo)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Status
              </label>

              <select
                value={form.status}
                onChange={(e) =>
                  updateField("status", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="PLANNING">
                  Planejamento
                </option>
                <option value="ACTIVE">Ativo</option>
                <option value="PAUSED">Pausado</option>
                <option value="COMPLETED">
                  Concluído
                </option>
                <option value="CANCELED">
                  Cancelado
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Data de início
              </label>

              <input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  updateField("startDate", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Data de término
              </label>

              <input
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  updateField("endDate", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Orçamento
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={(e) =>
                  updateField("budget", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Descrição
              </label>

              <textarea
                value={form.description}
                onChange={(e) =>
                  updateField("description", e.target.value)
                }
                rows={5}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(`/admin/projetos/${id}`)
            }
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}