import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import os from "os";
import path from "path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { prisma } from "@/lib/prisma";
import { getAdminApiContext } from "@/lib/auth";
import { checkRateLimit, internalErrorResponse } from "@/lib/api";
import { documentTemplateSchema } from "@/lib/validation";
import { validateTemplateUpload } from "@/lib/file-security";
import { createSignedStorageUrl, removeStorageObject, uploadPrivateObject } from "@/lib/storage";

export const runtime = "nodejs";
const execFileAsync = promisify(execFile);
const MAX_TEMPLATE_BYTES = Number(process.env.MAX_TEMPLATE_UPLOAD_BYTES || 10 * 1024 * 1024);

type Candidate = { key: string; label: string; suggestedPath: string; confidence: number; context: string; page?: number };
type PythonAnalysis = { ok: boolean; ready: boolean; fields?: string[]; candidates?: Candidate[]; error?: string };

const labels: Array<[RegExp, string, string, number]> = [
  [/\bnome(?:\s+completo)?\s*[:_]/gi, "member.fullName", "Nome completo", 0.82],
  [/\bcpf\s*[:_]/gi, "member.cpf", "CPF", 0.95],
  [/\brepresentante\s*[:_]/gi, "representative.fullName", "Representante", 0.78],
  [/\be-?mail\s*[:_]/gi, "member.email", "E-mail", 0.75],
  [/\btelefone\s*[:_]/gi, "member.phone", "Telefone", 0.75],
  [/\bcnpj\s*[:_]/gi, "organization.cnpj", "CNPJ", 0.75],
];

function detectCandidates(text: string, page = 1) {
  const found: Candidate[] = [];
  for (const [pattern, suggestedPath, label, confidence] of labels) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    let index = 0;
    while ((match = pattern.exec(text))) {
      found.push({
        key: `candidate.${suggestedPath}.${page}.${index++}`,
        label, suggestedPath, confidence, page,
        context: text.slice(Math.max(0, match.index - 60), match.index + match[0].length + 100).trim(),
      });
    }
  }
  return found;
}

async function analyzeDocx(filePath: string): Promise<PythonAnalysis> {
  const executable = process.env.PYTHON_EXECUTABLE || "python";
  const analyzer = path.join(process.cwd(), "document_engine", "analyze_template.py");
  const { stdout } = await execFileAsync(executable, [analyzer, "--template", filePath], {
    cwd: process.cwd(), windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024,
  });
  const result = JSON.parse(stdout.trim()) as PythonAnalysis;
  if (!result.ok) throw new Error("UNSAFE_OR_INVALID_TEMPLATE");
  return result;
}

async function analyzePdf(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await Promise.race([
      parser.getText({ first: 100 }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("PDF_TIMEOUT")), 15_000)),
    ]);
    const candidates = result.pages.flatMap((page) => detectCandidates(page.text, page.num));
    return { text: result.text.trim(), pages: result.total, candidates };
  } finally {
    await parser.destroy();
  }
}

export async function POST(request: Request) {
  let tempDirectory: string | null = null;
  let storageRef: string | null = null;
  try {
    const limited = checkRateLimit(request, "template-upload", 5, 60_000);
    if (limited) return limited;
    const authContext = await getAdminApiContext();
    if (authContext.response) return authContext.response;
    const organizationId = authContext.auth!.profile.organizationId;

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, message: "Arquivo não enviado." }, { status: 400 });
    const metadata = documentTemplateSchema.safeParse({
      name: formData.get("name")?.toString(),
      description: formData.get("description")?.toString() || null,
      type: formData.get("type")?.toString() || "OTHER",
    });
    if (!metadata.success) return NextResponse.json({ ok: false, message: "Dados do modelo inválidos." }, { status: 400 });

    let validated;
    try { validated = await validateTemplateUpload(file, MAX_TEMPLATE_BYTES); }
    catch { return NextResponse.json({ ok: false, message: "Arquivo inválido ou potencialmente inseguro." }, { status: 400 }); }

    const templateId = randomUUID();
    let extractedText = "";
    let candidates: Candidate[] = [];
    let fields: string[] = [];
    let processingStatus: "READY" | "NEEDS_REVIEW" | "REQUIRES_OCR" = "NEEDS_REVIEW";

    if (validated.safe.kind === "DOCX") {
      tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "template-analysis-"));
      const tempPath = path.join(tempDirectory, "original.docx");
      await fs.writeFile(tempPath, validated.buffer);
      let analysis: PythonAnalysis;
      try { analysis = await analyzeDocx(tempPath); }
      catch { return NextResponse.json({ ok: false, message: "O DOCX contém estrutura ou sintaxe de template não permitida." }, { status: 400 }); }
      extractedText = (await mammoth.extractRawText({ buffer: validated.buffer })).value.trim();
      fields = analysis.fields || [];
      candidates = analysis.candidates || [];
      processingStatus = analysis.ready ? "READY" : "NEEDS_REVIEW";
    } else {
      let analysis;
      try { analysis = await analyzePdf(validated.buffer); }
      catch { return NextResponse.json({ ok: false, message: "Não foi possível processar o PDF textual." }, { status: 400 }); }
      extractedText = analysis.text;
      candidates = analysis.candidates;
      processingStatus = extractedText.length < 30 ? "REQUIRES_OCR" : "NEEDS_REVIEW";
    }

    const objectPath = `organizations/${organizationId}/templates/${templateId}/original${validated.safe.extension}`;
    storageRef = await uploadPrivateObject(objectPath, validated.buffer, validated.safe.mime);

    const detected = fields.length
      ? fields.map((key) => ({ key, label: key, mappedPath: key, detectedValue: `{{ ${key} }}`, confidence: 1, confirmed: true }))
      : candidates.map((item) => ({
          key: item.key, label: item.label, mappedPath: item.suggestedPath, detectedValue: null,
          context: item.context, confidence: item.confidence, confirmed: false, page: item.page || null,
          exampleValue: item.context.slice(0, 250),
        }));

    const template = await prisma.documentTemplate.create({
      data: {
        id: templateId, organizationId, ...metadata.data, content: extractedText, extractedText,
        originalFileUrl: storageRef, originalFileName: file.name.slice(0, 255),
        originalMimeType: validated.safe.mime, originalFileSize: file.size,
        sourceType: validated.safe.kind,
        renderMode: validated.safe.kind === "DOCX" ? "DOCX_TEMPLATE" : "PDF_OVERLAY",
        processingStatus, active: processingStatus === "READY",
        confirmedAt: processingStatus === "READY" ? new Date() : null,
        layoutJson: validated.safe.kind === "PDF" ? { version: 1, pages: [], coordinateSystem: "pdf-points" } : undefined,
        fields: { create: detected },
      },
      include: { fields: true },
    });

    storageRef = null;
    return NextResponse.json({
      ok: true, ready: processingStatus === "READY", requiresOcr: processingStatus === "REQUIRES_OCR",
      needsReview: processingStatus === "NEEDS_REVIEW", message: processingStatus === "READY"
        ? "Modelo DOCX validado e pronto para uso."
        : processingStatus === "REQUIRES_OCR" ? "PDF sem texto suficiente; OCR será necessário."
        : "Campos candidatos detectados. Revise os mapeamentos antes de usar.",
      template: {
        ...template,
        originalFileUrl: await createSignedStorageUrl(template.originalFileUrl!),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Erro interno ao processar modelo:", error);
    if (storageRef) await removeStorageObject(storageRef).catch(() => undefined);
    return internalErrorResponse();
  } finally {
    if (tempDirectory) await fs.rm(tempDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
}
