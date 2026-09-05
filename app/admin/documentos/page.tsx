"use client";

import Link from "next/link";
import { documentEntityLabels, documentStatusLabels, documentTypeLabels, type DocumentEntityKey } from "@/lib/document-labels";
import { useEffect, useState } from "react";

type Document = {
  id: string;
  title: string;
  origin: "GENERATED" | "IMPORTED";
  documentDate: string | null;
  organizationDocument: boolean;
  signedFile: string | null;
  type: string;
  status: string;
  fileUrl: string | null;
  generatedDocxUrl?: string | null;
  issueDate: string | null;

  member: {
    id: string;
    fullName: string;
  } | null;

  client: {
    id: string;
    name: string;
  } | null;

  project: {
    id: string;
    name: string;
  } | null;

  contract: {
    id: string;
    title: string;
  } | null;
};

type Template = {
  id: string;
  name: string;
  description: string | null;
  type: string;
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

function statusLabel(status: string) {
  switch (status) {
    case "DRAFT":
      return "Rascunho";

    case "PENDING":
      return "Pendente";

    case "SIGNED":
      return "Assinado";

    case "ISSUED":
      return "Emitido";

    case "ARCHIVED":
      return "Arquivado";

    case "CANCELED":
      return "Cancelado";

    default:
      return status;
  }
}

function linkedTo(document: Document) {
  return [document.member?.fullName, document.client?.name, document.project?.name, document.contract?.title, document.organizationDocument ? "Organização" : null].filter(Boolean).join(" · ") || "Sem vínculo específico";
}

export default function DocumentosPage() {
  const [filters, setFilters] = useState({ origin: "", type: "", status: "", memberId: "", clientId: "", projectId: "", contractId: "", documentDate: "" });
  function changeFilter(key: keyof typeof filters, value: string) { setFilters((current) => ({ ...current, [key]: value })); }
  function entityOptions(key: DocumentEntityKey) {
    const property = key.slice(0, -2) as "member" | "client" | "project" | "contract";
    return [...new Map(documents.flatMap((document) => {
      const entity = document[property];
      return entity ? [[entity.id, { id: entity.id, label: "fullName" in entity ? entity.fullName : "name" in entity ? entity.name : entity.title }] as const] : [];
    })).values()];
  }
  const [documents, setDocuments] =
    useState<Document[]>([]);

  const [templates, setTemplates] =
    useState<Template[]>([]);

  const [organization, setOrganization] =
    useState<Organization | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [
          documentsResponse,
          templatesResponse,
          organizationResponse,
        ] = await Promise.all([
          fetch("/api/documents"),
          fetch("/api/document-templates"),
          fetch("/api/organization"),
        ]);

        const documentsData =
          await documentsResponse.json();

        const templatesData =
          await templatesResponse.json();

        const organizationData =
          await organizationResponse.json();

        if (documentsData.ok) {
          setDocuments(
            documentsData.documents || []
          );
        }

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
          "Erro ao carregar documentos:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredDocuments =
    documents.filter((document) => {
      if (filters.origin && document.origin !== filters.origin) return false;
      if (filters.type && document.type !== filters.type) return false;
      if (filters.status && document.status !== filters.status) return false;
      if (filters.documentDate && (document.documentDate || document.issueDate)?.slice(0, 10) !== filters.documentDate) return false;
      if (filters.memberId && document.member?.id !== filters.memberId) return false;
      if (filters.clientId && document.client?.id !== filters.clientId) return false;
      if (filters.projectId && document.project?.id !== filters.projectId) return false;
      if (filters.contractId && document.contract?.id !== filters.contractId) return false;
      const term =
        search.toLowerCase();

      return (
        document.title
          .toLowerCase()
          .includes(term) ||
        typeLabel(document.type)
          .toLowerCase()
          .includes(term) ||
        statusLabel(document.status)
          .toLowerCase()
          .includes(term) ||
        linkedTo(document)
          .toLowerCase()
          .includes(term)
      );
    });

  const activeTemplates =
    templates.filter(
      (template) =>
        template.active
    );

  const primaryColor =
    organization?.primaryColor ||
    "#6D28D9";

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Documentos
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Gere documentos a partir de modelos e acompanhe o histórico.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/admin/documentos/importar" className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium">Importar documento</Link>
          <Link
            href="/admin/documentos/modelos"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Gerenciar modelos
          </Link>

          <Link
            href="/admin/documentos/gerar"
            style={{
              backgroundColor:
                primaryColor,
            }}
            className="rounded-md px-4 py-2 text-sm font-medium text-white"
          >
            + Gerar documento
          </Link>
        </div>
      </div>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">
              Modelos disponíveis
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Escolha um modelo para gerar um novo documento.
            </p>
          </div>

          <Link
            href="/admin/documentos/novo"
            style={{
              color:
                primaryColor,
            }}
            className="text-sm font-medium"
          >
            + Enviar modelo
          </Link>
        </div>

        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">
            Carregando modelos...
          </div>
        ) : activeTemplates.length ===
          0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
            <h3 className="font-medium text-gray-900">
              Nenhum modelo disponível
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Envie um modelo DOCX para começar.
            </p>

            <Link
              href="/admin/documentos/novo"
              style={{
                backgroundColor:
                  primaryColor,
              }}
              className="mt-4 inline-block rounded-md px-4 py-2 text-sm font-medium text-white"
            >
              Enviar primeiro modelo
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeTemplates.map(
              (template) => (
                <div
                  key={template.id}
                  className="rounded-lg border border-gray-200 bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {template.name}
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        {typeLabel(
                          template.type
                        )}
                      </p>
                    </div>

                    <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                      Ativo
                    </span>
                  </div>

                  <p className="mt-4 min-h-10 text-sm text-gray-600">
                    {template.description ||
                      "Modelo pronto para geração."}
                  </p>

                  <div className="mt-5">
                    <Link
                      href={`/admin/documentos/gerar?templateId=${template.id}`}
                      style={{
                        color:
                          primaryColor,
                      }}
                      className="text-sm font-medium"
                    >
                      Gerar documento →
                    </Link>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3">
          <h2 className="font-semibold text-gray-900">
            Documentos
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Histórico dos documentos gerados e importados.
          </p>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm">Origem<select value={filters.origin} onChange={(e) => changeFilter("origin", e.target.value)} className="block w-full rounded-md border p-2"><option value="">Todas</option><option value="GENERATED">Gerado</option><option value="IMPORTED">Importado</option></select></label>
          <label className="text-sm">Tipo<select value={filters.type} onChange={(e) => changeFilter("type", e.target.value)} className="block w-full rounded-md border p-2"><option value="">Todos</option>{Object.entries(documentTypeLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-sm">Status<select value={filters.status} onChange={(e) => changeFilter("status", e.target.value)} className="block w-full rounded-md border p-2"><option value="">Todos</option>{Object.entries(documentStatusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {(Object.keys(documentEntityLabels) as DocumentEntityKey[]).map((key) => <label key={key} className="text-sm">{documentEntityLabels[key]}<select value={filters[key]} onChange={(e) => changeFilter(key, e.target.value)} className="block w-full rounded-md border p-2"><option value="">Todos</option>{entityOptions(key).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>)}
          <label className="text-sm">Data do documento<input type="date" value={filters.documentDate} onChange={(e) => changeFilter("documentDate", e.target.value)} className="block w-full rounded-md border p-2" /></label>
        </div>
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Buscar documento, tipo, status ou vínculo..."
            className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          {loading ? (
            <div className="p-6 text-sm text-gray-600">
              Carregando documentos...
            </div>
          ) : filteredDocuments.length ===
            0 ? (
            <div className="p-10 text-center">
              <h3 className="font-medium text-gray-900">
                Nenhum documento encontrado
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Os documentos gerados e importados aparecerão aqui.
              </p>

              {activeTemplates.length >
                0 && (
                <Link
                  href="/admin/documentos/gerar"
                  style={{
                    backgroundColor:
                      primaryColor,
                  }}
                  className="mt-4 inline-block rounded-md px-4 py-2 text-sm font-medium text-white"
                >
                  Gerar primeiro documento
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 font-medium text-gray-600">
                      Documento
                    </th>

                    <th className="px-5 py-3 font-medium text-gray-600">
                      Tipo
                    </th>

                    <th className="px-5 py-3 font-medium text-gray-600">
                      Vinculado a
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
                  {filteredDocuments.map(
                    (document) => (
                      <tr
                        key={document.id}
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900">
                            {document.title}<span className="ml-2 text-xs text-gray-500">{document.origin === "IMPORTED" ? "Importado" : "Gerado"}</span>
                          <span className="mt-1 block text-xs text-gray-500">{(document.documentDate || document.issueDate)?.slice(0, 10).split("-").reverse().join("/") || "Sem data"}</span>
                          </p>

                          {document.generatedDocxUrl && (
                            <p className="mt-1 text-xs text-green-600">
                              DOCX gerado
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 text-gray-700">
                          {typeLabel(
                            document.type
                          )}
                        </td>

                        <td className="px-5 py-4 text-gray-700">
                          {linkedTo(
                            document
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                            {statusLabel(
                              document.status
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-4">
                            <Link
                              href={`/admin/documentos/${document.id}`}
                              style={{
                                color:
                                  primaryColor,
                              }}
                              className="font-medium"
                            >
                              Ver
                            </Link>

                            {document.generatedDocxUrl && (
                              <a
                                href={
                                  document.generatedDocxUrl
                                }
                                className="font-medium text-gray-700"
                              >
                                Baixar DOCX
                              </a>
                            )}
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
      </section>
    </div>
  );
}