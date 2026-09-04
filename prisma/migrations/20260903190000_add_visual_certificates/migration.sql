ALTER TYPE "TemplateSourceType" ADD VALUE 'VISUAL';
ALTER TYPE "TemplateRenderMode" ADD VALUE 'VISUAL_CERTIFICATE';

ALTER TABLE "Document"
  ADD COLUMN "templateLayoutVersion" INTEGER,
  ADD COLUMN "templateLayoutSnapshot" JSONB;

CREATE TABLE "CertificateAsset" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "storageRef" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CertificateAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CertificateAsset_organizationId_idx" ON "CertificateAsset"("organizationId");
ALTER TABLE "CertificateAsset" ADD CONSTRAINT "CertificateAsset_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
