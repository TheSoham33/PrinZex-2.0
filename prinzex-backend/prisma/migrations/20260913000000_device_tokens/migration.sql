-- FCM device tokens (gap #10 — push notifications). One row per registered
-- device per recipient; the push sender fans a notification out to every token
-- matching (recipientType, recipientId). `token` is globally unique so
-- re-registering a token reassigns it to whoever owns that device now.

CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'web',
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");
CREATE INDEX "DeviceToken_recipientType_recipientId_idx" ON "DeviceToken"("recipientType", "recipientId");
CREATE INDEX "DeviceToken_createdAt_idx" ON "DeviceToken"("createdAt");
