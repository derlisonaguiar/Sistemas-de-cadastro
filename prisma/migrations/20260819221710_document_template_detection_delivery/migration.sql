-- CreateEnum
CREATE TYPE "TemplateFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'CPF', 'CNPJ', 'EMAIL', 'PHONE', 'ADDRESS', 'CURRENCY', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "generatedDocxUrl" TEXT,
ADD COLUMN     "generatedPdfUrl" TEXT;

-- AlterTable
ALTER TABLE "DocumentTemplate" ADD COLUMN     "extractedText" TEXT,
ADD COLUMN     "originalFileName" TEXT,
ADD COLUMN     "originalFileSize" INTEGER,
ADD COLUMN     "originalFileUrl" TEXT,
ADD COLUMN     "originalMimeType" TEXT;

-- CreateTable
CREATE TABLE "DocumentTemplateField" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "TemplateFieldType" NOT NULL DEFAULT 'TEXT',
    "mappedPath" TEXT,
    "detectedValue" TEXT,
    "context" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplateField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentDelivery" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT,
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentTemplateField_templateId_idx" ON "DocumentTemplateField"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplateField_templateId_key_key" ON "DocumentTemplateField"("templateId", "key");

-- CreateIndex
CREATE INDEX "DocumentDelivery_documentId_idx" ON "DocumentDelivery"("documentId");

-- CreateIndex
CREATE INDEX "DocumentDelivery_channel_idx" ON "DocumentDelivery"("channel");

-- CreateIndex
CREATE INDEX "DocumentDelivery_status_idx" ON "DocumentDelivery"("status");

-- AddForeignKey
ALTER TABLE "DocumentTemplateField" ADD CONSTRAINT "DocumentTemplateField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDelivery" ADD CONSTRAINT "DocumentDelivery_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
