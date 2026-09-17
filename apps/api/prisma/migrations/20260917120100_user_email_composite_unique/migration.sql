-- Multi-tenant : 1 email par organisation
DROP INDEX IF EXISTS "User_email_key";
CREATE INDEX IF NOT EXISTS "User_organizationId_email_idx"
  ON "User" ("organizationId", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_organizationId_email_unique"
  ON "User" ("organizationId", "email")
  WHERE "organizationId" IS NOT NULL;
