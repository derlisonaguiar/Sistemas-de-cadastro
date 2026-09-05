"use client";

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
  const primaryColor = organization?.primaryColor ?? "#5B21B6";

  function isActive(href: string) {
    if (href === "/admin") {
      return pathname === "/admin";
    }

    return pathname.startsWith(href);
  }

  return (
    <aside className="min-h-screen w-64 border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-5">
        {organization?.logoUrl ? (
          <img
            src={organization.logoUrl}
            alt={organizationName}
            className="h-9 w-9 object-contain"
          />
        ) : (
          <div
            className="flex h-9 w-9 items-center justify-center rounded-md text-sm font-bold"
            style={{
              backgroundColor: `${primaryColor}18`,
              color: primaryColor,
            }}
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

      <nav className="p-3">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const active = isActive(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm font-medium transition"
                  style={
                    active
                      ? {
                          backgroundColor: `${primaryColor}14`,
                          color: primaryColor,
                        }
                      : {
                          color: "#000000",
                        }
                  }
                  onMouseEnter={(event) => {
                    if (!active) {
                      event.currentTarget.style.backgroundColor =
                        `${primaryColor}0D`;
                      event.currentTarget.style.color = primaryColor;
                    }
                  }}
                  onMouseLeave={(event) => {
                    if (!active) {
                      event.currentTarget.style.backgroundColor = "";
                      event.currentTarget.style.color = "#000000";
                    }
                  }}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="pt-3">
            <p className="px-3 py-2 text-sm font-semibold text-gray-900">Configurações</p>
            <ul className="ml-3 space-y-1">
              {[
                { label: "Organização", href: "/admin/configuracoes" },
                { label: "Diretorias", href: "/admin/configuracoes/diretorias" },
                { label: "Cargos", href: "/admin/configuracoes/cargos" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} aria-current={pathname === item.href ? "page" : undefined}
                    className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-50"
                    style={pathname === item.href ? { backgroundColor: primaryColor + "14", color: primaryColor } : { color: "#000000" }}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </nav>
    </aside>
  );
}