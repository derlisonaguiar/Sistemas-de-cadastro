import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminApiContext } from "@/lib/auth";
import { databaseErrorResponse, parseJsonRequest } from "@/lib/api";
import { certificateTemplateCreateSchema } from "@/lib/validation";
import { createEmptyCertificateLayout } from "@/lib/certificate-layout";

export async function GET() {
  try {
    const context = await getAdminApiContext(); if (context.response) return context.response;
    const templates = await prisma.documentTemplate.findMany({
      where: { organizationId: context.auth!.profile.organizationId, type: "CERTIFICATE", renderMode: "VISUAL_CERTIFICATE" },
      select: { id: true, name: true, description: true, active: true, processingVersion: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ ok: true, templates });
  } catch (error) { console.error("Erro ao listar certificados visuais:", error); return databaseErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const context = await getAdminApiContext(); if (context.response) return context.response;
    const parsed = await parseJsonRequest(request, certificateTemplateCreateSchema); if (parsed.response) return parsed.response;
    const layout = createEmptyCertificateLayout(parsed.data!.orientation);
    const template = await prisma.documentTemplate.create({ data: {
      organizationId: context.auth!.profile.organizationId, name: parsed.data!.name, description: parsed.data!.description,
      type: "CERTIFICATE", content: "", sourceType: "VISUAL", renderMode: "VISUAL_CERTIFICATE", processingStatus: "READY", layoutJson: layout,
    }, select: { id: true, name: true, processingVersion: true } });
    return NextResponse.json({ ok: true, template }, { status: 201 });
  } catch (error) { console.error("Erro ao criar certificado visual:", error); return databaseErrorResponse(error); }
}
