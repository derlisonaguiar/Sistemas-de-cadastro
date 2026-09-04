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
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div>
        <p className="text-sm font-medium text-gray-900">
          Painel Administrativo
        </p>
        <p className="text-xs text-gray-500">
          Gestão da organização
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">
            Administrador
          </p>
          <p className="text-xs text-gray-500">
            Superadmin
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-700">
          AD
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          {signingOut ? "Saindo..." : "Sair"}
        </button>
      </div>
    </header>
  );
}
