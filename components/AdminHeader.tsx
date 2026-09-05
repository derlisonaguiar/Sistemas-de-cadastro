"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminHeader() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <header className="admin-header">
      <div>
        <p className="text-sm font-semibold tracking-tight text-gray-900">
          Painel Administrativo
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Gestão da organização
        </p>
      </div>

      <div className="admin-header-user flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">
            Administrador
          </p>
          <p className="text-xs text-gray-500">
            Superadmin
          </p>
        </div>

        <div className="admin-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          AD
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="admin-signout rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          {signingOut ? "Saindo..." : "Sair"}
        </button>
      </div>
    </header>
  );
}
