-- CreateEnum
CREATE TYPE "InterviewProposalStatus" AS ENUM ('pending', 'scheduled', 'discarded');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "mcpDisabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "interview_proposals" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "InterviewProposalStatus" NOT NULL DEFAULT 'pending',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledAt" TIMESTAMP(3),
    "handledBy" TEXT,
    "interviewId" TEXT,

    CONSTRAINT "interview_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcp_audit_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "clientId" TEXT,
    "scopes" TEXT[],
    "tool" TEXT NOT NULL,
    "arguments" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'mcp',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "interview_proposals_applicationId_status_idx" ON "interview_proposals"("applicationId", "status");

-- CreateIndex
CREATE INDEX "mcp_audit_log_createdAt_idx" ON "mcp_audit_log"("createdAt");

-- CreateIndex
CREATE INDEX "mcp_audit_log_userId_createdAt_idx" ON "mcp_audit_log"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "interview_proposals" ADD CONSTRAINT "interview_proposals_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_proposals" ADD CONSTRAINT "interview_proposals_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
