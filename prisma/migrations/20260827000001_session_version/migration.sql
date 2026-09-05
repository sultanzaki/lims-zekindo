-- Add sessionVersion to User: bumped on password change/reset so previously
-- issued (still unexpired) session cookies are invalidated.
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
