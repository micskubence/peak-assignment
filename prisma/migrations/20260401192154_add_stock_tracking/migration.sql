-- CreateTable
CREATE TABLE "TrackedSymbol" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastFetchedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackedSymbol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockPrice" (
    "id" TEXT NOT NULL,
    "trackedSymbolId" TEXT NOT NULL,
    "price" DECIMAL(12,4) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrackedSymbol_symbol_key" ON "TrackedSymbol"("symbol");

-- CreateIndex
CREATE INDEX "StockPrice_trackedSymbolId_fetchedAt_idx" ON "StockPrice"("trackedSymbolId", "fetchedAt");

-- AddForeignKey
ALTER TABLE "StockPrice" ADD CONSTRAINT "StockPrice_trackedSymbolId_fkey" FOREIGN KEY ("trackedSymbolId") REFERENCES "TrackedSymbol"("id") ON DELETE CASCADE ON UPDATE CASCADE;
