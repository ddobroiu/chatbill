-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN     "invoiceSeries" TEXT DEFAULT 'FAC',
ADD COLUMN     "invoiceStartNumber" INTEGER DEFAULT 1,
ADD COLUMN     "proformaSeries" TEXT DEFAULT 'PRO',
ADD COLUMN     "proformaStartNumber" INTEGER DEFAULT 1,
ADD COLUMN     "quoteSeries" TEXT DEFAULT 'OFF',
ADD COLUMN     "quoteStartNumber" INTEGER DEFAULT 1;
