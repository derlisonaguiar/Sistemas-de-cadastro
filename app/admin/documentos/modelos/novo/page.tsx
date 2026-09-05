"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NovoDocumentoPage() {
  const router = useRouter();

  const [file, setFile] =
    useState<File | null>(null);

  const [name, setName] =
    useState("");

  const [type, setType] =
    useState("VOLUNTEER_TERM");

  const [description, setDescription] =
    useState("");

  const [uploading, setUploading] =
    useState(false);

  const [success, setSuccess] =
    useState("");

  const [error, setError] =
    useState("");

  const [unknownFields, setUnknownFields] =
    useState<string[]>([]);

  const [reviewTemplate, setReviewTemplate] = useState<null | {
    id: string;
    needsReview: boolean;
    requiresOcr: boolean;
    fields: Array<{ id: string; label: string; mappedPath: string | null; confidence: number | null; context: string | null }>;
  }>(null);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] || null;

    setFile(selectedFile);

    setSuccess("");
    setError("");
    setUnknownFields([]);

    if (
      selectedFile &&
      !name.trim()
    ) {
      const suggestedName =
        selectedFile.name
          .replace(/\.(docx|pdf)$/i, "")
          .replace(/[_-]+/g, " ")
          .trim();

      setName(suggestedName);
    }
  }

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setSuccess("");
    setError("");
    setUnknownFields([]);

    if (!file) {
      setError(
        "Selecione um arquivo DOCX ou PDF."
      );

      return;
    }

    if (!name.trim()) {
      setError(
        "Informe o nome do modelo."
      );

      return;
    }

    try {
      setUploading(true);

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "name",
        name.trim()
      );

      formData.append(
        "type",
        type
      );

      formData.append(
        "description",
        description.trim()
      );

      const response =
        await fetch(
          "/api/document-templates/upload",
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
        setError(
          data.message ||
            "Erro ao enviar o modelo."
        );

        if (
          Array.isArray(
            data.unknownFields
          )
        ) {
          setUnknownFields(
            data.unknownFields
          );
        }

        return;
      }

      setSuccess(
        data.message ||
          "Modelo enviado e validado com sucesso."
      );

      setReviewTemplate({
        id: data.template.id,
        needsReview: Boolean(data.needsReview),
        requiresOcr: Boolean(data.requiresOcr),
        fields: Array.isArray(data.template.fields) ? data.template.fields : [],
      });

      if (!data.needsReview && !data.requiresOcr) setTimeout(() => {
        router.push(
          "/admin/documentos/modelos"
        );

        router.refresh();
      }, 1200);
    } catch (error) {
      console.error(
        "Erro ao enviar modelo:",
        error
      );

      setError(
        "Erro ao enviar o modelo."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Novo modelo de documento
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Envie um arquivo DOCX ou PDF.
          O sistema analisará automaticamente
          as variáveis antes de salvar.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Arquivo
            </h2>
          </div>

          <div className="p-5">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Modelo DOCX ou PDF *
            </label>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center transition hover:border-[var(--admin-accent-border)] hover:bg-[var(--admin-soft)]">
              <span className="text-sm font-medium text-gray-800">
                Clique para selecionar
                o arquivo
              </span>

              <span className="mt-1 text-xs text-gray-500">
                DOCX ou PDF de até 10 MB
              </span>

              <input
                type="file"
                accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                onChange={
                  handleFileChange
                }
                className="hidden"
              />
            </label>

            {file && (
              <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3">
                <p className="text-sm font-medium text-green-800">
                  Arquivo selecionado
                </p>

                <p className="mt-1 text-sm text-green-700">
                  {file.name}
                </p>

                <p className="mt-1 text-xs text-green-600">
                  {(
                    file.size /
                    1024
                  ).toFixed(1)}{" "}
                  KB
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Informações do modelo
            </h2>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nome do modelo *
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                required
                placeholder="Ex.: Termo de Voluntariado"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tipo *
              </label>

              <select
                value={type}
                onChange={(event) =>
                  setType(
                    event.target.value
                  )
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

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Descrição
              </label>

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                rows={3}
                placeholder="Descrição opcional"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">
            Como preparar o DOCX
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Insira as variáveis diretamente
            no Word, no local em que os dados
            devem aparecer.
          </p>

          <div className="mt-4 space-y-1 rounded-md bg-gray-50 p-4 font-mono text-xs text-gray-700">
            <p>
              {"{{ organization.logoImage }}"}
            </p>

            <p>
              {"{{ organization.name }}"}
            </p>

            <p>
              {"{{ organization.cnpj }}"}
            </p>

            <p>
              {"{{ member.fullName }}"}
            </p>

            <p>
              {"{{ representative.fullName }}"}
            </p>

            <p>
              {"{{ system.currentDate }}"}
            </p>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            A logo será obtida automaticamente
            das configurações da organização
            durante a geração do documento.
          </p>
        </section>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-medium">
              {error}
            </p>

            {unknownFields.length >
              0 && (
              <div className="mt-3">
                <p className="mb-2">
                  Variáveis não reconhecidas:
                </p>

                <div className="space-y-1 font-mono text-xs">
                  {unknownFields.map(
                    (field) => (
                      <p key={field}>
                        {"{{ "}
                        {field}
                        {" }}"}
                      </p>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {success && (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {reviewTemplate && (reviewTemplate.needsReview || reviewTemplate.requiresOcr) && (
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-semibold text-amber-900">Resultado do processamento</h2>
            {reviewTemplate.requiresOcr ? (
              <p className="mt-2 text-sm text-amber-800">
                O PDF não contém texto suficiente e foi marcado como requerendo OCR. Nenhum texto foi inventado.
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm text-amber-800">
                  Confirme ou corrija os campos sugeridos antes de usar o modelo.
                </p>
                <div className="mt-4 space-y-2">
                  {reviewTemplate.fields.map((field) => (
                    <div key={field.id} className="rounded-md border border-amber-200 bg-white p-3 text-sm">
                      <p className="font-medium text-gray-900">{field.label}</p>
                      <p className="mt-1 font-mono text-xs text-gray-600">{field.mappedPath || "Sem sugestão"}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Confiança: {field.confidence == null ? "—" : `${Math.round(field.confidence * 100)}%`}
                      </p>
                      {field.context && <p className="mt-2 text-xs text-gray-500">{field.context}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}
            <button
              type="button"
              onClick={() => router.push(`/admin/documentos/modelos/${reviewTemplate.id}`)}
              className="mt-4 rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
            >
              Revisar e confirmar mapeamentos
            </button>
          </section>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/documentos"
              )
            }
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={
              uploading ||
              !file ||
              !name.trim()
            }
            className="rounded-md bg-[var(--admin-primary)] px-5 py-2 text-sm font-medium text-[var(--admin-on-primary)] hover:bg-[var(--admin-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading
              ? "Validando..."
              : "Enviar modelo"}
          </button>
        </div>
      </form>
    </div>
  );
}
