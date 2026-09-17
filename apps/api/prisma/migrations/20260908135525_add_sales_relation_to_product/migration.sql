/*
  Warnings:

  - You are about to drop the column `address` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `Product` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "address",
DROP COLUMN "city";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "stock",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "type" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "price" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "quantity" SET DEFAULT 1;
