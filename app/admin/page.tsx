import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedProfile } from "@/lib/auth";

export default async function AdminPage() {
  const { organization, profile } = await requireAuthenticatedProfile();

  const [
    activeMembers,
    activeProjects,
    clients,
    issuedDocuments,
    directorates,
    positions,
    president,
    vicePresident,
    membersWithoutDirectorate,
    membersWithoutPosition,
    inactiveTemplates,
  ] = await Promise.all([
    prisma.member.count({
      where: {
        organizationId: organization.id,
        status: "ACTIVE",
      },
    }),

    prisma.project.count({
      where: {
        organizationId: organization.id,
        status: "ACTIVE",
      },
    }),

    prisma.client.count({
      where: {
        organizationId: organization.id,
      },
    }),

    prisma.document.count({
      where: {
        organizationId: organization.id,
        status: "ISSUED",
      },
    }),

    prisma.directorate.count({
      where: {
        organizationId: organization.id,
      },
    }),

    prisma.position.count({
      where: {
        organizationId: organization.id,
      },
    }),

    prisma.member.findFirst({
      where: {
        organizationId: organization.id,
        status: "ACTIVE",
        position: {
          role: "PRESIDENT",
        },
      },

      select: {
        id: true,
        fullName: true,
      },
    }),

    prisma.member.findFirst({
      where: {
        organizationId: organization.id,
        status: "ACTIVE",
        position: {
          role: "VICE_PRESIDENT",
        },
      },

      select: {
        id: true,
        fullName: true,
      },
    }),

    prisma.member.count({
      where: {
        organizationId: organization.id,
        status: "ACTIVE",
        directorateId: null,
      },
    }),

    prisma.member.count({
      where: {
        organizationId: organization.id,
        status: "ACTIVE",
        positionId: null,
      },
    }),

    prisma.documentTemplate.count({
      where: {
        organizationId: organization.id,
        active: false,
      },
    }),
  ]);

  const indicators = [
    {
      label: "Membros ativos",
      value: activeMembers,
      description: "Na organização atualmente",
      href: "/admin/membros",
      symbol: "M",
    },
    {
      label: "Projetos ativos",
      value: activeProjects,
      description: "Projetos em andamento",
      href: "/admin/projetos",
      symbol: "P",
    },
    {
      label: "Clientes",
      value: clients,
      description: "Clientes cadastrados",
      href: "/admin/clientes",
      symbol: "C",
    },
    {
      label: "Documentos emitidos",
      value: issuedDocuments,
      description: "Documentos registrados",
      href: "/admin/documentos",
      symbol: "D",
    },
  ];

  const quickActions = [
    {
      title: "Novo membro",
      description: "Cadastrar uma nova pessoa na organização",
      href: "/admin/membros/novo",
      symbol: "+",
    },
    {
      title: "Gerar documento",
      description: "Emitir termo, declaração ou certificado",
      href: "/admin/documentos/gerar",
      symbol: "D",
    },
    {
      title: "Novo cliente",
      description: "Cadastrar um novo cliente",
      href: "/admin/clientes/novo",
      symbol: "C",
    },
    {
      title: "Novo projeto",
      description: "Criar um novo projeto",
      href: "/admin/projetos/novo",
      symbol: "P",
    },
    {
      title: "Contratos",
      description: "Acessar a gestão de contratos",
      href: "/admin/contratos",
      symbol: "CT",
    },
    {
      title: "Configurações",
      description: "Dados e identidade da organização",
      href: "/admin/configuracoes",
      symbol: "⚙",
    },
  ];

  const totalPendencies =
    membersWithoutDirectorate +
    membersWithoutPosition +
    inactiveTemplates;

  return (
    <div className="admin-dashboard space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Visão geral da {organization.name}.
        </p>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {indicators.map((indicator) => (
          <Link
            key={indicator.label}
            href={indicator.href}
            className="admin-metric admin-card-link group rounded-xl border bg-white p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {indicator.label}
                </p>

                <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums text-gray-900">
                  {indicator.value}
                </p>
              </div>

              <div className="admin-symbol flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
                {indicator.symbol}
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              {indicator.description}
            </p>
          </Link>
        ))}
      </div>

      {/* Ações rápidas */}
      <section>
        <div className="mb-3">
          <h2 className="text-base font-semibold text-gray-900">
            Ações rápidas
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Acesse as principais funções do sistema.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickActions.filter(action => profile.role === "ADMIN" || action.href === "/admin/contratos").map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="admin-card-link group flex items-center gap-3 rounded-xl border bg-white p-4"
            >
              <div className="admin-symbol flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
                {action.symbol}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {action.title}
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {action.description}
                </p>
              </div>

              <span className="admin-card-arrow ml-auto text-sm">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Estrutura + Pendências */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Estrutura */}
        <section className="admin-dashboard-panel overflow-hidden rounded-xl border bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-900">
              Estrutura da organização
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Resumo da composição atual da empresa.
            </p>
          </div>

          <div className="divide-y divide-gray-100 px-5">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-4">
              <span className="text-sm text-gray-500">
                Presidente
              </span>

              {president ? (
                <Link
                  href={`/admin/membros/${president.id}`}
                  className="text-sm font-medium text-gray-900 hover:text-[var(--admin-ink)]"
                >
                  {president.fullName}
                </Link>
              ) : (
                <span className="text-sm font-medium text-amber-600">
                  Não definido
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-4">
              <span className="text-sm text-gray-500">
                Vice-Presidente
              </span>

              {vicePresident ? (
                <Link
                  href={`/admin/membros/${vicePresident.id}`}
                  className="text-sm font-medium text-gray-900 hover:text-[var(--admin-ink)]"
                >
                  {vicePresident.fullName}
                </Link>
              ) : (
                <span className="text-sm font-medium text-amber-600">
                  Não definido
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-4">
              <span className="text-sm text-gray-500">
                Diretorias cadastradas
              </span>

              <span className="text-sm font-semibold text-gray-900">
                {directorates}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-4">
              <span className="text-sm text-gray-500">
                Cargos cadastrados
              </span>

              <span className="text-sm font-semibold text-gray-900">
                {positions}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-4">
              <span className="text-sm text-gray-500">
                Total de membros ativos
              </span>

              <span className="text-sm font-semibold text-gray-900">
                {activeMembers}
              </span>
            </div>
          </div>
        </section>

        {/* Pendências */}
        <section className="admin-dashboard-panel overflow-hidden rounded-xl border bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Pendências
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Pontos que podem precisar de atenção.
              </p>
            </div>

            <div
              className={`flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm font-semibold ${
                totalPendencies === 0
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {totalPendencies}
            </div>
          </div>

          <div className="divide-y divide-gray-100 px-5">
            <Link
              href="/admin/membros"
              className="flex items-center justify-between gap-4 py-4"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Membros sem diretoria
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Membros ativos sem diretoria vinculada.
                </p>
              </div>

              <StatusNumber
                value={membersWithoutDirectorate}
              />
            </Link>

            <Link
              href="/admin/membros"
              className="flex items-center justify-between gap-4 py-4"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Membros sem cargo
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Membros ativos sem cargo definido.
                </p>
              </div>

              <StatusNumber
                value={membersWithoutPosition}
              />
            </Link>

            <Link
              href="/admin/documentos"
              className="flex items-center justify-between gap-4 py-4"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Modelos inativos
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Templates de documentos atualmente desativados.
                </p>
              </div>

              <StatusNumber
                value={inactiveTemplates}
              />
            </Link>
          </div>

          {totalPendencies === 0 && (
            <div className="border-t border-gray-100 bg-green-50/60 px-5 py-4">
              <p className="text-sm font-medium text-green-700">
                Tudo certo por aqui.
              </p>

              <p className="mt-1 text-xs text-green-600">
                Nenhuma pendência administrativa encontrada.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatusNumber({
  value,
}: {
  value: number;
}) {
  if (value === 0) {
    return (
      <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
        OK
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
      {value}
    </span>
  );
}
