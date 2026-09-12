import { NextResponse } from "next/server";
import { parseJsonRequest } from "@/lib/api";
import { organizationEntryCodeSchema } from "@/lib/validation";
import { OrganizationEntryCodeError, resolveOrganizationEntryCode } from "@/lib/organization-entry-code";

export async function POST(request: Request) {
  const parsed = await parseJsonRequest(request, organizationEntryCodeSchema);
  if (parsed.response) return parsed.response;
  try {
    await resolveOrganizationEntryCode(parsed.data!.entryCode);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof OrganizationEntryCodeError ? error.message : "Não foi possível validar o código.",
      },
      { status: 403 }
    );
  }
}
