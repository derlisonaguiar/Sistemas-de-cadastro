import { AccessProvider } from "@/components/AccessProvider";
import type { ReactNode } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { redirect } from "next/navigation";
import { AuthError, requireAuthenticatedProfile } from "@/lib/auth";
import { adminThemeStyle } from "@/lib/admin-theme";
import "./admin.css";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  let isAdmin = false;
  let theme;
  try {
    const auth = await requireAuthenticatedProfile();
    isAdmin = auth.profile.role === "ADMIN";
    theme = adminThemeStyle(auth.organization);
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
      <div className="admin-layout">
        <AdminSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <AdminHeader />

          <main className="admin-content flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
    </AccessProvider>
  );
}
