"use client";

import Link from "next/link";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

type TemplateField = {
  id: string;
  key: string;
  label: string;
  mappedPath: string | null;
  required: boolean;
  type: string;
};

type Template = {
  id: string;
  name: string;
  type: string;
  fields: TemplateField[];
};

type Position = {
  id: string;
  name: string;
  role?: string;
};

type Member = {
  id: string;
  fullName: string;
  email: string | null;
  cpf: string | null;
  phone: string | null;
  course: string | null;
  registration: string | null;
  nationality?: string | null;
  maritalStatus?: string | null;
  rg?: string | null;
  rgIssuer?: string | null;
  address?: string | null;
  addressNumber?: string | null;
  neighborhood?: string | null;
  cep?: string | null;
  city?: string | null;
  state?: string | null;
  status: string;
  position?: Position | null;
};

type Organization = {
  id: string;
  name: string;
  shortName: string | null;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  logoUrl?: string | null;
  documentLogoUrl?: string | null;
};

type MissingField = {
  source:
    | "member"
    | "representative"
    | "organization";
  key: string;
  label: string;
};

const fieldLabels: Record<string, string> = {
  "member.fullName": "Nome completo do membro",
  "member.email": "E-mail do membro",
  "member.phone": "Telefone do membro",
  "member.course": "Curso do membro",
  "member.registration": "Matrícula do membro",
  "member.nationality": "Nacionalidade do membro",
  "member.maritalStatus": "Estado civil do membro",
  "member.rg": "RG do membro",
  "member.rgIssuer": "Órgão expedidor do RG do membro",
  "member.cpf": "CPF do membro",
  "member.address": "Endereço do membro",
  "member.addressNumber": "Número do endereço do membro",
  "member.neighborhood": "Bairro do membro",
  "member.cep": "CEP do membro",
  "member.city": "Cidade do membro",
  "member.state": "Estado do membro",

  "representative.position": "Cargo do representante",
  "representative.fullName": "Nome do representante",
  "representative.email": "E-mail do representante",
  "representative.phone": "Telefone do representante",
  "representative.nationality": "Nacionalidade do representante",
  "representative.maritalStatus": "Estado civil do representante",
  "representative.course": "Curso do representante",
  "representative.registration": "Matrícula do representante",
  "representative.rg": "RG do representante",
  "representative.rgIssuer": "Órgão expedidor do RG do representante",
  "representative.cpf": "CPF do representante",
  "representative.address": "Endereço do representante",
  "representative.addressNumber": "Número do endereço do representante",
  "representative.neighborhood": "Bairro do representante",
  "representative.cep": "CEP do representante",
  "representative.city": "Cidade do representante",
  "representative.state": "Estado do representante",

  "organization.name": "Nome da organização",
  "organization.shortName": "Nome curto da organização",
  "organization.cnpj": "CNPJ da organização",
  "organization.email": "E-mail institucional",
  "organization.phone": "Telefone institucional",
  "organization.website": "Site da organização",
  "organization.address": "Endereço da organização",
  "organization.city": "Cidade da organização",
  "organization.state": "Estado da organização",

  "system.currentDate": "Data atual",
};

function getMemberValue(
  member: Member,
  key: string
): unknown {
  if (key === "position") {
    return member.position?.name || "";
  }

  return member[key as keyof Member];
}

function getOrganizationValue(
  organization: Organization,
  key: string
): unknown {
  return organization[key as keyof Organization];
}

function GerarDocumentoContent() {
  const searchParams = useSearchParams();

  const memberIdFromUrl =
    searchParams.get("memberId");

  const templateIdFromUrl =
    searchParams.get("templateId");

  const [templates, setTemplates] =
    useState<Template[]>([]);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [organization, setOrganization] =
    useState<Organization | null>(null);

  const [
    selectedTemplateId,
    setSelectedTemplateId,
  ] = useState("");

  const [
    selectedMemberId,
    setSelectedMemberId,
  ] = useState("");

  const [
    selectedRepresentativeId,
    setSelectedRepresentativeId,
  ] = useState("");

  const [
    manualValues,
    setManualValues,
  ] = useState<Record<string, string>>({});

  const [loading, setLoading] =
    useState(true);

  const [generating, setGenerating] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [
    generatedDocxUrl,
    setGeneratedDocxUrl,
  ] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setMessage("");

        const [
          templatesResponse,
          membersResponse,
          organizationResponse,
        ] = await Promise.all([
          fetch("/api/document-templates"),
          fetch("/api/members"),
          fetch("/api/organization"),
        ]);

        const templatesData =
          await templatesResponse.json();

        const membersData =
          await membersResponse.json();

        const organizationData =
          await organizationResponse.json();

        if (
          !templatesResponse.ok ||
          !templatesData.ok
        ) {
          throw new Error(
            templatesData.message ||
              "Erro ao carregar modelos."
          );
        }

        if (
          !membersResponse.ok ||
          !membersData.ok
        ) {
          throw new Error(
            membersData.message ||
              "Erro ao carregar membros."
          );
        }

        if (
          !organizationResponse.ok ||
          !organizationData.ok
        ) {
          throw new Error(
            organizationData.message ||
              "Erro ao carregar organização."
          );
        }

        setTemplates(
          templatesData.templates || []
        );

        setMembers(
          membersData.members || []
        );

        setOrganization(
          organizationData.organization ||
            null
        );
      } catch (error) {
        console.error(
          "Erro ao carregar dados:",
          error
        );

        setMessage(
          "Erro ao carregar os dados necessários para gerar documentos."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (
      !memberIdFromUrl ||
      members.length === 0
    ) {
      return;
    }

    const memberExists =
      members.some(
        (member) =>
          member.id ===
          memberIdFromUrl
      );

    if (memberExists) {
      setSelectedMemberId(
        memberIdFromUrl
      );
    }
  }, [
    memberIdFromUrl,
    members,
  ]);

  useEffect(() => {
    if (
      !templateIdFromUrl ||
      templates.length === 0
    ) {
      return;
    }

    const templateExists =
      templates.some(
        (template) =>
          template.id ===
          templateIdFromUrl
      );

    if (templateExists) {
      setSelectedTemplateId(
        templateIdFromUrl
      );
    }
  }, [
    templateIdFromUrl,
    templates,
  ]);

  const selectedTemplate =
    templates.find(
      (template) =>
        template.id ===
        selectedTemplateId
    ) || null;

  const selectedMember =
    members.find(
      (member) =>
        member.id ===
        selectedMemberId
    ) || null;

  const representatives =
    useMemo(() => {
      return members.filter(
        (member) =>
          member.status ===
            "ACTIVE" &&
          (
            member.position?.role ===
              "PRESIDENT" ||
            member.position?.role ===
              "VICE_PRESIDENT"
          )
      );
    }, [members]);

  useEffect(() => {
    if (
      representatives.length === 1
    ) {
      setSelectedRepresentativeId(
        representatives[0].id
      );

      return;
    }

    setSelectedRepresentativeId("");
  }, [representatives]);

  const selectedRepresentative =
    representatives.find(
      (member) =>
        member.id ===
        selectedRepresentativeId
    ) || null;

  const templateUsesRepresentative =
    selectedTemplate?.fields.some(
      (field) =>
        field.key.startsWith(
          "representative."
        )
    ) || false;

  const manualFields =
    selectedTemplate?.fields.filter(
      (field) =>
        (
          !field.mappedPath ||
          field.mappedPath ===
            "manual"
        ) &&
        !field.key.startsWith(
          "member."
        ) &&
        !field.key.startsWith(
          "representative."
        ) &&
        !field.key.startsWith(
          "organization."
        ) &&
        !field.key.startsWith(
          "system."
        )
    ) || [];

  const missingFields =
    useMemo(() => {
      const missing:
        MissingField[] = [];

      if (!selectedTemplate) {
        return missing;
      }

      for (
        const field of
        selectedTemplate.fields
      ) {
        if (!field.required) {
          continue;
        }

        if (
          field.key.startsWith(
            "member."
          )
        ) {
          if (!selectedMember) {
            continue;
          }

          const key =
            field.key.replace(
              "member.",
              ""
            );

          const value =
            getMemberValue(
              selectedMember,
              key
            );

          if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
          ) {
            missing.push({
              source: "member",
              key: field.key,
              label:
                fieldLabels[field.key] ||
                field.label,
            });
          }

          continue;
        }

        if (
          field.key.startsWith(
            "representative."
          )
        ) {
          if (
            !selectedRepresentative
          ) {
            continue;
          }

          const key =
            field.key.replace(
              "representative.",
              ""
            );

          const value =
            getMemberValue(
              selectedRepresentative,
              key
            );

          if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
          ) {
            missing.push({
              source:
                "representative",
              key: field.key,
              label:
                fieldLabels[field.key] ||
                field.label,
            });
          }

          continue;
        }

        if (
          field.key.startsWith(
            "organization."
          )
        ) {
          if (!organization) {
            continue;
          }

          const key =
            field.key.replace(
              "organization.",
              ""
            );

          const value =
            getOrganizationValue(
              organization,
              key
            );

          if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
          ) {
            missing.push({
              source:
                "organization",
              key: field.key,
              label:
                fieldLabels[field.key] ||
                field.label,
            });
          }
        }
      }

      return missing;
    }, [
      selectedTemplate,
      selectedMember,
      selectedRepresentative,
      organization,
    ]);

  const missingMemberFields =
    missingFields.filter(
      (field) =>
        field.source === "member"
    );

  const missingRepresentativeFields =
    missingFields.filter(
      (field) =>
        field.source ===
        "representative"
    );

  const missingOrganizationFields =
    missingFields.filter(
      (field) =>
        field.source ===
        "organization"
    );

  function handleTemplateChange(
    templateId: string
  ) {
    setSelectedTemplateId(
      templateId
    );

    setManualValues({});
    setGeneratedDocxUrl(null);
    setMessage("");
  }

  function handleManualValueChange(
    key: string,
    value: string
  ) {
    setManualValues(
      (current) => ({
        ...current,
        [key]: value,
      })
    );
  }

  async function handleGenerateDocument() {
    if (!selectedTemplate) {
      setMessage(
        "Selecione um modelo."
      );

      return;
    }

    if (!selectedMember) {
      setMessage(
        "Selecione um membro."
      );

      return;
    }

    if (
      templateUsesRepresentative &&
      !selectedRepresentative
    ) {
      setMessage(
        "Selecione o representante da organização."
      );

      return;
    }

    if (
      missingFields.length > 0
    ) {
      setMessage(
        "Existem dados obrigatórios faltando. Complete os cadastros antes de gerar o documento."
      );

      return;
    }

    try {
      setGenerating(true);
      setMessage("");
      setGeneratedDocxUrl(null);

      const response =
        await fetch(
          "/api/documents/generate",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                templateId:
                  selectedTemplate.id,

                memberId:
                  selectedMember.id,

                representativeId:
                  selectedRepresentative?.id ||
                  null,

                manualValues,
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.ok
      ) {
        setMessage(
          data.message ||
            "Erro ao gerar documento."
        );

        return;
      }

      setGeneratedDocxUrl(
        data.generatedDocxUrl
      );

      setMessage(
        "Documento gerado com sucesso."
      );
    } catch (error) {
      console.error(
        "Erro ao gerar documento:",
        error
      );

      setMessage(
        "Erro ao gerar documento."
      );
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl">
        <p className="text-sm text-gray-600">
          Carregando...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Gerar documento
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Escolha um modelo, um membro
          e, quando necessário, o
          representante da organização.
        </p>
      </div>

      {memberIdFromUrl &&
        selectedMember && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-purple-200 bg-purple-50 px-4 py-3">
            <div>
              <p className="text-xs font-medium uppercase text-purple-600">
                Documento para
              </p>

              <p className="mt-1 text-sm font-medium text-purple-900">
                {
                  selectedMember.fullName
                }
              </p>
            </div>

            <Link
              href={`/admin/membros/${selectedMember.id}`}
              className="text-sm font-medium text-purple-700 hover:underline"
            >
              Voltar ao perfil
            </Link>
          </div>
        )}

      {message && (
        <div className="mb-5 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          {message}
        </div>
      )}

      {generatedDocxUrl && (
        <div className="mb-5 rounded-md border border-green-200 bg-green-50 px-4 py-4">
          <p className="text-sm font-medium text-green-800">
            Documento pronto.
          </p>

          <a
            href={generatedDocxUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white"
          >
            Baixar DOCX
          </a>
        </div>
      )}

      <div className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Dados principais
            </h2>
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Modelo
              </label>

              <select
                value={
                  selectedTemplateId
                }
                onChange={(event) =>
                  handleTemplateChange(
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
              >
                <option value="">
                  Selecione um modelo
                </option>

                {templates.map(
                  (template) => (
                    <option
                      key={template.id}
                      value={template.id}
                    >
                      {template.name}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Membro
              </label>

              <select
                value={
                  selectedMemberId
                }
                onChange={(event) => {
                  setSelectedMemberId(
                    event.target.value
                  );

                  setGeneratedDocxUrl(
                    null
                  );

                  setMessage("");
                }}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
              >
                <option value="">
                  Selecione um membro
                </option>

                {members.map(
                  (member) => (
                    <option
                      key={member.id}
                      value={member.id}
                    >
                      {member.fullName}
                    </option>
                  )
                )}
              </select>
            </div>

            {templateUsesRepresentative && (
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Representante da organização
                </label>

                {representatives.length ===
                0 ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Nenhum Presidente ou
                    Vice-Presidente ativo
                    foi encontrado.
                  </div>
                ) : (
                  <select
                    value={
                      selectedRepresentativeId
                    }
                    onChange={(event) => {
                      setSelectedRepresentativeId(
                        event.target.value
                      );

                      setGeneratedDocxUrl(
                        null
                      );

                      setMessage("");
                    }}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
                  >
                    {representatives.length >
                      1 && (
                      <option value="">
                        Selecione o representante
                      </option>
                    )}

                    {representatives.map(
                      (representative) => (
                        <option
                          key={
                            representative.id
                          }
                          value={
                            representative.id
                          }
                        >
                          {
                            representative.fullName
                          }
                          {" — "}
                          {
                            representative
                              .position
                              ?.name
                          }
                        </option>
                      )
                    )}
                  </select>
                )}
              </div>
            )}
          </div>
        </section>

        {selectedTemplate &&
          missingFields.length >
            0 && (
            <section className="rounded-lg border border-amber-300 bg-amber-50">
              <div className="border-b border-amber-200 px-5 py-4">
                <h2 className="font-semibold text-amber-900">
                  Dados incompletos
                </h2>

                <p className="mt-1 text-sm text-amber-800">
                  Alguns dados
                  obrigatórios do
                  modelo não estão
                  preenchidos. Corrija
                  o cadastro
                  correspondente antes
                  de gerar o documento.
                </p>
              </div>

              <div className="space-y-4 p-5">
                {missingMemberFields.length >
                  0 &&
                  selectedMember && (
                    <div className="rounded-md border border-amber-200 bg-white p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Dados do membro
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {
                              selectedMember.fullName
                            }
                          </p>

                          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
                            {missingMemberFields.map(
                              (field) => (
                                <li
                                  key={
                                    field.key
                                  }
                                >
                                  {
                                    field.label
                                  }
                                </li>
                              )
                            )}
                          </ul>
                        </div>

                        <Link
                          href={`/admin/membros/${selectedMember.id}/editar`}
                          className="inline-flex shrink-0 items-center justify-center rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-100"
                        >
                          Editar membro
                        </Link>
                      </div>
                    </div>
                  )}

                {missingRepresentativeFields.length >
                  0 &&
                  selectedRepresentative && (
                    <div className="rounded-md border border-amber-200 bg-white p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Dados do representante
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {
                              selectedRepresentative.fullName
                            }

                            {selectedRepresentative
                              .position
                              ?.name
                              ? ` — ${selectedRepresentative.position.name}`
                              : ""}
                          </p>

                          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
                            {missingRepresentativeFields.map(
                              (field) => (
                                <li
                                  key={
                                    field.key
                                  }
                                >
                                  {
                                    field.label
                                  }
                                </li>
                              )
                            )}
                          </ul>
                        </div>

                        <Link
                          href={`/admin/membros/${selectedRepresentative.id}/editar`}
                          className="inline-flex shrink-0 items-center justify-center rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-100"
                        >
                          Editar representante
                        </Link>
                      </div>
                    </div>
                  )}

                {missingOrganizationFields.length >
                  0 && (
                  <div className="rounded-md border border-amber-200 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Dados da organização
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {organization?.name ||
                            "Organização"}
                        </p>

                        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
                          {missingOrganizationFields.map(
                            (field) => (
                              <li
                                key={
                                  field.key
                                }
                              >
                                {
                                  field.label
                                }
                              </li>
                            )
                          )}
                        </ul>
                      </div>

                      <Link
                        href="/admin/configuracoes"
                        className="inline-flex shrink-0 items-center justify-center rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-100"
                      >
                        Editar organização
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

        {selectedTemplate && (
          <section className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Campos manuais
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Apenas campos que
                    não possuem uma
                    origem automática
                    no sistema aparecem
                    aqui.
                  </p>
                </div>

                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                  {
                    manualFields.length
                  }{" "}
                  campos
                </span>
              </div>
            </div>

            {manualFields.length ===
            0 ? (
              <div className="p-5 text-sm text-gray-500">
                Este modelo não possui
                campos manuais.
              </div>
            ) : (
              <div className="grid gap-5 p-5 md:grid-cols-2">
                {manualFields.map(
                  (field) => (
                    <div key={field.id}>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        {fieldLabels[
                          field.key
                        ] ||
                          field.label}

                        {field.required && (
                          <span className="ml-1 text-red-600">
                            *
                          </span>
                        )}
                      </label>

                      <input
                        type={
                          field.type ===
                          "DATE"
                            ? "date"
                            : "text"
                        }
                        value={
                          manualValues[
                            field.key
                          ] || ""
                        }
                        onChange={(
                          event
                        ) =>
                          handleManualValueChange(
                            field.key,
                            event.target.value
                          )
                        }
                        placeholder={
                          fieldLabels[
                            field.key
                          ] ||
                          field.label
                        }
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
                      />
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        )}

        <div className="flex justify-end pb-8">
          <button
            type="button"
            disabled={
              !selectedTemplateId ||
              !selectedMemberId ||
              (
                templateUsesRepresentative &&
                !selectedRepresentativeId
              ) ||
              missingFields.length >
                0 ||
              generating
            }
            onClick={
              handleGenerateDocument
            }
            className="rounded-md bg-purple-700 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating
              ? "Gerando..."
              : "Gerar documento"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GerarDocumentoLoading() {
  return (
    <div className="max-w-5xl">
      <p className="text-sm text-gray-600">
        Carregando...
      </p>
    </div>
  );
}

export default function GerarDocumentoPage() {
  return (
    <Suspense
      fallback={
        <GerarDocumentoLoading />
      }
    >
      <GerarDocumentoContent />
    </Suspense>
  );
}