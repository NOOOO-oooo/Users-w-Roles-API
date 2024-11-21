-- CreateTable
CREATE TABLE "RefreshTokens" (
    "refreshtoken" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshTokens_refreshtoken_key" ON "RefreshTokens"("refreshtoken");

-- AddForeignKey
ALTER TABLE "RefreshTokens" ADD CONSTRAINT "RefreshTokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
