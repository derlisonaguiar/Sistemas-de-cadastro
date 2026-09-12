import { NextResponse } from "next/server";
import { getAdminApiContext } from "@/lib/auth";
import { checkRateLimit } from "@/lib/api";
import { validateImageUpload } from "@/lib/file-security";
import { uploadPublicObject } from "@/lib/storage";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const limited = checkRateLimit(request, "organization-favicon", 5, 60_000);
  if (limited) return limited;
  const context = await getAdminApiContext();
  if (context.response) return context.response;
  const file = (await request.formData()).get("file");
  if (!(file instanceof File) || file.size <= 0 || file.size > 2 * 1024 * 1024)
    return NextResponse.json({ ok: false, message: "Envie uma imagem de até 2 MB." }, { status: 400 });
  const buffer = Buffer.from(await file.arrayBuffer());
  let image: ReturnType<typeof validateImageUpload>;
  try {
    image = validateImageUpload(buffer, file);
  } catch {
    return NextResponse.json({ ok: false, message: "Envie um favicon PNG, JPG ou WebP válido." }, { status: 400 });
  }
  const faviconUrl = await uploadPublicObject(
    `organizations/${context.auth!.organization.id}/assets/favicon${image.extension}`,
    buffer,
    image.mime
  );
  const organization = await prisma.organization.update({
    where: { id: context.auth!.organization.id },
    data: { faviconUrl },
    select: { faviconUrl: true },
  });
  return NextResponse.json({ ok: true, faviconUrl: organization.faviconUrl });
}
