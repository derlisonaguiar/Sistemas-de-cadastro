CREATE TYPE "DocumentOrigin" AS ENUM ('GENERATED', 'IMPORTED');

ALTER TABLE "Document"
  ADD COLUMN "origin" "DocumentOrigin" NOT NULL DEFAULT 'GENERATED',
  ADD COLUMN "documentDate" DATE,
  ADD COLUMN "organizationDocument" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "importedById" TEXT,
  ADD COLUMN "importedAt" TIMESTAMP(3),
  ADD COLUMN "importedFileHash" TEXT,
  ADD COLUMN "importedFileName" TEXT,
  ADD COLUMN "importedMimeType" TEXT,
  ADD COLUMN "importedFileSize" INTEGER,
  ADD COLUMN "importLinks" JSONB,
  ADD COLUMN "duplicateOfId" TEXT,
  ADD COLUMN "duplicateReason" TEXT;

CREATE INDEX "Document_organizationId_importedFileHash_idx" ON "Document"("organizationId", "importedFileHash");
CREATE INDEX "Document_organizationId_documentDate_idx" ON "Document"("organizationId", "documentDate");
