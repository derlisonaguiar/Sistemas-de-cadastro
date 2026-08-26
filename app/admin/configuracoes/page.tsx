"use client";

import { useEffect, useState } from "react";

type Organization = {
  id: string;

  name: string;
  shortName: string | null;
  legalName: string | null;

  logoUrl: string | null;
  documentLogoUrl: string | null;
  faviconUrl: string | null;

  primaryColor: string;
  secondaryColor: string;

  cnpj: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;

  address: string | null;
  addressNumber: string | null;
  neighborhood: string | null;
  cep: string | null;
  addressComplement: string | null;

  city: string | null;
  state: string | null;

  documentHeaderText: string | null;
};

export default function ConfiguracoesPage() {
  const [organization, setOrganization] =
    useState<Organization | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploadingLogo, setUploadingLogo] =
    useState(false);

  const [
    uploadingDocumentLogo,
    setUploadingDocumentLogo,
  ] = useState(false);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    async function loadOrganization() {
      try {
        const response =
          await fetch("/api/organization");

        const data =
          await response.json();

        if (data.ok) {
          setOrganization(
            data.organization
          );
        }
      } catch (error) {
        console.error(
          "Erro ao carregar organização:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrganization();
  }, []);

  function updateField(
    field: keyof Organization,
    value: string
  ) {
    if (!organization) {
      return;
    }

    setOrganization({
      ...organization,
      [field]: value,
    });
  }

  async function handleLogoUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploadingLogo(true);
      setMessage("");

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "/api/organization/logo",
          {
            method: "POST",
            body: formData,
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
            "Erro ao enviar logo."
        );

        return;
      }

      setOrganization(
        data.organization
      );

      setMessage(
        "Logo atualizada com sucesso."
      );
    } catch (error) {
      console.error(
        "Erro ao enviar logo:",
        error
      );

      setMessage(
        "Erro ao enviar logo."
      );
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
    }
  }

  async function handleDocumentLogoUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploadingDocumentLogo(
        true
      );

      setMessage("");

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "/api/organization/document-logo",
          {
            method: "POST",
            body: formData,
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
            "Erro ao enviar logo para documentos."
        );

        return;
      }

      setOrganization(
        data.organization
      );

      setMessage(
        "Logo para documentos atualizada com sucesso."
      );
    } catch (error) {
      console.error(
        "Erro ao enviar logo para documentos:",
        error
      );

      setMessage(
        "Erro ao enviar logo para documentos."
      );
    } finally {
      setUploadingDocumentLogo(
        false
      );

      event.target.value = "";
    }
  }

  async function handleSave() {
    if (!organization) {
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response =
        await fetch(
          "/api/organization",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name:
                organization.name,

              shortName:
                organization.shortName,

              legalName:
                organization.legalName,

              primaryColor:
                organization.primaryColor,

              secondaryColor:
                organization.secondaryColor,

              cnpj:
                organization.cnpj,

              email:
                organization.email,

              phone:
                organization.phone,

              website:
                organization.website,

              address:
                organization.address,

              addressNumber:
                organization.addressNumber,

              neighborhood:
                organization.neighborhood,

              cep:
                organization.cep,

              addressComplement:
                organization.addressComplement,

              city:
                organization.city,

              state:
                organization.state,

              documentHeaderText:
                organization.documentHeaderText,
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
            "Erro ao salvar alterações."
        );

        return;
      }

      setOrganization(
        data.organization
      );

      setMessage(
        "Alterações salvas com sucesso."
      );
    } catch (error) {
      console.error(
        "Erro ao salvar:",
        error
      );

      setMessage(
        "Erro ao salvar alterações."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-600">
        Carregando configurações...
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-sm text-red-600">
        Não foi possível carregar os dados da organização.
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Configurações da Organização
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Gerencie a identidade visual,
          os dados institucionais e as
          informações usadas nos documentos.
        </p>
      </div>

      <div className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Identidade visual
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Informações exibidas no sistema.
            </p>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Logo da organização
              </label>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-500">
                  {organization.logoUrl ? (
                    <img
                      src={
                        organization.logoUrl
                      }
                      alt={
                        organization.name
                      }
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    "Sem logo"
                  )}
                </div>

                <div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={
                      handleLogoUpload
                    }
                    disabled={
                      uploadingLogo
                    }
                    className="block text-sm text-gray-600 disabled:opacity-50"
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    {uploadingLogo
                      ? "Enviando..."
                      : "PNG, JPG, WEBP ou SVG. Máximo de 2 MB."}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nome da organização
                </label>

                <input
                  type="text"
                  value={
                    organization.name
                  }
                  onChange={(event) =>
                    updateField(
                      "name",
                      event.target.value
                    )
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nome curto / Sigla
                </label>

                <input
                  type="text"
                  value={
                    organization.shortName ??
                    ""
                  }
                  onChange={(event) =>
                    updateField(
                      "shortName",
                      event.target.value
                    )
                  }
                  placeholder="Ex.: BS"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Cor principal
                </label>

                <div className="flex gap-2">
                  <input
                    type="color"
                    value={
                      organization.primaryColor
                    }
                    onChange={(event) =>
                      updateField(
                        "primaryColor",
                        event.target.value
                      )
                    }
                    className="h-10 w-14 cursor-pointer rounded border border-gray-300 bg-white p-1"
                  />

                  <input
                    type="text"
                    value={
                      organization.primaryColor
                    }
                    onChange={(event) =>
                      updateField(
                        "primaryColor",
                        event.target.value
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Cor secundária
                </label>

                <div className="flex gap-2">
                  <input
                    type="color"
                    value={
                      organization.secondaryColor
                    }
                    onChange={(event) =>
                      updateField(
                        "secondaryColor",
                        event.target.value
                      )
                    }
                    className="h-10 w-14 cursor-pointer rounded border border-gray-300 bg-white p-1"
                  />

                  <input
                    type="text"
                    value={
                      organization.secondaryColor
                    }
                    onChange={(event) =>
                      updateField(
                        "secondaryColor",
                        event.target.value
                      )
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Dados institucionais
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Informações jurídicas e de contato.
            </p>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Razão social
              </label>

              <input
                type="text"
                value={
                  organization.legalName ??
                  ""
                }
                onChange={(event) =>
                  updateField(
                    "legalName",
                    event.target.value
                  )
                }
                placeholder="Razão social completa"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                CNPJ
              </label>

              <input
                type="text"
                value={
                  organization.cnpj ??
                  ""
                }
                onChange={(event) =>
                  updateField(
                    "cnpj",
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                E-mail institucional
              </label>

              <input
                type="email"
                value={
                  organization.email ??
                  ""
                }
                onChange={(event) =>
                  updateField(
                    "email",
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Telefone
              </label>

              <input
                type="text"
                value={
                  organization.phone ??
                  ""
                }
                onChange={(event) =>
                  updateField(
                    "phone",
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Site
              </label>

              <input
                type="text"
                value={
                  organization.website ??
                  ""
                }
                onChange={(event) =>
                  updateField(
                    "website",
                    event.target.value
                  )
                }
                placeholder="www.exemplo.com.br"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Endereço
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Endereço institucional usado nos documentos.
            </p>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Logradouro
              </label>

              <input
                type="text"
                value={
                  organization.address ??
                  ""
                }
                onChange={(event) =>
                  updateField(
                    "address",
                    event.target.value
                  )
                }
                placeholder="Rua, avenida, campus..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Número
              </label>

              <input
                type="text"
                value={
                  organization.addressNumber ??
                  ""
                }
                onChange={(event) =>
                  updateField(
                    "addressNumber",
                    event.target.value
                  )
                }
                placeholder="Ex.: 123 ou s/n"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Bairro
              </label>

              <input
                type="text"
                value={
                  organization.neighborhood ??
                  ""
                }
                onChange={(event) =>
                  updateField(
                    "neighborhood",
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                CEP
              </label>

              <input
                type="text"
                value={
                  organization.cep ??
                  ""
                }
                onChange={(event) =>
                  updateField(
                    "cep",
                    event.target.value
                  )
                }
                placeholder="00000-000"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Complemento
              </label>

              <input
                type="text"
                value={
                  organization.addressComplement ??
                  ""
                }
                onChange={(event) =>
                  updateField(
                    "addressComplement",
                    event.target.value
                  )
                }
                placeholder="Prédio, bloco, sala..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Cidade
              </label>

              <input
                type="text"
                value={
                  organization.city ??
                  ""
                }
                onChange={(event) =>
                  updateField(
                    "city",
                    event.target.value
                  )
                }
                placeholder="Ex.: Belém"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Estado
              </label>

              <input
                type="text"
                value={
                  organization.state ??
                  ""
                }
                onChange={(event) =>
                  updateField(
                    "state",
                    event.target.value
                  )
                }
                placeholder="Ex.: Pará"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Documentos
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Personalização usada na geração de documentos.
            </p>
          </div>

          <div className="space-y-5 p-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Logo para documentos
              </label>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-500">
                  {organization.documentLogoUrl ||
                  organization.logoUrl ? (
                    <img
                      src={
                        organization.documentLogoUrl ||
                        organization.logoUrl ||
                        ""
                      }
                      alt="Logo para documentos"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    "Sem logo"
                  )}
                </div>

                <div>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={
                      handleDocumentLogoUpload
                    }
                    disabled={
                      uploadingDocumentLogo
                    }
                    className="block text-sm text-gray-600 disabled:opacity-50"
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    {uploadingDocumentLogo
                      ? "Enviando..."
                      : organization.documentLogoUrl
                        ? "Esta imagem será usada nos documentos."
                        : "Se não enviar outra imagem, será usada a logo principal."}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Texto do cabeçalho
              </label>

              <textarea
                value={
                  organization.documentHeaderText ??
                  ""
                }
                onChange={(event) =>
                  updateField(
                    "documentHeaderText",
                    event.target.value
                  )
                }
                rows={3}
                placeholder="Ex.: Campus Profissional - Laboratório de Engenharia Elétrica e Computação"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        {message && (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
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

        <div className="flex justify-end pb-8">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              backgroundColor:
                organization.primaryColor,
            }}
          >
            {saving
              ? "Salvando..."
              : "Salvar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}