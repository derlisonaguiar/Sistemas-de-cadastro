"use client";

import { AdminOnly } from "@/components/AccessProvider";
import Link from "next/link";
import { useEffect, useState } from "react";

type Contract = {
  id: string;
  title: string;
  contractNumber: string | null;
  value: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  signatureDate: string | null;

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

function formatCurrency(value: string | null) {
  if (!value) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

export default function ContratosPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [organization, setOrganization] =
    useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [contractsResponse, organizationResponse] =
          await Promise.all([
            fetch("/api/contracts"),
            fetch("/api/organization"),
          ]);

        const contractsData = await contractsResponse.json();
        const organizationData =
          await organizationResponse.json();

        if (contractsData.ok) {
          setContracts(contractsData.contracts);
        }

        if (organizationData.ok) {
          setOrganization(organizationData.organization);
        }
      } catch (error) {
        console.error("Erro ao carregar contratos:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredContracts = contracts.filter((contract) => {
    const term = search.toLowerCase();

    return (
      contract.title.toLowerCase().includes(term) ||
      contract.contractNumber?.toLowerCase().includes(term) ||
      contract.client.name.toLowerCase().includes(term) ||
      contract.client.companyName?.toLowerCase().includes(term) ||
      contract.project?.name.toLowerCase().includes(term)
    );
  });

  const primaryColor =
    organization?.primaryColor || "#6D28D9";

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Contratos
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Gerencie os contratos de clientes e projetos.
          </p>
        </div>

        <AdminOnly><Link
          href="/admin/contratos/novo"
          style={{ backgroundColor: primaryColor }}
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
        >
          + Novo contrato
        </Link></AdminOnly>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por contrato, cliente ou projeto..."
          className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="p-6 text-sm text-gray-600">
            Carregando contratos...
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Nenhum contrato encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 font-medium text-gray-600">
                    Contrato
                  </th>

                  <th className="px-5 py-3 font-medium text-gray-600">
                    Cliente
                  </th>

                  <th className="px-5 py-3 font-medium text-gray-600">
                    Projeto
                  </th>

                  <th className="px-5 py-3 font-medium text-gray-600">
                    Valor
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
                {filteredContracts.map((contract) => (
                  <tr key={contract.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">
                        {contract.title}
                      </p>

                      <p className="text-xs text-gray-500">
                        {contract.contractNumber ||
                          "Sem número"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {contract.client.name}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {contract.project?.name || "—"}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {formatCurrency(contract.value)}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        {statusLabel(contract.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/contratos/${contract.id}`}
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