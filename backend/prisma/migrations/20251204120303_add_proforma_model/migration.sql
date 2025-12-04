-- CreateTable
CREATE TABLE "Proforma" (
    "id" TEXT NOT NULL,
    "proformaNumber" TEXT NOT NULL,
    "conversationId" TEXT,
    "companyId" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tvaAmount" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
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
    "providerCapital" TEXT,
    "clientType" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientCUI" TEXT,
    "clientRegCom" TEXT,
    "clientCNP" TEXT,
    "clientFirstName" TEXT,
    "clientLastName" TEXT,
    "clientAddress" TEXT,
    "clientCity" TEXT,
    "clientCounty" TEXT,
    "clientEmail" TEXT,
    "pdfPath" TEXT,
    "template" TEXT NOT NULL DEFAULT 'modern',
    "notes" TEXT,
    "convertedToInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proforma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProformaItem" (
    "id" TEXT NOT NULL,
    "proformaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'buc',
    "quantity" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0.19,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "vatAmount" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProformaItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Proforma_proformaNumber_key" ON "Proforma"("proformaNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Proforma_convertedToInvoiceId_key" ON "Proforma"("convertedToInvoiceId");

-- CreateIndex
CREATE INDEX "Proforma_companyId_idx" ON "Proforma"("companyId");

-- CreateIndex
CREATE INDEX "Proforma_conversationId_idx" ON "Proforma"("conversationId");

-- CreateIndex
CREATE INDEX "Proforma_proformaNumber_idx" ON "Proforma"("proformaNumber");

-- CreateIndex
CREATE INDEX "ProformaItem_proformaId_idx" ON "ProformaItem"("proformaId");

-- AddForeignKey
ALTER TABLE "Proforma" ADD CONSTRAINT "Proforma_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proforma" ADD CONSTRAINT "Proforma_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaItem" ADD CONSTRAINT "ProformaItem_proformaId_fkey" FOREIGN KEY ("proformaId") REFERENCES "Proforma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
