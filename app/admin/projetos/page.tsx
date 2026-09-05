"use client";

import { AdminOnly } from "@/components/AccessProvider";
import Link from "next/link";
import { useEffect, useState } from "react";

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

function formatCurrency(value: string | null) {
  if (!value) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export default function ProjetosPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [organization, setOrganization] =
    useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [projectsResponse, organizationResponse] =
          await Promise.all([
            fetch("/api/projects"),
            fetch("/api/organization"),
          ]);

        const projectsData = await projectsResponse.json();
        const organizationData =
          await organizationResponse.json();

        if (projectsData.ok) {
          setProjects(projectsData.projects);
        }

        if (organizationData.ok) {
          setOrganization(organizationData.organization);
        }
      } catch (error) {
        console.error("Erro ao carregar projetos:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredProjects = projects.filter((project) => {
    const term = search.toLowerCase();

    return (
      project.name.toLowerCase().includes(term) ||
      project.description?.toLowerCase().includes(term) ||
      project.client?.name.toLowerCase().includes(term) ||
      project.client?.companyName?.toLowerCase().includes(term)
    );
  });

  const primaryColor =
    organization?.primaryColor || "#6D28D9";

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Projetos
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Gerencie os projetos da organização.
          </p>
        </div>

        <AdminOnly><Link
          href="/admin/projetos/novo"
          style={{ backgroundColor: primaryColor }}
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
        >
          + Novo projeto
        </Link></AdminOnly>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por projeto ou cliente..."
          className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="p-6 text-sm text-gray-600">
            Carregando projetos...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Nenhum projeto encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 font-medium text-gray-600">
                    Projeto
                  </th>

                  <th className="px-5 py-3 font-medium text-gray-600">
                    Cliente
                  </th>

                  <th className="px-5 py-3 font-medium text-gray-600">
                    Orçamento
                  </th>

                  <th className="px-5 py-3 font-medium text-gray-600">
                    Status
                  </th>

                  <th className="px-5 py-3 font-medium text-gray-600">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredProjects.map((project) => (
                  <tr key={project.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">
                        {project.name}
                      </p>

                      <p className="mt-1 max-w-xs truncate text-xs text-gray-500">
                        {project.description || "Sem descrição"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {project.client?.name || "Sem cliente"}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {formatCurrency(project.budget)}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        {statusLabel(project.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/projetos/${project.id}`}
                        style={{ color: primaryColor }}
                        className="font-medium"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}