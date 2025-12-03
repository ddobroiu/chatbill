-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cui" TEXT,
    "name" TEXT,
    "regCom" TEXT,
    "address" TEXT,
    "city" TEXT,
    "county" TEXT,
    "postalCode" TEXT,
    "country" TEXT DEFAULT 'România',
    "phone" TEXT,
    "email" TEXT,
    "bank" TEXT,
    "iban" TEXT,
    "capital" TEXT,
    "legalRep" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanySettings_userId_key" ON "CompanySettings"("userId");

-- CreateIndex
CREATE INDEX "CompanySettings_userId_idx" ON "CompanySettings"("userId");
