"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Member = {
  id: string;
  fullName: string;
};

type Client = {
  id: string;
  name: string;
};

type Project = {
  id: string;
  name: string;
};

type Contract = {
  id: string;
  title: string;
};

export default function EditarDocumentoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [members, setMembers] = useState<Member[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  const [imported, setImported] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    title: "",
    documentDate: "",
    organizationDocument: false,
    type: "OTHER",
    status: "DRAFT",
    memberId: "",
    clientId: "",
    projectId: "",
    contractId: "",
    description: "",
    fileUrl: "",
    issueDate: "",
    signatureDate: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [
          documentResponse,
          membersResponse,
          clientsResponse,
          projectsResponse,
          contractsResponse,
        ] = await Promise.all([
          fetch(`/api/documents/${id}`),
          fetch("/api/members"),
          fetch("/api/clients"),
          fetch("/api/projects"),
          fetch("/api/contracts"),
        ]);

        const documentData = await documentResponse.json();
        const membersData = await membersResponse.json();
        const clientsData = await clientsResponse.json();
        const projectsData = await projectsResponse.json();
        const contractsData = await contractsResponse.json();

        if (!documentResponse.ok || !documentData.ok) {
          setMessage(
            documentData.message ||
              "Erro ao carregar documento."
          );
          return;
        }

        const document = documentData.document;
        setImported(document.origin === "IMPORTED");

        setForm({
          title: document.title || "",
          documentDate: document.documentDate?.slice(0, 10) || "",
          organizationDocument: document.organizationDocument || false,
          type: document.type || "OTHER",
          status: document.status || "DRAFT",
          memberId: document.member?.id || "",
          clientId: document.client?.id || "",
          projectId: document.project?.id || "",
          contractId: document.contract?.id || "",
          description: document.description || "",
          fileUrl: document.fileUrl || "",
          issueDate: document.issueDate
            ? document.issueDate.slice(0, 10)
            : "",
          signatureDate: document.signatureDate
            ? document.signatureDate.slice(0, 10)
            : "",
        });

        if (membersData.ok) {
          setMembers(membersData.members);
        }

        if (clientsData.ok) {
          setClients(clientsData.clients);
        }

        if (projectsData.ok) {
          setProjects(projectsData.projects);
        }

        if (contractsData.ok) {
          setContracts(contractsData.contracts);
        }
      } catch (error) {
        console.error("Erro ao carregar documento:", error);
        setMessage("Erro ao carregar documento.");
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

      const response = await fetch(`/api/documents/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...form, fileUrl: undefined }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(
          data.message || "Erro ao atualizar documento."
        );
        return;
      }

      router.push(`/admin/documentos/${id}`);
    } catch (error) {
      console.error("Erro ao atualizar documento:", error);
      setMessage("Erro ao atualizar documento.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-600">
        Carregando documento...
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Editar documento
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Atualize os dados e vínculos do documento.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {imported && <div className="grid gap-4 rounded-lg border bg-white p-5 md:grid-cols-2">
          <label className="text-sm">Data real do documento<input type="date" required value={form.documentDate} onChange={(e) => updateField("documentDate", e.target.value)} className="mt-1 block w-full rounded-md border p-2" /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.organizationDocument} onChange={(e) => setForm((current) => ({ ...current, organizationDocument: e.target.checked }))} />Documento institucional da organização</label>
        </div>}

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
                Tipo *
              </label>

              <select
                value={form.type}
                onChange={(e) =>
                  updateField("type", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="VOLUNTEER_TERM">
                  Termo de voluntariado
                </option>
                <option value="TERMINATION_TERM">
                  Termo de desligamento
                </option>
                <option value="CERTIFICATE">
                  Certificado
                </option>
                <option value="DECLARATION">
                  Declaração
                </option>
                <option value="CONTRACT">
                  Contrato
                </option>
                <option value="PROJECT">
                  Projeto
                </option>
                <option value="CLIENT">
                  Cliente
                </option>
                <option value="OTHER">
                  Outro
                </option>
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
                <option value="DRAFT">
                  Rascunho
                </option>
                <option value="PENDING">
                  Pendente
                </option>
                <option value="SIGNED">
                  Assinado
                </option>
                <option value="ISSUED">
                  Emitido
                </option>
                <option value="ARCHIVED">
                  Arquivado
                </option>
                <option value="CANCELED">
                  Cancelado
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Membro
              </label>

              <select
                value={form.memberId}
                onChange={(e) =>
                  updateField("memberId", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Sem membro</option>

                {members.map((member) => (
                  <option
                    key={member.id}
                    value={member.id}
                  >
                    {member.fullName}
                  </option>
                ))}
              </select>
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
                  <option
                    key={client.id}
                    value={client.id}
                  >
                    {client.name}
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

                {projects.map((project) => (
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
                Contrato
              </label>

              <select
                value={form.contractId}
                onChange={(e) =>
                  updateField("contractId", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Sem contrato</option>

                {contracts.map((contract) => (
                  <option
                    key={contract.id}
                    value={contract.id}
                  >
                    {contract.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Link do arquivo
              </label>

              <input
                type="text"
                value={form.fileUrl}
                readOnly
                placeholder="Nenhum arquivo armazenado"
                className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Data de emissão
              </label>

              <input
                type="date"
                value={form.issueDate}
                onChange={(e) =>
                  updateField("issueDate", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Data de assinatura
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
              router.push(`/admin/documentos/${id}`)
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
              : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
