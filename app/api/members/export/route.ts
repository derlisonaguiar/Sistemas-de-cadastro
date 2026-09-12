import { getReadApiContext } from "@/lib/auth";
import {
  memberExportFields,
  memberStatusLabels,
  type MemberExportField,
  type MemberExportStatus,
} from "@/lib/member-export";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { z } from "zod";

export const runtime = "nodejs";

const fieldKeys = memberExportFields.map((field) => field.key) as [MemberExportField, ...MemberExportField[]];
const statusKeys = Object.keys(memberStatusLabels) as [MemberExportStatus, ...MemberExportStatus[]];
const exportSchema = z.object({
  status: z.enum(statusKeys).optional(),
  fields: z.array(z.enum(fieldKeys)).min(1),
  format: z.enum(["csv", "xlsx", "pdf"]),
});

type ExportMember = {
  fullName: string;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  course: string | null;
  registration: string | null;
  entryDate: Date | null;
  status: MemberExportStatus;
  directorate: { name: string } | null;
  position: { name: string } | null;
};

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(value) : "";
}

function rowsFor(members: ExportMember[], fields: MemberExportField[]) {
  return members.map((member) =>
    fields.map((field) => {
      switch (field) {
        case "fullName":
          return member.fullName;
        case "cpf":
          return member.cpf || "";
        case "email":
          return member.email || "";
        case "phone":
          return member.phone || "";
        case "course":
          return member.course || "";
        case "registration":
          return member.registration || "";
        case "directorate":
          return member.directorate?.name || "";
        case "position":
          return member.position?.name || "";
        case "status":
          return memberStatusLabels[member.status];
        case "entryDate":
          return formatDate(member.entryDate);
      }
    })
  );
}

function csvContent(headers: string[], rows: string[][]) {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return `\uFEFF${[headers, ...rows].map((row) => row.map(escape).join(";")).join("\r\n")}`;
}

function truncate(value: string, width: number) {
  const limit = Math.max(4, Math.floor(width / 3.3));
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

async function pdfContent(headers: string[], rows: string[][]) {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 28;
  const columnWidth = (pageWidth - margin * 2) / headers.length;
  const rowHeight = 18;
  let page = document.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawHeader = () => {
    page.drawText("Exportação de membros", { x: margin, y, size: 12, font: bold });
    y -= 22;
    headers.forEach((header, index) =>
      page.drawText(truncate(header, columnWidth - 4), { x: margin + index * columnWidth + 2, y, size: 7, font: bold })
    );
    y -= 7;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 0.6,
      color: rgb(0.6, 0.6, 0.6),
    });
    y -= 12;
  };
  drawHeader();

  for (const row of rows) {
    if (y < margin + rowHeight) {
      page = document.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawHeader();
    }
    row.forEach((value, index) =>
      page.drawText(truncate(value, columnWidth - 4), { x: margin + index * columnWidth + 2, y, size: 7, font })
    );
    y -= rowHeight;
  }
  return document.save();
}

export async function POST(request: Request) {
  try {
    const authContext = await getReadApiContext();
    if (authContext.response) return authContext.response;
    const organization = authContext.auth!.organization;
    if (!organization) return NextResponse.json({ ok: false, message: "Organização não encontrada." }, { status: 404 });

    const body = exportSchema.safeParse(await request.json());
    if (!body.success)
      return NextResponse.json({ ok: false, message: "Opções de exportação inválidas." }, { status: 400 });

    const members = await prisma.member.findMany({
      where: { organizationId: organization.id, ...(body.data.status ? { status: body.data.status } : {}) },
      include: { directorate: { select: { name: true } }, position: { select: { name: true } } },
      orderBy: { fullName: "asc" },
    });
    const fields = body.data.fields;
    const headers = fields.map((field) => memberExportFields.find((item) => item.key === field)!.label);
    const rows = rowsFor(members, fields);
    const filename = `membros-${new Date().toISOString().slice(0, 10)}`;

    if (body.data.format === "csv")
      return new NextResponse(csvContent(headers, rows), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    if (body.data.format === "xlsx") {
      const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      sheet["!cols"] = headers.map((header, index) => ({
        wch: Math.max(header.length, ...rows.map((row) => row[index]?.length || 0), 12),
      }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Membros");
      return new NextResponse(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        },
      });
    }
    const pdf = await pdfContent(headers, rows);
    const pdfBody = new Uint8Array(pdf).buffer as ArrayBuffer;
    return new NextResponse(pdfBody, {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"` },
    });
  } catch (error) {
    console.error("Erro ao exportar membros:", error);
    return NextResponse.json({ ok: false, message: "Erro ao exportar membros." }, { status: 500 });
  }
}
