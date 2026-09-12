import { getAdminApiContext } from "@/lib/auth";
import { checkRateLimit } from "@/lib/api";
import { validateImageUpload } from "@/lib/file-security";
import { prisma } from "@/lib/prisma";
import { uploadPublicObject } from "@/lib/storage";
import { routeIdSchema } from "@/lib/validation";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const MAX_BYTES = 2 * 1024 * 1024;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = await getAdminApiContext();
    if (auth.response) return auth.response;
    const limited = checkRateLimit(request, `member-photo:${auth.auth!.user.id}`, 10, 60_000);
    if (limited) return limited;
    const params = routeIdSchema.safeParse(await context.params);
    if (!params.success) return NextResponse.json({ ok: false, message: "ID inválido." }, { status: 400 });
    const organization = auth.auth!.organization;
    if (!organization) return NextResponse.json({ ok: false, message: "Organização não encontrada." }, { status: 404 });
    const member = await prisma.member.findFirst({
      where: { id: params.data.id, organizationId: organization.id },
      select: { id: true },
    });
    if (!member) return NextResponse.json({ ok: false, message: "Membro não encontrado." }, { status: 404 });
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || file.size <= 0 || file.size > MAX_BYTES)
      return NextResponse.json({ ok: false, message: "Envie uma imagem de até 2 MB." }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    let image: ReturnType<typeof validateImageUpload>;
    try {
      image = validateImageUpload(buffer, file);
    } catch {
      return NextResponse.json({ ok: false, message: "Envie uma imagem JPG, PNG ou WebP válida." }, { status: 400 });
    }
    const photoUrl = `${await uploadPublicObject(`organizations/${organization.id}/members/${member.id}/profile`, buffer, image.mime)}?v=${Date.now()}`;
    await prisma.member.update({ where: { id: member.id }, data: { photoUrl } });
    return NextResponse.json({ ok: true, photoUrl });
  } catch (error) {
    console.error("Erro ao enviar foto do membro:", error);
    return NextResponse.json({ ok: false, message: "Não foi possível enviar a foto." }, { status: 500 });
  }
}
