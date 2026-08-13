-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "MerchantStatus" AS ENUM ('DRAFT', 'APPROVED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DietTag" AS ENUM ('MEAT', 'DAIRY', 'PAREVE', 'MIXED');

-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('WHATSAPP', 'WEBSITE', 'PHONE', 'PICKUP');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('HOME_VIEW', 'DIRECTORY_VIEW', 'SEARCH', 'FILTER_USE', 'MERCHANT_VIEW', 'WHATSAPP_CLICK', 'WEBSITE_CLICK', 'PHONE_CLICK', 'DIRECTIONS_CLICK', 'APPLICATION_SUBMITTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSeedData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Neighborhood" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSeedData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Neighborhood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tagline" TEXT,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsappPhone" TEXT,
    "email" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "neighborhoodId" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "addressNote" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "deliveryAreaText" TEXT,
    "offersDelivery" BOOLEAN NOT NULL DEFAULT false,
    "offersPickup" BOOLEAN NOT NULL DEFAULT true,
    "dietTag" "DietTag",
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "orderChannels" "OrderChannel"[] DEFAULT ARRAY[]::"OrderChannel"[],
    "websiteUrl" TEXT,
    "whatsappGreeting" TEXT,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Panama',
    "shabbatCloseOffsetMinutes" INTEGER NOT NULL DEFAULT 90,
    "havdalahReopenOffsetMinutes" INTEGER NOT NULL DEFAULT 60,
    "observesShabbat" BOOLEAN NOT NULL DEFAULT true,
    "status" "MerchantStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortWeight" INTEGER NOT NULL DEFAULT 0,
    "searchText" TEXT NOT NULL DEFAULT '',
    "isSeedData" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantHours" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "opensAt" INTEGER NOT NULL,
    "closesAt" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HolidayClosure" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HolidayClosure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KosherSupervision" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "certificateId" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "verifiedByUserId" TEXT,
    "expiryNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KosherSupervision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationDocument" (
    "id" TEXT NOT NULL,
    "supervisionId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER,
    "dietTag" "DietTag",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isSeedData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantApplication" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsappPhone" TEXT,
    "email" TEXT NOT NULL,
    "categoryId" TEXT,
    "categorySlug" TEXT,
    "neighborhoodId" TEXT,
    "neighborhoodSlug" TEXT,
    "addressLine" TEXT NOT NULL,
    "description" TEXT,
    "deliveryAreaText" TEXT,
    "offersDelivery" BOOLEAN NOT NULL DEFAULT false,
    "offersPickup" BOOLEAN NOT NULL DEFAULT true,
    "dietTag" "DietTag",
    "orderChannels" "OrderChannel"[] DEFAULT ARRAY[]::"OrderChannel"[],
    "websiteUrl" TEXT,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "hoursPayload" JSONB,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "merchantId" TEXT,
    "submitterHash" TEXT,
    "isSeedData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "type" "AnalyticsEventType" NOT NULL,
    "merchantId" TEXT,
    "searchTerm" TEXT,
    "filterKey" TEXT,
    "filterValue" TEXT,
    "path" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActionLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_isActive_sortOrder_idx" ON "Category"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Neighborhood_slug_key" ON "Neighborhood"("slug");

-- CreateIndex
CREATE INDEX "Neighborhood_isActive_sortOrder_idx" ON "Neighborhood"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_publicId_key" ON "Merchant"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_slug_key" ON "Merchant"("slug");

-- CreateIndex
CREATE INDEX "Merchant_status_deletedAt_idx" ON "Merchant"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "Merchant_categoryId_status_idx" ON "Merchant"("categoryId", "status");

-- CreateIndex
CREATE INDEX "Merchant_neighborhoodId_status_idx" ON "Merchant"("neighborhoodId", "status");

-- CreateIndex
CREATE INDEX "Merchant_status_isFeatured_sortWeight_idx" ON "Merchant"("status", "isFeatured", "sortWeight");

-- CreateIndex
CREATE INDEX "MerchantHours_merchantId_dayOfWeek_idx" ON "MerchantHours"("merchantId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "HolidayClosure_merchantId_startsAt_endsAt_idx" ON "HolidayClosure"("merchantId", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "KosherSupervision_merchantId_key" ON "KosherSupervision"("merchantId");

-- CreateIndex
CREATE INDEX "KosherSupervision_isActive_expiresAt_idx" ON "KosherSupervision"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "CertificationDocument_supervisionId_idx" ON "CertificationDocument"("supervisionId");

-- CreateIndex
CREATE INDEX "Product_merchantId_sortOrder_idx" ON "Product"("merchantId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantApplication_publicId_key" ON "MerchantApplication"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantApplication_merchantId_key" ON "MerchantApplication"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantApplication_status_createdAt_idx" ON "MerchantApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MerchantApplication_submitterHash_createdAt_idx" ON "MerchantApplication"("submitterHash", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_merchantId_type_createdAt_idx" ON "AnalyticsEvent"("merchantId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AdminActionLog_entityType_entityId_createdAt_idx" ON "AdminActionLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminActionLog_createdAt_idx" ON "AdminActionLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_neighborhoodId_fkey" FOREIGN KEY ("neighborhoodId") REFERENCES "Neighborhood"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantHours" ADD CONSTRAINT "MerchantHours_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HolidayClosure" ADD CONSTRAINT "HolidayClosure_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KosherSupervision" ADD CONSTRAINT "KosherSupervision_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KosherSupervision" ADD CONSTRAINT "KosherSupervision_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationDocument" ADD CONSTRAINT "CertificationDocument_supervisionId_fkey" FOREIGN KEY ("supervisionId") REFERENCES "KosherSupervision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationDocument" ADD CONSTRAINT "CertificationDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantApplication" ADD CONSTRAINT "MerchantApplication_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantApplication" ADD CONSTRAINT "MerchantApplication_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActionLog" ADD CONSTRAINT "AdminActionLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
