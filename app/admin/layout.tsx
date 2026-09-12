import { AccessProvider } from "@/components/AccessProvider";
import type { ReactNode } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { redirect } from "next/navigation";
import { AuthError, isAdministrativeRole, requireAdministrativeAccess } from "@/lib/auth";
import { adminThemeStyle } from "@/lib/admin-theme";
import OrganizationScope from "@/components/OrganizationScope";
import { getDeploymentMode } from "@/lib/deployment-mode";
import { resolveAdminNavigation, type AdminNavigationState } from "@/lib/admin-navigation";
import OrganizationFavicon from "@/components/OrganizationFavicon";
import "./admin.css";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  let isAdmin = false;
  let isSuperadmin = false;
  let hasOrganization = false;
  let faviconUrl: string | null = null;
  let navigation: AdminNavigationState;
  let theme;
  try {
    const auth = await requireAdministrativeAccess();
    if (getDeploymentMode() === "single" && auth.user.role === "SUPERADMIN") redirect("/acesso-negado");
    isAdmin = isAdministrativeRole(auth.user.role) || isAdministrativeRole(auth.profile?.role);
    isSuperadmin = auth.user.role === "SUPERADMIN";
    hasOrganization = Boolean(auth.organization);
    faviconUrl = auth.organization?.faviconUrl ?? null;
    navigation = resolveAdminNavigation({ deploymentMode: getDeploymentMode(), isSuperadmin, hasOrganization });
    theme = auth.organization ? adminThemeStyle(auth.organization) : adminThemeStyle({ primaryColor: "#6D28D9", secondaryColor: "#FFFFFF" });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.code === "UNAUTHORIZED") redirect("/login");
      if (error.code === "PROFILE_REQUIRED") redirect("/vincular");
      redirect("/acesso-negado");
    }
    throw error;
  }

  return (
    <AccessProvider isAdmin={isAdmin}>
    <div className="admin-shell min-h-screen" style={theme}>
      <OrganizationFavicon href={faviconUrl} />
      <div className="admin-layout">
        <AdminSidebar navigation={navigation!} />

        <div className="flex min-w-0 flex-1 flex-col">
          <AdminHeader isGlobalAdministration={navigation!.isGlobalAdministration} hasOrganization={hasOrganization} />

          <main className="admin-content flex-1">
            <OrganizationScope hasOrganization={hasOrganization}>{children}</OrganizationScope>
          </main>
          <footer className="px-4 py-4 text-center text-xs leading-5 text-gray-500 sm:px-8">
            Desenvolvido por Brainstorm Engenharia — Empresa Júnior de Engenharia da Computação e Telecomunicações - UFPA
          </footer>
        </div>
      </div>
    </div>
    </AccessProvider>
  );
}
