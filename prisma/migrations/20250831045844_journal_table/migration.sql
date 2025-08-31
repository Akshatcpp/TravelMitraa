-- CreateTable
CREATE TABLE "public"."Journel" (
    "id" TEXT NOT NULL,
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Journel_pkey" PRIMARY KEY ("id")
);
