"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DocumentReview, { type ReviewableDocument } from "@/components/documents/DocumentReview";

export default function EditarDocumentoPage() {
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<ReviewableDocument | null>(null);
  const [message, setMessage] = useState("Carregando documento...");
  useEffect(() => {
    let active = true;
    fetch(`/api/documents/${id}`).then(async (response) => {
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error();
      if (active) setDocument(data.document);
    }).catch(() => { if (active) setMessage("Não foi possível carregar o documento."); });
    return () => { active = false; };
  }, [id]);
  return <div className="max-w-6xl"><h1 className="mb-6 text-2xl font-semibold">Revisar documento</h1>
    {document ? <DocumentReview key={document.id} document={document} editing /> : <p role="status">{message}</p>}
  </div>;
}
