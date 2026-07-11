-- CreateTable
CREATE TABLE "banks" (
    "id" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "banks_short_name_key" ON "banks"("short_name");

-- CreateIndex
CREATE INDEX "banks_full_name_idx" ON "banks"("full_name");
