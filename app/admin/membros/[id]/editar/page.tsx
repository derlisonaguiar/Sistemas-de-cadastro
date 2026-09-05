"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Directorate = {
  id: string;
  name: string;
  active: boolean;
};

type Position = {
  id: string;
  name: string;
  active: boolean;
  role?: string;
  directorateId: string | null;
};

type Member = {
  id: string;
  fullName: string;
  email: string | null;
  cpf: string | null;
  phone: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  rg: string | null;
  rgIssuer: string | null;
  course: string | null;
  registration: string | null;
  address: string | null;
  addressNumber: string | null;
  neighborhood: string | null;
  cep: string | null;
  city: string | null;
  state: string | null;
  entryDate: string | null;
  exitDate: string | null;
  status: string;
  directorateId: string | null;
  positionId: string | null;
};

export default function EditarMembroPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [directorates, setDirectorates] = useState<Directorate[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    cpf: "",
    phone: "",
    nationality: "",
    maritalStatus: "",
    rg: "",
    rgIssuer: "",
    course: "",
    registration: "",
    address: "",
    addressNumber: "",
    neighborhood: "",
    cep: "",
    city: "",
    state: "",
    entryDate: "",
    exitDate: "",
    status: "ACTIVE",
    directorateId: "",
    positionId: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [
          memberResponse,
          directoratesResponse,
          positionsResponse,
        ] = await Promise.all([
          fetch(`/api/members/${id}`),
          fetch("/api/directorates"),
          fetch("/api/positions"),
        ]);

        const memberData = await memberResponse.json();
        const directoratesData = await directoratesResponse.json();
        const positionsData = await positionsResponse.json();

        if (!memberResponse.ok || !memberData.ok) {
          setMessage(
            memberData.message || "Erro ao carregar membro."
          );
          return;
        }

        const member: Member = memberData.member;

        setForm({
          fullName: member.fullName || "",
          email: member.email || "",
          cpf: member.cpf || "",
          phone: member.phone || "",
          nationality: member.nationality || "",
          maritalStatus: member.maritalStatus || "",
          rg: member.rg || "",
          rgIssuer: member.rgIssuer || "",
          course: member.course || "",
          registration: member.registration || "",
          address: member.address || "",
          addressNumber: member.addressNumber || "",
          neighborhood: member.neighborhood || "",
          cep: member.cep || "",
          city: member.city || "",
          state: member.state || "",
          entryDate: member.entryDate
            ? member.entryDate.slice(0, 10)
            : "",
          exitDate: member.exitDate
            ? member.exitDate.slice(0, 10)
            : "",
          status: member.status || "ACTIVE",
          directorateId: member.directorateId || "",
          positionId: member.positionId || "",
        });

        if (!directoratesResponse.ok || !positionsResponse.ok || !directoratesData.ok || !positionsData.ok) {
          throw new Error("Erro ao carregar diretorias e cargos.");
        }

        if (directoratesData.ok) {
          setDirectorates(directoratesData.directorates);
        }

        if (positionsData.ok) {
          setPositions(positionsData.positions);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);

        setMessage(
          "Erro ao carregar dados do membro."
        );
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

  const availablePositions = positions.filter((position) =>
    !position.directorateId || position.directorateId === form.directorateId
  );

  const selectedPosition = useMemo(() => {
    return positions.find(
      (position) => position.id === form.positionId
    );
  }, [positions, form.positionId]);

  const selectedDirectorate = useMemo(() => {
    return directorates.find(
      (directorate) => directorate.id === form.directorateId
    );
  }, [directorates, form.directorateId]);

  const leadershipNotice = useMemo(() => {
    if (form.status !== "ACTIVE" || !selectedPosition) {
      return null;
    }

    if (selectedPosition.role === "PRESIDENT") {
      return {
        title: "Cargo de Presidência",
        text:
          "Só pode existir um Presidente ativo na organização. " +
          "Se outro membro já ocupar essa função, a alteração será bloqueada.",
      };
    }

    if (selectedPosition.role === "VICE_PRESIDENT") {
      return {
        title: "Cargo de Vice-Presidência",
        text:
          "Só pode existir um Vice-Presidente ativo na organização. " +
          "Se outro membro já ocupar essa função, a alteração será bloqueada.",
      };
    }

    if (selectedPosition.role === "DIRECTOR") {
      if (!selectedDirectorate) {
        return {
          title: "Diretoria obrigatória",
          text:
            "Um Diretor ativo precisa estar vinculado a uma diretoria. " +
            "Selecione uma diretoria antes de salvar.",
        };
      }

      return {
        title: "Cargo de Diretor",
        text:
          `Cada diretoria pode possuir apenas um Diretor ativo. ` +
          `Este membro ficará vinculado como Diretor da diretoria "${selectedDirectorate.name}".`,
      };
    }

    return null;
  }, [form.status, selectedPosition, selectedDirectorate]);

  function updateField(field: string, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "directorateId" && positions.find((position) => position.id === current.positionId)?.directorateId
        ? { positionId: "" } : {}),
      ...(field === "status" && value === "POS_JR" ? { directorateId: "", positionId: "" } : {}),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(
        `/api/members/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessage(
          data.message || "Erro ao atualizar membro."
        );
        return;
      }

      router.push(`/admin/membros/${id}`);
    } catch (error) {
      console.error("Erro ao atualizar membro:", error);

      setMessage(
        "Erro ao atualizar membro."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-600">
        Carregando membro...
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Editar membro
        </h1>

        <p className="mt-1 text-sm text-gray-600">
          Atualize os dados pessoais, acadêmicos e organizacionais do membro.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Dados pessoais
            </h2>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nome completo *
              </label>

              <input
                type="text"
                value={form.fullName}
                onChange={(e) =>
                  updateField("fullName", e.target.value)
                }
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                E-mail
              </label>

              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  updateField("email", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Telefone
              </label>

              <input
                type="text"
                value={form.phone}
                onChange={(e) =>
                  updateField("phone", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                CPF
              </label>

              <input
                type="text"
                value={form.cpf}
                onChange={(e) =>
                  updateField("cpf", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nacionalidade
              </label>

              <input
                type="text"
                value={form.nationality}
                onChange={(e) =>
                  updateField("nationality", e.target.value)
                }
                placeholder="Ex.: Brasileira"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Estado civil
              </label>

              <select
                value={form.maritalStatus}
                onChange={(e) =>
                  updateField("maritalStatus", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Não informado</option>
                <option value="Solteiro(a)">Solteiro(a)</option>
                <option value="Casado(a)">Casado(a)</option>
                <option value="Divorciado(a)">Divorciado(a)</option>
                <option value="Viúvo(a)">Viúvo(a)</option>
                <option value="União estável">União estável</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                RG
              </label>

              <input
                type="text"
                value={form.rg}
                onChange={(e) =>
                  updateField("rg", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Órgão expedidor
              </label>

              <input
                type="text"
                value={form.rgIssuer}
                onChange={(e) =>
                  updateField("rgIssuer", e.target.value)
                }
                placeholder="Ex.: SSP/PA"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Dados acadêmicos
            </h2>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Curso
              </label>

              <input
                type="text"
                value={form.course}
                onChange={(e) =>
                  updateField("course", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Matrícula
              </label>

              <input
                type="text"
                value={form.registration}
                onChange={(e) =>
                  updateField("registration", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Endereço
            </h2>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Endereço
              </label>

              <input
                type="text"
                value={form.address}
                onChange={(e) =>
                  updateField("address", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Número
              </label>

              <input
                type="text"
                value={form.addressNumber}
                onChange={(e) =>
                  updateField("addressNumber", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Bairro
              </label>

              <input
                type="text"
                value={form.neighborhood}
                onChange={(e) =>
                  updateField("neighborhood", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                CEP
              </label>

              <input
                type="text"
                value={form.cep}
                onChange={(e) =>
                  updateField("cep", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Cidade
              </label>

              <input
                type="text"
                value={form.city}
                onChange={(e) =>
                  updateField("city", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Estado
              </label>

              <input
                type="text"
                value={form.state}
                onChange={(e) =>
                  updateField("state", e.target.value)
                }
                placeholder="Ex.: PA"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              Vínculo na organização
            </h2>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div>
              <label htmlFor="directorateId" className="mb-1 block text-sm font-medium text-gray-700">
                Diretoria
              </label>

              <select
                id="directorateId" disabled={form.status === "POS_JR"}
                value={form.directorateId}
                onChange={(e) =>
                  updateField("directorateId", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Sem diretoria</option>

                {directorates.map((directorate) => (
                  <option
                    key={directorate.id}
                    value={directorate.id}
                  >
                    {directorate.name}
                    {!directorate.active ? " (inativa)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="positionId" className="mb-1 block text-sm font-medium text-gray-700">
                Cargo
              </label>

              <select
                id="positionId" disabled={form.status === "POS_JR"}
                value={form.positionId}
                onChange={(e) =>
                  updateField("positionId", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Sem cargo</option>

                {availablePositions.map((position) => (
                  <option
                    key={position.id}
                    value={position.id}
                  >
                    {position.name}
                    {!position.active ? " (inativo)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {directorates.length === 0 && (
              <p className="text-sm text-gray-700">Nenhuma diretoria cadastrada.</p>
            )}
            {positions.length === 0 && (
              <p className="text-sm text-gray-700">Nenhum cargo cadastrado.</p>
            )}
            {form.status === "POS_JR" && (
              <p className="md:col-span-2 text-sm text-gray-700">Pós-Jr não ocupa cargo ou diretoria. Ao salvar, o vínculo anterior ficará no histórico do membro e seus documentos serão preservados.</p>
            )}

            {leadershipNotice && (
              <div className="md:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-900">
                  {leadershipNotice.title}
                </p>

                <p className="mt-1 text-sm text-amber-800">
                  {leadershipNotice.text}
                </p>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Data de ingresso
              </label>

              <input
                type="date"
                value={form.entryDate}
                onChange={(e) =>
                  updateField("entryDate", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Data de saída
              </label>

              <input
                type="date"
                value={form.exitDate}
                onChange={(e) =>
                  updateField("exitDate", e.target.value)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
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
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
                <option value="LEAVE">Afastado</option>
                <option value="POS_JR">Pós-Jr</option>
                <option value="ALUMNI">Egresso</option>
              </select>
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
            onClick={() =>
              router.push(`/admin/membros/${id}`)
            }
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[var(--admin-primary)] px-4 py-2 text-sm font-medium text-[var(--admin-on-primary)] hover:bg-[var(--admin-primary)] disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}