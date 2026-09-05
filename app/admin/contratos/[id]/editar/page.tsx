"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Client = {
  id: string;
  name: string;
  active: boolean;
};

type Project = {
  id: string;
  name: string;
  client: {
    id: string;
  } | null;
};

export default function EditarContratoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    title: "",
    contractNumber: "",
    clientId: "",
    projectId: "",
    value: "",
    startDate: "",
    endDate: "",
    signatureDate: "",
    status: "DRAFT",
    description: "",
    notes: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [
          contractResponse,
          clientsResponse,
          projectsResponse,
        ] = await Promise.all([
          fetch(`/api/contracts/${id}`),
          fetch("/api/clients"),
          fetch("/api/projects"),
        ]);

        const contractData = await contractResponse.json();
        const clientsData = await clientsResponse.json();
        const projectsData = await projectsResponse.json();

        if (!contractResponse.ok || !contractData.ok) {
          setMessage(
            contractData.message ||
              "Erro ao carregar contrato."
          );
          return;
        }

        const contract = contractData.contract;

        setForm({
          title: contract.title || "",
          contractNumber: contract.contractNumber || "",
          clientId: contract.client?.id || "",
          projectId: contract.project?.id || "",
          value: contract.value || "",
          startDate: contract.startDate
            ? contract.startDate.slice(0, 10)
            : "",
          endDate: contract.endDate
            ? contract.endDate.slice(0, 10)
            : "",
          signatureDate: contract.signatureDate
            ? contract.signatureDate.slice(0, 10)
            : "",
          status: contract.status || "DRAFT",
          description: contract.description || "",
          notes: contract.notes || "",
        });

        if (clientsData.ok) {
          setClients(clientsData.clients);
        }

        if (projectsData.ok) {
          setProjects(projectsData.projects);
        }
      } catch (error) {
        console.error("Erro ao carregar contrato:", error);
        setMessage("Erro ao carregar contrato.");
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

  const filteredProjects = form.clientId
    ? projects.filter(
        (project) =>
          !project.client ||
          project.client.id === form.clientId
      )
    : projects;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(`/api/contracts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(
          data.message || "Erro ao atualizar contrato."
        );
        return;
      }

      router.push(`/admin/contratos/${id}`);
    } catch (error) {
      console.error("Erro ao atualizar contrato:", error);
      setMessage("Erro ao atualizar contrato.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-600">
        Carregando contrato...
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Editar contrato
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Atualize os dados do contrato.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Título *
              </label>

              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  updateField("title", e.target.value)
                }
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Número
              </label>

              <input
                type="text"
                value={form.contractNumber}
                onChange={(e) =>
                  updateField(
                    "contractNumber",
                    e.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
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
                <option value="DRAFT">Rascunho</option>
                <option value="PENDING_SIGNATURE">
                  Aguardando assinatura
                </option>
                <option value="ACTIVE">Ativo</option>
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
                Cliente *
              </label>

              <select
                value={form.clientId}
                onChange={(e) => {
                  updateField("clientId", e.target.value);
                  updateField("projectId", "");
                }}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">
                  Selecione um cliente
                </option>

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
                Projeto
              </label>

              <select
                value={form.projectId}
                onChange={(e) =>
                  updateField("projectId", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Sem projeto</option>

                {filteredProjects.map((project) => (
                  <option
                    key={project.id}
                    value={project.id}
                  >
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Valor
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(e) =>
                  updateField("value", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Data da assinatura
              </label>

              <input
                type="date"
                value={form.signatureDate}
                onChange={(e) =>
                  updateField(
                    "signatureDate",
                    e.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
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

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Descrição
              </label>

              <textarea
                value={form.description}
                onChange={(e) =>
                  updateField(
                    "description",
                    e.target.value
                  )
                }
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Observações
              </label>

              <textarea
                value={form.notes}
                onChange={(e) =>
                  updateField("notes", e.target.value)
                }
                rows={4}
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
              router.push(`/admin/contratos/${id}`)
            }
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[var(--admin-primary)] px-4 py-2 text-sm font-medium text-[var(--admin-on-primary)] hover:bg-[var(--admin-primary)] disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}