-- Renomme token (clair) → tokenHash (SHA-256 + pepper JWT_SECRET)
ALTER TABLE "RefreshToken" RENAME COLUMN "token" TO "tokenHash";
