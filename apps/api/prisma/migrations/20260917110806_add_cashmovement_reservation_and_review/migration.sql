-- AlterTable
ALTER TABLE "CashMovement" ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reservationId" TEXT;

-- CreateIndex
CREATE INDEX "CashMovement_reservationId_idx" ON "CashMovement"("reservationId");

-- CreateIndex
CREATE INDEX "CashMovement_organizationId_needsReview_idx" ON "CashMovement"("organizationId", "needsReview");

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
