-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "userId" TEXT,
ALTER COLUMN "sessionId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ChatMessage_userId_idx" ON "ChatMessage"("userId");
