-- CreateEnum
CREATE TYPE "PositionRole" AS ENUM ('PRESIDENT', 'VICE_PRESIDENT', 'DIRECTOR', 'MANAGER', 'MEMBER', 'OTHER');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "address" TEXT,
ADD COLUMN     "addressNumber" TEXT,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "maritalStatus" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "rg" TEXT,
ADD COLUMN     "rgIssuer" TEXT,
ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "Position" ADD COLUMN     "role" "PositionRole" NOT NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE INDEX "Position_role_idx" ON "Position"("role");
