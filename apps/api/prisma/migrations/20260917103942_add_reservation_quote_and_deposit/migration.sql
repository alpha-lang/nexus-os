-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReservationStatus" ADD VALUE 'QUOTED';
ALTER TYPE "ReservationStatus" ADD VALUE 'DEPOSIT_PAID';

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "cancellationPolicyDays" INTEGER,
ADD COLUMN     "depositAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "depositPaidAt" TIMESTAMP(3);
