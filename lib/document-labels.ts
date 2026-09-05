export const documentTypeLabels = {
  VOLUNTEER_TERM: "Termo de voluntariado", TERMINATION_TERM: "Termo de desligamento",
  CERTIFICATE: "Certificado", DECLARATION: "Declaração", CONTRACT: "Contrato",
  PROJECT: "Projeto", CLIENT: "Cliente", OTHER: "Outro",
};
export const documentStatusLabels = {
  DRAFT: "Rascunho", PENDING: "Pendente", SIGNED: "Assinado", ISSUED: "Emitido", ARCHIVED: "Arquivado", CANCELED: "Cancelado",
};
export const documentEntityLabels = { memberId: "Membro", clientId: "Cliente", projectId: "Projeto", contractId: "Contrato" };
export type DocumentEntityKey = keyof typeof documentEntityLabels;
