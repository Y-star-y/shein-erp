-- Login captcha and hourly failure window

ALTER TABLE "User" ADD COLUMN "loginFailureWindowStart" TIMESTAMP(3);

CREATE TABLE "LoginCaptcha" (
  "id" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginCaptcha_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoginCaptcha_expiresAt_idx" ON "LoginCaptcha"("expiresAt");
