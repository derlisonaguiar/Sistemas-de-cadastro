import { NextResponse } from "next/server";
import { getAuthenticatedProfile, getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { downloadStorageObject, parseStorageReference } from "@/lib/storage";

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("ref");
  const parsed = parseStorageReference(reference);
  const match = parsed?.path.match(/^organizations\/([A-Za-z0-9_-]+)\//);
  const organizationId = match?.[1];
  if (!reference || !parsed || !organizationId)
    return NextResponse.json({ ok: false, message: "Arquivo inválido." }, { status: 400 });
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.profile.organizationId !== organizationId) {
    const user = await getAuthenticatedUser();
    const application = user
      ? await prisma.memberApplication.findFirst({ where: { userId: user.id, organizationId }, select: { id: true } })
      : null;
    if (!application || !parsed.path.includes(`/applications/${application.id}/`))
      return NextResponse.json({ ok: false, message: "Acesso não autorizado." }, { status: 403 });
  }
  try {
    const data = await downloadStorageObject(reference);
    if (!data) throw new Error();
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Arquivo não encontrado." }, { status: 404 });
  }
}
