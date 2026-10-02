-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "adminTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
