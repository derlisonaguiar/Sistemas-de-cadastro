"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Template = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  originalFileName: string | null;
  originalMimeType: string | null;
  active: boolean;
};

type Organization = {
  primaryColor: string;
};

function typeLabel(type: string) {
  switch (type) {
    case "VOLUNTEER_TERM":
      return "Termo de voluntariado";

    case "TERMINATION_TERM":
      return "Termo de desligamento";

    case "CERTIFICATE":
      return "Certificado";

    case "DECLARATION":
      return "Declaração";

    case "CONTRACT":
      return "Contrato";

    case "PROJECT":
      return "Projeto";

    case "CLIENT":
      return "Cliente";

    case "OTHER":
      return "Outro";

    default:
      return type;
  }
}

export default function ModelosDocumentosPage() {
  const [templates, setTemplates] =
    useState<Template[]>([]);

  const [organization, setOrganization] =
    useState<Organization | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [
          templatesResponse,
          organizationResponse,
        ] = await Promise.all([
          fetch("/api/document-templates"),
          fetch("/api/organization"),
        ]);

        const templatesData =
          await templatesResponse.json();

        const organizationData =
          await organizationResponse.json();

        if (templatesData.ok) {
          setTemplates(
            templatesData.templates || []
          );
        }

        if (organizationData.ok) {
          setOrganization(
            organizationData.organization
          );
        }
      } catch (error) {
        console.error(
          "Erro ao carregar modelos:",
          error
        );

        setMessage(
          "Erro ao carregar modelos."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleDelete(
    template: Template
  ) {
    const confirmed =
      window.confirm(
        `Tem certeza que deseja excluir o modelo "${template.name}"?\n\nO arquivo original do modelo também será removido. Os documentos já gerados permanecerão no histórico.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(template.id);
      setMessage("");

      const response =
        await fetch(
          `/api/document-templates/${template.id}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok || !data.ok) {
        setMessage(
          data.message ||
            "Erro ao excluir modelo."
        );

        return;
      }

      setTemplates((current) =>
        current.filter(
          (item) =>
            item.id !== template.id
        )
      );

      setMessage(
        "Modelo excluído com sucesso."
      );
    } catch (error) {
      console.error(
        "Erro ao excluir modelo:",
        error
      );

      setMessage(
        "Erro ao excluir modelo."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const primaryColor =
    organization?.primaryColor ||
    "#6D28D9";

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Modelos de documentos
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Envie e gerencie os modelos usados para gerar documentos.
          </p>
        </div>

        <div className="flex gap-2">
        <Link href="/admin/documentos/modelos/certificados" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">Certificados visuais</Link>
        <Link
          href="/admin/documentos/modelos/novo"
          style={{
            backgroundColor:
              primaryColor,
          }}
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
        >
          + Enviar modelo
        </Link>
        </div>
      </div>

      {message && (
        <div
          className={`mb-5 rounded-md border px-4 py-3 text-sm ${
            message.includes(
              "sucesso"
            )
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="p-6 text-sm text-gray-600">
            Carregando modelos...
          </div>
        ) : templates.length === 0 ? (
          <div className="p-10 text-center">
            <h2 className="font-medium text-gray-900">
              Nenhum modelo cadastrado
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Envie um arquivo DOCX para criar seu primeiro modelo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 font-medium text-gray-600">
                    Modelo
                  </th>

                  <th className="px-5 py-3 font-medium text-gray-600">
                    Tipo
                  </th>

                  <th className="px-5 py-3 font-medium text-gray-600">
                    Arquivo original
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
                {templates.map(
                  (template) => (
                    <tr
                      key={template.id}
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {template.name}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {template.description ||
                            "Sem descrição"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {typeLabel(
                          template.type
                        )}
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {template.originalFileName ||
                          "Criado manualmente"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${
                            template.active
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {template.active
                            ? "Ativo"
                            : "Inativo"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-4">
                          <Link
                            href={`/admin/documentos/modelos/${template.id}`}
                            style={{
                              color:
                                primaryColor,
                            }}
                            className="font-medium"
                          >
                            Revisar
                          </Link>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                template
                              )
                            }
                            disabled={
                              deletingId ===
                              template.id
                            }
                            className="font-medium text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId ===
                            template.id
                              ? "Excluindo..."
                              : "Excluir"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
