-- CreateTable
CREATE TABLE "transport_trips" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_trips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_transport_trip_user" ON "transport_trips"("userId");

-- CreateIndex
CREATE INDEX "idx_transport_trip_user_created" ON "transport_trips"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "transport_trips" ADD CONSTRAINT "transport_trips_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
