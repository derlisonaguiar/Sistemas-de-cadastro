import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isAdministrativeRole, requireAdministrativeAccess } from "@/lib/auth";
import { getDeploymentMode } from "@/lib/deployment-mode";

export default async function AdminPage() {
  const auth = await requireAdministrativeAccess();
  const isSuperadmin = getDeploymentMode() === "multi" && auth.user.role === "SUPERADMIN";
  if (isSuperadmin && !auth.organization) return <div><h1 className="text-2xl font-semibold text-gray-900">Painel da plataforma</h1><p className="mt-2 text-sm text-gray-600">Você está conectado como SUPERADMIN global. As áreas vinculadas a uma organização permanecem indisponíveis até que exista um contexto organizacional.</p></div>;
  const { organization } = auth;
  if (!organization) return null;

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
    <div className="admin-dashboard space-y-7">
      <section className="relative overflow-hidden rounded-2xl border bg-white px-5 py-6 shadow-sm sm:px-7">
        <div className="absolute inset-y-0 left-0 w-1 bg-[var(--admin-primary)]" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--admin-ink)]">Visão geral</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">Olá{auth.user.user_metadata.name ? `, ${auth.user.user_metadata.name.split(" ")[0]}` : ""}.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">Acompanhe os principais indicadores e acesse as rotinas administrativas de {organization.name}.</p>
          </div>
          <div className="rounded-xl border border-[var(--admin-accent-border)] bg-[var(--admin-soft)] px-4 py-3 text-sm">
            <p className="text-xs font-medium text-gray-500">Organização ativa</p>
            <p className="mt-1 font-semibold text-[var(--admin-ink)]">{organization.name}</p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><h2 className="text-base font-semibold text-gray-900">Indicadores principais</h2><p className="mt-1 text-sm text-gray-500">Panorama atual da organização.</p></div>
          <span className="hidden text-xs text-gray-400 sm:block">Clique em um card para ver detalhes</span>
        </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {indicators.map((indicator) => (
          <Link
            key={indicator.label}
            href={indicator.href}
            className="admin-metric admin-card-link group rounded-xl border bg-white p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {indicator.label}
                </p>

                <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-gray-900 sm:text-4xl">
                  {indicator.value}
                </p>
              </div>

              <div className="admin-symbol flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-sm">
                {indicator.symbol}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-3"><p className="text-xs text-gray-500">{indicator.description}</p><span className="admin-card-arrow text-sm" aria-hidden="true">→</span></div>
          </Link>
        ))}
      </div>
      </section>

      {/* Ações rápidas */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Ações rápidas
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Acesse as principais funções do sistema.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickActions.filter(() => isAdministrativeRole(auth.user.role) || isAdministrativeRole(auth.profile?.role)).map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="admin-card-link group flex items-center gap-4 rounded-xl border bg-white p-4"
            >
              <div className="admin-symbol flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-sm">
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
