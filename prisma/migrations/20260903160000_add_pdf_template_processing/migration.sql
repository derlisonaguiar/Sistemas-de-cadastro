CREATE TYPE "TemplateSourceType" AS ENUM ('DOCX', 'PDF');
CREATE TYPE "TemplateRenderMode" AS ENUM ('DOCX_TEMPLATE', 'PDF_OVERLAY');
CREATE TYPE "TemplateProcessingStatus" AS ENUM ('READY', 'NEEDS_REVIEW', 'REQUIRES_OCR', 'FAILED');

ALTER TABLE "DocumentTemplate"
ADD COLUMN "sourceType" "TemplateSourceType" NOT NULL DEFAULT 'DOCX',
ADD COLUMN "renderMode" "TemplateRenderMode" NOT NULL DEFAULT 'DOCX_TEMPLATE',
ADD COLUMN "processingStatus" "TemplateProcessingStatus" NOT NULL DEFAULT 'READY',
ADD COLUMN "processingVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "layoutJson" JSONB,
ADD COLUMN "confirmedAt" TIMESTAMP(3);

ALTER TABLE "DocumentTemplateField"
ADD COLUMN "confirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "page" INTEGER,
ADD COLUMN "x" DOUBLE PRECISION,
ADD COLUMN "y" DOUBLE PRECISION,
ADD COLUMN "width" DOUBLE PRECISION,
ADD COLUMN "height" DOUBLE PRECISION,
ADD COLUMN "exampleValue" TEXT;

UPDATE "DocumentTemplateField" SET "confirmed" = true;
UPDATE "DocumentTemplate" SET "confirmedAt" = "createdAt" WHERE "active" = true;
