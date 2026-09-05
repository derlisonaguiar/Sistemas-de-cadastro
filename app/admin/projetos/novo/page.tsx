"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Client = {
  id: string;
  name: string;
  companyName: string | null;
  active: boolean;
};

export default function NovoProjetoPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    clientId: "",
    startDate: "",
    endDate: "",
    status: "PLANNING",
    budget: "",
  });

  useEffect(() => {
    async function loadClients() {
      try {
        const response = await fetch("/api/clients");
        const data = await response.json();

        if (data.ok) {
          setClients(
            data.clients.filter(
              (client: Client) => client.active
            )
          );
        }
      } catch (error) {
        console.error("Erro ao carregar clientes:", error);
      }
    }

    loadClients();
  }, []);

  function updateField(field: string, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(data.message || "Erro ao cadastrar projeto.");
        return;
      }

      router.push("/admin/projetos");
    } catch (error) {
      console.error("Erro ao cadastrar projeto:", error);
      setMessage("Erro ao cadastrar projeto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Novo projeto
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Cadastre um novo projeto e vincule-o a um cliente.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Dados do projeto
            </h2>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nome do projeto *
              </label>

              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Cliente
              </label>

              <select
                value={form.clientId}
                onChange={(e) =>
                  updateField("clientId", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Sem cliente</option>

                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                    {client.companyName
                      ? ` - ${client.companyName}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Status
              </label>

              <select
                value={form.status}
                onChange={(e) =>
                  updateField("status", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="PLANNING">
                  Planejamento
                </option>
                <option value="ACTIVE">Ativo</option>
                <option value="PAUSED">Pausado</option>
                <option value="COMPLETED">
                  Concluído
                </option>
                <option value="CANCELED">
                  Cancelado
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Data de início
              </label>

              <input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  updateField("startDate", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Data de término
              </label>

              <input
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  updateField("endDate", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Orçamento
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={(e) =>
                  updateField("budget", e.target.value)
                }
                placeholder="0,00"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Descrição
              </label>

              <textarea
                value={form.description}
                onChange={(e) =>
                  updateField("description", e.target.value)
                }
                rows={5}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/projetos")}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[var(--admin-primary)] px-4 py-2 text-sm font-medium text-[var(--admin-on-primary)] hover:bg-[var(--admin-primary)] disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Cadastrar projeto"}
          </button>
        </div>
      </form>
    </div>
  );
}