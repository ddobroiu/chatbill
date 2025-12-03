-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cui" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "county" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'România',
    "email" TEXT,
    "phone" TEXT,
    "regCom" TEXT,
    "iban" TEXT,
    "bank" TEXT,
    "legalRep" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Conversation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT,
    "text" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "conversationId" TEXT,
    "companyId" TEXT,
    "subtotal" REAL NOT NULL,
    "tvaAmount" REAL NOT NULL,
    "total" REAL NOT NULL,
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'generated',
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
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'buc',
    "quantity" REAL NOT NULL,
    "price" REAL NOT NULL,
    "vatRate" REAL NOT NULL DEFAULT 0.19,
    "subtotal" REAL NOT NULL,
    "vatAmount" REAL NOT NULL,
    "total" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_cui_key" ON "Company"("cui");

-- CreateIndex
CREATE INDEX "Company_cui_idx" ON "Company"("cui");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Conversation_companyId_idx" ON "Conversation"("companyId");

-- CreateIndex
CREATE INDEX "Conversation_userId_idx" ON "Conversation"("userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_userId_idx" ON "Message"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_companyId_idx" ON "Invoice"("companyId");

-- CreateIndex
CREATE INDEX "Invoice_conversationId_idx" ON "Invoice"("conversationId");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");
