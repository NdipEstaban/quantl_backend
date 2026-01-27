/*
  Warnings:

  - You are about to drop the column `isPaperTrade` on the `TradingAccount` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TradingAccount" DROP COLUMN "isPaperTrade",
ADD COLUMN     "isContest" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "numberOfTrades" DROP NOT NULL,
ALTER COLUMN "numberOfTrades" DROP DEFAULT;
