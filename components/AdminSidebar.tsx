"use client";

import { AdminOnly } from "@/components/AccessProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Organization = {
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  primaryColor: string;
};

const menuItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Membros", href: "/admin/membros" },
  { label: "Clientes", href: "/admin/clientes" },
  { label: "Contratos", href: "/admin/contratos" },
  { label: "Documentos", href: "/admin/documentos" },
  { label: "Projetos", href: "/admin/projetos" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [organization, setOrganization] = useState<Organization | null>(null);

  useEffect(() => {
    async function loadOrganization() {
      try {
        const response = await fetch("/api/organization");
        const data = await response.json();

        if (data.ok) {
          setOrganization(data.organization);
        }
      } catch (error) {
        console.error("Erro ao carregar organização:", error);
      }
    }

    loadOrganization();
  }, []);

  const organizationName = organization?.name ?? "Sistema de Gestão";
  const organizationShortName = organization?.shortName ?? "SG";


  function isActive(href: string) {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return pathname.startsWith(href);
  }

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand flex items-center gap-3">
        {organization?.logoUrl ? (
          <img
            src={organization.logoUrl}
            alt={organizationName}
            className="h-10 w-10 shrink-0 object-contain"
          />
        ) : (
          <div
            className="admin-brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold"
          >
            {organizationShortName}
          </div>
        )}

        <div className="min-w-0">
          <p className="text-xs text-gray-500">
            Sistema de Gestão
          </p>

          <h1 className="truncate text-sm font-semibold text-gray-900">
            {organizationName}
          </h1>
        </div>
      </div>

      <nav className="admin-navigation">
        <ul className="admin-menu space-y-1">
          {menuItems.map((item) => {
            const active = isActive(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="admin-nav-link"
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
          <AdminOnly><li className="admin-nav-settings">
            <p className="admin-nav-label">Configurações</p>
            <ul className="admin-settings-links space-y-1">
              {[
                { label: "Organização", href: "/admin/configuracoes" },
                { label: "Diretorias", href: "/admin/configuracoes/diretorias" },
                { label: "Cargos", href: "/admin/configuracoes/cargos" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} aria-current={pathname === item.href ? "page" : undefined}
                    className="admin-nav-link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </li></AdminOnly>
        </ul>
      </nav>
    </aside>
  );
}
