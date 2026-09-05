import { NextResponse } from "next/server";
import { authErrorResponse, getAdminApiContext } from "@/lib/auth";
import { internalErrorResponse, parseJsonRequest } from "@/lib/api";
import { updateOrganizationUser, updateUserSchema, UserManagementError } from "@/lib/user-management";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAdminApiContext();
    if (auth.response) return auth.response;
    const parsed = await parseJsonRequest(request, updateUserSchema);
    if (parsed.response) return parsed.response;
    const { id } = await context.params;
    const user = await updateOrganizationUser(auth.auth!.user.id, auth.auth!.profile.organizationId, id, parsed.data!);
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    if (error instanceof UserManagementError) return NextResponse.json({ ok: false, message: error.message }, { status: error.status });
    return authErrorResponse(error) || internalErrorResponse();
  }
}
