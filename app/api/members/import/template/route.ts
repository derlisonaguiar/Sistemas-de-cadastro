import { getAdminApiContext } from "@/lib/auth";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

const headers = ["Nome", "CPF", "Curso", "E-mail", "Telefone", "Matrícula", "Diretoria", "Cargo", "Status"];

export async function GET(request: Request) {
  const auth = await getAdminApiContext();
  if (auth.response) return auth.response;
  const format = new URL(request.url).searchParams.get("format");
  if (format === "csv") return new NextResponse(`\uFEFF${headers.join(";")}\r\n`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=\"modelo-importacao-membros.csv\"" } });
  if (format !== "xlsx") return NextResponse.json({ ok: false, message: "Formato inválido." }, { status: 400 });
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([headers]);
  sheet["!cols"] = headers.map((header) => ({ wch: Math.max(14, header.length + 4) }));
  XLSX.utils.book_append_sheet(workbook, sheet, "Membros");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Instruções"], ["Preencha a aba Membros. Nome é obrigatório; Status usa Ativo, Inativo, Afastado, Egresso ou Pós-Jr."], ["Diretoria e Cargo devem existir previamente na organização."]]), "Instruções");
  return new NextResponse(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": "attachment; filename=\"modelo-importacao-membros.xlsx\"" } });
}
