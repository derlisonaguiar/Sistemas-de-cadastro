import DocumentImportForm from "@/components/documents/DocumentImportForm";

export default async function ImportarDocumentoPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialLinks = Object.fromEntries(["memberId", "clientId", "projectId", "contractId"].map((key) => [key, typeof params[key] === "string" ? params[key] : ""]));
  return <DocumentImportForm initialLinks={initialLinks} />;
}
