"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type DocumentItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  generatedDocxUrl: string | null;
  generatedPdfUrl: string | null;
  createdAt: string;
  template: {
    id: string;
    name: string;
    type: string;
  } | null;
};

type Member = {
  id: string;
  fullName: string;
  email: string | null;
  cpf: string | null;
  phone: string | null;

  course: string | null;
  registration: string | null;

  nationality: string | null;
  maritalStatus: string | null;

  rg: string | null;
  rgIssuer: string | null;

  address: string | null;
  addressNumber: string | null;
  neighborhood: string | null;
  cep: string | null;
  city: string | null;
  state: string | null;

  entryDate: string | null;
  exitDate: string | null;

  status: string;

  directorate: {
    id: string;
    name: string;
  } | null;

  position: {
    id: string;
    name: string;
  } | null;
};

type Organization = {
  primaryColor: string;
};

function statusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Ativo";
    case "INACTIVE":
      return "Inativo";
    case "LEAVE":
      return "Afastado";
    case "ALUMNI":
      return "Egresso";
    default:
      return status;
  }
}

function documentStatusLabel(status: string) {
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

function documentTypeLabel(type: string) {
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

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone: "UTC",
    }
  ).format(new Date(date));
}

function formatDateTime(date: string) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(new Date(date));
}

function displayValue(
  value: string | null | undefined
) {
  return value?.trim() || "—";
}

export default function MembroPage() {
  const params = useParams();
  const id = params.id as string;

  const [member, setMember] =
    useState<Member | null>(null);

  const [documents, setDocuments] =
    useState<DocumentItem[]>([]);

  const [
    organization,
    setOrganization,
  ] =
    useState<Organization | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [loadingDocuments, setLoadingDocuments] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState<
      | "dados"
      | "vinculo"
      | "documentos"
      | "projetos"
      | "historico"
    >("dados");

  useEffect(() => {
    async function loadData() {
      try {
        const [
          memberResponse,
          organizationResponse,
        ] = await Promise.all([
          fetch(
            `/api/members/${id}`
          ),
          fetch(
            "/api/organization"
          ),
        ]);

        const memberData =
          await memberResponse.json();

        const organizationData =
          await organizationResponse.json();

        if (memberData.ok) {
          setMember(
            memberData.member
          );
        }

        if (
          organizationData.ok
        ) {
          setOrganization(
            organizationData.organization
          );
        }
      } catch (error) {
        console.error(
          "Erro ao carregar membro:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

  useEffect(() => {
    async function loadDocuments() {
      if (
        activeTab !== "documentos" ||
        !id
      ) {
        return;
      }

      try {
        setLoadingDocuments(true);

        const response =
          await fetch(
            `/api/documents?memberId=${id}`
          );

        const data =
          await response.json();

        if (data.ok) {
          setDocuments(
            data.documents
          );
        }
      } catch (error) {
        console.error(
          "Erro ao carregar documentos:",
          error
        );
      } finally {
        setLoadingDocuments(false);
      }
    }

    loadDocuments();
  }, [activeTab, id]);

  if (loading) {
    return (
      <div className="text-sm text-gray-600">
        Carregando membro...
      </div>
    );
  }

  if (!member) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Membro não encontrado
        </h1>
      </div>
    );
  }

  const primaryColor =
    organization?.primaryColor ||
    "#6D28D9";

  const tabClass = (
    tab:
      | "dados"
      | "vinculo"
      | "documentos"
      | "projetos"
      | "historico"
  ) => {
    const active =
      activeTab === tab;

    return active
      ? "border-b-2 pb-3 font-medium"
      : "pb-3 text-gray-500";
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">
              {member.fullName}
            </h1>

            <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
              {statusLabel(
                member.status
              )}
            </span>
          </div>

          <p className="mt-1 text-sm text-gray-600">
            Perfil e informações do membro.
          </p>
        </div>

        <Link
          href={`/admin/membros/${member.id}/editar`}
          style={{
            backgroundColor:
              primaryColor,
          }}
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
        >
          Editar membro
        </Link>
      </div>

      <div className="mb-6 flex gap-6 overflow-x-auto border-b border-gray-200 text-sm">
        {[
          ["dados", "Dados"],
          ["vinculo", "Vínculo"],
          ["documentos", "Documentos"],
          ["projetos", "Projetos"],
          ["historico", "Histórico"],
        ].map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() =>
              setActiveTab(
                tab as typeof activeTab
              )
            }
            className={
              tabClass(
                tab as typeof activeTab
              )
            }
            style={
              activeTab === tab
                ? {
                    borderColor:
                      primaryColor,
                    color:
                      primaryColor,
                  }
                : undefined
            }
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "dados" && (
        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900">
                Dados pessoais
              </h2>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Nome completo
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {member.fullName}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  CPF
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {displayValue(
                    member.cpf
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  RG
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {displayValue(
                    member.rg
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Órgão emissor
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {displayValue(
                    member.rgIssuer
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Nacionalidade
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {displayValue(
                    member.nationality
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Estado civil
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {displayValue(
                    member.maritalStatus
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  E-mail
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {displayValue(
                    member.email
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Telefone
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {displayValue(
                    member.phone
                  )}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900">
                Dados acadêmicos
              </h2>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Curso
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {displayValue(
                    member.course
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Matrícula
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {displayValue(
                    member.registration
                  )}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900">
                Endereço
              </h2>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <p className="text-xs font-medium uppercase text-gray-500">
                  Logradouro
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {displayValue(
                    member.address
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Número
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {displayValue(
                    member.addressNumber
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Bairro
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {displayValue(
                    member.neighborhood
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  CEP
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {displayValue(
                    member.cep
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Cidade
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {displayValue(
                    member.city
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase text-gray-500">
                  Estado
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {displayValue(
                    member.state
                  )}
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === "vinculo" && (
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Vínculo com a organização
            </h2>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Diretoria
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {member.directorate?.name ||
                  "Sem diretoria"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Cargo
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {member.position?.name ||
                  "Sem cargo"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Status
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {statusLabel(
                  member.status
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Data de ingresso
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(
                  member.entryDate
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Data de desligamento
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(
                  member.exitDate
                )}
              </p>
            </div>
          </div>
        </section>
      )}

      {activeTab === "documentos" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">
                Documentos do membro
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Termos, declarações e certificados vinculados a este membro.
              </p>
            </div>

            <Link
              href={`/admin/documentos/gerar?memberId=${member.id}`}
              className="rounded-md px-4 py-2 text-sm font-medium text-white"
              style={{
                backgroundColor:
                  primaryColor,
              }}
            >
              + Gerar documento
            </Link>
          </div>

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            {loadingDocuments ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Carregando documentos...
              </div>
            ) : documents.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-gray-700">
                  Nenhum documento encontrado.
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Gere o primeiro documento para este membro.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">
                        Documento
                      </th>
                      <th className="px-4 py-3 font-medium">
                        Tipo
                      </th>
                      <th className="px-4 py-3 font-medium">
                        Data
                      </th>
                      <th className="px-4 py-3 font-medium">
                        Status
                      </th>
                      <th className="px-4 py-3 font-medium">
                        Arquivo
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {documents.map(
                      (document) => (
                        <tr
                          key={
                            document.id
                          }
                          className="hover:bg-gray-50"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">
                              {
                                document.title
                              }
                            </p>

                            {document.template && (
                              <p className="mt-1 text-xs text-gray-500">
                                Modelo:{" "}
                                {
                                  document
                                    .template
                                    .name
                                }
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-3 text-gray-600">
                            {documentTypeLabel(
                              document.type
                            )}
                          </td>

                          <td className="px-4 py-3 text-gray-600">
                            {formatDateTime(
                              document.createdAt
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                              {documentStatusLabel(
                                document.status
                              )}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {document.generatedDocxUrl ? (
                                <a
                                  href={
                                    document.generatedDocxUrl
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm font-medium"
                                  style={{
                                    color:
                                      primaryColor,
                                  }}
                                >
                                  DOCX
                                </a>
                              ) : (
                                <span className="text-gray-400">
                                  —
                                </span>
                              )}

                              {document.generatedPdfUrl && (
                                <a
                                  href={
                                    document.generatedPdfUrl
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm font-medium"
                                  style={{
                                    color:
                                      primaryColor,
                                  }}
                                >
                                  PDF
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
          </section>
        </div>
      )}

      {activeTab === "projetos" && (
        <section className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-gray-700">
            Nenhum projeto exibido nesta área ainda.
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Os projetos vinculados ao membro aparecerão aqui.
          </p>
        </section>
      )}

      {activeTab === "historico" && (
        <section className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-gray-700">
            Histórico ainda não disponível.
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Alterações de cargo, diretoria e status poderão ser registradas nesta área.
          </p>
        </section>
      )}
    </div>
  );
}