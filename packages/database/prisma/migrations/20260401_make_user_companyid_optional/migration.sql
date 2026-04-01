-- AlterTable: make companyId optional on User (for SUPER_ADMIN)
ALTER TABLE "User" ALTER COLUMN "companyId" DROP NOT NULL;
