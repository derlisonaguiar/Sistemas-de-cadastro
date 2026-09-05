import { type Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Both editing and quick status changes use the existing PostgreSQL triggers:
// preserve_member_departure and enforce_member_leadership_rules. Keep the write
// atomic so history, released positions and leadership exclusivity stay in sync.
export function updateMember(args: {
  where: { id: string; organizationId: string };
  data: Prisma.MemberUncheckedUpdateInput;
  include?: { directorate: true; position: true };
}) {
  return prisma.member.update({ ...args, include: { directorate: true, position: true } });
}
