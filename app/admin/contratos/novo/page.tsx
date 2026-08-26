"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Client = {
  id: string;
  name: string;
  companyName: string | null;
  active: boolean;
};

type Project = {
  id: string;
  name: string;
  client: {
    id: string;
    name: string;
  } | null;
};

export default function NovoContratoPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
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
        const [clientsResponse, projectsResponse] =
          await Promise.all([
            fetch("/api/clients"),
            fetch("/api/projects"),
          ]);

        const clientsData = await clientsResponse.json();
        const projectsData = await projectsResponse.json();

        if (clientsData.ok) {
          setClients(
            clientsData.clients.filter(
              (client: Client) => client.active
            )
          );
        }

        if (projectsData.ok) {
          setProjects(projectsData.projects);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      }
    }

    loadData();
  }, []);

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

      const response = await fetch("/api/contracts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(
          data.message || "Erro ao cadastrar contrato."
        );
        return;
      }

      router.push("/admin/contratos");
    } catch (error) {
      console.error("Erro ao cadastrar contrato:", error);
      setMessage("Erro ao cadastrar contrato.");
    } finally {
      setSaving(false);
    }
  }

  const filteredProjects = form.clientId
    ? projects.filter(
        (project) =>
          !project.client ||
          project.client.id === form.clientId
      )
    : projects;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Novo contrato
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Cadastre um contrato vinculado a um cliente e,
          opcionalmente, a um projeto.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Identificação
            </h2>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Título do contrato *
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
                Número do contrato
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
                placeholder="Ex.: 001/2026"
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
                    {client.companyName
                      ? ` - ${client.companyName}`
                      : ""}
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
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Valores e datas
            </h2>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
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
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Informações adicionais
            </h2>
          </div>

          <div className="space-y-4 p-5">
            <div>
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

            <div>
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
              router.push("/admin/contratos")
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
            {saving
              ? "Salvando..."
              : "Cadastrar contrato"}
          </button>
        </div>
      </form>
    </div>
  );
}