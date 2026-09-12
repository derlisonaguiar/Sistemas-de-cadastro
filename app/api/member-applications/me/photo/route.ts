import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/api";
import { validateImageUpload } from "@/lib/file-security";
import { prisma } from "@/lib/prisma";
import { uploadPublicObject } from "@/lib/storage";

export const runtime = "nodejs";
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
  const limited = checkRateLimit(request, `application-photo:${user.id}`, 5, 60 * 60_000);
  if (limited) return limited;
  const application = await prisma.memberApplication.findUnique({ where: { userId: user.id } });
  if (!application)
    return NextResponse.json({ ok: false, message: "Envie a inscrição antes da foto." }, { status: 404 });
  if (application.status !== "PENDING")
    return NextResponse.json({ ok: false, message: "Esta inscrição já foi analisada." }, { status: 409 });
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
  const photoUrl = `${await uploadPublicObject(`organizations/${application.organizationId}/applications/${application.id}/profile`, buffer, image.mime)}?v=${Date.now()}`;
  await prisma.memberApplication.update({ where: { id: application.id }, data: { photoUrl } });
  return NextResponse.json({ ok: true, photoUrl });
}
