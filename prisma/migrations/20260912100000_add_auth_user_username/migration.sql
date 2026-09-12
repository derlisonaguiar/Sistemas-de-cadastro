ALTER TABLE "AuthUser" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "AuthUser_username_key" ON "AuthUser"("username");
