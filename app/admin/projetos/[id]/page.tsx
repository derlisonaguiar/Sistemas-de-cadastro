"use client";
import EntityDocuments from "@/components/documents/EntityDocuments";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Project = {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  budget: string | null;
  client: {
    id: string;
    name: string;
    companyName: string | null;
  } | null;
};

type Organization = {
  primaryColor: string;
};

function statusLabel(status: string) {
  switch (status) {
    case "PLANNING":
      return "Planejamento";
    case "ACTIVE":
      return "Ativo";
    case "PAUSED":
      return "Pausado";
    case "COMPLETED":
      return "Concluído";
    case "CANCELED":
      return "Cancelado";
    default:
      return status;
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatCurrency(value: string | null) {
  if (!value) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export default function ProjetoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [organization, setOrganization] =
    useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [projectResponse, organizationResponse] =
          await Promise.all([
            fetch(`/api/projects/${id}`),
            fetch("/api/organization"),
          ]);

        const projectData = await projectResponse.json();
        const organizationData =
          await organizationResponse.json();

        if (projectData.ok) {
          setProject(projectData.project);
        } else {
          setMessage(
            projectData.message || "Projeto não encontrado."
          );
        }

        if (organizationData.ok) {
          setOrganization(organizationData.organization);
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

  async function handleDelete() {
    if (!project) return;

    const confirmed = window.confirm(
      `Deseja realmente excluir o projeto "${project.name}"?`
    );

    if (!confirmed) return;

    const response = await fetch(
      `/api/projects/${project.id}`,
      {
        method: "DELETE",
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      setMessage(data.message || "Erro ao excluir projeto.");
      return;
    }

    router.push("/admin/projetos");
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-600">
        Carregando projeto...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Projeto não encontrado
        </h1>

        {message && (
          <p className="mt-2 text-sm text-red-600">
            {message}
          </p>
        )}
      </div>
    );
  }

  const primaryColor =
    organization?.primaryColor || "#6D28D9";

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">
              {project.name}
            </h1>

            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
              {statusLabel(project.status)}
            </span>
          </div>

          <p className="mt-1 text-sm text-gray-600">
            Informações e acompanhamento do projeto.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/admin/projetos/${project.id}/editar`}
            style={{ backgroundColor: primaryColor }}
            className="rounded-md px-4 py-2 text-sm font-medium text-white"
          >
            Editar projeto
          </Link>

          <button
            type="button"
            onClick={handleDelete}
            className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Excluir
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Projeto
            </h2>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Cliente
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {project.client?.name || "Sem cliente"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Orçamento
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatCurrency(project.budget)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Início
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(project.startDate)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Término
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(project.endDate)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Status
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {statusLabel(project.status)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Descrição
            </h2>
          </div>

          <div className="p-5">
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {project.description ||
                "Nenhuma descrição cadastrada."}
            </p>
          </div>
        </section>
      </div>
      <EntityDocuments entityKey="projectId" entityId={project.id} />
    </div>
  );
}