-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'ESSENTIAL', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INCOMPLETE', 'UNPAID', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "VerificationTokenType" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "AuditLogAction" AS ENUM ('LOGIN', 'LOGOUT', 'REGISTER', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'EMAIL_VERIFY', 'ACCOUNT_LINKED', 'ACCOUNT_UNLINKED', 'TRADING_ACCOUNT_ADDED', 'TRADING_ACCOUNT_REMOVED', 'TRADE_SYNC', 'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_UPDATED', 'SUBSCRIPTION_CANCELED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED');

-- CreateEnum
CREATE TYPE "TradingPlatform" AS ENUM ('MT5', 'MT4', 'CTRADER', 'INTERACTIVE_BROKERS', 'BINANCE', 'COINBASE', 'ALPACA', 'TRADINGVIEW', 'ETORO', 'WEBULL', 'TD_AMERITRADE', 'EXNESS', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderSide" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('PASSWORD', 'API_KEY', 'OAUTH_TOKEN', 'WEBHOOK', 'SESSION_TOKEN');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT', 'TRAILING_STOP', 'TAKE_PROFIT', 'STOP_LOSS', 'OCO', 'ICEBERG', 'POST_ONLY', 'FOK', 'IOC', 'GTC', 'GTD', 'DAY');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED', 'REJECTED', 'EXPIRED', 'TRIGGERED', 'SUSPENDED', 'REPLACED');

-- CreateEnum
CREATE TYPE "TradeSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "PositionSide" AS ENUM ('LONG', 'SHORT', 'FLAT');

-- CreateEnum
CREATE TYPE "AuthProviders" AS ENUM ('FACEBOOK', 'GOOGLE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT,
    "imageUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" "AuthProviders" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "VerificationTokenType" NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AuditLogAction" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "Role" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentId" TEXT,
    "invoiceUrl" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingAccount" (
    "id" TEXT NOT NULL,
    "platform" "TradingPlatform" NOT NULL,
    "accountIdentifier" TEXT NOT NULL,
    "brokerName" TEXT,
    "accountName" TEXT,
    "connectionConfig" JSONB NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "equity" DOUBLE PRECISION,
    "margin" DOUBLE PRECISION,
    "freeMargin" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "leverage" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "isPaperTrade" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "syncError" TEXT,
    "syncFrequency" INTEGER NOT NULL DEFAULT 60,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "orderExternalId" TEXT,
    "positionExternalId" TEXT,
    "symbol" TEXT NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "side" "OrderSide" NOT NULL,
    "entryType" TEXT,
    "swap" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformData" JSONB,
    "comment" TEXT,
    "tradingAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" "OrderSide" NOT NULL,
    "orderType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "volumeInitial" DOUBLE PRECISION NOT NULL,
    "volumeFilled" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceOrder" DOUBLE PRECISION,
    "priceFilled" DOUBLE PRECISION,
    "stopLoss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "takeProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timeCreated" TIMESTAMP(3) NOT NULL,
    "timeFilled" TIMESTAMP(3),
    "timeExpiry" TIMESTAMP(3),
    "platformData" JSONB,
    "comment" TEXT,
    "tradingAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" "PositionSide" NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "priceOpen" DOUBLE PRECISION NOT NULL,
    "priceCurrent" DOUBLE PRECISION NOT NULL,
    "priceAverage" DOUBLE PRECISION,
    "stopLoss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "takeProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unrealizedPnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "realizedPnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "swap" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timeOpen" TIMESTAMP(3) NOT NULL,
    "timeUpdate" TIMESTAMP(3) NOT NULL,
    "platformData" JSONB,
    "comment" TEXT,
    "tradingAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_sessionToken_idx" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_token_idx" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_identifier_idx" ON "VerificationToken"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_type_key" ON "VerificationToken"("identifier", "token", "type");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Subscription_currentPeriodEnd_idx" ON "Subscription"("currentPeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentId_key" ON "Payment"("stripePaymentId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "TradingAccount_userId_idx" ON "TradingAccount"("userId");

-- CreateIndex
CREATE INDEX "TradingAccount_platform_idx" ON "TradingAccount"("platform");

-- CreateIndex
CREATE INDEX "TradingAccount_accountIdentifier_idx" ON "TradingAccount"("accountIdentifier");

-- CreateIndex
CREATE INDEX "TradingAccount_isActive_idx" ON "TradingAccount"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TradingAccount_userId_platform_accountIdentifier_key" ON "TradingAccount"("userId", "platform", "accountIdentifier");

-- CreateIndex
CREATE INDEX "Deal_tradingAccountId_time_idx" ON "Deal"("tradingAccountId", "time" DESC);

-- CreateIndex
CREATE INDEX "Deal_symbol_idx" ON "Deal"("symbol");

-- CreateIndex
CREATE INDEX "Deal_externalId_idx" ON "Deal"("externalId");

-- CreateIndex
CREATE INDEX "Deal_time_idx" ON "Deal"("time" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Deal_tradingAccountId_externalId_key" ON "Deal"("tradingAccountId", "externalId");

-- CreateIndex
CREATE INDEX "Order_tradingAccountId_status_idx" ON "Order"("tradingAccountId", "status");

-- CreateIndex
CREATE INDEX "Order_symbol_idx" ON "Order"("symbol");

-- CreateIndex
CREATE INDEX "Order_timeCreated_idx" ON "Order"("timeCreated" DESC);

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_tradingAccountId_externalId_key" ON "Order"("tradingAccountId", "externalId");

-- CreateIndex
CREATE INDEX "Position_tradingAccountId_idx" ON "Position"("tradingAccountId");

-- CreateIndex
CREATE INDEX "Position_symbol_idx" ON "Position"("symbol");

-- CreateIndex
CREATE INDEX "Position_timeOpen_idx" ON "Position"("timeOpen" DESC);

-- CreateIndex
CREATE INDEX "Position_side_idx" ON "Position"("side");

-- CreateIndex
CREATE UNIQUE INDEX "Position_tradingAccountId_externalId_key" ON "Position"("tradingAccountId", "externalId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingAccount" ADD CONSTRAINT "TradingAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_tradingAccountId_fkey" FOREIGN KEY ("tradingAccountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
