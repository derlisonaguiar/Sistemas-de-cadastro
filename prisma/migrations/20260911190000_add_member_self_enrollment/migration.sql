CREATE TYPE "MemberApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Member" ADD COLUMN "userId" TEXT;
CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");

CREATE TABLE "MemberApplication" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "email" TEXT,
  "cpf" TEXT NOT NULL,
  "phone" TEXT,
  "photoUrl" TEXT,
  "course" TEXT,
  "registration" TEXT,
  "nationality" TEXT,
  "maritalStatus" TEXT,
  "rg" TEXT,
  "rgIssuer" TEXT,
  "address" TEXT,
  "addressNumber" TEXT,
  "neighborhood" TEXT,
  "cep" TEXT,
  "city" TEXT,
  "state" TEXT,
  "status" "MemberApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "directorateId" TEXT,
  "positionId" TEXT,
  "rejectionReason" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "memberId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MemberApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemberApplication_userId_key" ON "MemberApplication"("userId");
CREATE UNIQUE INDEX "MemberApplication_memberId_key" ON "MemberApplication"("memberId");
CREATE UNIQUE INDEX "MemberApplication_organizationId_cpf_key" ON "MemberApplication"("organizationId", "cpf");
CREATE INDEX "MemberApplication_organizationId_status_createdAt_idx" ON "MemberApplication"("organizationId", "status", "createdAt");
ALTER TABLE "MemberApplication" ADD CONSTRAINT "MemberApplication_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
