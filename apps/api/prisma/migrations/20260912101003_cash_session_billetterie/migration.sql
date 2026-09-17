-- AlterTable
ALTER TABLE "CashMovement" ADD COLUMN     "sessionId" TEXT;

-- AlterTable
ALTER TABLE "CashRegister" ADD COLUMN     "closedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CashSession" ADD COLUMN     "closingBreakdown" JSONB,
ADD COLUMN     "openingBreakdown" JSONB;

-- AlterTable
ALTER TABLE "OrderPayment" ADD COLUMN     "cashSessionId" TEXT;

-- CreateIndex
CREATE INDEX "CashMovement_sessionId_idx" ON "CashMovement"("sessionId");

-- CreateIndex
CREATE INDEX "OrderPayment_cashSessionId_idx" ON "OrderPayment"("cashSessionId");

-- AddForeignKey
ALTER TABLE "OrderPayment" ADD CONSTRAINT "OrderPayment_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CashSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
