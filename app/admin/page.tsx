import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isAdministrativeRole, requireAdministrativeAccess } from "@/lib/auth";
import { getDeploymentMode } from "@/lib/deployment-mode";
import DashboardNotifications from "@/components/DashboardNotifications";
import {
  BriefcaseBusiness,
  Building2,
  FilePlus2,
  FileSignature,
  FileText,
  FolderKanban,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";

export default async function AdminPage() {
  const auth = await requireAdministrativeAccess();
  const isSuperadmin = getDeploymentMode() === "multi" && auth.user.role === "SUPERADMIN";
  if (isSuperadmin && !auth.organization)
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Painel da plataforma</h1>
        <p className="mt-2 text-sm text-gray-600">
          Você está conectado como SUPERADMIN global. As áreas vinculadas a uma organização permanecem indisponíveis até
          que exista um contexto organizacional.
        </p>
      </div>
    );
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
      icon: Users,
    },
    {
      label: "Projetos ativos",
      value: activeProjects,
      description: "Projetos em andamento",
      href: "/admin/projetos",
      icon: FolderKanban,
    },
    {
      label: "Clientes",
      value: clients,
      description: "Clientes cadastrados",
      href: "/admin/clientes",
      icon: BriefcaseBusiness,
    },
    {
      label: "Documentos emitidos",
      value: issuedDocuments,
      description: "Documentos registrados",
      href: "/admin/documentos",
      icon: FileText,
    },
  ];

  const quickActions = [
    {
      title: "Novo membro",
      description: "Cadastrar uma nova pessoa na organização",
      href: "/admin/membros/novo",
      icon: UserPlus,
    },
    {
      title: "Gerar documento",
      description: "Emitir termo, declaração ou certificado",
      href: "/admin/documentos/gerar",
      icon: FilePlus2,
    },
    {
      title: "Novo cliente",
      description: "Cadastrar um novo cliente",
      href: "/admin/clientes/novo",
      icon: Building2,
    },
    {
      title: "Novo projeto",
      description: "Criar um novo projeto",
      href: "/admin/projetos/novo",
      icon: FolderKanban,
    },
    {
      title: "Contratos",
      description: "Acessar a gestão de contratos",
      href: "/admin/contratos",
      icon: FileSignature,
    },
    {
      title: "Configurações",
      description: "Dados e identidade da organização",
      href: "/admin/configuracoes",
      icon: Settings,
    },
  ];

  const notifications = [
    {
      title: "Membros sem diretoria",
      description: "Membros ativos sem diretoria vinculada.",
      href: "/admin/membros",
      count: membersWithoutDirectorate,
    },
    {
      title: "Membros sem cargo",
      description: "Membros ativos sem cargo definido.",
      href: "/admin/membros",
      count: membersWithoutPosition,
    },
    {
      title: "Modelos inativos",
      description: "Templates de documentos atualmente desativados.",
      href: "/admin/documentos",
      count: inactiveTemplates,
    },
  ];

  return (
    <div className="admin-dashboard space-y-6">
      <section className="rounded-xl border bg-white px-5 py-4 shadow-sm sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--admin-ink)]">
              Painel administrativo
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
              Olá{auth.user.user_metadata.name ? `, ${auth.user.user_metadata.name.split(" ")[0]}` : ""}.
            </h1>
            <p className="mt-1 text-sm text-gray-500">Visão geral de {organization.name}.</p>
          </div>
          <div className="flex items-center gap-2">
            <DashboardNotifications notifications={notifications} />
            <div className="rounded-lg bg-[var(--admin-soft)] px-3 py-2 text-sm">
              <p className="text-[11px] font-medium text-gray-500">Organização ativa</p>
              <p className="mt-0.5 font-semibold text-[var(--admin-ink)]">{organization.name}</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Indicadores principais</h2>
            <p className="mt-1 text-sm text-gray-500">Panorama atual da organização.</p>
          </div>
          <span className="hidden text-xs text-gray-400 sm:block">Clique em um card para ver detalhes</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {indicators.map((indicator) => (
            <Link
              key={indicator.label}
              href={indicator.href}
              className="admin-metric admin-card-link group rounded-xl border bg-white p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">{indicator.label}</p>

                  <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums text-gray-900">
                    {indicator.value}
                  </p>
                </div>

                <div className="admin-symbol flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                  <indicator.icon aria-hidden="true" size={18} strokeWidth={1.8} />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs text-gray-500">{indicator.description}</p>
                <span className="admin-card-arrow text-sm" aria-hidden="true">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Ações rápidas */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Ações rápidas</h2>

          <p className="mt-1 text-sm text-gray-500">Acesse as principais funções do sistema.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickActions
            .filter(() => isAdministrativeRole(auth.user.role) || isAdministrativeRole(auth.profile?.role))
            .map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="admin-card-link group flex items-center gap-3 rounded-lg border bg-white px-4 py-3"
              >
                <div className="admin-symbol flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                  <action.icon aria-hidden="true" size={16} strokeWidth={1.8} />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{action.title}</p>

                  <p className="mt-0.5 text-xs leading-4 text-gray-500">{action.description}</p>
                </div>

                <span className="admin-card-arrow ml-auto text-sm">→</span>
              </Link>
            ))}
        </div>
      </section>

      <section className="admin-dashboard-panel rounded-xl border bg-white p-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Estrutura da organização</h2>

          <p className="mt-1 text-xs text-gray-500">Resumo da composição atual da empresa.</p>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <span className="text-sm text-gray-500">Presidente</span>

            {president ? (
              <Link
                href={`/admin/membros/${president.id}`}
                className="mt-1 block text-sm font-medium text-gray-900 hover:text-[var(--admin-ink)]"
              >
                {president.fullName}
              </Link>
            ) : (
              <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                Não definido
              </span>
            )}
          </div>

          <div>
            <span className="text-sm text-gray-500">Vice-Presidente</span>

            {vicePresident ? (
              <Link
                href={`/admin/membros/${vicePresident.id}`}
                className="mt-1 block text-sm font-medium text-gray-900 hover:text-[var(--admin-ink)]"
              >
                {vicePresident.fullName}
              </Link>
            ) : (
              <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                Não definido
              </span>
            )}
          </div>

          <div>
            <span className="text-sm text-gray-500">Diretorias cadastradas</span>

            <span className="mt-1 block text-sm font-semibold text-gray-900">{directorates}</span>
          </div>

          <div>
            <span className="text-sm text-gray-500">Cargos cadastrados</span>

            <span className="mt-1 block text-sm font-semibold text-gray-900">{positions}</span>
          </div>

          <div>
            <span className="text-sm text-gray-500">Total de membros ativos</span>

            <span className="mt-1 block text-sm font-semibold text-gray-900">{activeMembers}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
