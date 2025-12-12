-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'web';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "whatsappMessageId" TEXT;

-- CreateIndex
CREATE INDEX "Conversation_phoneNumber_idx" ON "Conversation"("phoneNumber");

-- CreateIndex
CREATE INDEX "Conversation_type_idx" ON "Conversation"("type");

-- CreateIndex
CREATE INDEX "Message_whatsappMessageId_idx" ON "Message"("whatsappMessageId");
