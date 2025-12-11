/*
  Warnings:

  - You are about to drop the column `preferredTemplate` on the `CompanySettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CompanySettings" DROP COLUMN "preferredTemplate",
ADD COLUMN     "invoiceTemplate" TEXT DEFAULT 'modern',
ADD COLUMN     "proformaTemplate" TEXT DEFAULT 'modern',
ADD COLUMN     "quoteTemplate" TEXT DEFAULT 'modern';
