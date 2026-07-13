-- CreateTable
CREATE TABLE "book_locks" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lock_date" DATE NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_locks_pkey" PRIMARY KEY ("id")
);
