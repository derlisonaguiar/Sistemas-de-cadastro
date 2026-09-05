"use client";

import { AdminOnly } from "@/components/AccessProvider";
import Link from "next/link";
import { useEffect, useState } from "react";

type Client = {
  id: string;
  name: string;
  companyName: string | null;
  cpfCnpj: string | null;
  email: string | null;
  phone: string | null;
  contactName: string | null;
  active: boolean;
};

type Organization = {
  primaryColor: string;
};

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [clientsResponse, organizationResponse] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/organization"),
        ]);

        const clientsData = await clientsResponse.json();
        const organizationData = await organizationResponse.json();

        if (clientsData.ok) {
          setClients(clientsData.clients);
        }

        if (organizationData.ok) {
          setOrganization(organizationData.organization);
        }
      } catch (error) {
        console.error("Erro ao carregar clientes:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredClients = clients.filter((client) => {
    const term = search.toLowerCase();

    return (
      client.name.toLowerCase().includes(term) ||
      client.companyName?.toLowerCase().includes(term) ||
      client.cpfCnpj?.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term) ||
      client.phone?.toLowerCase().includes(term) ||
      client.contactName?.toLowerCase().includes(term)
    );
  });

  const primaryColor = organization?.primaryColor || "#6D28D9";

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Clientes
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Gerencie os clientes da organização.
          </p>
        </div>

        <AdminOnly><Link
          href="/admin/clientes/novo"
          style={{ backgroundColor: primaryColor }}
          className="rounded-md px-4 py-2 text-sm font-medium text-white"
        >
          + Novo cliente
        </Link></AdminOnly>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nome, empresa, CPF/CNPJ, e-mail..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {loading ? (
          <div className="p-6 text-sm text-gray-600">
            Carregando clientes...
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Nenhum cliente encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 font-medium text-gray-600">
                    Cliente
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-600">
                    CPF/CNPJ
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-600">
                    Contato
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
                {filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">
                        {client.name}
                      </p>

                      <p className="text-xs text-gray-500">
                        {client.companyName || "Pessoa física"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {client.cpfCnpj || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-gray-700">
                        {client.email || "—"}
                      </p>

                      <p className="text-xs text-gray-500">
                        {client.phone || ""}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          client.active
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {client.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/clientes/${client.id}`}
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