import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AuthError, requireAdminProfile } from "@/lib/auth";

export default async function AdminGuard({ children }: { children: ReactNode }) {
  try { await requireAdminProfile(); }
  catch (error) {
    if (error instanceof AuthError) redirect(error.code === "UNAUTHORIZED" ? "/login" : "/acesso-negado");
    throw error;
  }
  return children;
}
