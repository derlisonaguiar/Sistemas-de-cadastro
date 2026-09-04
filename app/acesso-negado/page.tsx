"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AccessDeniedPage() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Acesso não autorizado</h1>
        <p className="mt-2 text-sm text-gray-600">
          Seu perfil não possui permissão administrativa para acessar esta área.
        </p>
        <button
          type="button"
          onClick={signOut}
          className="mt-6 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Sair
        </button>
      </div>
    </main>
  );
}
