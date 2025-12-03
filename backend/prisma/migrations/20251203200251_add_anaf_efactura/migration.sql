-- CreateTable
CREATE TABLE "AnafAuth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "cui" TEXT,
    "companyName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRefresh" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnafAuth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnafAppConfig" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "authUrl" TEXT NOT NULL DEFAULT 'https://logincert.anaf.ro/anaf/oauth2/v1/authorize',
    "tokenUrl" TEXT NOT NULL DEFAULT 'https://logincert.anaf.ro/anaf/oauth2/v1/token',
    "apiBaseUrl" TEXT NOT NULL DEFAULT 'https://api.anaf.ro/prod/FCTEH/public-v1',
    "environment" TEXT NOT NULL DEFAULT 'test',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnafAppConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EFacturaLog" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "anafMessageId" TEXT,
    "xmlContent" TEXT,
    "responseCode" TEXT,
    "responseMsg" TEXT,
    "errorDetails" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EFacturaLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnafAuth_userId_key" ON "AnafAuth"("userId");

-- CreateIndex
CREATE INDEX "AnafAuth_userId_idx" ON "AnafAuth"("userId");

-- CreateIndex
CREATE INDEX "AnafAuth_cui_idx" ON "AnafAuth"("cui");

-- CreateIndex
CREATE UNIQUE INDEX "AnafAppConfig_clientId_key" ON "AnafAppConfig"("clientId");

-- CreateIndex
CREATE INDEX "EFacturaLog_invoiceId_idx" ON "EFacturaLog"("invoiceId");

-- CreateIndex
CREATE INDEX "EFacturaLog_status_idx" ON "EFacturaLog"("status");

-- AddForeignKey
ALTER TABLE "AnafAuth" ADD CONSTRAINT "AnafAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EFacturaLog" ADD CONSTRAINT "EFacturaLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
