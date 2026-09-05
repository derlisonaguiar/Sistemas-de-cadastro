"use client";
import { AdminOnly } from "@/components/AccessProvider";
import EntityDocuments from "@/components/documents/EntityDocuments";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Client = {
  id: string;
  name: string;
  companyName: string | null;
  cpfCnpj: string | null;
  email: string | null;
  phone: string | null;
  contactName: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
};

type Organization = {
  primaryColor: string;
};

export default function ClientePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [organization, setOrganization] =
    useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [clientResponse, organizationResponse] =
          await Promise.all([
            fetch(`/api/clients/${id}`),
            fetch("/api/organization"),
          ]);

        const clientData = await clientResponse.json();
        const organizationData =
          await organizationResponse.json();

        if (clientData.ok) {
          setClient(clientData.client);
        } else {
          setMessage(clientData.message || "Cliente não encontrado.");
        }

        if (organizationData.ok) {
          setOrganization(organizationData.organization);
        }
      } catch (error) {
        console.error("Erro ao carregar cliente:", error);
        setMessage("Erro ao carregar cliente.");
      } finally {
        setLoading(false);
      }
    }


    if (id) void loadData();
  }, [id]);

  async function handleToggleActive() {
    if (!client) return;

    const response = await fetch(`/api/clients/${client.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...client,
        active: !client.active,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      setMessage(data.message || "Erro ao alterar cliente.");
      return;
    }

    setClient(data.client);
  }

  async function handleDelete() {
    if (!client) return;

    const confirmed = window.confirm(
      `Deseja realmente excluir o cliente "${client.name}"?`
    );

    if (!confirmed) return;

    const response = await fetch(`/api/clients/${client.id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      setMessage(data.message || "Erro ao excluir cliente.");
      return;
    }

    router.push("/admin/clientes");
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-600">
        Carregando cliente...
      </div>
    );
  }

  if (!client) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Cliente não encontrado
        </h1>

        {message && (
          <p className="mt-2 text-sm text-red-600">
            {message}
          </p>
        )}
      </div>
    );
  }

  const primaryColor = `var(--admin-primary, ${organization?.primaryColor})`;

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">
              {client.name}
            </h1>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                client.active
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {client.active ? "Ativo" : "Inativo"}
            </span>
          </div>

          <p className="mt-1 text-sm text-gray-600">
            Dados e informações do cliente.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <AdminOnly><Link
            href={`/admin/clientes/${client.id}/editar`}
            style={{ backgroundColor: primaryColor }}
            className="rounded-md px-4 py-2 text-sm font-medium text-white"
          >
            Editar cliente
          </Link></AdminOnly>

          <AdminOnly><button
            type="button"
            onClick={handleToggleActive}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {client.active ? "Desativar" : "Ativar"}
          </button></AdminOnly>

          <AdminOnly><button
            type="button"
            onClick={handleDelete}
            className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Excluir
          </button></AdminOnly>
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
              Identificação
            </h2>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Nome
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {client.name}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Razão social / Empresa
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {client.companyName || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                CPF / CNPJ
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {client.cpfCnpj || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Pessoa de contato
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {client.contactName || "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Contato
            </h2>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                E-mail
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {client.email || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase text-gray-500">
                Telefone
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {client.phone || "—"}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase text-gray-500">
                Endereço
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {client.address || "—"}
              </p>
            </div>
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
              {client.notes || "Nenhuma observação cadastrada."}
            </p>
          </div>
        </section>
      </div>
      <EntityDocuments entityKey="clientId" entityId={client.id} />
    </div>
  );
}