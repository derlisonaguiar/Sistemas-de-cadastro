"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type TemplateField = {
  id: string;
  key: string;
  label: string;
  type: string;
  mappedPath: string | null;
  detectedValue: string | null;
  context: string | null;
  required: boolean;
  confidence: number | null;
};

type Template = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  content: string;
  extractedText: string | null;
  originalFileUrl: string | null;
  originalFileName: string | null;
  originalMimeType: string | null;
  originalFileSize: number | null;
  active: boolean;
  fields: TemplateField[];
};

type EditableField = {
  label: string;
  type: string;
  mappedPath: string;
  required: boolean;
};

const fieldTypes = [
  { value: "TEXT", label: "Texto" },
  { value: "NUMBER", label: "Número" },
  { value: "DATE", label: "Data" },
  { value: "CPF", label: "CPF" },
  { value: "CNPJ", label: "CNPJ" },
  { value: "EMAIL", label: "E-mail" },
  { value: "PHONE", label: "Telefone" },
  { value: "ADDRESS", label: "Endereço" },
  { value: "CURRENCY", label: "Valor monetário" },
  { value: "BOOLEAN", label: "Sim / Não" },
];

const sourceOptions = [
  {
    group: "Membro",
    options: [
      {
        value: "member.fullName",
        label: "Nome completo",
      },
      {
        value: "member.email",
        label: "E-mail",
      },
      {
        value: "member.cpf",
        label: "CPF",
      },
      {
        value: "member.phone",
        label: "Telefone",
      },
      {
        value: "member.course",
        label: "Curso",
      },
      {
        value: "member.registration",
        label: "Matrícula",
      },
      {
        value: "member.directorate.name",
        label: "Diretoria",
      },
      {
        value: "member.position.name",
        label: "Cargo",
      },
    ],
  },

  {
    group: "Organização",
    options: [
      {
        value: "organization.name",
        label: "Nome",
      },
      {
        value: "organization.shortName",
        label: "Nome curto",
      },
      {
        value: "organization.cnpj",
        label: "CNPJ",
      },
      {
        value: "organization.email",
        label: "E-mail",
      },
      {
        value: "organization.phone",
        label: "Telefone",
      },
      {
        value: "organization.website",
        label: "Site",
      },
      {
        value: "organization.address",
        label: "Endereço",
      },
    ],
  },

  {
    group: "Cliente",
    options: [
      {
        value: "client.name",
        label: "Nome",
      },
      {
        value: "client.companyName",
        label: "Razão social",
      },
      {
        value: "client.cpfCnpj",
        label: "CPF/CNPJ",
      },
      {
        value: "client.email",
        label: "E-mail",
      },
      {
        value: "client.phone",
        label: "Telefone",
      },
      {
        value: "client.contactName",
        label: "Pessoa de contato",
      },
      {
        value: "client.address",
        label: "Endereço",
      },
    ],
  },

  {
    group: "Projeto",
    options: [
      {
        value: "project.name",
        label: "Nome",
      },
      {
        value: "project.description",
        label: "Descrição",
      },
      {
        value: "project.startDate",
        label: "Data de início",
      },
      {
        value: "project.endDate",
        label: "Data de término",
      },
      {
        value: "project.budget",
        label: "Orçamento",
      },
    ],
  },

  {
    group: "Contrato",
    options: [
      {
        value: "contract.title",
        label: "Título",
      },
      {
        value: "contract.contractNumber",
        label: "Número do contrato",
      },
      {
        value: "contract.value",
        label: "Valor",
      },
      {
        value: "contract.startDate",
        label: "Data de início",
      },
      {
        value: "contract.endDate",
        label: "Data de término",
      },
    ],
  },

  {
    group: "Sistema",
    options: [
      {
        value: "system.currentDate",
        label: "Data atual",
      },
      {
        value: "manual",
        label: "Preenchimento manual",
      },
    ],
  },
];

function confidenceLabel(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${Math.round(value * 100)}%`;
}

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

function sourceStatus(mappedPath: string | null) {
  if (!mappedPath) {
    return {
      label: "Não configurado",
      className:
        "border border-yellow-200 bg-yellow-50 text-yellow-700",
    };
  }

  if (mappedPath === "manual") {
    return {
      label: "Manual",
      className:
        "border border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  return {
    label: "Mapeado",
    className:
      "border border-green-200 bg-green-50 text-green-700",
  };
}

function sourceLabel(mappedPath: string | null) {
  if (!mappedPath) {
    return "Nenhuma fonte selecionada";
  }

  for (const group of sourceOptions) {
    const option = group.options.find(
      (item) => item.value === mappedPath
    );

    if (option) {
      return `${group.group} > ${option.label}`;
    }
  }

  return mappedPath;
}

export default function RevisarModeloDocumentoPage() {
  const params = useParams();
  const id = params.id as string;

  const [template, setTemplate] =
    useState<Template | null>(null);

  const [editableFields, setEditableFields] =
    useState<Record<string, EditableField>>({});

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [savingFieldId, setSavingFieldId] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadTemplate() {
      try {
        const response = await fetch(
          `/api/document-templates/${id}`
        );

        const data = await response.json();

        if (!response.ok || !data.ok) {
          setMessage(
            data.message ||
              "Erro ao carregar modelo."
          );

          return;
        }

        setTemplate(data.template);

        const initialFields: Record<
          string,
          EditableField
        > = {};

        data.template.fields.forEach(
          (field: TemplateField) => {
            initialFields[field.id] = {
              label: field.label,
              type: field.type,
              mappedPath:
                field.mappedPath || "",
              required: field.required,
            };
          }
        );

        setEditableFields(initialFields);
      } catch (error) {
        console.error(
          "Erro ao carregar modelo:",
          error
        );

        setMessage(
          "Erro ao carregar modelo."
        );
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadTemplate();
    }
  }, [id]);

  function updateEditableField(
    fieldId: string,
    values: Partial<EditableField>
  ) {
    setEditableFields((current) => ({
      ...current,
      [fieldId]: {
        ...current[fieldId],
        ...values,
      },
    }));
  }

  async function saveField(
    fieldId: string
  ) {
    if (!template) {
      return;
    }

    const editable =
      editableFields[fieldId];

    if (!editable) {
      return;
    }

    try {
      setSavingFieldId(fieldId);
      setMessage("");

      const response = await fetch(
        `/api/document-templates/${template.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            fieldId,
            label: editable.label,
            type: editable.type,
            mappedPath:
              editable.mappedPath,
            required:
              editable.required,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(
          data.message ||
            "Erro ao atualizar campo."
        );

        return;
      }

      setTemplate((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          fields: current.fields.map(
            (field) =>
              field.id === fieldId
                ? {
                    ...field,
                    label:
                      data.field.label,
                    type:
                      data.field.type,
                    mappedPath:
                      data.field.mappedPath,
                    required:
                      data.field.required,
                  }
                : field
          ),
        };
      });

      setMessage(
        "Campo atualizado com sucesso."
      );
    } catch (error) {
      console.error(
        "Erro ao salvar campo:",
        error
      );

      setMessage(
        "Erro ao atualizar campo."
      );
    } finally {
      setSavingFieldId(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl">
        <p className="text-sm text-gray-600">
          Carregando modelo...
        </p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="max-w-6xl">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {message ||
            "Modelo não encontrado."}
        </div>
      </div>
    );
  }

  const mappedCount =
    template.fields.filter(
      (field) =>
        field.mappedPath &&
        field.mappedPath !== "manual"
    ).length;

  const manualCount =
    template.fields.filter(
      (field) =>
        field.mappedPath === "manual"
    ).length;

  const pendingCount =
    template.fields.filter(
      (field) => !field.mappedPath
    ).length;

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2">
            <Link
              href="/admin/documentos/modelos"
              className="text-sm text-[var(--admin-ink)] hover:underline"
            >
              ← Voltar para modelos
            </Link>
          </div>

          <h1 className="text-2xl font-semibold text-gray-900">
            {template.name}
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Revise, ajuste e configure os campos detectados.
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            template.active
              ? "bg-green-50 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {template.active
            ? "Ativo"
            : "Inativo"}
        </span>
      </div>

      {message && (
        <div className="mb-5 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          {message}
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-green-700">
            Mapeados
          </p>

          <p className="mt-2 text-2xl font-semibold text-green-800">
            {mappedCount}
          </p>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
            Manuais
          </p>

          <p className="mt-2 text-2xl font-semibold text-blue-800">
            {manualCount}
          </p>
        </div>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-yellow-700">
            Não configurados
          </p>

          <p className="mt-2 text-2xl font-semibold text-yellow-800">
            {pendingCount}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <section className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900">
                Informações do modelo
              </h2>
            </div>

            <div className="space-y-4 p-5 text-sm">
              <div>
                <p className="text-gray-500">
                  Tipo
                </p>

                <p className="mt-1 font-medium text-gray-900">
                  {typeLabel(
                    template.type
                  )}
                </p>
              </div>

              <div>
                <p className="text-gray-500">
                  Descrição
                </p>

                <p className="mt-1 text-gray-900">
                  {template.description ||
                    "Sem descrição"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">
                  Arquivo original
                </p>

                <p className="mt-1 text-gray-900">
                  {template.originalFileName ||
                    "Não informado"}
                </p>
              </div>

              {template.originalFileSize !==
                null && (
                <div>
                  <p className="text-gray-500">
                    Tamanho
                  </p>

                  <p className="mt-1 text-gray-900">
                    {(
                      template.originalFileSize /
                      1024
                    ).toFixed(1)}{" "}
                    KB
                  </p>
                </div>
              )}

              {template.originalFileUrl && (
                <div>
                  <a
                    href={
                      template.originalFileUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Abrir arquivo original
                  </a>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900">
                Texto extraído
              </h2>
            </div>

            <div className="p-5">
              <textarea
                value={
                  template.extractedText ||
                  template.content ||
                  ""
                }
                readOnly
                rows={22}
                className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800"
              />
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Campos detectados
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Edite o campo e defina de onde o valor será obtido.
                </p>
              </div>

              <span className="rounded-full bg-[var(--admin-soft)] px-3 py-1 text-xs font-medium text-[var(--admin-ink)]">
                {template.fields.length} campos
              </span>
            </div>
          </div>

          {template.fields.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">
              Nenhum campo foi detectado.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {template.fields.map(
                (field) => {
                  const editable =
                    editableFields[
                      field.id
                    ];

                  const status =
                    sourceStatus(
                      field.mappedPath
                    );

                  if (!editable) {
                    return null;
                  }

                  return (
                    <div
                      key={field.id}
                      className="p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium text-gray-900">
                              {field.label}
                            </h3>

                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </div>

                          <p className="mt-1 font-mono text-xs text-gray-500">
                            {field.key}
                          </p>
                        </div>

                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                          {confidenceLabel(
                            field.confidence
                          )}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                            Nome do campo
                          </label>

                          <input
                            type="text"
                            value={
                              editable.label
                            }
                            onChange={(
                              event
                            ) =>
                              updateEditableField(
                                field.id,
                                {
                                  label:
                                    event
                                      .target
                                      .value,
                                }
                              )
                            }
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                            Tipo
                          </label>

                          <select
                            value={
                              editable.type
                            }
                            onChange={(
                              event
                            ) =>
                              updateEditableField(
                                field.id,
                                {
                                  type:
                                    event
                                      .target
                                      .value,
                                }
                              )
                            }
                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
                          >
                            {fieldTypes.map(
                              (type) => (
                                <option
                                  key={
                                    type.value
                                  }
                                  value={
                                    type.value
                                  }
                                >
                                  {
                                    type.label
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Valor encontrado
                        </p>

                        <p className="mt-1 break-words rounded-md bg-gray-50 p-3 text-sm text-gray-900">
                          {field.detectedValue ||
                            "-"}
                        </p>
                      </div>

                      {field.context && (
                        <div className="mt-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Contexto
                          </p>

                          <p className="mt-1 rounded-md bg-gray-50 p-3 text-xs leading-5 text-gray-600">
                            {field.context}
                          </p>
                        </div>
                      )}

                      <div className="mt-4">
                        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                          Fonte do dado
                        </label>

                        <select
                          value={
                            editable.mappedPath
                          }
                          onChange={(
                            event
                          ) =>
                            updateEditableField(
                              field.id,
                              {
                                mappedPath:
                                  event
                                    .target
                                    .value,
                              }
                            )
                          }
                          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
                        >
                          <option value="">
                            Não configurado
                          </option>

                          {sourceOptions.map(
                            (group) => (
                              <optgroup
                                key={
                                  group.group
                                }
                                label={
                                  group.group
                                }
                              >
                                {group.options.map(
                                  (
                                    option
                                  ) => (
                                    <option
                                      key={
                                        option.value
                                      }
                                      value={
                                        option.value
                                      }
                                    >
                                      {
                                        option.label
                                      }
                                    </option>
                                  )
                                )}
                              </optgroup>
                            )
                          )}
                        </select>

                        <p className="mt-2 text-xs text-gray-500">
                          Fonte atual:{" "}
                          <span className="font-medium text-gray-700">
                            {sourceLabel(
                              editable.mappedPath ||
                                null
                            )}
                          </span>
                        </p>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={
                              editable.required
                            }
                            onChange={(
                              event
                            ) =>
                              updateEditableField(
                                field.id,
                                {
                                  required:
                                    event
                                      .target
                                      .checked,
                                }
                              )
                            }
                          />

                          Campo obrigatório
                        </label>

                        <button
                          type="button"
                          disabled={
                            savingFieldId ===
                            field.id
                          }
                          onClick={() =>
                            saveField(
                              field.id
                            )
                          }
                          className="rounded-md bg-[var(--admin-primary)] px-4 py-2 text-sm font-medium text-[var(--admin-on-primary)] disabled:opacity-60"
                        >
                          {savingFieldId ===
                          field.id
                            ? "Salvando..."
                            : "Salvar campo"}
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}