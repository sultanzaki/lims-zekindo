-- Scalability indexes for analytics / BI / cron queries at large row counts.
-- All additive; safe to run on existing data (Postgres builds them in the
-- background on large tables via CREATE INDEX CONCURRENTLY in production,
-- but a plain CREATE INDEX is fine for this app's size during deploy).

CREATE INDEX "Sample_approvedAt_idx" ON "Sample"("approvedAt");
CREATE INDEX "Sample_type_idx" ON "Sample"("type");
CREATE INDEX "Sample_status_retentionUntil_idx" ON "Sample"("status", "retentionUntil");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "CustodyEvent_time_idx" ON "CustodyEvent"("time");
