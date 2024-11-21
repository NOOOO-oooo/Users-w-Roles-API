/*
  Warnings:

  - You are about to drop the `RefreshTokens` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RefreshTokens" DROP CONSTRAINT "RefreshTokens_user_id_fkey";

-- DropTable
DROP TABLE "RefreshTokens";

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "refreshtoken" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_refreshtoken_key" ON "refresh_tokens"("refreshtoken");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users_info"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
