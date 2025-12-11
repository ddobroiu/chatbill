-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "offerNumber" TEXT NOT NULL,
    "conversationId" TEXT,
    "companyId" TEXT,
    "title" TEXT NOT NULL,
    "validity" INTEGER NOT NULL DEFAULT 30,
    "paymentTerms" TEXT NOT NULL DEFAULT '30days',
    "delivery" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tvaAmount" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "providerName" TEXT NOT NULL,
    "providerCUI" TEXT NOT NULL,
    "providerRegCom" TEXT,
    "providerAddress" TEXT NOT NULL,
    "providerCity" TEXT,
    "providerCounty" TEXT,
    "providerEmail" TEXT,
    "providerPhone" TEXT,
    "providerBank" TEXT,
    "providerIban" TEXT,
    "clientType" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientCUI" TEXT,
    "clientRegCom" TEXT,
    "clientFirstName" TEXT,
    "clientLastName" TEXT,
    "clientAddress" TEXT,
    "clientCity" TEXT,
    "clientCounty" TEXT,
    "clientEmail" TEXT,
    "clientPhone" TEXT,
    "pdfPath" TEXT,
    "template" TEXT NOT NULL DEFAULT 'modern',
    "notes" TEXT,
    "convertedToInvoiceId" TEXT,
    "convertedToProformaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferItem" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'buc',
    "quantity" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0.21,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "vatAmount" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Offer_offerNumber_key" ON "Offer"("offerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_convertedToInvoiceId_key" ON "Offer"("convertedToInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_convertedToProformaId_key" ON "Offer"("convertedToProformaId");

-- CreateIndex
CREATE INDEX "Offer_companyId_idx" ON "Offer"("companyId");

-- CreateIndex
CREATE INDEX "Offer_conversationId_idx" ON "Offer"("conversationId");

-- CreateIndex
CREATE INDEX "Offer_offerNumber_idx" ON "Offer"("offerNumber");

-- CreateIndex
CREATE INDEX "OfferItem_offerId_idx" ON "OfferItem"("offerId");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferItem" ADD CONSTRAINT "OfferItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
