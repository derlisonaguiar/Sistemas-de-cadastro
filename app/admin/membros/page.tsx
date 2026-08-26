"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Directorate = {
  id: string;
  name: string;
};

type Position = {
  id: string;
  name: string;
};

type Member = {
  id: string;
  fullName: string;
  email: string | null;
  cpf: string | null;
  phone: string | null;
  course: string | null;
  registration: string | null;
  entryDate: string | null;
  exitDate: string | null;
  status: "ACTIVE" | "INACTIVE" | "LEAVE" | "ALUMNI";

  directorate: Directorate | null;
  position: Position | null;
};

type Organization = {
  primaryColor: string;
};

const statusLabels = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  LEAVE: "Afastado",
  ALUMNI: "Egresso",
};

export default function MembrosPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [organization, setOrganization] =
    useState<Organization | null>(null);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [
          membersResponse,
          organizationResponse,
        ] = await Promise.all([
          fetch("/api/members"),
          fetch("/api/organization"),
        ]);

        const membersData =
          await membersResponse.json();

        const organizationData =
          await organizationResponse.json();

        if (membersData.ok) {
          setMembers(
            membersData.members
          );
        }

        if (organizationData.ok) {
          setOrganization(
            organizationData.organization
          );
        }
      } catch (error) {
        console.error(
          "Erro ao carregar membros:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const primaryColor =
    organization?.primaryColor ??
    "#5B21B6";

  const filteredMembers =
    members.filter((member) => {
      const term =
        search
          .trim()
          .toLowerCase();

      if (!term) {
        return true;
      }

      return (
        member.fullName
          .toLowerCase()
          .includes(term) ||
        member.email
          ?.toLowerCase()
          .includes(term) ||
        member.cpf
          ?.toLowerCase()
          .includes(term) ||
        member.course
          ?.toLowerCase()
          .includes(term) ||
        member.registration
          ?.toLowerCase()
          .includes(term) ||
        member.directorate
          ?.name
          .toLowerCase()
          .includes(term) ||
        member.position
          ?.name
          .toLowerCase()
          .includes(term)
      );
    });

  if (loading) {
    return (
      <div className="text-sm text-gray-600">
        Carregando membros...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Membros
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Gerencie os membros da organização.
          </p>
        </div>

        <Link
          href="/admin/membros/novo"
          className="rounded-md px-4 py-2 text-sm font-medium text-white transition"
          style={{
            backgroundColor:
              primaryColor,
          }}
        >
          + Novo membro
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <div className="max-w-md">
            <input
              type="search"
              placeholder="Buscar por nome, diretoria, cargo, curso ou e-mail..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {filteredMembers.length ===
        0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-gray-700">
              Nenhum membro encontrado.
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {members.length === 0
                ? "Cadastre o primeiro membro da organização."
                : "Tente alterar os termos da busca."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    Nome
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Diretoria
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Cargo
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Curso
                  </th>

                  <th className="px-4 py-3 font-medium">
                    E-mail
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Status
                  </th>

                  <th className="px-4 py-3 font-medium">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredMembers.map(
                  (member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {member.fullName}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {member
                          .directorate
                          ?.name ||
                          "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {member
                          .position
                          ?.name ||
                          "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {member.course ||
                          "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {member.email ||
                          "—"}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                          {
                            statusLabels[
                              member.status
                            ]
                          }
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/membros/${member.id}`}
                          className="text-sm font-medium"
                          style={{
                            color:
                              primaryColor,
                          }}
                        >
                          Ver detalhes
                        </Link>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}