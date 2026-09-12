"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type OrganizationScopeProps = {
  hasOrganization: boolean;
  children: ReactNode;
};

/**
 * Organization resources are intentionally unavailable to a global SUPERADMIN
 * until an organization context exists. This avoids fabricating an
 * organizationId or mounting pages that would issue organization-scoped calls.
 */
export default function OrganizationScope({ hasOrganization, children }: OrganizationScopeProps) {
  const pathname = usePathname();

  if (hasOrganization || pathname === "/admin") return children;

  return (
    <section className="max-w-2xl rounded-xl border bg-white p-6">
      <h1 className="text-xl font-semibold text-gray-900">Área vinculada a uma organização</h1>
      <p className="mt-2 text-sm text-gray-600">
        Esta área utiliza dados de uma organização específica. O acesso global foi mantido, mas nenhuma organização foi
        selecionada para este SUPERADMIN.
      </p>
    </section>
  );
}
