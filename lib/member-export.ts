export const memberStatusLabels = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  LEAVE: "Afastado",
  ALUMNI: "Egresso",
  POS_JR: "Pós-Jr",
} as const;

export type MemberExportStatus = keyof typeof memberStatusLabels;

export const memberExportFields = [
  { key: "fullName", label: "Nome" },
  { key: "cpf", label: "CPF" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone" },
  { key: "course", label: "Curso" },
  { key: "registration", label: "Matrícula" },
  { key: "directorate", label: "Diretoria" },
  { key: "position", label: "Cargo" },
  { key: "status", label: "Status" },
  { key: "entryDate", label: "Data de entrada" },
] as const;

export type MemberExportField = (typeof memberExportFields)[number]["key"];
