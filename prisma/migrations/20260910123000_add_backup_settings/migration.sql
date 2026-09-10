CREATE TABLE "BackupSettings" (
  "organizationId" TEXT NOT NULL,
  "destination" TEXT NOT NULL DEFAULT 'LOCAL',
  "frequency" TEXT NOT NULL DEFAULT 'MANUAL',
  "lastBackupAt" TIMESTAMP(3),
  "lastBackupById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BackupSettings_pkey" PRIMARY KEY ("organizationId"),
  CONSTRAINT "BackupSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);

CREATE TABLE "BackupAudit" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "summary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BackupAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BackupAudit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);
CREATE INDEX "BackupAudit_organizationId_createdAt_idx" ON "BackupAudit"("organizationId", "createdAt");
