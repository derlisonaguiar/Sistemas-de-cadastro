import type { ReactNode } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { redirect } from "next/navigation";
import { AuthError, requireAdminProfile } from "@/lib/auth";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  try {
    await requireAdminProfile();
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.code === "UNAUTHORIZED") redirect("/login");
      if (error.code === "PROFILE_REQUIRED") redirect("/vincular");
      redirect("/acesso-negado");
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <AdminHeader />

          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
