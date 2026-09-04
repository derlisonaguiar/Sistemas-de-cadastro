"use client";
import { use } from "react";
import dynamic from "next/dynamic";
const Editor = dynamic(() => import("@/components/certificates/CertificateEditor"), { ssr: false });
export default function EditCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  return <div><h1 className="mb-4 text-2xl font-semibold">Editor de certificado</h1><Editor templateId={use(params).id} /></div>;
}
