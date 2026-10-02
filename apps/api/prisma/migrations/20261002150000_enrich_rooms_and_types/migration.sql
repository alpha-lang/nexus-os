-- RoomType : rename capacity → adultCapacity, ajouter les nouveaux champs
ALTER TABLE "RoomType" RENAME COLUMN "capacity" TO "adultCapacity";
ALTER TABLE "RoomType" ADD COLUMN "childCapacity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RoomType" ADD COLUMN "weekendPrice" DOUBLE PRECISION;
ALTER TABLE "RoomType" ADD COLUMN "surface" DOUBLE PRECISION;
ALTER TABLE "RoomType" ADD COLUMN "bedType" TEXT;
ALTER TABLE "RoomType" ADD COLUMN "bedCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "RoomType" ADD COLUMN "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "RoomType" ADD COLUMN "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "RoomType" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#14b8a6';
ALTER TABLE "RoomType" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RoomType" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Room : ajouter les nouveaux champs
ALTER TABLE "Room" ADD COLUMN "view" TEXT;
ALTER TABLE "Room" ADD COLUMN "isAccessible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Room" ADD COLUMN "hasBalcony" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Room" ADD COLUMN "internalNotes" TEXT;
ALTER TABLE "Room" ADD COLUMN "maintenanceDate" TIMESTAMP(3);
ALTER TABLE "Room" ADD COLUMN "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
