"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Contract = {
  id: string;
  title: string;
  description: string | null;
  contractNumber: string | null;
  value: string | null;
  startDate: string | null;
  endDate: string | null;
  signatureDate: string | null;
  status: string;
  notes: string | null;

  client: {
    id: string;
    name: string;
    companyName: string | null;
  };

  project: {
    id: string;
    name: string;
  } | null;
};

type Organization = {
  primaryColor: string;
};

function statusLabel(status: string) {
  switch (status) {
    case "DRAFT":
      return "Rascunho";
    case "PENDING_SIGNATURE":
      return "Aguardando assinatura";
    case "ACTIVE":
      return "Ativo";
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

export default function ContratoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [organization, setOrganization] =
    useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [contractResponse, organizationResponse] =
          await Promise.all([
            fetch(`/api/contracts/${id}`),
            fetch("/api/organization"),
          ]);

        const contractData = await contractResponse.json();
        const organizationData =
          await organizationResponse.json();

        if (contractData.ok) {
          setContract(contractData.contract);
        } else {
          setMessage(
            contractData.message || "Contrato não encontrado."
          );
        }

        if (organizationData.ok) {
          setOrganization(organizationData.organization);
        }
      } catch (error) {
        console.error("Erro ao carregar contrato:", error);
        setMessage("Erro ao carregar contrato.");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

  async function handleDelete() {
    if (!contract) return;

    const confirmed = window.confirm(
      `Deseja realmente excluir o contrato "${contract.title}"?`
    );

    if (!confirmed) return;

    const response = await fetch(
      `/api/contracts/${contract.id}`,
      {
        method: "DELETE",
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      setMessage(data.message || "Erro ao excluir contrato.");
      return;
    }

    router.push("/admin/contratos");
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-600">
        Carregando contrato...
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Contrato não encontrado
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
              {contract.title}
            </h1>

            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
              {statusLabel(contract.status)}
            </span>
          </div>

          <p className="mt-1 text-sm text-gray-600">
            {contract.contractNumber
              ? `Contrato ${contract.contractNumber}`
              : "Contrato sem número"}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/admin/contratos/${contract.id}/editar`}
            style={{ backgroundColor: primaryColor }}
            className="rounded-md px-4 py-2 text-sm font-medium text-white"
          >
            Editar contrato
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Vínculos
            </h2>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Cliente
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {contract.client.name}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Projeto
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {contract.project?.name || "Sem projeto"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Valor
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatCurrency(contract.value)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Status
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {statusLabel(contract.status)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Datas
            </h2>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Início
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(contract.startDate)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Término
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(contract.endDate)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Assinatura
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(contract.signatureDate)}
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
              {contract.description ||
                "Nenhuma descrição cadastrada."}
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white lg:col-span-2">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Observações
            </h2>
          </div>

          <div className="p-5">
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {contract.notes ||
                "Nenhuma observação cadastrada."}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}