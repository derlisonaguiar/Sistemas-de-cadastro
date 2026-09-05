"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Document = {
  id: string;
  title: string;
  type: string;
  status: string;
  description: string | null;
  fileUrl: string | null;
  generatedDocxUrl: string | null;
  generatedPdfUrl: string | null;
  signedFile: string | null;
  signedAt: string | null;
  issueDate: string | null;
  signatureDate: string | null;

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

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(value));
}

export default function DocumentoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [organization, setOrganization] =
    useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  async function uploadSigned(file: File) {
    setUploading(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch(`/api/documents/${id}/signed`, { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Falha no envio.");
      const refreshed = await fetch(`/api/documents/${id}`);
      const data = await refreshed.json();
      if (!refreshed.ok) throw new Error("Arquivo enviado. Recarregue a página para atualizar.");
      setDocument(data.document);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no envio.");
    } finally { setUploading(false); }
  }

  useEffect(() => {
    async function loadData() {
      try {
        const [documentResponse, organizationResponse] =
          await Promise.all([
            fetch(`/api/documents/${id}`),
            fetch("/api/organization"),
          ]);

        const documentData = await documentResponse.json();
        const organizationData =
          await organizationResponse.json();

        if (documentData.ok) {
          setDocument(documentData.document);
        } else {
          setMessage(
            documentData.message ||
              "Documento não encontrado."
          );
        }

        if (organizationData.ok) {
          setOrganization(organizationData.organization);
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

  async function handleDelete() {
    if (!document) return;

    const confirmed = window.confirm(
      `Deseja realmente excluir o documento "${document.title}"?`
    );

    if (!confirmed) return;

    const response = await fetch(
      `/api/documents/${document.id}`,
      {
        method: "DELETE",
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      setMessage(
        data.message || "Erro ao excluir documento."
      );
      return;
    }

    router.push("/admin/documentos");
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-600">
        Carregando documento...
      </div>
    );
  }

  if (!document) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Documento não encontrado
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
              {document.title}
            </h1>

            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
              {statusLabel(document.status)}
            </span>
          </div>

          <p className="mt-1 text-sm text-gray-600">
            {typeLabel(document.type)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(document.generatedPdfUrl || document.generatedDocxUrl) && (
            <a href={document.generatedPdfUrl || document.generatedDocxUrl || undefined} target="_blank" rel="noopener noreferrer" className="rounded-md border px-4 py-2 text-sm">Abrir original gerado</a>
          )}
          {document.signedFile ? (
            <a href={document.signedFile} target="_blank" rel="noopener noreferrer" className="rounded-md border px-4 py-2 text-sm">Abrir assinado · enviado em {formatDate(document.signedAt)}</a>
          ) : (
            <label className="rounded-md border px-4 py-2 text-sm">
              {uploading ? "Enviando..." : "Enviar assinado (PDF, até 10 MB)"}
              <input type="file" accept="application/pdf,.pdf" disabled={uploading} className="block text-xs" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadSigned(file);
                event.target.value = "";
              }} />
            </label>
          )}
          {document.fileUrl && (
            <a
              href={document.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Abrir arquivo
            </a>
          )}

          <Link
            href={`/admin/documentos/${document.id}/editar`}
            style={{ backgroundColor: primaryColor }}
            className="rounded-md px-4 py-2 text-sm font-medium text-white"
          >
            Editar documento
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
              Documento
            </h2>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Tipo
              </p>

              <p className="mt-1 text-sm text-gray-900">
                {typeLabel(document.type)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Status
              </p>

              <p className="mt-1 text-sm text-gray-900">
                {statusLabel(document.status)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Emissão
              </p>

              <p className="mt-1 text-sm text-gray-900">
                {formatDate(document.issueDate)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Assinatura
              </p>

              <p className="mt-1 text-sm text-gray-900">
                {formatDate(document.signatureDate)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Vínculos
            </h2>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Membro
              </p>

              <p className="mt-1 text-sm text-gray-900">
                {document.member?.fullName || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Cliente
              </p>

              <p className="mt-1 text-sm text-gray-900">
                {document.client?.name || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Projeto
              </p>

              <p className="mt-1 text-sm text-gray-900">
                {document.project?.name || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Contrato
              </p>

              <p className="mt-1 text-sm text-gray-900">
                {document.contract?.title || "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white lg:col-span-2">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Descrição
            </h2>
          </div>

          <div className="p-5">
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {document.description ||
                "Nenhuma descrição cadastrada."}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
